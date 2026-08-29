import {
  LeaveRequestRepository,
  EmployeeRepository,
  UserRepository,
  type LeaveRequest,
  type LeaveType
} from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid, assertOneOf, assertValidDateRange } from '../validation.js';
import { notify } from '../notifications/notificationService.js';

const LEAVE_TYPES: readonly LeaveType[] = ['annual_leave', 'sick_leave', 'emergency_leave', 'unpaid_leave'];

/**
 * `start_date`/`end_date` are typed `string` (LeaveRequestRepository's own
 * interface) but `pg` actually returns a `date` column as a native `Date`
 * object at the driver level — a template literal would otherwise call its
 * default `Date.toString()` ("Thu Jul 01 2027 00:00:00 GMT+0100 (West
 * Africa Standard Time)") into these user-facing notification messages.
 * JSON responses elsewhere already coerce this correctly via
 * `Date.prototype.toJSON`, so this only needs handling here.
 */
function formatLeaveDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export interface CreateLeaveRequestInput {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

/**
 * Leave request service (backend completion pass). leave_requests (008,
 * hardened 018) had a full repository layer and a real status-transition
 * trigger — pending -> approved/rejected/cancelled, then terminal — but no
 * service or API ever wrote to it. This wires the request/approve/reject/
 * cancel lifecycle onto that existing schema, respecting the trigger's own
 * rules rather than re-deriving them (e.g. an approved request cannot be
 * cancelled — the trigger treats 'approved' as terminal — so cancelLeaveRequest
 * only ever operates on a still-pending request).
 */
export class LeaveRequestService {
  private readonly leaveRequests: LeaveRequestRepository;
  private readonly employees: EmployeeRepository;
  private readonly users: UserRepository;

  constructor(private readonly context: ApplicationContext) {
    this.leaveRequests = new LeaveRequestRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
    this.users = new UserRepository(context.client);
  }

  async createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    assertUuid(input.employeeId, 'employeeId');
    await this.context.requirePermission('leave.create');
    assertOneOf(input.leaveType, LEAVE_TYPES, 'leaveType');
    assertNonEmptyString(input.reason, 'reason');
    assertValidDateRange(input.startDate, input.endDate, 'leave request date range');

    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, input.employeeId);
    this.context.requireBranchAccess(employee.branch_id);

    // total_days is a GENERATED ALWAYS STORED column ((end_date - start_date) + 1,
    // migration 008) — Postgres rejects an explicit value for it, so it is
    // deliberately not part of this insert payload.
    return this.leaveRequests.insert(this.context.organizationId, {
      branch_id: employee.branch_id,
      employee_id: employee.id,
      requested_by: this.context.userId,
      leave_type: input.leaveType,
      status: 'pending',
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason.trim(),
      created_by: this.context.userId
    } as Partial<LeaveRequest>);
  }

  async approveLeaveRequest(leaveRequestId: string): Promise<LeaveRequest> {
    assertUuid(leaveRequestId, 'leaveRequestId');
    await this.context.requirePermission('leave.approve');

    const before = await this.getScoped(leaveRequestId);
    if (before.status !== 'pending') {
      throw new ValidationError(`Cannot approve a leave request in status "${before.status}"`);
    }
    const updated = await this.leaveRequests.approve(this.context.organizationId, leaveRequestId, this.context.userId);
    await notify(
      this.context.client,
      this.context.organizationId,
      before.requested_by,
      'Leave request approved',
      `Your ${before.leave_type.replace('_', ' ')} request for ${formatLeaveDate(before.start_date)} to ${formatLeaveDate(before.end_date)} was approved.`
    );
    await this.context.audit('approve_leave_request', 'leave_request', leaveRequestId, before, updated);
    return updated;
  }

  async rejectLeaveRequest(leaveRequestId: string, managerNotes: string): Promise<LeaveRequest> {
    assertUuid(leaveRequestId, 'leaveRequestId');
    assertNonEmptyString(managerNotes, 'managerNotes');
    await this.context.requirePermission('leave.approve');

    const before = await this.getScoped(leaveRequestId);
    if (before.status !== 'pending') {
      throw new ValidationError(`Cannot reject a leave request in status "${before.status}"`);
    }
    const updated = await this.leaveRequests.reject(this.context.organizationId, leaveRequestId, this.context.userId, managerNotes.trim());
    await notify(
      this.context.client,
      this.context.organizationId,
      before.requested_by,
      'Leave request rejected',
      `Your ${before.leave_type.replace('_', ' ')} request for ${formatLeaveDate(before.start_date)} to ${formatLeaveDate(before.end_date)} was rejected: ${managerNotes.trim()}`,
      'high'
    );
    await this.context.audit('reject_leave_request', 'leave_request', leaveRequestId, before, updated);
    return updated;
  }

  async cancelLeaveRequest(leaveRequestId: string, reason: string): Promise<LeaveRequest> {
    assertUuid(leaveRequestId, 'leaveRequestId');
    assertNonEmptyString(reason, 'reason');
    await this.context.requirePermission('leave.cancel');

    const before = await this.getScoped(leaveRequestId);
    // trg_leave_requests_validate treats 'approved'/'rejected'/'cancelled' as
    // terminal — only a still-pending request can transition to 'cancelled'.
    if (before.status !== 'pending') {
      throw new ValidationError(`Cannot cancel a leave request in status "${before.status}": it has already been decided`);
    }

    const canApprove = await this.context.hasPermission('leave.approve');
    if (!canApprove && before.requested_by !== this.context.userId) {
      throw new ValidationError('You can only cancel your own leave request');
    }

    return this.leaveRequests.cancel(this.context.organizationId, leaveRequestId, this.context.userId, reason.trim());
  }

  async getLeaveRequest(leaveRequestId: string): Promise<LeaveRequest> {
    assertUuid(leaveRequestId, 'leaveRequestId');
    await this.context.requirePermission('leave.read');
    return this.getScoped(leaveRequestId);
  }

  async listForEmployee(employeeId: string, options?: { limit?: number; offset?: number }): Promise<LeaveRequest[]> {
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('leave.read');
    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    this.context.requireBranchAccess(employee.branch_id);
    return this.leaveRequests.findByEmployee(this.context.organizationId, employeeId, options);
  }

  /** My own leave request history, resolved the same self-service way as attendance/announcements (email match to an employee record). */
  async listMine(options?: { limit?: number; offset?: number }): Promise<LeaveRequest[]> {
    await this.context.requirePermission('leave.read');
    const user = await this.users.getByIdOrThrow(this.context.userId);
    const employee = await this.employees.findByEmail(this.context.organizationId, user.email);
    if (!employee) {
      return [];
    }
    return this.leaveRequests.findByEmployee(this.context.organizationId, employee.id, options);
  }

  async listPending(requestedBranchId?: string, options?: { limit?: number; offset?: number }): Promise<LeaveRequest[]> {
    await this.context.requirePermission('leave.approve');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.leaveRequests.findPending(this.context.organizationId, branchIds, options);
  }

  private async getScoped(leaveRequestId: string): Promise<LeaveRequest> {
    const record = await this.leaveRequests.getByIdOrThrow(this.context.organizationId, leaveRequestId);
    this.context.requireBranchAccess(record.branch_id);
    return record;
  }
}
