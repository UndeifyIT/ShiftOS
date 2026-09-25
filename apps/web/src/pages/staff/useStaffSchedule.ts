import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Department, Employee, Schedule, ScheduleDayOff, Shift, ShiftAssignment } from '../../types/domain.js';
import { addDays } from '../scheduling/grid/scheduleFormat.js';
import { useMyEmployee } from './useStaffSelf.js';

/*
 * A Staff member's own published shifts between two dates. Staff only ever
 * see published weeks (handoff "Published · your shifts only"), so drafts are
 * dropped here, before anything is asked about them. Each published schedule
 * overlapping the range is read with the calls a Staff role can make:
 * list_shifts_for_employee_in_schedule (my shifts), list_my_shift_assignments_in_schedule
 * (their assignment rows, which a swap request keys off) and list_schedule_day_offs.
 */

export interface StaffSchedule {
  me: Employee | null;
  employees: Employee[];
  branch: Branch | null;
  timeZone: string | null;
  departments: Map<string, string>;
  schedules: Schedule[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  /** My shift's assignment row, by shift id. */
  assignmentByShift: Map<string, ShiftAssignment>;
  /** Dates in the range covered by a published schedule. */
  publishedDates: Set<string>;
  /** Dates in the range marked as my day off. */
  dayOffs: Set<string>;
  loading: boolean;
}

export function useStaffSchedule(from: string, to: string): StaffSchedule {
  const { hasPermission } = useSession();
  const { employee: me, employees, loading: employeesLoading } = useMyEmployee();
  const branchId = me?.branch_id ?? '';

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const branch = (branches ?? []).find((b) => b.id === branchId) ?? null;
  const timeZone = typeof branch?.settings?.timeZone === 'string' ? (branch.settings.timeZone as string) : null;
  const { data: departmentRows } = useRpcQuery<Department[]>('list_departments', branchId ? { branchId } : undefined, {
    enabled: Boolean(branchId) && hasPermission('departments.read')
  });
  const departments = useMemo(() => new Map((departmentRows ?? []).map((d) => [d.id, d.name])), [departmentRows]);

  const schedulesQuery = useRpcQuery<Schedule[]>('list_schedules', branchId ? { branchId } : undefined, {
    enabled: Boolean(branchId) && hasPermission('schedules.read')
  });
  const schedules = useMemo(
    () =>
      (schedulesQuery.data ?? [])
        .filter((s) => s.status === 'published' && !s.deleted_at && s.start_date <= to && s.end_date >= from)
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [schedulesQuery.data, from, to]
  );

  const canReadShifts = Boolean(me) && hasPermission('shifts.read');
  const shiftQueries = useRpcQueries<Shift[]>(
    'list_shifts_for_employee_in_schedule',
    schedules.map((s) => ({ scheduleId: s.id, employeeId: me?.id })),
    { enabled: canReadShifts }
  );
  const assignmentQueries = useRpcQueries<ShiftAssignment[]>(
    'list_my_shift_assignments_in_schedule',
    schedules.map((s) => ({ scheduleId: s.id })),
    { enabled: canReadShifts }
  );
  const dayOffQueries = useRpcQueries<ScheduleDayOff[]>(
    'list_schedule_day_offs',
    schedules.map((s) => ({ scheduleId: s.id })),
    { enabled: Boolean(me) }
  );

  const shifts = shiftQueries
    .flatMap((q) => q.data ?? [])
    .filter((s) => !s.deleted_at && s.status !== 'cancelled' && s.shift_date >= from && s.shift_date <= to);
  const assignments = assignmentQueries.flatMap((q) => q.data ?? []);
  const assignmentByShift = new Map(assignments.map((a) => [a.shift_id, a]));
  const dayOffs = new Set(
    dayOffQueries
      .flatMap((q) => q.data ?? [])
      .filter((d) => !d.deleted_at && d.employee_id === me?.id && d.off_date >= from && d.off_date <= to)
      .map((d) => d.off_date)
  );
  const publishedDates = new Set<string>();
  for (const schedule of schedules) {
    for (let date = schedule.start_date < from ? from : schedule.start_date; date <= schedule.end_date && date <= to; date = addDays(date, 1)) publishedDates.add(date);
  }

  const loading =
    employeesLoading ||
    (Boolean(branchId) && schedulesQuery.isLoading) ||
    shiftQueries.some((q) => q.isLoading) ||
    assignmentQueries.some((q) => q.isLoading);

  return { me, employees, branch, timeZone, departments, schedules, shifts, assignments, assignmentByShift, publishedDates, dayOffs, loading };
}
