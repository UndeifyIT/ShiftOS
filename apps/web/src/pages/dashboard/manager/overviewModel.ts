/**
 * Builds the Manager "Branch overview" from real branch data, shaped exactly
 * like the design handoff's HOME.Manager block (`ShiftOS Dashboards.dc.html`):
 * four stats, "Department coverage today", "Needs your attention", the
 * announcement and activity previews, and the Shifty nudge. Pure — every
 * number here is derived from the rows passed in, and `now` is injected.
 */
import { emailKey } from '../../../lib/members.js';
import type {
  AnnouncementType,
  Announcement,
  AttendanceRecord,
  Branch,
  Department,
  Employee,
  Invitation,
  LeaveRequest,
  LeaveType,
  Member,
  Schedule,
  Shift,
  ShiftAssignment,
  ShiftSwap,
  Task
} from '../../../types/domain.js';
import { addDays, clockMinutes, fullName, todayDateString, weekStartOf, type Tone } from '../../scheduling/grid/scheduleFormat.js';

export interface OverviewInput {
  now: Date;
  branch: Branch;
  employees: Employee[];
  departments: Department[];
  members: Member[];
  schedules: Schedule[];
  /** Shifts and assignments of the published schedules covering this week. */
  shifts: Shift[];
  assignments: ShiftAssignment[];
  /** Attendance created from this week's Monday up to now. */
  attendance: AttendanceRecord[];
  pendingLeave: LeaveRequest[];
  pendingSwaps: ShiftSwap[];
  invitations: Invitation[];
  announcements: Announcement[];
  tasks: Task[];
}

export interface OverviewStat {
  label: string;
  value: string;
  meta: string;
  color: string;
}

export interface CoverageRow {
  key: string;
  name: string;
  sub: string;
  middle: string;
  pct: number;
  barColor: string;
  barLabel: string;
  status: string;
  tone: Tone;
  scheduled: number;
  checkedIn: number;
}

export interface AttentionItem {
  title: string;
  meta: string;
  tag: string;
  tone: Tone;
  done: boolean;
}

export interface AnnouncementPreview {
  id: string;
  title: string;
  body: string;
  meta: string;
  color: string;
}

export type ActivityIcon = 'users' | 'checkCircle' | 'clipboard' | 'megaphone' | 'calendar' | 'user';

/** The Recent Activity page's three buckets (handoff ACTIVITY `type`). */
export type ActivityCategory = 'System Events' | 'Employee Actions' | 'Task Updates';

export interface ActivityEvent {
  key: string;
  at: Date;
  title: string;
  time: string;
  icon: ActivityIcon;
  tone: Tone;
  /** `title` split for the handoff's red accent word: 'Mary Johnson marked' + 'late'. */
  headline: string;
  accent: string | null;
  /** Second line: 'Check-in time: 08:15 AM (15m late)'. */
  desc: string;
  /** Who it concerns, and their department or role ('System' · 'Automated' when nobody did it). */
  person: string;
  role: string;
  category: ActivityCategory;
  /** The page the row's menu opens. */
  href: string;
}

interface EventDetail {
  accent?: string;
  desc: string;
  person: string;
  role: string;
  category: ActivityCategory;
  href: string;
}

export interface TodayAssignment {
  assignment: ShiftAssignment;
  shift: Shift;
  employee: Employee | undefined;
  record: AttendanceRecord | undefined;
  departmentName: string;
}

export interface GapShift {
  shift: Shift;
  departmentName: string;
}

export interface ManagerOverview {
  today: string;
  weekStart: string;
  nextWeekStart: string;
  subtitle: string;
  stats: OverviewStat[];
  coverageRows: CoverageRow[];
  attention: AttentionItem[];
  openAttentionCount: number;
  announcementPreviews: AnnouncementPreview[];
  activity: ActivityEvent[];
  showShifty: boolean;
  nextWeekPublished: boolean;
  payrollRange: string;
  /** Raw derived collections the Ask ShiftOS answers read from. */
  detail: {
    branchName: string;
    employees: Employee[];
    departments: Department[];
    today: TodayAssignment[];
    gaps: GapShift[];
    pendingInvitations: Invitation[];
    pendingLeave: LeaveRequest[];
    pendingSwaps: ShiftSwap[];
    employeesById: Map<string, Employee>;
    attendanceWeek: AttendanceRecord[];
    lastAnnouncement: Announcement | undefined;
  };
}

export const C = {
  ink: '#38312B',
  mute: '#857A72',
  faint: '#A79C93',
  line: '#EBE7E3',
  primary: '#F04E17',
  deep: '#C6420E',
  ok: '#2E9E62',
  warn: '#B77714',
  bad: '#C93A22',
  info: '#2563EB',
  violet: '#7C3AED'
} as const;

/** The first colour of each handoff TONES pair — dots, bars and activity icons. */
export const TONE_FG: Record<Tone, string> = {
  ok: C.ok,
  warn: C.warn,
  bad: C.bad,
  info: C.info,
  primary: C.deep,
  violet: C.violet,
  neutral: C.mute
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;

const plural = (count: number, word: string, many = `${word}s`): string => `${count} ${count === 1 ? word : many}`;

function parseDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** '07:58 AM' — the handoff's clock and activity times. */
export function clock12(at: Date): string {
  const hours = at.getHours();
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hours12).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** 'May 16, 2025' — the header clock pill's date line. */
export function pillDate(at: Date): string {
  return `${MONTHS[at.getMonth()]} ${at.getDate()}, ${at.getFullYear()}`;
}

/** 'Friday, May 16' */
export function longDay(at: Date): string {
  return `${WEEKDAYS_LONG[at.getDay()]}, ${MONTHS_LONG[at.getMonth()]} ${at.getDate()}`;
}

/** '12 May' for a 'YYYY-MM-DD' date. */
export function dayMonth(date: string): string {
  const value = parseDay(date);
  return `${String(value.getUTCDate()).padStart(2, '0')} ${MONTHS[value.getUTCMonth()]}`;
}

/** 'Wed 21 May' for a 'YYYY-MM-DD' date. */
export function weekdayDayMonth(date: string): string {
  return `${WEEKDAYS_SHORT[parseDay(date).getUTCDay()]} ${dayMonth(date)}`;
}

/** '02 – 04 Jun', '28 May', '30 May – 02 Jun' */
export function dateRange(start: string, end: string): string {
  if (start === end) return dayMonth(start);
  const a = parseDay(start);
  const b = parseDay(end);
  return a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()
    ? `${String(a.getUTCDate()).padStart(2, '0')} – ${dayMonth(end)}`
    : `${dayMonth(start)} – ${dayMonth(end)}`;
}

function localDay(at: Date): string {
  return todayDateString(at);
}

/** Whole calendar days between an instant and today (0 = today). */
export function daysAgo(iso: string, now: Date): number {
  return Math.max(0, Math.round((parseDay(localDay(now)).getTime() - parseDay(localDay(new Date(iso))).getTime()) / DAY_MS));
}

function agoText(days: number): string {
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

/** 'Today, 07:30 AM' / 'Yesterday, 05:40 PM' / '12 May' — announcement meta times. */
export function relativeStamp(iso: string, now: Date): string {
  const at = new Date(iso);
  const days = daysAgo(iso, now);
  if (days === 0) return `Today, ${clock12(at)}`;
  if (days === 1) return `Yesterday, ${clock12(at)}`;
  return dayMonth(localDay(at));
}

/** Activity rows: '08:15 AM' today, otherwise '12 May'. */
function activityTime(at: Date, now: Date): string {
  return localDay(at) === localDay(now) ? clock12(at) : dayMonth(localDay(at));
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual_leave: 'Annual leave',
  sick_leave: 'Sick leave',
  emergency_leave: 'Emergency leave',
  unpaid_leave: 'Unpaid leave'
};

const ANNOUNCEMENT_TONE: Record<AnnouncementType, Tone> = {
  general: 'primary',
  operational: 'info',
  policy: 'violet',
  safety: 'warn',
  emergency: 'bad'
};

const LIVE_ASSIGNMENT = new Set(['assigned', 'confirmed', 'completed']);
const LIVE_SHIFT = (shift: Shift): boolean => shift.is_active && !shift.deleted_at && shift.status !== 'cancelled' && shift.status !== 'archived';

/** Handoff bar(): the coverage bar colour follows its status. */
function coverageStatus(dueCount: number, dueCheckedIn: number): { status: string; tone: Tone } {
  if (dueCount === 0) return { status: 'Upcoming', tone: 'neutral' };
  const pct = (dueCheckedIn / dueCount) * 100;
  if (pct >= 85) return { status: 'Healthy', tone: 'ok' };
  if (pct >= 70) return { status: 'Watch', tone: 'warn' };
  return { status: 'At risk', tone: 'bad' };
}

function overlaps(schedule: Schedule, start: string, end: string): boolean {
  return !schedule.deleted_at && schedule.start_date <= end && schedule.end_date >= start;
}

export function buildManagerOverview(input: OverviewInput): ManagerOverview {
  const { now, branch } = input;
  const today = localDay(now);
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekStart, 13);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const employees = input.employees.filter((e) => e.is_active && !e.deleted_at && e.branch_id === branch.id);
  const employeesById = new Map(input.employees.map((e) => [e.id, e]));
  const departments = input.departments.filter((d) => d.is_active && !d.deleted_at);
  const departmentsById = new Map(departments.map((d) => [d.id, d]));

  const supervisorEmails = new Set(
    input.members
      .filter((m) => m.is_active && !m.deleted_at && /supervisor/i.test(m.role_name))
      .map((m) => emailKey(m.user_email))
      .filter((email): email is string => email !== null)
  );
  const isSupervisor = (employee: Employee | undefined): boolean => Boolean(employee?.email && supervisorEmails.has(employee.email.toLowerCase()));
  const supervisorCount = employees.filter(isSupervisor).length;

  const shifts = [...new Map(input.shifts.filter(LIVE_SHIFT).filter((s) => s.shift_date >= weekStart && s.shift_date <= weekEnd).map((s) => [s.id, s])).values()];
  const shiftsById = new Map(shifts.map((s) => [s.id, s]));
  const assignments = [...new Map(input.assignments.filter((a) => !a.deleted_at && LIVE_ASSIGNMENT.has(a.assignment_status)).map((a) => [a.id, a])).values()];
  const recordByAssignment = new Map(input.attendance.filter((r) => !r.deleted_at).map((r) => [r.shift_assignment_id, r]));

  const departmentOf = (shift: Shift, employee: Employee | undefined): string | null => shift.department_id ?? employee?.department_id ?? null;
  const departmentName = (id: string | null): string => (id ? departmentsById.get(id)?.name ?? 'No department' : 'No department');

  const todayRows: TodayAssignment[] = assignments
    .map((assignment) => ({ assignment, shift: shiftsById.get(assignment.shift_id) }))
    .filter((row): row is { assignment: ShiftAssignment; shift: Shift } => Boolean(row.shift) && row.shift?.shift_date === today)
    .map(({ assignment, shift }) => {
      const employee = employeesById.get(assignment.employee_id);
      return { assignment, shift, employee, record: recordByAssignment.get(assignment.id), departmentName: departmentName(departmentOf(shift, employee)) };
    });

  const checkedIn = (row: TodayAssignment): boolean => Boolean(row.record?.clock_in_at);
  const onShiftNow = todayRows.filter((row) => row.record?.clock_in_at && !row.record.clock_out_at).length;

  const assignedShiftIds = new Set(assignments.map((a) => a.shift_id));
  const gaps: GapShift[] = shifts
    .filter((shift) => !assignedShiftIds.has(shift.id))
    .sort((a, b) => a.shift_date.localeCompare(b.shift_date) || a.start_time.localeCompare(b.start_time))
    .map((shift) => ({ shift, departmentName: departmentName(shift.department_id ?? null) }));

  const pendingInvitations = input.invitations
    .filter((i) => i.status === 'pending' && new Date(i.expires_at).getTime() > now.getTime())
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pendingLeave = [...input.pendingLeave].filter((l) => l.status === 'pending').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pendingSwaps = [...input.pendingSwaps].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const stats: OverviewStat[] = [
    {
      label: 'Employees',
      value: String(employees.length),
      meta: `${plural(supervisorCount, 'supervisor')} · ${employees.length - supervisorCount} staff`,
      color: C.primary
    },
    { label: 'On shift now', value: String(onShiftNow), meta: `of ${todayRows.length} scheduled`, color: C.info },
    { label: 'Coverage gaps', value: String(gaps.length), meta: 'This week, unfilled', color: C.bad },
    {
      label: 'Open requests',
      value: String(pendingSwaps.length + pendingLeave.length),
      meta: `${plural(pendingSwaps.length, 'swap')} · ${pendingLeave.length} leave`,
      color: C.ok
    }
  ];

  // Department coverage today — one row per department with people scheduled.
  const groups = new Map<string, TodayAssignment[]>();
  for (const row of todayRows) {
    const key = departmentOf(row.shift, row.employee) ?? 'none';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const coverageRows: CoverageRow[] = [...groups.entries()]
    .map(([key, rows]) => {
      const name = key === 'none' ? 'No department' : departmentName(key);
      const due = rows.filter((row) => clockMinutes(row.shift.start_time) <= nowMinutes);
      const inCount = rows.filter(checkedIn).length;
      const { status, tone } = coverageStatus(due.length, due.filter(checkedIn).length);
      const supervisor = rows.find((row) => isSupervisor(row.employee))?.employee;
      return {
        key,
        name,
        sub: supervisor ? `${fullName(supervisor)} · Supervisor` : 'No supervisor on shift',
        middle: `${rows.length} scheduled`,
        pct: Math.round((inCount / rows.length) * 100),
        barColor: tone === 'neutral' ? C.line : TONE_FG[tone],
        barLabel: `${inCount} of ${rows.length} checked in`,
        status,
        tone,
        scheduled: rows.length,
        checkedIn: inCount
      };
    })
    .sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name)));

  const publishedCovering = (start: string, end: string): Schedule | undefined =>
    input.schedules.find((s) => s.status === 'published' && overlaps(s, start, end));
  const thisWeekPublished = publishedCovering(weekStart, weekEnd);
  const nextWeekPublished = Boolean(publishedCovering(nextWeekStart, nextWeekEnd));

  const attention: AttentionItem[] = [];
  if (supervisorCount > 0) {
    for (const row of coverageRows) {
      if (row.key !== 'none' && row.sub === 'No supervisor on shift') {
        attention.push({ title: `${row.name} has no supervisor on shift`, meta: `${row.scheduled} scheduled today`, tag: 'Blocking', tone: 'bad', done: false });
      }
    }
  }
  if (!nextWeekPublished) {
    attention.push({ title: "Next week's schedule is unpublished", meta: 'Closes Sunday', tag: 'Scheduling', tone: 'warn', done: false });
  }
  if (pendingInvitations.length > 0) {
    const allSupervisors = pendingInvitations.every((i) => /supervisor/i.test(i.role_name));
    attention.push({
      title: `${pendingInvitations.length} ${allSupervisors ? 'supervisor ' : ''}invitation${pendingInvitations.length === 1 ? '' : 's'} pending`,
      meta: `Sent ${agoText(daysAgo(pendingInvitations[0].created_at, now))}`,
      tag: 'Invitations',
      tone: 'info',
      done: false
    });
  }
  if (pendingSwaps.length > 0) {
    const age = daysAgo(pendingSwaps[0].created_at, now);
    attention.push({
      title: `${plural(pendingSwaps.length, 'swap request')} waiting on you`,
      meta: age === 0 ? 'Raised today' : `${plural(age, 'day')} old`,
      tag: 'Swaps',
      tone: 'violet',
      done: false
    });
  }
  if (pendingLeave.length > 0) {
    const first = pendingLeave[0];
    const person = employeesById.get(first.employee_id);
    attention.push({
      title: `${plural(pendingLeave.length, 'leave request')} waiting on you`,
      meta: `${person ? `${fullName(person)} · ` : ''}${dateRange(first.start_date, first.end_date)}`,
      tag: 'Leave',
      tone: 'primary',
      done: false
    });
  }
  if (thisWeekPublished) {
    attention.push({ title: "This week's schedule is published", meta: `${thisWeekPublished.name}`, tag: 'Scheduling', tone: 'ok', done: true });
  }

  const membersByUser = new Map(input.members.map((m) => [m.user_id, m]));
  const liveAnnouncements = input.announcements
    .filter((a) => a.is_published && !a.deleted_at && (!a.expires_at || new Date(a.expires_at).getTime() > now.getTime()))
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));
  const announcementPreviews: AnnouncementPreview[] = liveAnnouncements.slice(0, 2).map((a) => {
    const author = membersByUser.get(a.created_by);
    const authorLabel = author ? `${`${author.user_first_name} ${author.user_last_name}`.trim()} · ${author.role_name}` : 'ShiftOS';
    return {
      id: a.id,
      title: a.title.length > 46 ? `${a.title.slice(0, 44)}…` : a.title,
      body: a.content,
      meta: `${authorLabel} · ${relativeStamp(a.published_at ?? a.created_at, now)}`,
      color: TONE_FG[ANNOUNCEMENT_TONE[a.announcement_type] ?? 'primary']
    };
  });

  const weekAgo = now.getTime() - 7 * DAY_MS;
  const events: ActivityEvent[] = [];
  const pushEvent = (key: string, iso: string | null, headline: string, icon: ActivityIcon, tone: Tone, detail: EventDetail): void => {
    if (!iso) return;
    const at = new Date(iso);
    if (Number.isNaN(at.getTime()) || at.getTime() < weekAgo || at.getTime() > now.getTime()) return;
    const accent = detail.accent ?? null;
    events.push({
      key,
      at,
      title: accent ? `${headline} ${accent}` : headline,
      time: activityTime(at, now),
      icon,
      tone,
      headline,
      accent,
      desc: detail.desc,
      person: detail.person,
      role: detail.role,
      category: detail.category,
      href: detail.href
    });
  };
  const departmentOfEmployee = (person: Employee | undefined): string =>
    person?.department_id ? departmentsById.get(person.department_id)?.name ?? 'Staff' : 'Staff';
  const memberName = (userId: string | null): { person: string; role: string } | null => {
    const member = userId ? membersByUser.get(userId) : undefined;
    return member ? { person: `${member.user_first_name} ${member.user_last_name}`.trim(), role: member.role_name } : null;
  };
  const SYSTEM = { person: 'System', role: 'Automated' };
  for (const record of input.attendance) {
    if (record.deleted_at) continue;
    const person = employeesById.get(record.employee_id);
    const name = person ? fullName(person) : 'Someone';
    const who = { person: name, role: departmentOfEmployee(person), category: 'Employee Actions' as const, href: '/attendance' };
    if (record.attendance_status === 'absent' || record.attendance_status === 'no_show') {
      pushEvent(`att-${record.id}`, record.updated_at, `${name} marked`, 'users', 'bad', { ...who, accent: 'absent', desc: 'No check-in recorded for this shift' });
    } else if (record.clock_in_at) {
      const late = record.attendance_status === 'late' || record.late_minutes > 0;
      const checkIn = `Check-in time: ${clock12(new Date(record.clock_in_at))}`;
      pushEvent(
        `att-${record.id}`,
        record.clock_in_at,
        late ? `${name} marked` : `${name} checked in`,
        late ? 'users' : 'checkCircle',
        late ? 'bad' : 'ok',
        late ? { ...who, accent: 'late', desc: `${checkIn} (${record.late_minutes}m late)` } : { ...who, desc: checkIn }
      );
    }
  }
  for (const task of input.tasks) {
    if (task.deleted_at) continue;
    const assignee = task.assigned_supervisor_id ? employeesById.get(task.assigned_supervisor_id) : undefined;
    const assigneeWho = assignee ? { person: fullName(assignee), role: departmentOfEmployee(assignee) } : null;
    if (task.completed_at) {
      pushEvent(`task-${task.id}`, task.completed_at, 'Task completed', 'clipboard', 'info', {
        ...(memberName(task.completed_by) ?? assigneeWho ?? SYSTEM),
        desc: `${task.title} completed`,
        category: 'Task Updates',
        href: '/tasks'
      });
    }
    if (task.assigned_at && assignee) {
      pushEvent(`task-assigned-${task.id}`, task.assigned_at, 'Task assigned', 'clipboard', 'info', {
        ...(assigneeWho ?? SYSTEM),
        desc: `${task.title} assigned to ${fullName(assignee)}`,
        category: 'Task Updates',
        href: '/tasks'
      });
    }
  }
  for (const announcement of liveAnnouncements) {
    pushEvent(`ann-${announcement.id}`, announcement.published_at, 'Announcement posted', 'megaphone', 'primary', {
      ...(memberName(announcement.created_by) ?? SYSTEM),
      desc: announcement.title,
      category: 'System Events',
      href: '/announcements'
    });
  }
  for (const schedule of input.schedules) {
    if (schedule.status === 'published') {
      pushEvent(`sch-${schedule.id}`, schedule.updated_at, `${schedule.name} published`, 'calendar', 'violet', {
        ...SYSTEM,
        desc: dateRange(schedule.start_date, schedule.end_date),
        category: 'System Events',
        href: '/schedules'
      });
    }
  }
  for (const leave of input.pendingLeave) {
    const person = employeesById.get(leave.employee_id);
    const name = person ? fullName(person) : 'Someone';
    pushEvent(`leave-${leave.id}`, leave.created_at, `${name} requested leave`, 'user', 'warn', {
      person: name,
      role: departmentOfEmployee(person),
      desc: `${LEAVE_TYPE_LABEL[leave.leave_type]} · ${dateRange(leave.start_date, leave.end_date)}`,
      category: 'Employee Actions',
      href: '/requests'
    });
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  const monthStart = `${today.slice(0, 8)}01`;

  return {
    today,
    weekStart,
    nextWeekStart,
    subtitle: `${branch.name} · ${longDay(now)}`,
    stats,
    coverageRows,
    attention,
    openAttentionCount: attention.filter((item) => !item.done).length,
    announcementPreviews,
    activity: events,
    showShifty: !nextWeekPublished,
    nextWeekPublished,
    payrollRange: `${MONTHS[parseDay(monthStart).getUTCMonth()]} ${parseDay(monthStart).getUTCDate()} – ${MONTHS[now.getMonth()]} ${now.getDate()}`,
    detail: {
      branchName: branch.name,
      employees,
      departments,
      today: todayRows,
      gaps,
      pendingInvitations,
      pendingLeave,
      pendingSwaps,
      employeesById,
      attendanceWeek: input.attendance.filter((r) => !r.deleted_at),
      lastAnnouncement: liveAnnouncements[0]
    }
  };
}

export { agoText, plural };
