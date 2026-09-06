import { ScheduleRosterService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField } from '../parse.js';

export const addEmployeeToSchedule = defineRpc('add_employee_to_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ScheduleRosterService(context).addEmployeeToSchedule(
    requiredStringField(input, 'scheduleId'),
    requiredStringField(input, 'employeeId')
  );
});

export const removeEmployeeFromSchedule = defineRpc('remove_employee_from_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ScheduleRosterService(context).removeEmployeeFromSchedule(
    requiredStringField(input, 'scheduleId'),
    requiredStringField(input, 'employeeId')
  );
});

export const listScheduleRoster = defineRpc('list_schedule_roster', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ScheduleRosterService(context).listScheduleRoster(requiredStringField(input, 'scheduleId'));
});

export const scheduleRosterOperations = [addEmployeeToSchedule, removeEmployeeFromSchedule, listScheduleRoster];
