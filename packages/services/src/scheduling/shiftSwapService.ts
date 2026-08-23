import {
  ShiftSwapRequestRepository,
  ShiftAssignmentRepository,
  ShiftRepository,
  EmployeeRepository,
  UserRepository,
  AttendanceRecordRepository,
  type ShiftSwapRequest
} from '@shiftos/repositories';
import { ValidationError, AuthorizationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertUuid } from '../validation.js';
import { notify } from '../notifications/notificationService.js';

/**
 * Shift swap requests (backend completion pass, second phase). See
 * 042_create_shift_swap_requests.sql for the full design decision: this is a
 * one-way coverage handoff (request -> accept/claim -> supervisor approval),
 * not a two-way trade marketplace. WHO may perform each transition is
 * enforced here; the DB trigger enforces the state machine's structural
 * integrity (valid transitions, immutable fields, required companion
 * fields) — the same split already used by AttendanceService.
 */
export class ShiftSwapService {
  private readonly swaps: ShiftSwapRequestRepository;
  private readonly assignments: ShiftAssignmentRepository;
  private readonly shifts: ShiftRepository;
  private readonly employees: EmployeeRepository;
  private readonly users: UserRepository;
  private readonly attendanceRecords: AttendanceRecordRepository;

  constructor(private readonly context: ApplicationContext) {
    this.swaps = new ShiftSwapRequestRepository(context.client);
    this.assignments = new ShiftAssignmentRepository(context.client);
    this.shifts = new ShiftRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
    this.users = new UserRepository(context.client);
    this.attendanceRecords = new AttendanceRecordRepository(context.client);
  }

  async requestSwap(shiftAssignmentId: string, targetEmployeeId?: string | null, notes?: string | null): Promise<ShiftSwapRequest> {
    assertUuid(shiftAssignmentId, 'shiftAssignmentId');
    await this.context.requirePermission('swaps.request');

    const me = await this.resolveMyEmployee();
    if (!me) {
      throw new ValidationError('Your account is not linked to an employee record, so there is nothing to offer a swap as.');
    }

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, shiftAssignmentId);
    if (assignment.employee_id !== me.id) {
      throw new AuthorizationError('You can only request a swap for your own shift assignment');
    }
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);

    if (targetEmployeeId) {
      assertUuid(targetEmployeeId, 'targetEmployeeId');
      if (targetEmployeeId === me.id) {
        throw new ValidationError('Cannot direct a swap request at yourself');
      }
      const target = await this.employees.getByIdOrThrow(this.context.organizationId, targetEmployeeId);
      if (target.branch_id !== shift.branch_id) {
        throw new ValidationError('The target employee must belong to the same branch as the shift');
      }
    }

    return this.swaps.insert(this.context.organizationId, {
      branch_id: shift.branch_id,
      shift_assignment_id: shiftAssignmentId,
      requested_by_employee_id: me.id,
      target_employee_id: targetEmployeeId ?? null,
      notes: notes ?? null
    } as Partial<ShiftSwapRequest>);
  }

  async respondToSwap(swapId: string, accept: boolean): Promise<ShiftSwapRequest> {
    assertUuid(swapId, 'swapId');
    await this.context.requirePermission('swaps.respond');

    const me = await this.resolveMyEmployee();
    if (!me) {
      throw new ValidationError('Your account is not linked to an employee record, so there is nothing to respond as.');
    }

    const swap = await this.swaps.getByIdOrThrow(this.context.organizationId, swapId);
    this.context.requireBranchAccess(swap.branch_id);
    if (swap.status !== 'pending') {
      throw new ValidationError(`Cannot respond to a swap request in status "${swap.status}"`);
    }
    if (swap.target_employee_id !== null && swap.target_employee_id !== me.id) {
      throw new AuthorizationError('This swap request is directed at a different employee');
    }
    if (swap.requested_by_employee_id === me.id) {
      throw new ValidationError('You cannot respond to your own swap request');
    }

    if (!accept) {
      if (swap.target_employee_id === null) {
        throw new ValidationError('An open swap request cannot be declined by an individual employee; simply do not claim it');
      }
      const declined = await this.swaps.patch(this.context.organizationId, swapId, {
        status: 'declined',
        responded_by_employee_id: me.id,
        responded_at: new Date().toISOString()
      } as Partial<ShiftSwapRequest>);
      await this.notifyRequester(swap, 'declined');
      return declined;
    }

    const accepted = await this.swaps.patch(this.context.organizationId, swapId, {
      status: 'accepted',
      target_employee_id: me.id,
      responded_by_employee_id: me.id,
      responded_at: new Date().toISOString()
    } as Partial<ShiftSwapRequest>);
    await this.notifyRequester(swap, 'accepted');
    return accepted;
  }

  async cancelSwap(swapId: string): Promise<ShiftSwapRequest> {
    assertUuid(swapId, 'swapId');
    await this.context.requirePermission('swaps.request');

    const me = await this.resolveMyEmployee();
    const swap = await this.swaps.getByIdOrThrow(this.context.organizationId, swapId);
    this.context.requireBranchAccess(swap.branch_id);
    if (!me || swap.requested_by_employee_id !== me.id) {
      throw new AuthorizationError('Only the employee who requested the swap can cancel it');
    }
    if (swap.status !== 'pending' && swap.status !== 'accepted') {
      throw new ValidationError(`Cannot cancel a swap request in status "${swap.status}"`);
    }

    return this.swaps.patch(this.context.organizationId, swapId, { status: 'cancelled' } as Partial<ShiftSwapRequest>);
  }

  /** Approves an accepted swap and atomically reassigns the underlying shift assignment. */
  async approveSwap(swapId: string, decisionNotes?: string | null): Promise<ShiftSwapRequest> {
    assertUuid(swapId, 'swapId');
    await this.context.requirePermission('swaps.approve');

    const swap = await this.swaps.getByIdOrThrow(this.context.organizationId, swapId);
    this.context.requireBranchAccess(swap.branch_id);
    if (swap.status !== 'accepted') {
      throw new ValidationError(`Cannot approve a swap request in status "${swap.status}"`);
    }
    if (!swap.target_employee_id) {
      throw new ValidationError('Swap request has no accepting employee to reassign to');
    }

    const existingAttendance = await this.attendanceRecords.findByShiftAssignment(this.context.organizationId, swap.shift_assignment_id);
    if (existingAttendance && existingAttendance.attendance_status !== 'scheduled') {
      throw new ValidationError('Cannot approve this swap: attendance has already been recorded against this shift assignment');
    }

    const organizationId = this.context.organizationId;
    const decisionBy = this.context.userId;
    const targetEmployeeId = swap.target_employee_id;

    const result = await this.context.client.transaction(async (trxClient) => {
      const trxAssignments = new ShiftAssignmentRepository(trxClient);
      const trxSwaps = new ShiftSwapRequestRepository(trxClient);

      await trxAssignments.patch(organizationId, swap.shift_assignment_id, {
        employee_id: targetEmployeeId
      } as Partial<{ employee_id: string }>);

      return trxSwaps.patch(organizationId, swapId, {
        status: 'approved',
        decision_by: decisionBy,
        decision_at: new Date().toISOString(),
        decision_notes: decisionNotes ?? null
      } as Partial<ShiftSwapRequest>);
    });

    await this.context.audit('approve_shift_swap', 'shift_swap_request', swapId, swap, result);
    await this.notifyRequester(swap, 'approved');
    return result;
  }

  async rejectSwap(swapId: string, decisionNotes?: string | null): Promise<ShiftSwapRequest> {
    assertUuid(swapId, 'swapId');
    await this.context.requirePermission('swaps.approve');

    const swap = await this.swaps.getByIdOrThrow(this.context.organizationId, swapId);
    this.context.requireBranchAccess(swap.branch_id);
    if (swap.status !== 'accepted') {
      throw new ValidationError(`Cannot reject a swap request in status "${swap.status}"`);
    }

    const rejected = await this.swaps.patch(this.context.organizationId, swapId, {
      status: 'rejected',
      decision_by: this.context.userId,
      decision_at: new Date().toISOString(),
      decision_notes: decisionNotes ?? null
    } as Partial<ShiftSwapRequest>);
    await this.notifyRequester(swap, 'rejected');
    return rejected;
  }

  async getSwap(swapId: string): Promise<ShiftSwapRequest> {
    assertUuid(swapId, 'swapId');
    await this.context.requirePermission('swaps.read');
    const swap = await this.swaps.getByIdOrThrow(this.context.organizationId, swapId);
    this.context.requireBranchAccess(swap.branch_id);
    return swap;
  }

  /** Every swap the caller requested or was targeted by (both directions of "involving me"). */
  async listMySwaps(): Promise<ShiftSwapRequest[]> {
    await this.context.requirePermission('swaps.read');
    const me = await this.resolveMyEmployee();
    if (!me) {
      return [];
    }
    return this.swaps.listForEmployee(this.context.organizationId, me.id);
  }

  /** Open (unclaimed) swap requests across every branch the caller can access — the pool an employee could claim from. */
  async listOpenSwaps(): Promise<ShiftSwapRequest[]> {
    await this.context.requirePermission('swaps.read');
    const branchIds = this.context.resolveBranchScope();
    return this.swaps.listOpenForBranches(this.context.organizationId, branchIds);
  }

  /** Every swap awaiting approval in a branch — the supervisor queue. */
  async listPendingApprovals(requestedBranchId?: string): Promise<ShiftSwapRequest[]> {
    await this.context.requirePermission('swaps.approve');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    const all = await this.swaps.listByBranches(this.context.organizationId, branchIds, { filters: { status: 'accepted' } });
    return all;
  }

  private async notifyRequester(swap: ShiftSwapRequest, outcome: 'accepted' | 'declined' | 'approved' | 'rejected'): Promise<void> {
    const requester = await this.employees.getByIdOrThrow(this.context.organizationId, swap.requested_by_employee_id).catch(() => null);
    if (!requester?.email) {
      return;
    }
    const requesterUser = await this.users.findByEmail(requester.email).catch(() => null);
    if (!requesterUser) {
      return;
    }
    const titles: Record<typeof outcome, string> = {
      accepted: 'Shift swap accepted',
      declined: 'Shift swap declined',
      approved: 'Shift swap approved',
      rejected: 'Shift swap rejected'
    };
    const bodies: Record<typeof outcome, string> = {
      accepted: 'A coworker accepted your shift swap request. It now awaits supervisor approval.',
      declined: 'A coworker declined your shift swap request.',
      approved: 'Your shift swap request was approved and the shift has been reassigned.',
      rejected: 'Your shift swap request was reviewed and rejected.'
    };
    await notify(this.context.client, this.context.organizationId, requesterUser.id, titles[outcome], bodies[outcome]);
  }

  private async resolveMyEmployee() {
    const user = await this.users.getByIdOrThrow(this.context.userId);
    return this.employees.findByEmail(this.context.organizationId, user.email);
  }
}
