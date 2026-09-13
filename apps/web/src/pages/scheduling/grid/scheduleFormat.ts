/**
 * Formatting + small calendar helpers for the weekly schedule grid, ported
 * from the design handoff's own helpers (`ShiftOS Dashboards.dc.html`:
 * minLabel, labelMin, durText, shiftTone, toneFor, initialsOf, SCHED_DAYS) so
 * labels, colours and week maths render exactly as designed.
 */

export const HANDOFF = {
  ink: '#38312B',
  body: '#57504A',
  mute: '#857A72',
  faint: '#A79C93',
  line: '#EBE7E3',
  primary: '#F04E17',
  deep: '#C6420E',
  soft: '#FDF0E9',
  ok: '#2E9E62',
  okSoft: '#E9F7EF',
  warn: '#B77714',
  warnSoft: '#FDF4E6',
  bad: '#C93A22',
  badSoft: '#FCEDEA',
  info: '#2563EB',
  infoSoft: '#EFF4FE',
  violet: '#7C3AED',
  violetSoft: '#F3EEFE'
} as const;

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'primary' | 'violet' | 'neutral';

export const TONES: Record<Tone, [fg: string, bg: string]> = {
  ok: [HANDOFF.ok, HANDOFF.okSoft],
  warn: [HANDOFF.warn, HANDOFF.warnSoft],
  bad: [HANDOFF.bad, HANDOFF.badSoft],
  info: [HANDOFF.info, HANDOFF.infoSoft],
  primary: [HANDOFF.deep, HANDOFF.soft],
  violet: [HANDOFF.violet, HANDOFF.violetSoft],
  neutral: [HANDOFF.mute, '#F4F1EE']
};

const AVATAR_TONES: Array<[string, string]> = [
  [HANDOFF.deep, HANDOFF.soft],
  [HANDOFF.info, HANDOFF.infoSoft],
  [HANDOFF.ok, HANDOFF.okSoft],
  [HANDOFF.violet, HANDOFF.violetSoft],
  [HANDOFF.warn, HANDOFF.warnSoft]
];

/** Handoff toneFor(): avatar colours keyed off the first character of the name. */
export function avatarTone(name: string): { color: string; backgroundColor: string } {
  const [color, backgroundColor] = AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];
  return { color, backgroundColor };
}

/** Handoff initialsOf(): first letter of the first two words. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

export function fullName(person: { first_name: string; last_name: string }): string {
  return `${person.first_name} ${person.last_name}`.trim();
}

/** 'HH:MM[:SS]' → minutes from midnight. */
export function clockMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes from midnight → 'HH:MM' (wraps past midnight). */
export function minutesToClock(total: number): string {
  const minutes = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Handoff minLabel(): '07:30' → '7:30 AM', '00:00' → '12:00 AM'. */
export function timeLabel(time: string): string {
  const total = clockMinutes(time);
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${hours24 < 12 ? 'AM' : 'PM'}`;
}

/** Every half hour of the day as 'HH:MM', the handoff's TIME_OPTIONS. */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => minutesToClock(i * 30));

export const BREAK_OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 0, label: 'No break' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hour' }
];

export function breakLabel(minutes: number): string {
  return BREAK_OPTIONS.find((option) => option.minutes === minutes)?.label ?? `${minutes} min`;
}

/** A block's span in minutes; an end at or before the start runs past midnight (handoff blockSpan). */
export function blockSpanMinutes(startTime: string, endTime: string): number {
  let span = clockMinutes(endTime) - clockMinutes(startTime);
  if (span <= 0) span += 1440;
  return span;
}

export function paidMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  return Math.max(0, blockSpanMinutes(startTime, endTime) - breakMinutes);
}

/** Handoff durText(): 510 → '8h 30m', 480 → '8h'. */
export function durationText(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Handoff shiftTone(): morning starts are green, late-morning violet, afternoon/evening blue. */
export function shiftTone(startTime: string): Tone {
  const minutes = clockMinutes(startTime);
  return minutes < 11 * 60 ? 'ok' : minutes < 13 * 60 ? 'violet' : 'info';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Indexed by Date#getUTCDay(), so a label always matches its real date. */
const WEEKDAYS_BY_UTC_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Adds days to a 'YYYY-MM-DD' date using pure UTC arithmetic, so it's correct in every timezone. */
export function addDays(date: string, days: number): string {
  const value = parseDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDate(value);
}

/** The Monday on or before a date — handoff weeks run Mon → Sun. */
export function weekStartOf(date: string): string {
  const weekday = (parseDate(date).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

export function todayDateString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** ISO-8601 week number ("Week 20" for May 12, 2025). */
export function isoWeekNumber(date: string): number {
  const thursday = parseDate(date);
  thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

/** 'May 12' */
export function shortDate(date: string): string {
  const value = parseDate(date);
  return `${MONTHS[value.getUTCMonth()]} ${value.getUTCDate()}`;
}

/** 'May 12 – May 18, 2025' (both years shown when the week straddles New Year). */
export function weekRangeLabel(weekStart: string): string {
  const start = parseDate(weekStart);
  const end = parseDate(addDays(weekStart, 6));
  return start.getUTCFullYear() === end.getUTCFullYear()
    ? `${shortDate(weekStart)} – ${shortDate(formatDate(end))}, ${end.getUTCFullYear()}`
    : `${shortDate(weekStart)}, ${start.getUTCFullYear()} – ${shortDate(formatDate(end))}, ${end.getUTCFullYear()}`;
}

/** The seven day columns from `weekStart`: each date with its own weekday name and 'May 12' label. */
export function weekDays(weekStart: string): Array<{ date: string; weekday: string; label: string }> {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { date, weekday: WEEKDAYS_BY_UTC_DAY[parseDate(date).getUTCDay()], label: shortDate(date) };
  });
}
