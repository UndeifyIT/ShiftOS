<<<<<<< HEAD
import type { Announcement, AttendanceRecord, Department, Employee, LeaveRequest, Member, Schedule, Shift, ShiftAssignment, Task } from '../../types/domain.js';
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

const LEAVE_LABEL: Record<string, string> = {
  annual_leave: 'Annual leave',
  sick_leave: 'Sick leave',
  unpaid_leave: 'Unpaid leave',
  maternity_leave: 'Maternity leave',
  paternity_leave: 'Paternity leave',
  compassionate_leave: 'Compassionate leave',
  study_leave: 'Study leave'
};

/** '02 Jun', '02 – 04 Jun', or '30 May – 02 Jun' — the month is said once when it can be. */
function dayRange(start: string, end: string): string {
  const parse = (date: string): Date => new Date(`${date}T00:00:00`);
  const day = (date: Date): string => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const [from, to] = [parse(start), parse(end)];
  if (start === end) return day(from);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${String(from.getDate()).padStart(2, '0')} – ${day(to)}`;
  }
  return `${day(from)} – ${day(to)}`;
}

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
  schedules: Schedule[];
  leave: LeaveRequest[];
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
  announcements,
  schedules,
  leave
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

  for (const request of leave) {
    if (request.deleted_at) continue;
    const employee = employeeById.get(request.employee_id);
    const person = nameOf(employee);
    const { at, time } = stamp(request.created_at);
    push({
      id: `leave-${request.id}`,
      at,
      time,
      icon: 'user',
      tone: 'warn',
      title: `${person} requested leave`,
      accent: '',
      desc: `${LEAVE_LABEL[request.leave_type] ?? 'Leave'} · ${dayRange(request.start_date, request.end_date)}`,
      person,
      role: roleOf(employee),
      type: 'Employee Actions'
    });
  }

  for (const schedule of schedules) {
    if (schedule.status !== 'published' || schedule.deleted_at) continue;
    const { at, time } = stamp(schedule.updated_at);
    push({
      id: `schedule-${schedule.id}`,
      at,
      time,
      icon: 'calendar',
      tone: 'violet',
      title: 'Schedule published',
      accent: '',
      desc: `${schedule.name} is live for the team`,
      person: branchName,
      role: 'Schedule',
      type: 'System Events'
    });
  }

  // A shift is an event once it has actually started, and only if somebody is
  // on it. A branch that runs the same hours in five departments started ONE
  // shift, not five, so identical hours collapse into a single row — the
  // handoff shows one "Shift started" line, not a column of them.
  const staffed = new Set(assignments.filter((assignment) => assignment.assignment_status !== 'cancelled').map((assignment) => assignment.shift_id));
  const started = new Map<string, { at: number; end: number; title: string; departments: Set<string> }>();
  for (const shift of shifts) {
    if (shift.status !== 'published' || shift.deleted_at || !staffed.has(shift.id)) continue;
    const at = atTime(shift.shift_date, shift.start_time);
    if (!Number.isFinite(at) || at > now.getTime()) continue;
    const key = `${shift.shift_date}|${shift.start_time}|${shift.end_time}|${shift.title ?? ''}`;
    const group = started.get(key) ?? { at, end: atTime(shift.shift_date, shift.end_time), title: shift.title ?? 'Shift', departments: new Set<string>() };
    const department = shift.department_id ? departmentById.get(shift.department_id) : undefined;
    if (department) group.departments.add(department);
    started.set(key, group);
  }
  for (const [key, group] of started) {
    push({
      id: `shift-${key}`,
      at: group.at,
      time: stamp(new Date(group.at).toISOString()).time,
      icon: 'users',
      tone: 'violet',
      title: 'Shift started',
      accent: '',
      desc: `${group.title} (${clock(new Date(group.at))} – ${clock(new Date(group.end))})`,
      person: branchName,
      role: group.departments.size === 1 ? [...group.departments][0]! : 'Schedule',
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
=======
import type { ActivityCategory, ActivityEvent } from '../dashboard/manager/overviewModel.js';

/*
 * The Recent Activity page's pure helpers: the handoff's four stat tiles, the
 * Type / Person / Date range filters, search, sort, the 8-row pager and the
 * CSV export. Events come from buildManagerOverview (the last 7 days).
 */

export const PAGE_SIZE = 8;
export const CATEGORIES: ActivityCategory[] = ['System Events', 'Employee Actions', 'Task Updates'];
export type DateRange = 'Today' | 'Last 7 days';
export const DATE_RANGES: DateRange[] = ['Today', 'Last 7 days'];
export type SortOrder = 'Newest first' | 'Oldest first';

export interface ActivityFilters {
  type: ActivityCategory | 'All Types';
  person: string | 'All People';
  range: DateRange;
  query: string;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: ActivityFilters = { type: 'All Types', person: 'All People', range: 'Today', query: '', sort: 'Newest first' };

const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dd = (at: Date): string => String(at.getDate()).padStart(2, '0');

/** Handoff export Range: '16 May 2025' for today, '10 – 16 May 2025' for the last 7 days. */
export function rangeLabel(range: DateRange, now: Date): string {
  const end = `${dd(now)} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (range === 'Today') return end;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (start.getFullYear() !== now.getFullYear()) return `${dd(start)} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end}`;
  if (start.getMonth() !== now.getMonth()) return `${dd(start)} ${MONTHS[start.getMonth()]} – ${end}`;
  return `${dd(start)} – ${end}`;
}

export function inRange(events: ActivityEvent[], range: DateRange, now: Date): ActivityEvent[] {
  return range === 'Today' ? events.filter((event) => sameDay(event.at, now)) : events;
>>>>>>> origin/main
}

export interface ActivityStat {
  label: string;
  value: string;
  meta: string;
<<<<<<< HEAD
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
=======
  icon: 'activity' | 'checkCircle' | 'users' | 'clipboard';
  tone: 'info' | 'ok' | 'primary' | 'violet';
}

/** Handoff ACTIVITY_STATS: the total, then each bucket with its share of the total. */
export function activityStats(events: ActivityEvent[], range: DateRange): ActivityStat[] {
  const total = events.length;
  const share = (category: ActivityCategory): { value: string; meta: string } => {
    const count = events.filter((event) => event.category === category).length;
    return { value: String(count), meta: total ? `${Math.round((count / total) * 100)}%` : '0%' };
  };
  return [
    { label: 'Total Activities', value: String(total), meta: range, icon: 'activity', tone: 'info' },
    { label: 'System Events', ...share('System Events'), icon: 'checkCircle', tone: 'ok' },
    { label: 'Employee Actions', ...share('Employee Actions'), icon: 'users', tone: 'primary' },
    { label: 'Task Updates', ...share('Task Updates'), icon: 'clipboard', tone: 'violet' }
  ];
}

/** Everyone who appears in the range, alphabetically — the Person filter's choices. */
export function peopleIn(events: ActivityEvent[]): string[] {
  return [...new Set(events.map((event) => event.person))].sort((a, b) => a.localeCompare(b));
}

export function filterActivity(events: ActivityEvent[], filters: ActivityFilters, now: Date): ActivityEvent[] {
  const needle = filters.query.trim().toLowerCase();
  const rows = inRange(events, filters.range, now).filter(
    (event) =>
      (filters.type === 'All Types' || event.category === filters.type) &&
      (filters.person === 'All People' || event.person === filters.person) &&
      (!needle || [event.title, event.desc, event.person, event.role].some((text) => text.toLowerCase().includes(needle)))
  );
  const direction = filters.sort === 'Newest first' ? -1 : 1;
  return [...rows].sort((a, b) => direction * (a.at.getTime() - b.at.getTime()));
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** 'Showing 1 to 8 of 24 activities' */
export function showingLine(page: number, total: number): string {
  if (total === 0) return 'Showing 0 activities';
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return `Showing ${from} to ${to} of ${total} ${total === 1 ? 'activity' : 'activities'}`;
}

/** The pager buttons: up to three page numbers around the current one, then → when there's a next page. */
export function pagerPages(page: number, pages: number): number[] {
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  return Array.from({ length: Math.min(3, pages) }, (_, index) => start + index);
}

export function activityCsvRows(events: ActivityEvent[]): string[][] {
  return [
    ['Date', 'Time', 'Activity', 'Details', 'Person', 'Role', 'Type'],
    ...events.map((event) => [event.at.toLocaleDateString('en-GB'), event.time, event.title, event.desc, event.person, event.role, event.category])
  ];
>>>>>>> origin/main
}
