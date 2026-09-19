import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { AttendanceRecord, Branch, Department, Employee, Schedule, Shift, ShiftAssignment } from '../../types/domain.js';
import { todayDateString } from '../scheduling/grid/scheduleFormat.js';

/**
 * Everything today's attendance screen reads for one branch: the shifts
 * published for today, who is assigned to them, and the attendance already
 * recorded. Each read is gated by the permission its RPC checks.
 */
export interface TodayAttendance {
  branchId: string;
  branchName: string;
  today: string;
  shifts: Shift[];
  assignments: ShiftAssignment[];
  employees: Employee[];
  departments: Department[];
  records: AttendanceRecord[];
  isLoading: boolean;
}

function localMidnightIso(date: string, addDays = 0): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day + addDays).toISOString();
}

export function useTodayAttendance(now: Date): TodayAttendance {
  const { hasPermission } = useSession();
  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const has = Boolean(branchId);
  const today = todayDateString(now);

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const employeesQuery = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: has && hasPermission('employees.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: has && hasPermission('departments.read') });
  const schedulesQuery = useRpcQuery<Schedule[]>('list_schedules', scoped, { enabled: has && hasPermission('schedules.read') });

  // A day can be covered by more than one published schedule (one ending midweek, the next starting).
  const todaySchedules = (schedulesQuery.data ?? [])
    .filter((schedule) => schedule.status === 'published' && !schedule.deleted_at && schedule.start_date <= today && schedule.end_date >= today)
    .slice(0, 2);
  const canReadShifts = hasPermission('schedules.read');
  const shiftsA = useRpcQuery<Shift[]>('list_shifts_for_schedule', todaySchedules[0] ? { scheduleId: todaySchedules[0].id } : undefined, { enabled: canReadShifts && Boolean(todaySchedules[0]) });
  const shiftsB = useRpcQuery<Shift[]>('list_shifts_for_schedule', todaySchedules[1] ? { scheduleId: todaySchedules[1].id } : undefined, { enabled: canReadShifts && Boolean(todaySchedules[1]) });
  const assignmentsA = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', todaySchedules[0] ? { scheduleId: todaySchedules[0].id } : undefined, {
    enabled: canReadShifts && Boolean(todaySchedules[0])
  });
  const assignmentsB = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', todaySchedules[1] ? { scheduleId: todaySchedules[1].id } : undefined, {
    enabled: canReadShifts && Boolean(todaySchedules[1])
  });
  const recordsQuery = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_branch_and_range',
    has ? { branchId, startIso: localMidnightIso(today), endIso: localMidnightIso(today, 1) } : undefined,
    { enabled: has && hasPermission('attendance.read') }
  );

  const shifts = useMemo(
    () => [...(shiftsA.data ?? []), ...(shiftsB.data ?? [])].filter((shift) => shift.shift_date.slice(0, 10) === today && !shift.deleted_at),
    [shiftsA.data, shiftsB.data, today]
  );
  const assignments = useMemo(() => {
    const todayShiftIds = new Set(shifts.map((shift) => shift.id));
    return [...(assignmentsA.data ?? []), ...(assignmentsB.data ?? [])].filter((assignment) => todayShiftIds.has(assignment.shift_id));
  }, [assignmentsA.data, assignmentsB.data, shifts]);

  return {
    branchId,
    branchName: (branches ?? []).find((branch) => branch.id === branchId)?.name ?? 'your branch',
    today,
    shifts,
    assignments,
    employees: employeesQuery.data ?? [],
    departments: departments ?? [],
    records: recordsQuery.data ?? [],
    isLoading: employeesQuery.isLoading || schedulesQuery.isLoading || recordsQuery.isLoading
  };
}
