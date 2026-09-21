import type { AttendanceRecord, Announcement, Department, Employee, Member, Shift, ShiftAssignment, Task } from '../../types/domain.js';
import { emailKey } from '../../lib/members.js';
import type { ScheduleIconName } from '../scheduling/grid/ScheduleIcon.js';
import type { Tone } from '../scheduling/grid/scheduleFormat.js';

/*
 * The Recent Activity feed, as the design handoff draws it
 * (`ShiftOS Dashboards.dc.html`: `PAGES["Manager/Recent Activity"]`, the
 * `kindActivity` markup at lines 1499-1590, `ACTIVITY` / `ACTIVITY_STATS` at
 * 3473-3492 and the `activityRows` values at 5355-5400).
 *
 * The handoff's fixture comes from an `activity_log` table this system does
 * not have; `audit_logs` is append-only plumbing keyed by login, not by
 * person, and only some services write to it. So the feed is composed from
 * what actually happened — today's clock-ins, task movements, published
 * announcements and the shifts that have started — which is exactly the set
 * of rows the design shows, with real names against them.
 */

export type ActivityType = 'Employee Actions' | 'Task Updates' | 'System Events';
export const ACTIVITY_TYPES: ActivityType[] = ['Employee Actions', 'Task Updates', 'System Events'];

export type ActivityRange = 'Today' | 'Yesterday' | 'Last 7 days';
export const ACTIVITY_RANGES: ActivityRange[] = ['Today', 'Yesterday', 'Last 7 days'];

export type ActivitySort = 'Newest first' | 'Oldest first';

export const PER_PAGE = 8;

export interface ActivityEvent {
  id: string;
  /** When it happened, for sorting and the range filter. */
  at: number;
  /** '08:15 AM' — and the date too, when the feed reaches past today. */
  time: string;
  icon: ScheduleIconName;
  tone: Tone;
  title: string;
  /** The handoff's red word after the title ("late"). */
  accent: string;
  desc: string;
  person: string;
  role: string;
  type: ActivityType;
}

const clock = (at: Date): string => {
  const hours = at.getHours();
  return `${String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
};

const dateOf = (at: Date): string => `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;

/** 'HH:MM:SS' on a date → a timestamp in the viewer's own timezone. */
const atTime = (date: string, time: string): number => new Date(`${date}T${time}`).getTime();

/**
 * Minutes late, derived from the shift's own start — `late_minutes` is zeroed
 * by the database (011/018), and the branch-range read doesn't join the shift,
 * so it comes through the assignment like the Attendance screen's does.
 */
function lateBy(record: AttendanceRecord, shift: Shift | undefined): number {
  if (!record.clock_in_at || !shift) return 0;
  const minutes = Math.round((new Date(record.clock_in_at).getTime() - atTime(shift.shift_date, shift.start_time)) / 60000);
  return minutes > 0 ? minutes : 0;
}

export interface ActivitySources {
  now: Date;
  branchName: string;
  employees: Employee[];
  departments: Department[];
  members: Member[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  announcements: Announcement[];
}

/** Everything that happened, newest first. The page filters and pages it. */
export function buildActivity({
  now,
  branchName,
  employees,
  departments,
  members,
  shifts,
  assignments,
  attendance,
  tasks,
  announcements
}: ActivitySources): ActivityEvent[] {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const departmentById = new Map(departments.map((department) => [department.id, department.name]));
  const nameOf = (employee: Employee | undefined): string => (employee ? `${employee.first_name} ${employee.last_name}`.trim() : 'Someone');
  const roleOf = (employee: Employee | undefined): string =>
    (employee?.department_id ? departmentById.get(employee.department_id) : undefined) ?? 'Employee';

  // Announcements carry the login that posted them, not an employee; the member list is the only bridge to a name.
  const memberByUser = new Map(members.map((member) => [member.user_id, member]));
  const employeeByEmail = new Map(employees.map((employee) => [emailKey(employee.email) ?? employee.id, employee]));
  const posterOf = (userId: string | null): { person: string; role: string } => {
    const member = userId ? memberByUser.get(userId) : undefined;
    if (!member) return { person: branchName, role: 'ShiftOS' };
    const employee = employeeByEmail.get(emailKey(member.user_email) ?? '');
    const name = `${member.user_first_name ?? ''} ${member.user_last_name ?? ''}`.trim();
    return { person: name || nameOf(employee) , role: member.role_name ?? roleOf(employee) };
  };

  // The branch-range attendance read carries no shift, so it is reached through the assignment.
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const shiftByAssignment = new Map(assignments.map((assignment) => [assignment.id, shiftById.get(assignment.shift_id)]));

  const events: ActivityEvent[] = [];
  const push = (event: ActivityEvent): void => {
    if (Number.isFinite(event.at)) events.push(event);
  };
  const stamp = (iso: string): { at: number; time: string } => {
    const at = new Date(iso);
    const today = dateOf(now);
    const day = dateOf(at);
    return { at: at.getTime(), time: day === today ? clock(at) : `${clock(at)} · ${at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` };
  };

  for (const record of attendance) {
    const employee = employeeById.get(record.employee_id);
    const person = nameOf(employee);
    const role = roleOf(employee);

    const shift = shiftByAssignment.get(record.shift_assignment_id);

    if (record.clock_in_at) {
      const late = lateBy(record, shift);
      const { at, time } = stamp(record.clock_in_at);
      push({
        id: `in-${record.id}`,
        at,
        time,
        icon: late > 0 ? 'users' : 'checkCircle',
        tone: late > 0 ? 'bad' : 'ok',
        title: late > 0 ? `${person} marked` : `${person} checked in`,
        accent: late > 0 ? 'late' : '',
        desc: `Check-in time: ${clock(new Date(record.clock_in_at))}${late > 0 ? ` (${late}m late)` : ''}`,
        person,
        role,
        type: 'Employee Actions'
      });
    }

    if (record.clock_out_at) {
      const { at, time } = stamp(record.clock_out_at);
      push({
        id: `out-${record.id}`,
        at,
        time,
        icon: 'clock',
        tone: 'neutral',
        title: `${person} checked out`,
        accent: '',
        desc: `Check-out time: ${clock(new Date(record.clock_out_at))}`,
        person,
        role,
        type: 'Employee Actions'
      });
    }

    if (record.attendance_status === 'absent' && shift) {
      const at = atTime(shift.shift_date, shift.start_time);
      push({
        id: `absent-${record.id}`,
        at,
        time: stamp(new Date(at).toISOString()).time,
        icon: 'x',
        tone: 'bad',
        title: `${person} marked`,
        accent: 'absent',
        desc: `No show for ${shift.title ?? 'their shift'}`,
        person,
        role,
        type: 'Employee Actions'
      });
    }
  }

  for (const task of tasks) {
    if (task.deleted_at) continue;
    const owner = task.assigned_supervisor_id ? employeeById.get(task.assigned_supervisor_id) : undefined;
    const person = owner ? nameOf(owner) : branchName;
    const role = owner ? roleOf(owner) : 'Unassigned';

    if (task.completed_at) {
      const { at, time } = stamp(task.completed_at);
      push({ id: `done-${task.id}`, at, time, icon: 'clipboard', tone: 'info', title: 'Task completed', accent: '', desc: `${task.title} completed`, person, role, type: 'Task Updates' });
    }
    if (task.assigned_at) {
      const { at, time } = stamp(task.assigned_at);
      push({
        id: `assigned-${task.id}`,
        at,
        time,
        icon: 'clipboard',
        tone: 'info',
        title: 'Task assigned',
        accent: '',
        desc: `${task.title} assigned to ${person}`,
        person,
        role,
        type: 'Task Updates'
      });
    }
    if (!task.assigned_at && !task.completed_at) {
      const { at, time } = stamp(task.created_at);
      push({ id: `new-${task.id}`, at, time, icon: 'clipboard', tone: 'violet', title: 'Task created', accent: '', desc: `${task.title} added to the board`, person, role, type: 'Task Updates' });
    }
  }

  for (const announcement of announcements) {
    if (!announcement.published_at || announcement.deleted_at) continue;
    const { at, time } = stamp(announcement.published_at);
    const by = posterOf(announcement.created_by);
    push({ id: `ann-${announcement.id}`, at, time, icon: 'megaphone', tone: 'primary', title: 'Announcement posted', accent: '', desc: announcement.title, ...by, type: 'System Events' });
  }

  // A shift is an event once it has actually started, and only if somebody is on it.
  const staffed = new Set(assignments.filter((assignment) => assignment.assignment_status !== 'cancelled').map((assignment) => assignment.shift_id));
  for (const shift of shifts) {
    if (shift.status !== 'published' || shift.deleted_at || !staffed.has(shift.id)) continue;
    const at = atTime(shift.shift_date, shift.start_time);
    if (!Number.isFinite(at) || at > now.getTime()) continue;
    const { time } = stamp(new Date(at).toISOString());
    push({
      id: `shift-${shift.id}`,
      at,
      time,
      icon: 'users',
      tone: 'violet',
      title: 'Shift started',
      accent: '',
      desc: `${shift.title ?? 'Shift'} (${clock(new Date(at))} – ${clock(new Date(atTime(shift.shift_date, shift.end_time)))})`,
      person: branchName,
      role: (shift.department_id ? departmentById.get(shift.department_id) : undefined) ?? 'Schedule',
      type: 'System Events'
    });
  }

  return events.sort((left, right) => right.at - left.at);
}

/** The window a range covers, as [from, to) timestamps. */
export function rangeWindow(range: ActivityRange, now: Date): [number, number] {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86_400_000;
  if (range === 'Yesterday') return [midnight - DAY, midnight];
  if (range === 'Last 7 days') return [midnight - 6 * DAY, midnight + DAY];
  return [midnight, midnight + DAY];
}

export interface ActivityFilters {
  type: string;
  person: string;
  range: ActivityRange;
  query: string;
  sort: ActivitySort;
}

export function filterActivity(events: ActivityEvent[], { type, person, range, query, sort }: ActivityFilters, now: Date): ActivityEvent[] {
  const [from, to] = rangeWindow(range, now);
  const needle = query.trim().toLowerCase();
  const shown = events.filter((event) => {
    if (event.at < from || event.at >= to) return false;
    if (type !== 'All Types' && event.type !== type) return false;
    if (person !== 'All People' && event.person !== person) return false;
    if (needle && !`${event.title} ${event.desc} ${event.person}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  return sort === 'Oldest first' ? shown.reverse() : shown;
}

/** Everyone who appears in the feed, for the Person filter. */
export function peopleIn(events: ActivityEvent[]): string[] {
  return [...new Set(events.map((event) => event.person))].sort((left, right) => left.localeCompare(right));
}

export interface ActivityStat {
  label: string;
  value: string;
  meta: string;
  icon: ScheduleIconName;
  tone: Tone;
}

/** The four tiles: the total, then each type with its share of it. */
export function activityStats(events: ActivityEvent[]): ActivityStat[] {
  const total = events.length;
  const share = (count: number): string => (total === 0 ? '0%' : `${Math.round((count / total) * 100)}%`);
  const count = (type: ActivityType): number => events.filter((event) => event.type === type).length;
  return [
    { label: 'Total Activities', value: String(total), meta: 'In view', icon: 'activity', tone: 'info' },
    { label: 'System Events', value: String(count('System Events')), meta: share(count('System Events')), icon: 'checkCircle', tone: 'ok' },
    { label: 'Employee Actions', value: String(count('Employee Actions')), meta: share(count('Employee Actions')), icon: 'users', tone: 'primary' },
    { label: 'Task Updates', value: String(count('Task Updates')), meta: share(count('Task Updates')), icon: 'clipboard', tone: 'violet' }
  ];
}

/** "Showing 1 to 8 of 24 activities". */
export function showingLabel(total: number, page: number): string {
  if (total === 0) return 'Showing 0 activities';
  const first = page * PER_PAGE + 1;
  const last = Math.min(total, (page + 1) * PER_PAGE);
  return `Showing ${first} to ${last} of ${total} ${total === 1 ? 'activity' : 'activities'}`;
}

/** The subtitle: "All real-time activities and updates from today's shift · May 16, 2025". */
export function activitySubtitle(now: Date, range: ActivityRange): string {
  const day = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (range === 'Today') return `All real-time activities and updates from today's shift · ${day}`;
  if (range === 'Yesterday') return `Everything that happened yesterday · ${new Date(now.getTime() - 86_400_000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  return `Everything from the last seven days · up to ${day}`;
}
