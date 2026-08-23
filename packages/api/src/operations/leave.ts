import { LeaveRequestService } from '@shiftos/services';
import type { LeaveType } from '@shiftos/repositories';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, numberField } from '../parse.js';

export const createLeaveRequest = defineRpc('create_leave_request', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new LeaveRequestService(context).createLeaveRequest({
    employeeId: requiredStringField(input, 'employeeId'),
    leaveType: requiredStringField(input, 'leaveType') as LeaveType,
    startDate: requiredStringField(input, 'startDate'),
    endDate: requiredStringField(input, 'endDate'),
    reason: requiredStringField(input, 'reason')
  });
});

export const approveLeaveRequest = defineRpc('approve_leave_request', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new LeaveRequestService(context).approveLeaveRequest(requiredStringField(input, 'leaveRequestId'));
});

export const rejectLeaveRequest = defineRpc('reject_leave_request', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new LeaveRequestService(context).rejectLeaveRequest(requiredStringField(input, 'leaveRequestId'), requiredStringField(input, 'managerNotes'));
});

export const cancelLeaveRequest = defineRpc('cancel_leave_request', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new LeaveRequestService(context).cancelLeaveRequest(requiredStringField(input, 'leaveRequestId'), requiredStringField(input, 'reason'));
});

export const getLeaveRequest = defineRpc('get_leave_request', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new LeaveRequestService(context).getLeaveRequest(requiredStringField(input, 'leaveRequestId'));
});

export const listLeaveForEmployee = defineRpc('list_leave_for_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new LeaveRequestService(context).listForEmployee(requiredStringField(input, 'employeeId'), {
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

export const listMyLeave = defineRpc('list_my_leave', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new LeaveRequestService(context).listMine({ limit: numberField(input, 'limit'), offset: numberField(input, 'offset') });
});

export const listPendingLeave = defineRpc('list_pending_leave', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new LeaveRequestService(context).listPending(stringField(input, 'branchId'), {
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

export const leaveOperations = [
  createLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest,
  getLeaveRequest, listLeaveForEmployee, listMyLeave, listPendingLeave
];
