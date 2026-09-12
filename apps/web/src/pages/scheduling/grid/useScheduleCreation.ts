import { useRpcMutation } from '../../../lib/useRpc.js';
import type { Schedule } from '../../../types/domain.js';
import { addDays, isoWeekNumber, weekRangeLabel } from './scheduleFormat.js';

export function scheduleNameForWeek(weekStart: string): string {
  return `Week ${isoWeekNumber(weekStart)} · ${weekRangeLabel(weekStart)}`;
}

/**
 * One-click week creation from the handoff's empty state ("Create New Schedule",
 * "Copy last week") and the assistant's "Create next week": creates the Mon–Sun
 * draft, and optionally copies another week's roster, shifts and days off into it.
 */
export function useScheduleCreation(branchId: string) {
  const createMutation = useRpcMutation<Schedule, Record<string, unknown>>('create_schedule', { invalidates: ['list_schedules'] });
  const duplicateMutation = useRpcMutation<{ copiedCount: number }, { sourceScheduleId: string; targetScheduleId: string }>('duplicate_schedule_shifts', {
    invalidates: ['list_schedule_roster', 'list_shifts_for_schedule', 'list_assignments_for_schedule', 'list_schedule_day_offs', 'get_schedule_conflicts']
  });

  const createWeek = async (weekStart: string, copyFrom?: Schedule): Promise<Schedule> => {
    const created = await createMutation.mutateAsync({
      branchId,
      name: scheduleNameForWeek(weekStart),
      startDate: weekStart,
      endDate: addDays(weekStart, 6)
    });
    if (copyFrom) {
      await duplicateMutation.mutateAsync({ sourceScheduleId: copyFrom.id, targetScheduleId: created.id });
    }
    return created;
  };

  return { createWeek, creating: createMutation.isPending || duplicateMutation.isPending };
}
