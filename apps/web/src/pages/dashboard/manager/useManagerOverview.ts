import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../../auth/useDefaultBranchId.js';
import { currentTime } from '../../../lib/clock.js';
import { useRpcQuery } from '../../../lib/useRpc.js';
import type {
  Announcement,
  AttendanceRecord,
  Branch,
  Department,
  Employee,
  Invitation,
  LeaveRequest,
  Member,
  Schedule,
  Shift,
  ShiftAssignment,
  ShiftSwap,
  Task
} from '../../../types/domain.js';
import { addDays, todayDateString, weekStartOf } from '../../scheduling/grid/scheduleFormat.js';
import { buildManagerOverview, type ManagerOverview } from './overviewModel.js';

/** "Now", re-read every 30 seconds so the clock pill and live counts stay current. */
export function useNow(): Date {
  const [now, setNow] = useState(currentTime);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(currentTime()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function localMidnightIso(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toISOString();
}

export type OverviewStatus = 'loading' | 'no-branch' | 'empty' | 'ready';

export interface ManagerOverviewState {
  status: OverviewStatus;
  now: Date;
  branches: Branch[];
  branchId: string;
  branch: Branch | undefined;
  overview: ManagerOverview | null;
}

/**
 * Loads everything the Manager overview reads for one branch — people,
 * departments, this week's published shifts and assignments, this week's
 * attendance, pending leave/swaps/invitations, announcements and tasks — and
 * folds it into the handoff's overview shape. Each read is gated by the
 * permission its RPC checks, so a missing permission leaves that part empty.
 */
export function useManagerOverview(): ManagerOverviewState {
  const { hasPermission } = useSession();
  const now = useNow();
  // The Manager's own branch — the overview never shows or switches to another.
  const homeBranchId = useDefaultBranchId();

  const today = todayDateString(now);
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);

  const branchesQuery = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const branches = (branchesQuery.data ?? []).filter((b) => b.is_active && !b.deleted_at);
  const branchId = homeBranchId ?? '';
  const branch = branches.find((b) => b.id === branchId);
  const scoped = branchId ? { branchId } : undefined;
  const has = Boolean(branchId);

  const employees = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: has && hasPermission('employees.read') });
  const departments = useRpcQuery<Department[]>('list_departments', scoped, { enabled: has && hasPermission('departments.read') });
  const members = useRpcQuery<Member[]>('list_members', undefined, { enabled: hasPermission('org.members.manage') });
  const invitations = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: hasPermission('org.members.manage') });
  const schedules = useRpcQuery<Schedule[]>('list_schedules', scoped, { enabled: has && hasPermission('schedules.read') });
  const pendingLeave = useRpcQuery<LeaveRequest[]>('list_pending_leave', scoped, { enabled: has && hasPermission('leave.approve') });
  const pendingSwaps = useRpcQuery<ShiftSwap[]>('list_pending_shift_swap_approvals', scoped, { enabled: has && hasPermission('swaps.approve') });
  const announcements = useRpcQuery<Announcement[]>('list_announcements', scoped, { enabled: has && hasPermission('announcements.read') });
  const tasks = useRpcQuery<Task[]>('list_tasks', scoped, { enabled: has && hasPermission('tasks.read') });
  const attendance = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_branch_and_range',
    has ? { branchId, startIso: localMidnightIso(weekStart), endIso: localMidnightIso(addDays(today, 1)) } : undefined,
    { enabled: has && hasPermission('attendance.read') }
  );

  // A week can be covered by more than one published schedule (e.g. one ending Wednesday, the next starting Thursday).
  const weekSchedules = (schedules.data ?? [])
    .filter((s) => s.status === 'published' && !s.deleted_at && s.start_date <= weekEnd && s.end_date >= weekStart)
    .slice(0, 2);
  const canReadShifts = hasPermission('schedules.read');
  const shiftsA = useRpcQuery<Shift[]>('list_shifts_for_schedule', weekSchedules[0] ? { scheduleId: weekSchedules[0].id } : undefined, { enabled: canReadShifts && Boolean(weekSchedules[0]) });
  const shiftsB = useRpcQuery<Shift[]>('list_shifts_for_schedule', weekSchedules[1] ? { scheduleId: weekSchedules[1].id } : undefined, { enabled: canReadShifts && Boolean(weekSchedules[1]) });
  const assignmentsA = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', weekSchedules[0] ? { scheduleId: weekSchedules[0].id } : undefined, {
    enabled: canReadShifts && Boolean(weekSchedules[0])
  });
  const assignmentsB = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', weekSchedules[1] ? { scheduleId: weekSchedules[1].id } : undefined, {
    enabled: canReadShifts && Boolean(weekSchedules[1])
  });

  const loading = branchesQuery.isLoading || (has && (employees.isLoading || schedules.isLoading));

  const overview = useMemo(() => {
    if (!branch) return null;
    return buildManagerOverview({
      now,
      branch,
      employees: employees.data ?? [],
      departments: departments.data ?? [],
      members: members.data ?? [],
      schedules: schedules.data ?? [],
      shifts: [...(shiftsA.data ?? []), ...(shiftsB.data ?? [])],
      assignments: [...(assignmentsA.data ?? []), ...(assignmentsB.data ?? [])],
      attendance: attendance.data ?? [],
      pendingLeave: pendingLeave.data ?? [],
      pendingSwaps: pendingSwaps.data ?? [],
      invitations: invitations.data ?? [],
      announcements: announcements.data ?? [],
      tasks: tasks.data ?? []
    });
  }, [
    now,
    branch,
    employees.data,
    departments.data,
    members.data,
    schedules.data,
    shiftsA.data,
    shiftsB.data,
    assignmentsA.data,
    assignmentsB.data,
    attendance.data,
    pendingLeave.data,
    pendingSwaps.data,
    invitations.data,
    announcements.data,
    tasks.data
  ]);

  const status: OverviewStatus = loading
    ? 'loading'
    : !branch
      ? 'no-branch'
      : (overview?.detail.employees.length ?? 0) === 0
        ? 'empty'
        : 'ready';

  return { status, now, branches, branchId, branch, overview };
}
