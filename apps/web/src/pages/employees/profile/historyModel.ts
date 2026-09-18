/**
 * The Employee Profile's "Employee History" tab (`ShiftOS Dashboards.dc.html`
 * lines 1779-1855: HISTORY_STATS, HISTORY_DAYS, HISTORY_ROWS) from one
 * person's real attendance records. Pure — `today` is passed in.
 */
import type { AttendanceRecord } from '../../../types/domain.js';
import type { Tone } from '../../scheduling/grid/scheduleFormat.js';

export type RangeKey = 'this_month' | 'last_month' | 'last_30';
export type HistoryFilter = 'all' | 'on_time' | 'late' | 'absent';

export interface DayRange {
  start: string;
  end: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = parse(date);
  value.setUTCDate(value.getUTCDate() + days);
  return iso(value);
}

function daysBetween(start: string, end: string): number {
  return Math.round((parse(end).getTime() - parse(start).getTime()) / 86_400_000) + 1;
}

export function rangeFor(key: RangeKey, today: string): DayRange {
  if (key === 'last_30') return { start: addDays(today, -29), end: today };
  const [y, m] = today.split('-').map(Number);
  if (key === 'last_month') {
    const start = new Date(Date.UTC(y, m - 2, 1));
    const end = new Date(Date.UTC(y, m - 1, 0));
    return { start: iso(start), end: iso(end) };
  }
  return { start: `${today.slice(0, 8)}01`, end: today };
}

/**
 * What a range is compared with. Calendar-month ranges compare with the month
 * before (the handoff's "vs Apr 1 – Apr 30"), cut to the same days of the
 * month while this month is still running so the change is like for like;
 * "Last 30 days" compares with the 30 days before it.
 */
export function previousRange(range: DayRange, key: RangeKey): DayRange {
  if (key === 'last_30') {
    const length = daysBetween(range.start, range.end);
    return { start: addDays(range.start, -length), end: addDays(range.start, -1) };
  }
  const end = parse(range.end);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
  const monthEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
  const endsMonth = addDays(range.end, 1).slice(8) === '01';
  const sameDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), Math.min(end.getUTCDate(), monthEnd.getUTCDate())));
  return { start: iso(start), end: iso(endsMonth ? monthEnd : sameDay) };
}

/** 'May 1 – May 16, 2025'; `withYear: false` gives the stat cards' 'Apr 1 – Apr 30'. */
export function rangeLabel(range: DayRange, withYear = true): string {
  const a = parse(range.start);
  const b = parse(range.end);
  const left = `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}`;
  const right = `${MONTHS[b.getUTCMonth()]} ${b.getUTCDate()}`;
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${left}, ${a.getUTCFullYear()} – ${right}, ${b.getUTCFullYear()}`;
  return withYear ? `${left} – ${right}, ${b.getUTCFullYear()}` : `${left} – ${right}`;
}

/** The day a record counts for: its shift's date, else when it was clocked in or created (local). */
export function recordDay(record: AttendanceRecord): string {
  if (record.shift_date) return record.shift_date.slice(0, 10);
  const at = new Date(record.clock_in_at ?? record.created_at);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}

export type DayState = 'ok' | 'late' | 'absent' | 'off';

export function recordState(record: AttendanceRecord): DayState {
  if (record.attendance_status === 'absent' || record.attendance_status === 'no_show') return 'absent';
  if (!record.clock_in_at) return 'off';
  return record.attendance_status === 'late' || record.late_minutes > 0 ? 'late' : 'ok';
}

const inRange = (record: AttendanceRecord, range: DayRange): boolean => {
  const day = recordDay(record);
  return day >= range.start && day <= range.end;
};

/** '162h 30m' */
export function hoursText(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, '0')}m`;
}

export interface HistoryStat {
  label: string;
  value: string;
  meta: string;
  good: boolean;
  tone: Tone;
  icon: 'clock' | 'calendar';
}

function summarize(records: AttendanceRecord[]) {
  const worked = records.reduce((sum, r) => sum + (r.clock_out_at ? r.worked_minutes : 0), 0);
  const daysWorked = new Set(records.filter((r) => r.clock_in_at).map(recordDay)).size;
  const scheduledDays = new Set(records.filter((r) => recordState(r) !== 'off' || r.clock_in_at).map(recordDay)).size;
  const late = records.filter((r) => recordState(r) === 'late').length;
  const absent = records.filter((r) => recordState(r) === 'absent').length;
  return { worked, daysWorked, scheduledDays, late, absent };
}

export function historyStats(records: AttendanceRecord[], range: DayRange, key: RangeKey): HistoryStat[] {
  const prev = previousRange(range, key);
  const now = summarize(records.filter((r) => inRange(r, range)));
  const before = summarize(records.filter((r) => inRange(r, prev)));
  const vs = `vs ${rangeLabel(prev, false)}`;

  const hoursChange = before.worked ? Math.round(((now.worked - before.worked) / before.worked) * 100) : null;
  const hoursMeta = hoursChange === null ? `No hours ${vs}` : hoursChange === 0 ? 'No change' : `${hoursChange > 0 ? '↑' : '↓'} ${Math.abs(hoursChange)}% ${vs}`;
  // For late arrivals and absences, fewer is the good direction.
  const countMeta = (current: number, previous: number): { meta: string; good: boolean } =>
    current === previous ? { meta: 'No change', good: false } : { meta: `${current > previous ? '↑' : '↓'} ${Math.abs(current - previous)} ${vs}`, good: current < previous };
  const lateMeta = countMeta(now.late, before.late);
  const absentMeta = countMeta(now.absent, before.absent);

  return [
    { label: 'Total Hours Worked', value: hoursText(now.worked), meta: hoursMeta, good: (hoursChange ?? 0) > 0, tone: 'info', icon: 'clock' },
    {
      label: 'Days Worked',
      value: String(now.daysWorked),
      meta: now.scheduledDays ? `${Math.round((now.daysWorked / now.scheduledDays) * 100)}% of scheduled days` : 'No scheduled days',
      good: false,
      tone: 'ok',
      icon: 'calendar'
    },
    { label: 'Late Arrivals', value: String(now.late), meta: lateMeta.meta, good: lateMeta.good, tone: 'violet', icon: 'clock' },
    { label: 'Absent Days', value: String(now.absent), meta: absentMeta.meta, good: absentMeta.good, tone: 'warn', icon: 'calendar' }
  ];
}

export interface StripDay {
  date: string;
  dow: string;
  label: string;
  state: DayState;
}

/** One mark per day of the range (most recent 31 at most): absent beats late beats on time; no record is Off. */
export function historyDays(records: AttendanceRecord[], range: DayRange): StripDay[] {
  const byDay = new Map<string, DayState>();
  const rank: Record<DayState, number> = { off: 0, ok: 1, late: 2, absent: 3 };
  for (const record of records.filter((r) => inRange(r, range))) {
    const day = recordDay(record);
    const state = recordState(record);
    if (rank[state] > rank[byDay.get(day) ?? 'off']) byDay.set(day, state);
  }
  const length = Math.min(31, daysBetween(range.start, range.end));
  const first = addDays(range.end, -(length - 1));
  return Array.from({ length }, (_, i) => {
    const date = addDays(first, i);
    const value = parse(date);
    return { date, dow: WEEKDAYS[value.getUTCDay()].toUpperCase(), label: `${MONTHS[value.getUTCMonth()]} ${value.getUTCDate()}`, state: byDay.get(date) ?? 'off' };
  });
}

function clock(iso: string | null): string {
  if (!iso) return '—';
  const at = new Date(iso);
  const h = at.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(at.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function time12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export interface HistoryRow {
  id: string;
  date: string;
  shift: string;
  inTime: string;
  late: boolean;
  out: string;
  total: string;
  status: string;
  tone: Tone;
  notes: string;
  state: DayState;
}

export function historyRows(records: AttendanceRecord[], range: DayRange, filter: HistoryFilter): HistoryRow[] {
  return records
    .filter((r) => inRange(r, range))
    .sort((a, b) => recordDay(b).localeCompare(recordDay(a)) || (b.clock_in_at ?? b.created_at).localeCompare(a.clock_in_at ?? a.created_at))
    .map((record) => {
      const state = recordState(record);
      const day = parse(recordDay(record));
      const status =
        state === 'absent'
          ? record.attendance_status === 'no_show'
            ? 'No-show'
            : 'Absent'
          : state === 'late'
            ? `Late (${record.late_minutes}m)`
            : record.attendance_status === 'left_early'
              ? 'Left Early'
              : state === 'ok'
                ? 'On Time'
                : 'Scheduled';
      const tone: Tone = state === 'absent' ? 'bad' : state === 'late' || record.attendance_status === 'left_early' ? 'warn' : state === 'ok' ? 'ok' : 'neutral';
      return {
        id: record.id,
        date: `${WEEKDAYS[day.getUTCDay()]}, ${MONTHS[day.getUTCMonth()]} ${day.getUTCDate()}, ${day.getUTCFullYear()}`,
        shift: record.shift_start_time && record.shift_end_time ? `${record.shift_title && record.shift_title !== 'Shift' ? record.shift_title : 'Shift'} (${time12(record.shift_start_time)} – ${time12(record.shift_end_time)})` : '—',
        inTime: clock(record.clock_in_at),
        late: state === 'late',
        out: clock(record.clock_out_at),
        total: record.clock_out_at ? hoursText(record.worked_minutes) : '—',
        status,
        tone,
        notes: record.notes || '—',
        state
      };
    })
    .filter((row) => filter === 'all' || (filter === 'on_time' ? row.state === 'ok' : filter === 'late' ? row.state === 'late' : row.state === 'absent'));
}
