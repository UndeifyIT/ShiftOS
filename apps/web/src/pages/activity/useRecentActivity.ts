import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcQueries, useRpcQuery } from '../../lib/useRpc.js';
import type { Announcement, AttendanceRecord, Branch, Department, Employee, Member, Schedule, Shift, ShiftAssignment, Task } from '../../types/domain.js';
import { addDays, todayDateString } from '../scheduling/grid/scheduleFormat.js';
import { buildActivity, type ActivityEvent } from './activityModel.js';

/**
 * Everything the Recent Activity feed reads for one branch: the last seven
 * days of attendance (so the date-range filter has something to filter),
 * today's and this week's published shifts, the branch's tasks, published
 * announcements, and the people behind all of it. Each read is gated by the
 * permission its RPC checks, so a missing permission leaves that part empty
 * rather than failing the page.
 */
export interface RecentActivityState {
  loading: boolean;
  branchName: string;
  events: ActivityEvent[];
}

const localMidnightIso = (date: string): string => new Date(`${date}T00:00:00`).toISOString();

export function useRecentActivity(now: Date): RecentActivityState {
  const { hasPermission } = useSession();
  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const has = Boolean(branchId);

  const today = todayDateString(now);
  const from = addDays(today, -6);

  const branches = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const employees = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: has && hasPermission('employees.read') });
  const departments = useRpcQuery<Department[]>('list_departments', scoped, { enabled: has && hasPermission('departments.read') });
  const members = useRpcQuery<Member[]>('list_members', undefined, { enabled: hasPermission('org.members.manage') });
  const schedules = useRpcQuery<Schedule[]>('list_schedules', scoped, { enabled: has && hasPermission('schedules.read') });
  const tasks = useRpcQuery<Task[]>('list_tasks', scoped, { enabled: has && hasPermission('tasks.read') });
  const announcements = useRpcQuery<Announcement[]>('list_announcements', scoped, { enabled: has && hasPermission('announcements.read') });
  const attendance = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_branch_and_range',
    has ? { branchId, startIso: localMidnightIso(from), endIso: localMidnightIso(addDays(today, 1)) } : undefined,
    { enabled: has && hasPermission('attendance.read') }
  );

  // A week can be covered by more than one published schedule.
  const weekSchedules = (schedules.data ?? []).filter((schedule) => schedule.status === 'published' && !schedule.deleted_at && schedule.start_date <= today && schedule.end_date >= from);
  const canReadShifts = hasPermission('schedules.read');
  const shiftQueries = useRpcQueries<Shift[]>(
    'list_shifts_for_schedule',
    weekSchedules.map((schedule) => ({ scheduleId: schedule.id })),
    { enabled: canReadShifts }
  );
  const assignmentQueries = useRpcQueries<ShiftAssignment[]>(
    'list_assignments_for_schedule',
    weekSchedules.map((schedule) => ({ scheduleId: schedule.id })),
    { enabled: canReadShifts }
  );

  const branchName = (branches.data ?? []).find((branch) => branch.id === branchId)?.name ?? 'Your branch';
  const shifts = shiftQueries.flatMap((query) => query.data ?? []);
  const assignments = assignmentQueries.flatMap((query) => query.data ?? []);

  const events = useMemo(
    () =>
      buildActivity({
        now,
        branchName,
        employees: employees.data ?? [],
        departments: departments.data ?? [],
        members: members.data ?? [],
        shifts,
        assignments,
        attendance: attendance.data ?? [],
        tasks: tasks.data ?? [],
        announcements: announcements.data ?? []
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, branchName, employees.data, departments.data, members.data, attendance.data, tasks.data, announcements.data, shifts.length, assignments.length]
  );

  return {
    loading: employees.isLoading || attendance.isLoading || schedules.isLoading,
    branchName,
    events
  };
}
