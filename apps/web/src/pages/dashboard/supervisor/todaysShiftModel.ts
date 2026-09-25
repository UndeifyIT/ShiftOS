/**
 * The Supervisor's "Today's Shift" home, shaped like the design handoff's
 * HOME.Supervisor block (`ShiftOS Dashboards.dc.html`): the shift in progress,
 * Present / Late / Absent / Tasks done, the team's check-ins, today's tasks
 * and the shift controls. Pure — built from the same branch data the Manager
 * overview reads (buildManagerOverview), with `now` injected.
 */
import type { Task, TaskPriority } from '../../../types/domain.js';
import { clockMinutes, fullName, todayDateString, type Tone } from '../../scheduling/grid/scheduleFormat.js';
import { C, clock12, plural, type ManagerOverview, type OverviewStat, type TodayAssignment } from '../manager/overviewModel.js';

export interface CheckInRow {
  key: string;
  name: string;
  sub: string;
  middle: string;
  pct: number;
  barColor: string;
  barLabel: string;
  status: string;
  tone: Tone;
}

export interface ShiftTaskRow {
  id: string;
  title: string;
  meta: string;
  tag: string;
  tone: Tone;
  done: boolean;
}

export interface ShiftControl {
  title: string;
  body: string;
  tone: Tone;
  to: string;
}

export interface TodaysShift {
  title: string;
  subtitle: string;
  stats: OverviewStat[];
  checkIns: CheckInRow[];
  scheduled: number;
  /** Assignments on this shift nobody has recorded yet — what "Mark all present" fills in. */
  unrecorded: TodayAssignment[];
  tasks: ShiftTaskRow[];
  tasksDone: number;
  tasksTotal: number;
  controls: ShiftControl[];
  shiftTitle: string;
  /** Everyone on this shift, and whether it has started. */
  members: TodayAssignment[];
  started: boolean;
}

/** '08:00:00' → '08:00 AM' */
export function time12(time: string): string {
  const minutes = clockMinutes(time);
  const hours = Math.floor(minutes / 60) % 24;
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** '14:00:00' → '2 PM', '10:30:00' → '10:30 AM' */
function shortTime(time: string): string {
  const minutes = clockMinutes(time);
  const hours = Math.floor(minutes / 60) % 24;
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}${minutes % 60 ? `:${String(minutes % 60).padStart(2, '0')}` : ''} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** 'Mary J.' */
const shortName = (row: TodayAssignment): string => (row.employee ? `${row.employee.first_name} ${row.employee.last_name.slice(0, 1)}.` : 'Someone');

/** One name in full, several as short names — the handoff's 'James Carter' and 'Mary J. · David W.'. */
function names(rows: TodayAssignment[], none: string): string {
  if (rows.length === 0) return none;
  if (rows.length === 1) return rows[0].employee ? fullName(rows[0].employee) : 'Someone';
  const shown = rows.slice(0, 2).map(shortName).join(' · ');
  return rows.length > 2 ? `${shown} +${rows.length - 2}` : shown;
}

export const PRIORITY: Record<TaskPriority, { tag: string; tone: Tone }> = {
  critical: { tag: 'Urgent', tone: 'bad' },
  high: { tag: 'High', tone: 'bad' },
  normal: { tag: 'Medium', tone: 'warn' },
  low: { tag: 'Low', tone: 'info' }
};

const isLate = (row: TodayAssignment): boolean => Boolean(row.record && (row.record.attendance_status === 'late' || (row.record.clock_in_at && row.record.late_minutes > 0)));
const isAbsent = (row: TodayAssignment): boolean => row.record?.attendance_status === 'absent' || row.record?.attendance_status === 'no_show';
const isIn = (row: TodayAssignment): boolean => Boolean(row.record?.clock_in_at);

/**
 * The shift the home is about: the one running now, else the next to start
 * today, else the last one that ran. People on the same title and hours are
 * one shift, whatever department their slot is in.
 */
function currentShift(today: TodayAssignment[], nowMinutes: number): { rows: TodayAssignment[]; phase: 'live' | 'upcoming' | 'ended' } | null {
  const groups = new Map<string, TodayAssignment[]>();
  for (const row of today) {
    const key = `${row.shift.title}|${row.shift.start_time}|${row.shift.end_time}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const list = [...groups.values()].map((rows) => {
    const start = clockMinutes(rows[0].shift.start_time);
    let end = clockMinutes(rows[0].shift.end_time);
    if (rows[0].shift.crosses_midnight || end <= start) end += 24 * 60;
    return { rows, start, end };
  });
  const live = list.filter((g) => g.start <= nowMinutes && nowMinutes < g.end).sort((a, b) => a.start - b.start)[0];
  if (live) return { rows: live.rows, phase: 'live' };
  const next = list.filter((g) => g.start > nowMinutes).sort((a, b) => a.start - b.start)[0];
  if (next) return { rows: next.rows, phase: 'upcoming' };
  const last = list.sort((a, b) => b.end - a.end)[0];
  return last ? { rows: last.rows, phase: 'ended' } : null;
}

function checkInRow(row: TodayAssignment, started: boolean): CheckInRow {
  const name = row.employee ? fullName(row.employee) : 'Unknown employee';
  const base = { key: row.assignment.id, name, sub: row.departmentName };
  if (isAbsent(row)) {
    return { ...base, middle: '—', pct: 0, barColor: C.line, barLabel: row.record?.attendance_status === 'no_show' ? 'No call, no show' : 'Not shown up', status: 'Absent', tone: 'bad' };
  }
  if (row.record?.clock_in_at) {
    const time = clock12(new Date(row.record.clock_in_at));
    const late = isLate(row);
    const out = row.record.clock_out_at ? `Clocked out ${clock12(new Date(row.record.clock_out_at))}` : null;
    return {
      ...base,
      middle: time,
      pct: 100,
      barColor: C.ok,
      barLabel: out ?? (late ? `${row.record.late_minutes}m late` : 'On time'),
      status: late ? 'Late' : 'Checked in',
      tone: late ? 'warn' : 'ok'
    };
  }
  return started
    ? { ...base, middle: '—', pct: 0, barColor: C.line, barLabel: 'Not clocked in yet', status: 'Not in', tone: 'neutral' }
    : { ...base, middle: '—', pct: 0, barColor: C.line, barLabel: `Starts ${time12(row.shift.start_time)}`, status: 'Scheduled', tone: 'neutral' };
}

/** Exceptions first (absent, late, not in), then by check-in time — what a supervisor acts on. */
function rank(row: TodayAssignment): number {
  if (isAbsent(row)) return 0;
  if (isLate(row)) return 1;
  if (!isIn(row)) return 2;
  return 3;
}

function taskRows(tasks: Task[], today: string, overview: ManagerOverview): ShiftTaskRow[] {
  const { employeesById } = overview.detail;
  const dayOf = (iso: string | null): string | null => (iso ? todayDateString(new Date(iso)) : null);
  const done = (t: Task): boolean => t.task_status === 'completed' || t.task_status === 'verified';
  return tasks
    .filter((t) => t.task_status !== 'cancelled' && t.task_status !== 'draft' && (t.due_date === today || dayOf(t.completed_at) === today))
    .sort((a, b) => Number(done(b)) - Number(done(a)) || (a.completed_at ?? '').localeCompare(b.completed_at ?? '') || (a.due_time ?? '99').localeCompare(b.due_time ?? '99'))
    .map((t) => {
      const person = t.assigned_supervisor_id ? employeesById.get(t.assigned_supervisor_id) : undefined;
      const who = person ? fullName(person) : 'Unassigned';
      const meta = done(t) && t.completed_at ? `Completed ${clock12(new Date(t.completed_at))} · ${who}` : t.due_time ? `Due ${time12(t.due_time)} · ${who}` : `Due today · ${who}`;
      return { id: t.id, title: t.title, meta, ...PRIORITY[t.priority], done: done(t) };
    });
}

export function buildTodaysShift(overview: ManagerOverview, now: Date): TodaysShift | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const picked = currentShift(overview.detail.today, nowMinutes);
  if (!picked) return null;
  const { rows, phase } = picked;
  const shift = rows[0].shift;
  const started = phase !== 'upcoming';

  const present = rows.filter((row) => isIn(row) && !isLate(row));
  const late = rows.filter(isLate);
  const absent = rows.filter(isAbsent);
  const pct = rows.length ? Math.round((present.length / rows.length) * 100) : 0;

  const allTasks = taskRows(overview.detail.tasks, overview.today, overview);
  const open = allTasks.filter((t) => !t.done);
  const openDue = overview.detail.tasks
    .filter((t) => open.some((o) => o.id === t.id) && t.due_time)
    .map((t) => t.due_time as string)
    .sort();
  const tasksDone = allTasks.length - open.length;

  const stats: OverviewStat[] = [
    { label: 'Present', value: String(present.length), meta: `${pct}% of scheduled`, color: C.ok },
    { label: 'Late', value: String(late.length), meta: names(late, 'Nobody late'), color: C.warn },
    { label: 'Absent', value: String(absent.length), meta: names(absent, 'Nobody absent'), color: C.bad },
    {
      label: 'Tasks done',
      value: `${tasksDone}/${allTasks.length}`,
      meta:
        allTasks.length === 0
          ? 'No tasks due today'
          : open.length === 0
            ? 'All done'
            : openDue.length === open.length
              ? `${open.length} due before ${shortTime(openDue[openDue.length - 1])}`
              : `${open.length} still open`,
      color: C.primary
    }
  ];

  const swaps = overview.detail.pendingSwaps.length;
  const controls: ShiftControl[] = [
    { title: 'Add shift note', body: 'Handover, issue or inventory', tone: 'primary', to: '/shift-notes' },
    { title: 'Assign a task', body: 'Pick an employee on this shift', tone: 'info', to: '/tasks' },
    {
      title: swaps ? `Review ${plural(swaps, 'swap request')}` : 'No swaps waiting',
      body: swaps === 0 ? 'Nothing needs your approval' : swaps === 1 ? 'Needs your approval' : swaps === 2 ? 'Both need your approval' : 'All need your approval',
      tone: 'violet',
      to: '/requests'
    },
    { title: 'End shift', body: 'Closes attendance and hands over', tone: 'neutral', to: '/attendance' }
  ];

  return {
    title: `${shift.title} · ${phase === 'live' ? 'in progress' : phase === 'upcoming' ? `starts ${time12(shift.start_time)}` : 'ended'}`,
    subtitle: `${time12(shift.start_time)} – ${time12(shift.end_time)} · ${rows.length} scheduled · ${overview.detail.branchName}`,
    stats,
    checkIns: [...rows]
      .sort((a, b) => rank(a) - rank(b) || (a.record?.clock_in_at ?? '').localeCompare(b.record?.clock_in_at ?? '') || (a.employee?.employee_number ?? '').localeCompare(b.employee?.employee_number ?? ''))
      .map((row) => checkInRow(row, started)),
    scheduled: rows.length,
    unrecorded: started ? rows.filter((row) => !row.record || row.record.attendance_status === 'scheduled') : [],
    tasks: allTasks,
    tasksDone,
    tasksTotal: allTasks.length,
    controls,
    shiftTitle: shift.title,
    members: rows,
    started
  };
}
