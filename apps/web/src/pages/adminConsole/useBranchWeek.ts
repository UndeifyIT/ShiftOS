import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { AttendanceRecord, Schedule, Shift, ShiftAssignment } from '../../types/domain.js';
import { addDays } from '../scheduling/grid/scheduleFormat.js';

const LIVE_ASSIGNMENT = new Set(['assigned', 'confirmed', 'completed']);

function localMidnightIso(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

/** One branch's published week (the schedules covering it, their shifts and assignments) and that week's attendance — read-only. */
export function useBranchWeek(branchId: string, weekStart: string, enabled: boolean) {
  const { hasPermission } = useSession();
  const weekEnd = addDays(weekStart, 6);
  const schedules = useRpcQuery<Schedule[]>('list_schedules', { branchId }, { enabled: enabled && hasPermission('schedules.read') });
  const covering = (schedules.data ?? []).filter((s) => s.status === 'published' && !s.deleted_at && s.start_date <= weekEnd && s.end_date >= weekStart).slice(0, 2);
  const canShifts = enabled && hasPermission('shifts.read');
  const shiftsA = useRpcQuery<Shift[]>('list_shifts_for_schedule', covering[0] ? { scheduleId: covering[0].id } : undefined, { enabled: canShifts && Boolean(covering[0]) });
  const shiftsB = useRpcQuery<Shift[]>('list_shifts_for_schedule', covering[1] ? { scheduleId: covering[1].id } : undefined, { enabled: canShifts && Boolean(covering[1]) });
  const assignA = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', covering[0] ? { scheduleId: covering[0].id } : undefined, { enabled: canShifts && Boolean(covering[0]) });
  const assignB = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', covering[1] ? { scheduleId: covering[1].id } : undefined, { enabled: canShifts && Boolean(covering[1]) });
  const attendance = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_branch_and_range',
    { branchId, startIso: localMidnightIso(weekStart), endIso: localMidnightIso(addDays(weekStart, 7)) },
    { enabled: enabled && hasPermission('attendance.read') }
  );

  const shifts = [...new Map([...(shiftsA.data ?? []), ...(shiftsB.data ?? [])].filter((s) => s.branch_id === branchId && s.is_active && !s.deleted_at && s.status !== 'cancelled' && s.shift_date >= weekStart && s.shift_date <= weekEnd).map((s) => [s.id, s])).values()];
  const shiftIds = new Set(shifts.map((s) => s.id));
  const assignments = [...new Map([...(assignA.data ?? []), ...(assignB.data ?? [])].filter((a) => !a.deleted_at && LIVE_ASSIGNMENT.has(a.assignment_status) && shiftIds.has(a.shift_id)).map((a) => [a.id, a])).values()];

  return {
    loading: schedules.isLoading || shiftsA.isLoading || assignA.isLoading,
    published: covering.length > 0,
    shifts,
    assignments,
    attendance: (attendance.data ?? []).filter((r) => !r.deleted_at)
  };
}
