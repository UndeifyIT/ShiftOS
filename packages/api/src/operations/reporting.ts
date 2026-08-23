import { ReportingService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField } from '../parse.js';

export const getAttendanceSummaryReport = defineRpc('get_attendance_summary_report', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ReportingService(context).getAttendanceSummary(
    requiredStringField(input, 'startDate'),
    requiredStringField(input, 'endDate'),
    stringField(input, 'branchId')
  );
});

export const getTaskCompletionReport = defineRpc('get_task_completion_report', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new ReportingService(context).getTaskCompletionStats(
    stringField(input, 'branchId'),
    stringField(input, 'startDate'),
    stringField(input, 'endDate')
  );
});

export const getLeaveUsageReport = defineRpc('get_leave_usage_report', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ReportingService(context).getLeaveUsageSummary(
    requiredStringField(input, 'startDate'),
    requiredStringField(input, 'endDate'),
    stringField(input, 'branchId')
  );
});

export const reportingOperations = [getAttendanceSummaryReport, getTaskCompletionReport, getLeaveUsageReport];
