import {
  ScheduleRepository,
  ScheduleVersionRepository,
  ShiftRepository,
  ShiftAssignmentRepository,
  EmployeeRepository,
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

  constructor(private readonly context: ApplicationContext) {
    this.schedules = new ScheduleRepository(context.client);
    this.versions = new ScheduleVersionRepository(context.client);
    this.shifts = new ShiftRepository(context.client);
    this.assignments = new ShiftAssignmentRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
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
