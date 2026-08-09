import { useQuery } from '@tanstack/react-query';
import { callRpc } from '../lib/apiClient.js';
import { useSession } from '../auth/SessionProvider.js';
import type { Shift, ShiftAssignment } from '../types/domain.js';

/**
 * Fetches every shift in `scheduleId` and keeps only the ones `employeeId`
 * is assigned to. There is no "list shifts for employee" RPC operation yet
 * (packages/api only exposes list_assignments_for_shift, per-shift) — this
 * is a straightforward composition of what exists today, not a new backend
 * capability. Fine at P0 scale (one schedule, a handful of shifts); a
 * dedicated "my shifts" operation would be the right follow-up once shift
 * counts grow.
 */
export function useMyAssignedShifts(scheduleId: string | undefined, employeeId: string | undefined) {
  const { myContext } = useSession();
  const organizationId = myContext?.organizationId;

  return useQuery<Shift[]>({
    queryKey: ['my_assigned_shifts', scheduleId, employeeId],
    enabled: Boolean(scheduleId && employeeId && organizationId),
    queryFn: async () => {
      const shifts = await callRpc<Shift[]>('list_shifts_for_schedule', organizationId as string, { scheduleId });
      const results = await Promise.all(
        shifts.map(async (shift) => {
          const assignments = await callRpc<ShiftAssignment[]>('list_assignments_for_shift', organizationId as string, { shiftId: shift.id });
          const mine = assignments.some((a) => a.employee_id === employeeId && a.assignment_status !== 'cancelled' && a.assignment_status !== 'declined');
          return mine ? shift : null;
        })
      );
      return results.filter((s): s is Shift => s !== null).sort((a, b) => (a.shift_date < b.shift_date ? -1 : 1));
    }
  });
}
