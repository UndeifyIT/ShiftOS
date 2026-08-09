import { useMemo } from 'react';
import { useRpcQuery } from '../lib/useRpc.js';
import type { Schedule, Shift } from '../types/domain.js';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Composes list_schedules + list_shifts_for_schedule (the only scheduling
 * RPC operations packages/api currently exposes — there is no direct
 * "shifts for branch on date X" or "shifts for employee" endpoint yet) to
 * answer "what's the relevant schedule and its shifts for this branch right
 * now." Prefers the schedule whose date range covers today; falls back to
 * the most recently created schedule so the screen still shows something
 * useful outside an active period.
 */
export function useActiveScheduleForBranch(branchId: string | undefined) {
  const schedulesQuery = useRpcQuery<Schedule[]>('list_schedules', branchId ? { branchId } : undefined, { enabled: Boolean(branchId) });

  const activeSchedule = useMemo(() => {
    const schedules = schedulesQuery.data ?? [];
    if (schedules.length === 0) return null;
    const today = todayIso();
    const covering = schedules.find((s) => s.status === 'published' && s.start_date <= today && s.end_date >= today);
    return covering ?? [...schedules].sort((a, b) => (a.start_date < b.start_date ? 1 : -1))[0] ?? null;
  }, [schedulesQuery.data]);

  return { activeSchedule, isLoading: schedulesQuery.isLoading, error: schedulesQuery.error };
}

export function useShiftsForSchedule(scheduleId: string | undefined) {
  return useRpcQuery<Shift[]>('list_shifts_for_schedule', scheduleId ? { scheduleId } : undefined, { enabled: Boolean(scheduleId) });
}

export { todayIso };
