import { AttendanceService } from '@shiftos/services';
import type { AttendanceStatus } from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, booleanField, numberField } from '../parse.js';

export const clockIn = defineRpc('clock_in', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).clockIn(requiredStringField(input, 'shiftAssignmentId'));
});

export const clockOut = defineRpc('clock_out', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).clockOut(requiredStringField(input, 'shiftAssignmentId'));
});

export const markAttendanceAbsent = defineRpc('mark_attendance_absent', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).markAbsent(
    requiredStringField(input, 'shiftAssignmentId'),
    booleanField(input, 'noShow') ?? false,
    stringField(input, 'notes') ?? null
  );
});

/** Supervisor-side marking from the Attendance screen — clock_in/clock_out stay self-service. */
export const markAttendance = defineRpc('mark_attendance', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const status = requiredStringField(input, 'status');
  if (!['present', 'late', 'absent', 'no_show', 'scheduled'].includes(status)) {
    throw new ValidationError(`Unsupported attendance status "${status}"`);
  }
  return new AttendanceService(context).markAttendance({
    shiftAssignmentId: requiredStringField(input, 'shiftAssignmentId'),
    status: status as 'present' | 'late' | 'absent' | 'no_show' | 'scheduled',
    at: stringField(input, 'at') ?? null,
    notes: 'notes' in input ? stringField(input, 'notes') ?? null : undefined
  });
});

export const setAttendanceNote = defineRpc('set_attendance_note', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).setNote(requiredStringField(input, 'attendanceRecordId'), stringField(input, 'notes') ?? null);
});

export const getAttendanceRecord = defineRpc('get_attendance_record', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).getRecord(requiredStringField(input, 'recordId'));
});

export const listAttendanceForEmployee = defineRpc('list_attendance_for_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).listForEmployee(requiredStringField(input, 'employeeId'), {
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

export const listMyAttendance = defineRpc('list_my_attendance', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new AttendanceService(context).listMine({ limit: numberField(input, 'limit'), offset: numberField(input, 'offset') });
});

export const listAttendanceForBranchAndRange = defineRpc('list_attendance_for_branch_and_range', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).listForBranchAndRange(
    requiredStringField(input, 'branchId'),
    requiredStringField(input, 'startIso'),
    requiredStringField(input, 'endIso')
  );
});

export const recordAttendanceCorrection = defineRpc('record_attendance_correction', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).recordCorrection({
    attendanceRecordId: requiredStringField(input, 'attendanceRecordId'),
    correctedStatus: requiredStringField(input, 'correctedStatus') as AttendanceStatus,
    correctedClockIn: stringField(input, 'correctedClockIn') ?? null,
    correctedClockOut: stringField(input, 'correctedClockOut') ?? null,
    reason: requiredStringField(input, 'reason')
  });
});

export const listAttendanceCorrections = defineRpc('list_attendance_corrections', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new AttendanceService(context).listCorrections(requiredStringField(input, 'attendanceRecordId'));
});

export const attendanceOperations = [
  clockIn, clockOut, markAttendance, markAttendanceAbsent, setAttendanceNote, getAttendanceRecord, listAttendanceForEmployee,
  listMyAttendance, listAttendanceForBranchAndRange, recordAttendanceCorrection, listAttendanceCorrections
];
