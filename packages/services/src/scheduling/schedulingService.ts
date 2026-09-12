import {
  ScheduleRepository,
  ScheduleVersionRepository,
  ShiftRepository,
  ShiftAssignmentRepository,
  ShiftTemplateRepository,
  EmployeeRepository,
  UserRepository,
  publishScheduleWithVersion,
  type Schedule,
  type ScheduleVersion,
  type Shift,
  type ShiftAssignment,
  type AssignmentStatus,
  type PublishScheduleResult
} from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid, assertValidDateRange, assertOneOf } from '../validation.js';
import { computeDuration, isDateWithinRange } from './time.js';

const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = ['assigned', 'confirmed', 'declined', 'completed', 'cancelled'];

export interface CreateScheduleInput {
  branchId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateScheduleInput {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateShiftInput {
  templateId?: string | null;
  title: string;
  description?: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  crossesMidnight?: boolean;
  breakMinutes?: number;
}

export interface UpdateShiftInput {
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  breakMinutes?: number;
}

export interface AssignShiftToEmployeeInput {
  templateId?: string | null;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  breakMinutes?: number;
  notes?: string | null;
}

export interface UpdateAssignedShiftInput {
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  breakMinutes?: number;
  notes?: string | null;
}

export interface ScheduleConflict {
  employeeId: string;
  date: string;
  kind: 'double_booking' | 'long_shift';
  detail: string;
}

const LONG_SHIFT_HOURS_THRESHOLD = 10;

/**
 * A shift's occupied window as minutes from midnight of its shift_date,
 * extending past 1440 when it crosses midnight — the same normalization
 * computeDuration() (./time.ts) applies when measuring a crossing shift's
 * length.
 */
function shiftTimeRangeMinutes(shift: Shift): { start: number; end: number } {
  const [startHours, startMinutes] = shift.start_time.split(':').map(Number);
  const [endHours, endMinutes] = shift.end_time.split(':').map(Number);
  const start = startHours * 60 + startMinutes;
  let end = endHours * 60 + endMinutes;
  if (shift.crosses_midnight) end += 24 * 60;
  return { start, end };
}

/** True when two shifts on the same date actually overlap in time (touching endpoints don't count). */
function shiftsOverlap(a: Shift, b: Shift): boolean {
  const rangeA = shiftTimeRangeMinutes(a);
  const rangeB = shiftTimeRangeMinutes(b);
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

/**
 * Schedule -> Schedule Version -> Shifts -> Shift Assignments (see
 * docs/backend/API-012-SCHEDULING-WORKFLOW.md).
 *
 * Important schema characteristic this service works around rather than
 * changing: `shifts` has no `schedule_id` foreign key. A shift "belongs to"
 * a schedule by (branch_id match + shift_date within
 * [schedule.start_date, schedule.end_date]) — reliable here specifically
 * because uq_schedules_branch_active_dates guarantees at most one
 * (non-deleted) schedule can cover a given branch+date-range at a time. This
 * is a deliberate inference, not a workaround for a bug — see the doc for
 * the full rationale and when it would need revisiting.
 *
 * Also deliberate: `schedules.status` only supports draft/published/archived
 * at the database level (schedules_status_check), not the fuller
 * Draft/Ready/Published/Active/Completed/Archived/Cancelled lifecycle
 * SCH-002 documents. This service implements the 3-state subset the schema
 * actually enforces and flags the gap rather than pretending app-level-only
 * states exist.
 */
export class SchedulingService {
  private readonly schedules: ScheduleRepository;
  private readonly versions: ScheduleVersionRepository;
  private readonly shifts: ShiftRepository;
  private readonly assignments: ShiftAssignmentRepository;
  private readonly employees: EmployeeRepository;
  private readonly users: UserRepository;
  private readonly templates: ShiftTemplateRepository;

  constructor(private readonly context: ApplicationContext) {
    this.schedules = new ScheduleRepository(context.client);
    this.versions = new ScheduleVersionRepository(context.client);
    this.shifts = new ShiftRepository(context.client);
    this.assignments = new ShiftAssignmentRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
    this.users = new UserRepository(context.client);
    this.templates = new ShiftTemplateRepository(context.client);
  }

  /** Resolves "me" the same way attendance/announcements self-service does — email match to an employee record, never a client-supplied employeeId. */
  private async resolveMyEmployee() {
    const user = await this.users.getByIdOrThrow(this.context.userId);
    return this.employees.findByEmail(this.context.organizationId, user.email);
  }

  // ==================== Schedules ====================

  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    await this.context.requirePermission('schedules.create');
    assertUuid(input.branchId, 'branchId');
    this.context.requireBranchAccess(input.branchId);
    assertNonEmptyString(input.name, 'name');
    assertValidDateRange(input.startDate, input.endDate, 'schedule period');

    const existing = await this.schedules.findExact(this.context.organizationId, input.branchId, input.startDate, input.endDate);
    if (existing) {
      throw new ValidationError('A schedule already exists for this branch and period', ['branch/period combination must be unique']);
    }

    return this.schedules.insert(this.context.organizationId, {
      branch_id: input.branchId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'draft'
    } as Partial<Schedule>);
  }

  async getSchedule(scheduleId: string): Promise<Schedule> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return schedule;
  }

  async updateSchedule(scheduleId: string, input: UpdateScheduleInput): Promise<Schedule> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.update');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule', ['archived schedules are read-only']);
    }

    const nextStart = input.startDate ?? schedule.start_date;
    const nextEnd = input.endDate ?? schedule.end_date;
    if (input.startDate !== undefined || input.endDate !== undefined) {
      assertValidDateRange(nextStart, nextEnd, 'schedule period');
    }
    if (input.name !== undefined) {
      assertNonEmptyString(input.name, 'name');
    }

    const changes: Partial<Schedule> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.startDate !== undefined) changes.start_date = input.startDate;
    if (input.endDate !== undefined) changes.end_date = input.endDate;
    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    return this.schedules.patch(this.context.organizationId, scheduleId, changes);
  }

  /**
   * Sets status = 'archived' rather than soft-deleting (ScheduleRepository.archive()):
   * schedules.status already has 'archived' as a valid enum value that the rest of
   * this service checks against (e.g. updateSchedule/createShift/publishSchedule
   * rejecting further writes), and those checks require the row to still be
   * fetchable afterward. Soft-deleting would hide the row from getByIdOrThrow via
   * deleted_at, making those checks unreachable and silently destroying
   * publish/version history from listings — the opposite of "preserve history".
   */
  async archiveSchedule(scheduleId: string): Promise<Schedule> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.archive');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return this.schedules.patch(this.context.organizationId, scheduleId, { status: 'archived' } as Partial<Schedule>);
  }

  async listSchedules(requestedBranchId?: string, options?: { limit?: number; offset?: number }): Promise<Schedule[]> {
    await this.context.requirePermission('schedules.read');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.schedules.listByBranches(this.context.organizationId, branchIds, options);
  }

  // ==================== Schedule versions ====================

  async listScheduleVersions(scheduleId: string): Promise<ScheduleVersion[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return this.versions.listForSchedule(this.context.organizationId, scheduleId);
  }

  async getLatestScheduleVersion(scheduleId: string): Promise<ScheduleVersion | null> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return this.versions.latestForSchedule(this.context.organizationId, scheduleId);
  }

  // ==================== Shifts ====================

  async createShift(scheduleId: string, input: CreateShiftInput): Promise<Shift> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('shifts.create');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot add shifts to an archived schedule');
    }
    assertNonEmptyString(input.title, 'title');
    if (!isDateWithinRange(input.shiftDate, schedule.start_date, schedule.end_date)) {
      throw new ValidationError('shiftDate must fall within the schedule period', [
        `shiftDate must be between ${schedule.start_date} and ${schedule.end_date}`
      ]);
    }

    const crossesMidnight = input.crossesMidnight ?? false;
    const duration = computeDuration(input.startTime, input.endTime, crossesMidnight);

    return this.shifts.insert(this.context.organizationId, {
      branch_id: schedule.branch_id,
      template_id: input.templateId ?? null,
      title: input.title,
      description: input.description ?? null,
      shift_date: input.shiftDate,
      start_time: input.startTime,
      end_time: input.endTime,
      duration,
      crosses_midnight: crossesMidnight,
      break_minutes: input.breakMinutes ?? 0,
      status: 'draft'
    } as Partial<Shift>);
  }

  async getShift(shiftId: string): Promise<Shift> {
    assertUuid(shiftId, 'shiftId');
    await this.context.requirePermission('shifts.read');
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);
    return shift;
  }

  async updateShift(shiftId: string, input: UpdateShiftInput): Promise<Shift> {
    assertUuid(shiftId, 'shiftId');
    await this.context.requirePermission('shifts.update');
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);

    if (shift.status === 'cancelled' || shift.status === 'completed' || shift.status === 'archived') {
      throw new ValidationError(`Cannot edit a shift in status "${shift.status}"`);
    }
    if (input.title !== undefined) {
      assertNonEmptyString(input.title, 'title');
    }

    const changes: Partial<Shift> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.description !== undefined) changes.description = input.description;
    if (input.breakMinutes !== undefined) changes.break_minutes = input.breakMinutes;

    if (input.startTime !== undefined || input.endTime !== undefined || input.crossesMidnight !== undefined) {
      const startTime = input.startTime ?? shift.start_time;
      const endTime = input.endTime ?? shift.end_time;
      const crossesMidnight = input.crossesMidnight ?? shift.crosses_midnight;
      changes.start_time = startTime;
      changes.end_time = endTime;
      changes.crosses_midnight = crossesMidnight;
      changes.duration = computeDuration(startTime, endTime, crossesMidnight);
    }

    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    return this.shifts.patch(this.context.organizationId, shiftId, changes);
  }

  async cancelShift(shiftId: string): Promise<Shift> {
    assertUuid(shiftId, 'shiftId');
    await this.context.requirePermission('shifts.update');
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);
    return this.shifts.patch(this.context.organizationId, shiftId, { status: 'cancelled' } as Partial<Shift>);
  }

  /** Sets status = 'archived' rather than soft-deleting — see archiveSchedule's comment for why. */
  async archiveShift(shiftId: string): Promise<Shift> {
    assertUuid(shiftId, 'shiftId');
    await this.context.requirePermission('shifts.archive');
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);
    return this.shifts.patch(this.context.organizationId, shiftId, { status: 'archived' } as Partial<Shift>);
  }

  /** See the class-level doc comment: shifts are matched to a schedule by branch + date range, not a foreign key. */
  async listShiftsForSchedule(scheduleId: string): Promise<Shift[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('shifts.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return this.shifts.findByBranchAndDateRange(this.context.organizationId, schedule.branch_id, schedule.start_date, schedule.end_date);
  }

  /**
   * Same shifts as listShiftsForSchedule(), narrowed to the ones `employeeId`
   * is actively assigned to — batching the assignment lookup across every
   * shift in a single query (ShiftAssignmentRepository.listForShifts, which
   * already existed for exactly this shape) instead of one query per shift.
   * Replaces the N+1 composition the mobile "my schedule" screen previously
   * had to do client-side across two separate RPC calls.
   */
  async listShiftsForEmployeeInSchedule(scheduleId: string, employeeId: string): Promise<Shift[]> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('shifts.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const shifts = await this.shifts.findByBranchAndDateRange(this.context.organizationId, schedule.branch_id, schedule.start_date, schedule.end_date);
    if (shifts.length === 0) return [];

    const assignments = await this.assignments.listForShifts(this.context.organizationId, shifts.map((shift) => shift.id));
    const assignedShiftIds = new Set(
      assignments
        .filter((a) => a.employee_id === employeeId && a.assignment_status !== 'cancelled' && a.assignment_status !== 'declined')
        .map((a) => a.shift_id)
    );
    return shifts.filter((shift) => assignedShiftIds.has(shift.id));
  }

  /**
   * The shift_assignment rows behind listShiftsForEmployeeInSchedule()'s
   * shifts — that method computes exactly this via the same
   * listForShifts() batch query, then discards the assignment ids and
   * returns only the shifts. A caller that needs to act on a specific
   * shift (request_shift_swap, clock_in — both key off shift_assignment_id,
   * not shift_id) had no batched way to get them; the alternative is one
   * list_assignments_for_shift call per shift, exactly the N+1 this
   * method's sibling was already written to avoid.
   *
   * Unlike that sibling (a Manager/Supervisor coverage-lookup method that
   * intentionally takes an arbitrary employeeId), this one is caller-scoped
   * only — the name promises "my" assignments, so it resolves the caller's
   * own employee record server-side rather than trusting a client-supplied
   * employeeId, which would otherwise let any authenticated member with
   * shifts.read enumerate another employee's shift_assignment ids.
   */
  async listMyShiftAssignmentsInSchedule(scheduleId: string): Promise<ShiftAssignment[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('shifts.read');
    const employee = await this.resolveMyEmployee();
    if (!employee) {
      return [];
    }
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const shifts = await this.shifts.findByBranchAndDateRange(this.context.organizationId, schedule.branch_id, schedule.start_date, schedule.end_date);
    if (shifts.length === 0) return [];

    const assignments = await this.assignments.listForShifts(this.context.organizationId, shifts.map((shift) => shift.id));
    return assignments.filter(
      (a) => a.employee_id === employee.id && a.assignment_status !== 'cancelled' && a.assignment_status !== 'declined'
    );
  }

  // ==================== Shift assignments ====================

  async assignEmployee(shiftId: string, employeeId: string): Promise<ShiftAssignment> {
    assertUuid(shiftId, 'shiftId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('assignments.create');

    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);

    // getByIdOrThrow scopes strictly by this.context.organizationId, so an
    // employeeId belonging to another organization throws NotFoundError here
    // — this is the cross-tenant assignment rejection.
    await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);

    const existingForShift = await this.assignments.findByShift(this.context.organizationId, shiftId);
    if (existingForShift.some((assignment) => assignment.employee_id === employeeId)) {
      throw new ValidationError('Employee is already assigned to this shift');
    }

    return this.assignments.insert(this.context.organizationId, {
      shift_id: shiftId,
      employee_id: employeeId,
      assignment_status: 'assigned',
      assigned_by: this.context.userId
    } as Partial<ShiftAssignment>);
  }

  async updateAssignmentStatus(assignmentId: string, status: AssignmentStatus): Promise<ShiftAssignment> {
    assertUuid(assignmentId, 'assignmentId');
    assertOneOf(status, ASSIGNMENT_STATUSES, 'status');
    await this.context.requirePermission('assignments.update');

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, assignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);

    const timestampField =
      status === 'confirmed' ? 'confirmed_at' :
      status === 'declined' ? 'declined_at' :
      status === 'cancelled' ? 'cancelled_at' :
      null;

    const changes: Partial<ShiftAssignment> = { assignment_status: status };
    if (timestampField) {
      (changes as Record<string, unknown>)[timestampField] = new Date().toISOString();
    }

    return this.assignments.patch(this.context.organizationId, assignmentId, changes);
  }

  async removeAssignment(assignmentId: string): Promise<ShiftAssignment> {
    assertUuid(assignmentId, 'assignmentId');
    await this.context.requirePermission('assignments.delete');

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, assignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);

    return this.assignments.archive(this.context.organizationId, assignmentId);
  }

  async listAssignmentsForShift(shiftId: string): Promise<ShiftAssignment[]> {
    assertUuid(shiftId, 'shiftId');
    await this.context.requirePermission('shifts.read');
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);
    return this.assignments.findByShift(this.context.organizationId, shiftId);
  }

  // ==================== Grid cell assignment ====================

  /**
   * One-shot version of createShift + assignEmployee for the weekly grid's
   * click-to-assign flow (docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md §3.3):
   * a single call so the modal's one "Assign Shift" button can't leave a
   * shift created with no assignment on a partial failure. Phase 1 is one
   * shift block per employee per day, so re-assigning a cell that already
   * has an active assignment replaces it (cancels the old shift first)
   * rather than stacking a second block onto the same day.
   */
  async assignShiftToEmployeeOnDate(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput
  ): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    return this.insertShiftAssignment(scheduleId, employeeId, date, input, { replaceExisting: true });
  }

  /**
   * Adds another shift to a cell without touching whatever's already there —
   * split shifts (spec §3.1). Shares every validation/insert step with
   * assignShiftToEmployeeOnDate via insertShiftAssignment; the two methods
   * differ only in replaceExisting.
   */
  async addShiftToEmployeeOnDate(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput
  ): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    return this.insertShiftAssignment(scheduleId, employeeId, date, input, { replaceExisting: false });
  }

  /**
   * Shared body for assignShiftToEmployeeOnDate (replaceExisting: true) and
   * addShiftToEmployeeOnDate (replaceExisting: false, split shifts — spec
   * §3.1). Wraps validation + the replace-then-insert or plain-insert in one
   * transaction so the modal's single button can't leave a half-created
   * shift with no assignment on a partial failure.
   */
  private async insertShiftAssignment(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput,
    options: { replaceExisting: boolean }
  ): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('shifts.create');
    await this.context.requirePermission('assignments.create');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }
    if (!isDateWithinRange(date, schedule.start_date, schedule.end_date)) {
      throw new ValidationError('date must fall within the schedule period', [
        `date must be between ${schedule.start_date} and ${schedule.end_date}`
      ]);
    }
    await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);

    let templateId: string | null = null;
    let startTime = input.startTime;
    let endTime = input.endTime;
    let crossesMidnight = input.crossesMidnight ?? false;
    let title = 'Shift';

    if (input.templateId) {
      const template = await this.templates.getByIdOrThrow(this.context.organizationId, input.templateId);
      templateId = template.id;
      startTime = template.start_time.slice(0, 5);
      endTime = template.end_time.slice(0, 5);
      crossesMidnight = template.crosses_midnight;
      title = template.name;
    }
    assertNonEmptyString(startTime, 'startTime');
    assertNonEmptyString(endTime, 'endTime');

    const duration = computeDuration(startTime, endTime, crossesMidnight);

    return this.context.client.transaction(async (trxClient) => {
      const shiftsRepo = new ShiftRepository(trxClient);
      const assignmentsRepo = new ShiftAssignmentRepository(trxClient);

      if (options.replaceExisting) {
        await this.replaceActiveAssignmentOnDate(shiftsRepo, assignmentsRepo, schedule, employeeId, date);
      }

      const shift = await shiftsRepo.insert(this.context.organizationId, {
        branch_id: schedule.branch_id,
        template_id: templateId,
        title,
        description: null,
        shift_date: date,
        start_time: startTime,
        end_time: endTime,
        duration,
        crosses_midnight: crossesMidnight,
        break_minutes: input.breakMinutes ?? 0,
        status: 'draft'
      } as Partial<Shift>);

      const assignment = await assignmentsRepo.insert(this.context.organizationId, {
        shift_id: shift.id,
        employee_id: employeeId,
        assignment_status: 'assigned',
        assigned_by: this.context.userId,
        notes: input.notes ?? null
      } as Partial<ShiftAssignment>);

      return { shift, assignment };
    });
  }

  /**
   * If `employeeId` has an active (assigned/confirmed) assignment on `date`,
   * cancels its shift and archives the assignment first. Phase 1 has one block
   * per employee per day, so this is what makes re-assigning a filled cell a
   * clean replace rather than a stack.
   *
   * Takes its repositories as parameters rather than using `this.shifts` /
   * `this.assignments` so the caller can hand it transaction-scoped instances —
   * those fields are bound to the outer, non-transactional client.
   */
  private async replaceActiveAssignmentOnDate(
    shiftsRepo: ShiftRepository,
    assignmentsRepo: ShiftAssignmentRepository,
    schedule: Schedule,
    employeeId: string,
    date: string
  ): Promise<void> {
    const dayShifts = await shiftsRepo.findByBranchAndDateRange(this.context.organizationId, schedule.branch_id, date, date);
    if (dayShifts.length === 0) return;

    const assignments = await assignmentsRepo.listForShifts(this.context.organizationId, dayShifts.map((s) => s.id));
    const existing = assignments.find(
      (a) => a.employee_id === employeeId && (a.assignment_status === 'assigned' || a.assignment_status === 'confirmed')
    );
    if (!existing) return;

    await assignmentsRepo.archive(this.context.organizationId, existing.id);
    const remaining = await assignmentsRepo.findByShift(this.context.organizationId, existing.shift_id);
    if (remaining.length === 0) {
      await shiftsRepo.cancel(this.context.organizationId, existing.shift_id);
    }
  }

  async updateAssignedShiftOnDate(assignmentId: string, input: UpdateAssignedShiftInput): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    assertUuid(assignmentId, 'assignmentId');
    await this.context.requirePermission('shifts.update');

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, assignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);
    // Shifts have no schedule_id FK (see the class doc), so the owning
    // schedule is resolved by branch + covering date range. A null result
    // (no schedule covers this date — an edge case, not the common path)
    // leaves the edit alone rather than blocking it.
    const coveringSchedule = await this.schedules.findCoveringDate(this.context.organizationId, shift.branch_id, shift.shift_date);
    if (coveringSchedule?.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }

    let updatedShift = shift;
    if (input.startTime !== undefined || input.endTime !== undefined || input.crossesMidnight !== undefined || input.breakMinutes !== undefined) {
      updatedShift = await this.updateShift(shift.id, {
        startTime: input.startTime,
        endTime: input.endTime,
        crossesMidnight: input.crossesMidnight,
        breakMinutes: input.breakMinutes
      });
    }

    let updatedAssignment = assignment;
    if (input.notes !== undefined) {
      updatedAssignment = await this.assignments.patch(this.context.organizationId, assignmentId, {
        notes: input.notes
      } as Partial<ShiftAssignment>);
    }

    return { shift: updatedShift, assignment: updatedAssignment };
  }

  /** Removing the cell's only assignment also cancels the now-orphaned shift, so it doesn't linger as dangling data (spec §3.3/§6). */
  async removeAssignedShiftOnDate(assignmentId: string): Promise<{ assignment: ShiftAssignment; shiftCancelled: boolean }> {
    assertUuid(assignmentId, 'assignmentId');
    await this.context.requirePermission('assignments.delete');

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, assignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);
    // See updateAssignedShiftOnDate: the owning schedule is inferred by
    // branch + covering date range, and a null result doesn't block the edit.
    const coveringSchedule = await this.schedules.findCoveringDate(this.context.organizationId, shift.branch_id, shift.shift_date);
    if (coveringSchedule?.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }

    const archived = await this.assignments.archive(this.context.organizationId, assignmentId);
    const remaining = await this.assignments.findByShift(this.context.organizationId, shift.id);
    let shiftCancelled = false;
    if (remaining.length === 0) {
      await this.shifts.cancel(this.context.organizationId, shift.id);
      shiftCancelled = true;
    }

    return { assignment: archived, shiftCancelled };
  }

  /** All active+inactive assignments across every shift in the schedule's date range, in one call — what the weekly grid needs to build its employee×day cells (list_assignments_for_shift is per-shift only). */
  async listAssignmentsForSchedule(scheduleId: string): Promise<ShiftAssignment[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('shifts.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const shifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      schedule.branch_id,
      schedule.start_date,
      schedule.end_date
    );
    if (shifts.length === 0) return [];
    return this.assignments.listForShifts(this.context.organizationId, shifts.map((shift) => shift.id));
  }

  /**
   * Computed on read, nothing stored — SCH-012 §2.3 "validation does not
   * modify data". Detects two conditions: an employee double-booked across
   * overlapping active assignments on the same date, and any single shift
   * exceeding the 10-hour rule. Not wired into publishSchedule's validation
   * (spec §3.4) — conflicts are advisory in Phase 1, matching publish's
   * existing "at least one shift" - only check.
   */
  async getScheduleConflicts(scheduleId: string): Promise<ScheduleConflict[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const shifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      schedule.branch_id,
      schedule.start_date,
      schedule.end_date
    );
    if (shifts.length === 0) return [];

    const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
    const assignments = await this.assignments.listForShifts(this.context.organizationId, shifts.map((shift) => shift.id));

    const conflicts: ScheduleConflict[] = [];
    const shiftsByEmployeeDate = new Map<string, Shift[]>();

    for (const assignment of assignments) {
      if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
      const shift = shiftsById.get(assignment.shift_id);
      if (!shift) continue;

      const key = `${assignment.employee_id}:${shift.shift_date}`;
      const list = shiftsByEmployeeDate.get(key) ?? [];
      list.push(shift);
      shiftsByEmployeeDate.set(key, list);

      const [hoursPart, minutesPart] = shift.duration.split(':').map(Number);
      const totalHours = hoursPart + minutesPart / 60;
      if (totalHours > LONG_SHIFT_HOURS_THRESHOLD) {
        conflicts.push({
          employeeId: assignment.employee_id,
          date: shift.shift_date,
          kind: 'long_shift',
          detail: `${shift.title} is ${hoursPart}h${minutesPart > 0 ? ` ${minutesPart}m` : ''} — over the 10-hour rule`
        });
      }
    }

    for (const [key, dayShifts] of shiftsByEmployeeDate) {
      if (dayShifts.length < 2) continue;
      // Two shifts on one date is only a double-booking if they actually
      // overlap — a split shift (09:00-13:00 + 14:00-18:00) is legal.
      let hasOverlap = false;
      for (let i = 0; i < dayShifts.length && !hasOverlap; i += 1) {
        for (let j = i + 1; j < dayShifts.length; j += 1) {
          if (shiftsOverlap(dayShifts[i], dayShifts[j])) {
            hasOverlap = true;
            break;
          }
        }
      }
      if (!hasOverlap) continue;
      const [employeeId, date] = key.split(':');
      conflicts.push({
        employeeId,
        date,
        kind: 'double_booking',
        detail: `Double-booked across ${dayShifts.length} shifts on ${date}`
      });
    }

    return conflicts;
  }

  /** Powers the grid's ‹ › week-navigator (spec §3.2) — never auto-creates a schedule for an empty adjacent week, just reports there isn't one. */
  async findAdjacentSchedule(scheduleId: string, direction: 'prev' | 'next'): Promise<Schedule | null> {
    assertUuid(scheduleId, 'scheduleId');
    assertOneOf(direction, ['prev', 'next'], 'direction');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return this.schedules.findAdjacent(this.context.organizationId, schedule.branch_id, schedule.start_date, direction);
  }

  /**
   * "Copy last week" (spec §3.3): for every active assignment in the source
   * schedule's date range, creates an equivalent shift+assignment in the
   * target schedule at the same day-of-week offset. Notes are deliberately
   * not copied — a fresh week shouldn't inherit last week's handover notes.
   * One transaction: a partial failure must not leave a half-copied week.
   */
  async duplicateScheduleShifts(sourceScheduleId: string, targetScheduleId: string): Promise<{ copiedCount: number }> {
    assertUuid(sourceScheduleId, 'sourceScheduleId');
    assertUuid(targetScheduleId, 'targetScheduleId');
    await this.context.requirePermission('shifts.create');
    await this.context.requirePermission('assignments.create');

    const source = await this.schedules.getByIdOrThrow(this.context.organizationId, sourceScheduleId);
    const target = await this.schedules.getByIdOrThrow(this.context.organizationId, targetScheduleId);
    this.context.requireBranchAccess(source.branch_id);
    this.context.requireBranchAccess(target.branch_id);
    if (target.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }

    const sourceShifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      source.branch_id,
      source.start_date,
      source.end_date
    );
    if (sourceShifts.length === 0) {
      return { copiedCount: 0 };
    }

    const sourceAssignments = await this.assignments.listForShifts(this.context.organizationId, sourceShifts.map((s) => s.id));
    const shiftsById = new Map(sourceShifts.map((s) => [s.id, s]));
    const activeAssignments = sourceAssignments.filter(
      (a) => a.assignment_status !== 'cancelled' && a.assignment_status !== 'declined'
    );

    const sourceStart = new Date(`${source.start_date}T00:00:00Z`);
    const targetStart = new Date(`${target.start_date}T00:00:00Z`);

    return this.context.client.transaction(async (trxClient) => {
      const shiftsRepo = new ShiftRepository(trxClient);
      const assignmentsRepo = new ShiftAssignmentRepository(trxClient);
      let copiedCount = 0;

      for (const assignment of activeAssignments) {
        const sourceShift = shiftsById.get(assignment.shift_id);
        if (!sourceShift) continue;

        const sourceDate = new Date(`${sourceShift.shift_date}T00:00:00Z`);
        const dayOffset = Math.round((sourceDate.getTime() - sourceStart.getTime()) / (24 * 60 * 60 * 1000));
        const targetDate = new Date(targetStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const targetDateString = targetDate.toISOString().slice(0, 10);

        const newShift = await shiftsRepo.insert(this.context.organizationId, {
          branch_id: target.branch_id,
          template_id: sourceShift.template_id,
          title: sourceShift.title,
          description: null,
          shift_date: targetDateString,
          start_time: sourceShift.start_time,
          end_time: sourceShift.end_time,
          duration: sourceShift.duration,
          crosses_midnight: sourceShift.crosses_midnight,
          break_minutes: sourceShift.break_minutes,
          status: 'draft'
        } as Partial<Shift>);

        await assignmentsRepo.insert(this.context.organizationId, {
          shift_id: newShift.id,
          employee_id: assignment.employee_id,
          assignment_status: 'assigned',
          assigned_by: this.context.userId,
          notes: null
        } as Partial<ShiftAssignment>);

        copiedCount += 1;
      }

      return { copiedCount };
    });
  }

  // ==================== Publishing ====================

  /**
   * Validates, then delegates to the Milestone 3 publishScheduleWithVersion()
   * transaction (schedule status update + new schedule_versions row, atomic)
   * rather than reimplementing that logic. See SCH-007 §4/§10.
   */
  async publishSchedule(scheduleId: string, changesSummary?: string): Promise<PublishScheduleResult> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.publish');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot publish an archived schedule');
    }

    const existingShifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      schedule.branch_id,
      schedule.start_date,
      schedule.end_date
    );
    if (existingShifts.length === 0) {
      throw new ValidationError('Cannot publish a schedule with no shifts', ['at least one shift is required before publishing']);
    }

    // "Only one published schedule per branch and period" (SCH-007 §2.3) is
    // already enforced at the database level by uq_schedules_branch_active_dates
    // — that index applies to any non-deleted schedule for the branch+range,
    // which is a stricter guarantee than SCH-007 asks for, so no additional
    // check is needed here.

    return publishScheduleWithVersion(
      this.context.client,
      this.context.organizationId,
      scheduleId,
      this.context.userId,
      changesSummary ?? null
    );
  }
}
