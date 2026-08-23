import {
  AttendanceRecordRepository,
  AttendanceCorrectionRepository,
  ShiftAssignmentRepository,
  ShiftRepository,
  EmployeeRepository,
  UserRepository,
  type AttendanceRecord,
  type AttendanceStatus
} from '@shiftos/repositories';
import { ValidationError, AuthorizationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid } from '../validation.js';

/**
 * Attendance service (backend completion pass). attendance_records/
 * attendance_corrections (011, 016) had a full repository layer, a real
 * validation trigger, and zero rows anywhere in the live database — no
 * service ever wrote to them. This wires clock in/out (self-service) and
 * supervisor-side status corrections onto that existing schema, without
 * adding any new tables.
 *
 * There is no "create attendance record" API of its own: a record is
 * created lazily, in 'scheduled' status, the first time anyone touches a
 * given shift assignment (clock-in or a manual status change) — the schema
 * has no trigger that auto-creates one when an assignment is made, and
 * adding that as a side effect of assignEmployee() (schedulingService,
 * outside this domain's files) is a larger, separate change this pass
 * leaves alone rather than reaching into another service's flow.
 */
export class AttendanceService {
  private readonly records: AttendanceRecordRepository;
  private readonly corrections: AttendanceCorrectionRepository;
  private readonly assignments: ShiftAssignmentRepository;
  private readonly shifts: ShiftRepository;
  private readonly employees: EmployeeRepository;
  private readonly users: UserRepository;

  constructor(private readonly context: ApplicationContext) {
    this.records = new AttendanceRecordRepository(context.client);
    this.corrections = new AttendanceCorrectionRepository(context.client);
    this.assignments = new ShiftAssignmentRepository(context.client);
    this.shifts = new ShiftRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
    this.users = new UserRepository(context.client);
  }

  async clockIn(shiftAssignmentId: string): Promise<AttendanceRecord> {
    assertUuid(shiftAssignmentId, 'shiftAssignmentId');
    await this.context.requirePermission('attendance.clockin');

    const record = await this.resolveSelfRecord(shiftAssignmentId);
    if (record.attendance_status !== 'scheduled') {
      throw new ValidationError(`Cannot clock in: attendance is already "${record.attendance_status}"`);
    }
    return this.records.clockIn(this.context.organizationId, record.id, this.context.userId);
  }

  async clockOut(shiftAssignmentId: string): Promise<AttendanceRecord> {
    assertUuid(shiftAssignmentId, 'shiftAssignmentId');
    await this.context.requirePermission('attendance.clockin');

    const record = await this.resolveSelfRecord(shiftAssignmentId);
    if (record.attendance_status !== 'present' && record.attendance_status !== 'late') {
      throw new ValidationError(`Cannot clock out: attendance is currently "${record.attendance_status}"`);
    }
    return this.records.clockOut(this.context.organizationId, record.id, this.context.userId);
  }

  async markAbsent(shiftAssignmentId: string, noShow: boolean, notes?: string | null): Promise<AttendanceRecord> {
    assertUuid(shiftAssignmentId, 'shiftAssignmentId');
    await this.context.requirePermission('attendance.update');

    const record = await this.getOrCreateForAssignment(shiftAssignmentId);
    if (record.attendance_status !== 'scheduled') {
      throw new ValidationError(`Cannot mark absent: attendance is already "${record.attendance_status}"`);
    }

    return this.records.patch(this.context.organizationId, record.id, {
      attendance_status: noShow ? 'no_show' : 'absent',
      notes: notes?.trim() || null,
      updated_by: this.context.userId
    } as Partial<AttendanceRecord>);
  }

  async getRecord(recordId: string): Promise<AttendanceRecord> {
    assertUuid(recordId, 'recordId');
    await this.context.requirePermission('attendance.read');
    const record = await this.records.getByIdOrThrow(this.context.organizationId, recordId);
    this.context.requireBranchAccess(record.branch_id);
    return record;
  }

  async listForEmployee(employeeId: string, options?: { limit?: number; offset?: number }): Promise<AttendanceRecord[]> {
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('attendance.read');
    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    this.context.requireBranchAccess(employee.branch_id);
    return this.records.findByEmployee(this.context.organizationId, employeeId, options);
  }

  /** My own attendance history — resolves "me" the same way announcements/self-service does (email match to an employee record). */
  async listMine(options?: { limit?: number; offset?: number }): Promise<AttendanceRecord[]> {
    await this.context.requirePermission('attendance.clockin');
    const employee = await this.resolveMyEmployee();
    if (!employee) {
      return [];
    }
    return this.records.findByEmployee(this.context.organizationId, employee.id, options);
  }

  async listForBranchAndRange(branchId: string, startIso: string, endIso: string): Promise<AttendanceRecord[]> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('attendance.read');
    this.context.requireBranchAccess(branchId);
    if (Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso))) {
      throw new ValidationError('Invalid date range', ['startIso/endIso must be valid dates']);
    }
    return this.records.findByBranchAndDateRange(this.context.organizationId, branchId, startIso, endIso);
  }

  async recordCorrection(input: {
    attendanceRecordId: string;
    correctedStatus: AttendanceStatus;
    correctedClockIn?: string | null;
    correctedClockOut?: string | null;
    reason: string;
  }): Promise<AttendanceRecord> {
    assertUuid(input.attendanceRecordId, 'attendanceRecordId');
    assertNonEmptyString(input.reason, 'reason');
    await this.context.requirePermission('attendance.correct');

    const before = await this.records.getByIdOrThrow(this.context.organizationId, input.attendanceRecordId);
    this.context.requireBranchAccess(before.branch_id);

    const updated = await this.records.patch(this.context.organizationId, before.id, {
      attendance_status: input.correctedStatus,
      clock_in_at: input.correctedClockIn ?? null,
      clock_out_at: input.correctedClockOut ?? null,
      updated_by: this.context.userId
    } as Partial<AttendanceRecord>);

    await this.corrections.record(this.context.organizationId, {
      attendance_record_id: before.id,
      original_status: before.attendance_status,
      original_clock_in: before.clock_in_at,
      original_clock_out: before.clock_out_at,
      corrected_status: input.correctedStatus,
      corrected_clock_in: input.correctedClockIn ?? null,
      corrected_clock_out: input.correctedClockOut ?? null,
      reason: input.reason.trim(),
      approved_by: this.context.userId,
      approved_at: new Date().toISOString()
    });

    return updated;
  }

  async listCorrections(attendanceRecordId: string) {
    assertUuid(attendanceRecordId, 'attendanceRecordId');
    await this.context.requirePermission('attendance.read');
    const record = await this.records.getByIdOrThrow(this.context.organizationId, attendanceRecordId);
    this.context.requireBranchAccess(record.branch_id);
    return this.corrections.listForAttendanceRecord(this.context.organizationId, attendanceRecordId);
  }

  private async resolveSelfRecord(shiftAssignmentId: string): Promise<AttendanceRecord> {
    const employee = await this.resolveMyEmployee();
    if (!employee) {
      throw new ValidationError('Your account is not linked to an employee record, so there is nothing to clock in as.');
    }
    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, shiftAssignmentId);
    if (assignment.employee_id !== employee.id) {
      throw new AuthorizationError('You can only clock in or out of your own shift assignment');
    }
    return this.getOrCreateForAssignment(shiftAssignmentId);
  }

  private async getOrCreateForAssignment(shiftAssignmentId: string): Promise<AttendanceRecord> {
    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, shiftAssignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);

    const existing = await this.records.findByShiftAssignment(this.context.organizationId, shiftAssignmentId);
    if (existing) {
      return existing;
    }

    return this.records.insert(this.context.organizationId, {
      branch_id: shift.branch_id,
      shift_assignment_id: shiftAssignmentId,
      employee_id: assignment.employee_id,
      attendance_status: 'scheduled',
      recorded_by: this.context.userId
    } as Partial<AttendanceRecord>);
  }

  private async resolveMyEmployee() {
    const user = await this.users.getByIdOrThrow(this.context.userId);
    return this.employees.findByEmail(this.context.organizationId, user.email);
  }
}
