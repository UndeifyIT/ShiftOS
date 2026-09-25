/**
 * The Staff home ("My Shift"), shaped like the design handoff's HOME.Staff
 * block (`ShiftOS Dashboards.dc.html`): the greeting, Next shift / Shifts this
 * week / Hours this week / Unread notices, the next four days as "My week",
 * the person's own swap and leave requests, and the shift actions. Pure —
 * built from what a Staff login can read about itself, with `now` injected.
 */
import type { Announcement, AttendanceRecord, Employee, LeaveRequest, Shift, ShiftSwap } from '../../types/domain.js';
import { addDays, clockMinutes, durationText, fullName, todayDateString, weekStartOf, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { buildAnnouncementPreviews, C, type AnnouncementPreview, type OverviewStat } from '../dashboard/manager/overviewModel.js';

export interface MyShiftInput {
  now: Date;
  /** My published shifts — this week's and next week's. */
  shifts: Shift[];
  /** Dates in a published week with no shift for me: an explicit day off, or nothing assigned. */
  publishedDates: Set<string>;
  swaps: ShiftSwap[];
  leave: LeaveRequest[];
  announcements: Announcement[];
  acknowledged: Map<string, boolean>;
  attendance: AttendanceRecord[];
  /** Everyone on the branch, to name the other side of a swap. */
  employees: Employee[];
  departments: Map<string, string>;
  timeZone: string | null;
}

export interface WeekRow {
  date: string;
  /** 'FRI\n16' */
  chip: string;
  today: boolean;
  name: string;
  sub: string;
  middle: string;
  barLabel: string;
  status: string;
  tone: Tone;
}

export interface RequestRow {
  key: string;
  title: string;
  meta: string;
  tag: string;
  tone: Tone;
  done: boolean;
}

export interface ShiftAction {
  title: string;
  body: string;
  tone: Tone;
  action: 'leave' | 'swap' | 'schedule';
}

export interface MyShift {
  title: string;
  subtitle: string;
  stats: OverviewStat[];
  week: WeekRow[];
  foot: string;
  requests: RequestRow[];
  openRequests: number;
  actions: ShiftAction[];
  announcementPreviews: AnnouncementPreview[];
  /** My next shift that hasn't finished, and whether anything at all is published for me. */
  next: Shift | null;
  hasSchedule: boolean;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const plural = (count: number, word: string, many = `${word}s`): string => `${count} ${count === 1 ? word : many}`;

function parseDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** '08:00' */
export const hm = (time: string): string => time.slice(0, 5);

/** 'FRI\n16' — the handoff's day chip. */
export function dayChip(date: string): string {
  const day = parseDay(date);
  return `${WEEKDAYS[day.getUTCDay()]}\n${day.getUTCDate()}`;
}

/** 'Mon 19 May' */
export function shortDay(date: string): string {
  const day = parseDay(date);
  return `${WEEKDAYS_SHORT[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`;
}

/** '09 June' */
function dayLongMonth(date: string): string {
  const day = parseDay(date);
  return `${String(day.getUTCDate()).padStart(2, '0')} ${MONTHS_LONG[day.getUTCMonth()]}`;
}

/** '12 May' for an instant. */
function dayMonthOf(iso: string): string {
  const at = new Date(iso);
  return `${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

/** When a shift starts and ends, as instants on the viewer's clock (an end at or before the start runs past midnight). */
function shiftWindow(shift: Shift): { start: Date; end: Date } {
  const [year, month, day] = shift.shift_date.split('-').map(Number);
  const startMinutes = clockMinutes(shift.start_time);
  let endMinutes = clockMinutes(shift.end_time);
  if (endMinutes <= startMinutes) endMinutes += 1440;
  return {
    start: new Date(year, month - 1, day, 0, startMinutes),
    end: new Date(year, month - 1, day, 0, endMinutes)
  };
}

/** 'in 2 minutes' / 'in 3 hours' / 'in 1 hour 20 minutes' */
function startsIn(minutes: number): { long: string; short: string } {
  if (minutes < 60) return { long: plural(minutes, 'minute'), short: `${minutes} min` };
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return {
    long: rest ? `${plural(hours, 'hour')} ${plural(rest, 'minute')}` : plural(hours, 'hour'),
    short: rest ? `${hours}h ${rest}m` : `${hours}h`
  };
}

function greeting(now: Date): string {
  const hour = now.getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

const isOpenSwap = (swap: ShiftSwap): boolean => swap.status === 'pending' || swap.status === 'accepted';

/** The swap still in play on one of my shifts (matched by the shift it moves). */
function openSwapFor(shift: Shift, swaps: ShiftSwap[], meId: string): ShiftSwap | undefined {
  return swaps.find(
    (s) => isOpenSwap(s) && s.requested_by_employee_id === meId && s.shift_date === shift.shift_date && s.shift_start_time?.slice(0, 5) === hm(shift.start_time)
  );
}

/** Monday–Friday between two dates, inclusive — the handoff's "Working days". */
export function workingDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  let count = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function buildMyShift(input: MyShiftInput, me: Employee): MyShift {
  const { now } = input;
  const today = todayDateString(now);
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  const shifts = [...input.shifts].sort((a, b) => (a.shift_date + a.start_time).localeCompare(b.shift_date + b.start_time));
  const dept = (id: string | null | undefined): string => (id ? input.departments.get(id) ?? '' : '');
  const shiftSub = (shift: Shift): string => [shift.title, dept(shift.department_id)].filter(Boolean).join(' · ');
  const nameOf = (id: string | null): string => {
    const person = id ? input.employees.find((e) => e.id === id) : undefined;
    return person ? fullName(person) : 'a teammate';
  };

  const next = shifts.find((s) => shiftWindow(s).end.getTime() > now.getTime()) ?? null;
  const todays = shifts.find((s) => s.shift_date === today) ?? null;

  // ---- header
  let subtitle: string;
  if (todays) {
    const { start, end } = shiftWindow(todays);
    const minutes = Math.round((start.getTime() - now.getTime()) / 60_000);
    subtitle =
      minutes > 0
        ? `You're on the ${todays.title} today — starts in ${startsIn(minutes).long}`
        : end.getTime() > now.getTime()
          ? `You're on the ${todays.title} today — until ${hm(todays.end_time)}`
          : next
            ? `Today's ${todays.title} is done — next up ${next.shift_date === addDays(today, 1) ? 'tomorrow' : WEEKDAYS_LONG[parseDay(next.shift_date).getUTCDay()]} at ${hm(next.start_time)}`
            : `Today's ${todays.title} is done`;
  } else if (next) {
    subtitle = `No shift today — your next one is ${next.shift_date === addDays(today, 1) ? 'tomorrow' : WEEKDAYS_LONG[parseDay(next.shift_date).getUTCDay()]} at ${hm(next.start_time)}`;
  } else {
    subtitle = 'Nothing on your published schedule yet';
  }

  // ---- stats
  const thisWeek = shifts.filter((s) => s.shift_date >= weekStart && s.shift_date <= weekEnd);
  const restDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(
    (date) => date >= today && input.publishedDates.has(date) && !thisWeek.some((s) => s.shift_date === date)
  ).length;
  const worked = input.attendance.filter((r) => {
    if (r.deleted_at || !r.clock_in_at) return false;
    const day = todayDateString(new Date(r.clock_in_at));
    return day >= weekStart && day <= weekEnd;
  });
  const workedMinutes = worked.reduce((total, r) => total + (r.worked_minutes ?? 0), 0);
  const unread = input.announcements.filter((a) => a.is_published && !a.deleted_at && !input.acknowledged.get(a.id));
  const unreadRoles = [...new Set(unread.map((a) => (a.author_role ?? '').toLowerCase()).filter(Boolean))];
  const nextMeta = next
    ? `${next.shift_date === today ? 'Today' : next.shift_date === addDays(today, 1) ? 'Tomorrow' : shortDay(next.shift_date).split(' ').slice(0, 2).join(' ')} · ${next.title}`
    : 'Nothing published yet';

  const stats: OverviewStat[] = [
    { label: 'Next shift', value: next ? hm(next.start_time) : '—', meta: nextMeta, color: C.primary },
    { label: 'Shifts this week', value: String(thisWeek.length), meta: `${plural(restDays, 'rest day')} remaining`, color: C.info },
    { label: 'Hours this week', value: durationText(workedMinutes), meta: `${plural(worked.length, 'shift')} worked`, color: C.ok },
    {
      label: 'Unread notices',
      value: String(unread.length),
      meta: unread.length === 0 ? "You're up to date" : unreadRoles.length === 1 ? `From your ${unreadRoles[0] === 'owner' ? 'manager' : unreadRoles[0]}` : 'From your managers',
      color: C.warn
    }
  ];

  // ---- my week: today and the next three days
  const week: WeekRow[] = Array.from({ length: 4 }, (_, index) => {
    const date = addDays(today, index);
    const dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : WEEKDAYS_LONG[parseDay(date).getUTCDay()];
    const shift = shifts.find((s) => s.shift_date === date);
    const onLeave = input.leave.find((l) => l.status === 'approved' && l.start_date <= date && l.end_date >= date);
    const base = { date, chip: dayChip(date), today: index === 0 };
    if (!shift) {
      if (onLeave) return { ...base, name: dayName, sub: 'Approved time off', middle: '—', barLabel: '', status: 'Leave', tone: 'warn' };
      if (input.publishedDates.has(date)) return { ...base, name: 'Rest day', sub: 'No shift assigned', middle: '—', barLabel: '', status: 'Off', tone: 'neutral' };
      return { ...base, name: dayName, sub: 'Schedule not published yet', middle: '—', barLabel: '', status: 'Not published', tone: 'neutral' };
    }
    const middle = `${hm(shift.start_time)} – ${hm(shift.end_time)}`;
    const swap = openSwapFor(shift, input.swaps, me.id);
    if (swap) return { ...base, name: dayName, sub: shiftSub(shift), middle, barLabel: 'Swap requested', status: 'Pending', tone: 'violet' };
    const { start, end } = shiftWindow(shift);
    if (start.getTime() > now.getTime() && shift === next) {
      const minutes = Math.round((start.getTime() - now.getTime()) / 60_000);
      return { ...base, name: dayName, sub: shiftSub(shift), middle, barLabel: minutes <= 12 * 60 ? `Starts in ${startsIn(minutes).short}` : 'Published', status: 'Up next', tone: 'primary' };
    }
    if (start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
      return { ...base, name: dayName, sub: shiftSub(shift), middle, barLabel: `Until ${hm(shift.end_time)}`, status: 'On shift', tone: 'primary' };
    }
    if (end.getTime() <= now.getTime()) return { ...base, name: dayName, sub: shiftSub(shift), middle, barLabel: 'Finished', status: 'Done', tone: 'neutral' };
    return { ...base, name: dayName, sub: shiftSub(shift), middle, barLabel: 'Published', status: 'Scheduled', tone: 'ok' };
  });

  // ---- my requests: what's still open, then what was decided in the last fortnight
  const recent = (iso: string | null): boolean => Boolean(iso) && now.getTime() - new Date(iso as string).getTime() <= 14 * 86_400_000;
  const swapTitle = (s: ShiftSwap): string => `Swap ${s.shift_date ? shortDay(s.shift_date) : 'shift'}${s.shift_title ? ` · ${s.shift_title}` : ''}`;
  const swapRows: Array<RequestRow & { at: string }> = input.swaps
    .filter((s) => s.requested_by_employee_id === me.id && (isOpenSwap(s) || ((s.status === 'approved' || s.status === 'rejected') && recent(s.decision_at))))
    .map((s) => {
      const other = s.target_employee_id ? `With ${nameOf(s.target_employee_id)}` : 'Open to anyone';
      if (s.status === 'accepted') return { key: s.id, at: s.created_at, title: swapTitle(s), meta: `${other} · awaiting supervisor`, tag: 'Swap', tone: 'violet', done: false };
      if (s.status === 'pending')
        return { key: s.id, at: s.created_at, title: swapTitle(s), meta: `${other} · ${s.target_employee_id ? 'awaiting their reply' : 'awaiting a taker'}`, tag: 'Swap', tone: 'violet', done: false };
      const by = s.decision_by_name ? ` by ${s.decision_by_name}` : '';
      return s.status === 'approved'
        ? { key: s.id, at: s.decision_at as string, title: swapTitle(s), meta: `Approved ${dayMonthOf(s.decision_at as string)}${by}`, tag: 'Approved', tone: 'ok', done: true }
        : { key: s.id, at: s.decision_at as string, title: swapTitle(s), meta: `Declined ${dayMonthOf(s.decision_at as string)}${by}`, tag: 'Declined', tone: 'bad', done: true };
    });
  const leaveTitle = (l: LeaveRequest): string =>
    `Time off · ${l.start_date === l.end_date ? dayLongMonth(l.start_date) : `${dayLongMonth(l.start_date)} – ${dayLongMonth(l.end_date)}`}`;
  const leaveRows: Array<RequestRow & { at: string }> = input.leave
    .filter((l) => l.status === 'pending' || ((l.status === 'approved' || l.status === 'rejected') && recent(l.last_status_changed_at)))
    .map((l) => {
      const reason = l.reason?.trim() || 'Time off';
      if (l.status === 'pending') return { key: l.id, at: l.created_at, title: leaveTitle(l), meta: `${reason} · pending`, tag: 'Leave', tone: 'warn', done: false };
      return l.status === 'approved'
        ? { key: l.id, at: l.last_status_changed_at, title: leaveTitle(l), meta: `Approved ${dayMonthOf(l.last_status_changed_at)}`, tag: 'Approved', tone: 'ok', done: true }
        : { key: l.id, at: l.last_status_changed_at, title: leaveTitle(l), meta: `Declined ${dayMonthOf(l.last_status_changed_at)}`, tag: 'Declined', tone: 'bad', done: true };
    });
  // Open first (swaps, then leave, oldest first), then the decided ones, newest first.
  const open = [...swapRows.filter((r) => !r.done), ...leaveRows.filter((r) => !r.done)];
  const decided = [...swapRows, ...leaveRows].filter((r) => r.done).sort((a, b) => b.at.localeCompare(a.at));
  const requests = [...open, ...decided].slice(0, 5).map(({ at: _at, ...row }) => row);

  // ---- shift actions
  const swappable = shifts.find((s) => shiftWindow(s).start.getTime() > now.getTime() && !openSwapFor(s, input.swaps, me.id));
  const actions: ShiftAction[] = [
    { title: 'Request time off', body: 'Goes to your supervisor', tone: 'info', action: 'leave' },
    { title: 'Request a swap', body: swappable ? `${shortDay(swappable.shift_date).split(' ').slice(0, 2).join(' ')} · ${swappable.title}` : 'No upcoming shift to swap', tone: 'violet', action: 'swap' },
    { title: 'View my schedule', body: 'Published shifts for the week', tone: 'neutral', action: 'schedule' }
  ];

  return {
    title: `${greeting(now)}, ${me.first_name}`,
    subtitle,
    stats,
    week,
    foot: input.timeZone ? `Times shown in your branch time zone (${input.timeZone}).` : 'Times shown in your branch time zone.',
    requests,
    openRequests: open.length,
    actions,
    announcementPreviews: buildAnnouncementPreviews(input.announcements, [], now),
    next,
    hasSchedule: input.publishedDates.size > 0
  };
}
