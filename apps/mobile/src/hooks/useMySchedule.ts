import { useRpcQuery } from '../lib/useRpc.js';
import type { Shift } from '../types/domain.js';

/**
 * Single RPC call to `list_shifts_for_employee_in_schedule`
 * (packages/services SchedulingService.listShiftsForEmployeeInSchedule),
 * which batches the assignment lookup across every shift in one query
 * server-side. Previously this hook fetched every shift in the schedule and
 * then issued one `list_assignments_for_shift` call per shift (N+1) — that
 * composition has been replaced, not merely hidden behind a cache.
 */
export function useMyAssignedShifts(scheduleId: string | undefined, employeeId: string | undefined) {
  return useRpcQuery<Shift[]>(
    'list_shifts_for_employee_in_schedule',
    scheduleId && employeeId ? { scheduleId, employeeId } : undefined,
    { enabled: Boolean(scheduleId && employeeId) }
  );
}
