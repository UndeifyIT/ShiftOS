import { SchedulingService } from '@shiftos/services';
import type { AssignmentStatus } from '@shiftos/repositories';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, numberField, booleanField } from '../parse.js';

// ---- Schedules ----

export const createSchedule = defineRpc('create_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).createSchedule({
    branchId: requiredStringField(input, 'branchId'),
    name: requiredStringField(input, 'name'),
    startDate: requiredStringField(input, 'startDate'),
    endDate: requiredStringField(input, 'endDate')
  });
});

export const getSchedule = defineRpc('get_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).getSchedule(requiredStringField(input, 'scheduleId'));
});

export const updateSchedule = defineRpc('update_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const scheduleId = requiredStringField(input, 'scheduleId');
  return new SchedulingService(context).updateSchedule(scheduleId, {
    name: stringField(input, 'name'),
    startDate: stringField(input, 'startDate'),
    endDate: stringField(input, 'endDate')
  });
});

export const archiveSchedule = defineRpc('archive_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).archiveSchedule(requiredStringField(input, 'scheduleId'));
});

export const listSchedules = defineRpc('list_schedules', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new SchedulingService(context).listSchedules(stringField(input, 'branchId'), {
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

// ---- Schedule versions ----

export const listScheduleVersions = defineRpc('list_schedule_versions', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).listScheduleVersions(requiredStringField(input, 'scheduleId'));
});

export const getLatestScheduleVersion = defineRpc('get_latest_schedule_version', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).getLatestScheduleVersion(requiredStringField(input, 'scheduleId'));
});

// ---- Shifts ----

export const createShift = defineRpc('create_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const scheduleId = requiredStringField(input, 'scheduleId');
  return new SchedulingService(context).createShift(scheduleId, {
    templateId: stringField(input, 'templateId') ?? null,
    title: requiredStringField(input, 'title'),
    description: stringField(input, 'description') ?? null,
    shiftDate: requiredStringField(input, 'shiftDate'),
    startTime: requiredStringField(input, 'startTime'),
    endTime: requiredStringField(input, 'endTime'),
    crossesMidnight: booleanField(input, 'crossesMidnight'),
    breakMinutes: numberField(input, 'breakMinutes')
  });
});

export const getShift = defineRpc('get_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).getShift(requiredStringField(input, 'shiftId'));
});

export const updateShift = defineRpc('update_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const shiftId = requiredStringField(input, 'shiftId');
  return new SchedulingService(context).updateShift(shiftId, {
    title: stringField(input, 'title'),
    description: stringField(input, 'description'),
    startTime: stringField(input, 'startTime'),
    endTime: stringField(input, 'endTime'),
    crossesMidnight: booleanField(input, 'crossesMidnight'),
    breakMinutes: numberField(input, 'breakMinutes')
  });
});

export const cancelShift = defineRpc('cancel_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).cancelShift(requiredStringField(input, 'shiftId'));
});

export const archiveShift = defineRpc('archive_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).archiveShift(requiredStringField(input, 'shiftId'));
});

export const listShiftsForSchedule = defineRpc('list_shifts_for_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).listShiftsForSchedule(requiredStringField(input, 'scheduleId'));
});

export const listShiftsForEmployeeInSchedule = defineRpc('list_shifts_for_employee_in_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).listShiftsForEmployeeInSchedule(
    requiredStringField(input, 'scheduleId'),
    requiredStringField(input, 'employeeId')
  );
});

export const listMyShiftAssignmentsInSchedule = defineRpc('list_my_shift_assignments_in_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).listMyShiftAssignmentsInSchedule(requiredStringField(input, 'scheduleId'));
});

// ---- Shift assignments ----

export const assignEmployee = defineRpc('assign_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).assignEmployee(
    requiredStringField(input, 'shiftId'),
    requiredStringField(input, 'employeeId')
  );
});

export const updateAssignmentStatus = defineRpc('update_assignment_status', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const assignmentId = requiredStringField(input, 'assignmentId');
  const status = requiredStringField(input, 'status');
  // The precise set of valid values is re-validated inside
  // SchedulingService.updateAssignmentStatus (assertOneOf); the cast here is
  // narrowed by that downstream check, matching the pattern used for
  // employmentStatus in employee.ts.
  return new SchedulingService(context).updateAssignmentStatus(assignmentId, status as AssignmentStatus);
});

export const removeAssignment = defineRpc('remove_assignment', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).removeAssignment(requiredStringField(input, 'assignmentId'));
});

export const listAssignmentsForShift = defineRpc('list_assignments_for_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).listAssignmentsForShift(requiredStringField(input, 'shiftId'));
});

// ---- Publishing ----

export const publishSchedule = defineRpc('publish_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).publishSchedule(
    requiredStringField(input, 'scheduleId'),
    stringField(input, 'changesSummary')
  );
});

export const schedulingOperations = [
  createSchedule, getSchedule, updateSchedule, archiveSchedule, listSchedules,
  listScheduleVersions, getLatestScheduleVersion,
  createShift, getShift, updateShift, cancelShift, archiveShift, listShiftsForSchedule, listShiftsForEmployeeInSchedule,
  listMyShiftAssignmentsInSchedule,
  assignEmployee, updateAssignmentStatus, removeAssignment, listAssignmentsForShift,
  publishSchedule
];
