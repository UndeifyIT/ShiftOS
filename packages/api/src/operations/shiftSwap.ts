import { ShiftSwapService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, booleanField } from '../parse.js';

export const requestShiftSwap = defineRpc('request_shift_swap', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftSwapService(context).requestSwap(
    requiredStringField(input, 'shiftAssignmentId'),
    stringField(input, 'targetEmployeeId') ?? null,
    stringField(input, 'notes') ?? null
  );
});

export const respondToShiftSwap = defineRpc('respond_to_shift_swap', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftSwapService(context).respondToSwap(requiredStringField(input, 'swapId'), booleanField(input, 'accept') ?? false);
});

export const cancelShiftSwap = defineRpc('cancel_shift_swap', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftSwapService(context).cancelSwap(requiredStringField(input, 'swapId'));
});

export const approveShiftSwap = defineRpc('approve_shift_swap', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftSwapService(context).approveSwap(requiredStringField(input, 'swapId'), stringField(input, 'decisionNotes') ?? null);
});

export const rejectShiftSwap = defineRpc('reject_shift_swap', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftSwapService(context).rejectSwap(requiredStringField(input, 'swapId'), stringField(input, 'decisionNotes') ?? null);
});

export const getShiftSwap = defineRpc('get_shift_swap', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftSwapService(context).getSwap(requiredStringField(input, 'swapId'));
});

export const listMyShiftSwaps = defineRpc('list_my_shift_swaps', async (context) => {
  return new ShiftSwapService(context).listMySwaps();
});

export const listOpenShiftSwaps = defineRpc('list_open_shift_swaps', async (context) => {
  return new ShiftSwapService(context).listOpenSwaps();
});

export const listPendingShiftSwapApprovals = defineRpc('list_pending_shift_swap_approvals', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new ShiftSwapService(context).listPendingApprovals(stringField(input, 'branchId'));
});

export const shiftSwapOperations = [
  requestShiftSwap,
  respondToShiftSwap,
  cancelShiftSwap,
  approveShiftSwap,
  rejectShiftSwap,
  getShiftSwap,
  listMyShiftSwaps,
  listOpenShiftSwaps,
  listPendingShiftSwapApprovals
];
