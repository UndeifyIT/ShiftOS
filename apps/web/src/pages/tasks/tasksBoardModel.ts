import type { Department, Employee, Task, TaskPriority, TaskStatus } from '../../types/domain.js';
import type { Tone } from '../scheduling/grid/scheduleFormat.js';

/*
 * The Tasks board, as the design handoff draws it (`ShiftOS Dashboards.dc.html`:
 * `PAGES["Manager/Tasks"]`, the `kindTasks` markup at lines 900-932 and the
 * `taskColumns` values at 4953-4962). Three columns — To do, In progress,
 * Completed — each a card list with a check, a due/started/completed line, a
 * priority pill and an assignee.
 *
 * The board is "today": everything still open, plus what was finished today.
 * A task due next week belongs on next week's board, not this one.
 */

export type TaskFilter = 'All' | 'Unassigned' | 'Overdue' | 'Mine';
export const TASK_FILTERS: TaskFilter[] = ['All', 'Unassigned', 'Overdue', 'Mine'];

/** The handoff's three columns and their dot colours (C.faint / C.warn / C.ok). */
export const COLUMN_TITLES = ['To do', 'In progress', 'Completed'] as const;
export type ColumnTitle = (typeof COLUMN_TITLES)[number];
const COLUMN_DOT: Record<ColumnTitle, string> = {
  'To do': '#A79C93',
  'In progress': '#B77714',
  Completed: '#2E9E62'
};

/** The handoff's task vocabulary is Low/Medium/High; the schema's fourth level keeps its own name. */
export const PRIORITY_LABEL: Record<TaskPriority, string> = { low: 'Low', normal: 'Medium', high: 'High', critical: 'Critical' };
export const PRIORITY_TONE: Record<TaskPriority, Tone> = { low: 'info', normal: 'warn', high: 'bad', critical: 'bad' };
const PRIORITY_RANK: Record<TaskPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };

export interface TaskCard {
  id: string;
  title: string;
  /** The handoff's second line: "Due 10:00 AM · Front End", "Started 09:10 AM · Warehouse", "Completed 08:15 AM". */
  meta: string;
  priority: string;
  tone: Tone;
  assignee: string;
  assigneeId: string | null;
  done: boolean;
  status: TaskStatus;
  overdue: boolean;
}

export interface TaskColumn {
  title: ColumnTitle;
  dot: string;
  cards: TaskCard[];
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** 'HH:MM[:SS]' → '10:00 AM'. */
export function clockFromTime(time: string | null | undefined): string {
  if (!time) return '';
  const hours = Number(time.slice(0, 2));
  if (Number.isNaN(hours)) return '';
  return `${String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0')}:${time.slice(3, 5)} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** A timestamp → '08:15 AM'. */
export function clockFromIso(iso: string | null | undefined): string {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const hours = at.getHours();
  return `${String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** 'Thu 15 May' — for a task carried over from an earlier day. */
function dayOf(date: string): string {
  const at = new Date(`${date}T00:00:00`);
  if (Number.isNaN(at.getTime())) return date;
  return at.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

/** A Date as 'YYYY-MM-DD' in the viewer's own timezone. */
export function todayOf(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** When a task is due, as a timestamp — a date with no time is due at the end of its day. */
export function dueAt(task: Task): number | null {
  if (!task.due_date) return null;
  const at = new Date(`${task.due_date}T${task.due_time ?? '23:59:59'}`);
  return Number.isNaN(at.getTime()) ? null : at.getTime();
}

export const isDone = (task: Task): boolean => task.task_status === 'completed' || task.task_status === 'verified';

export function isOverdue(task: Task, now: Date): boolean {
  if (isDone(task) || task.task_status === 'cancelled') return false;
  const due = dueAt(task);
  return due !== null && due < now.getTime();
}

function columnOf(task: Task): ColumnTitle | null {
  if (task.task_status === 'draft' || task.task_status === 'assigned') return 'To do';
  if (task.task_status === 'in_progress') return 'In progress';
  if (isDone(task)) return 'Completed';
  return null; // cancelled
}

/**
 * Today's board: everything still open (including anything carried over or
 * undated), and whatever was completed today.
 */
export function onTodaysBoard(task: Task, now: Date): boolean {
  if (task.deleted_at || task.task_status === 'cancelled') return false;
  if (isDone(task)) return Boolean(task.completed_at) && todayOf(new Date(task.completed_at as string)) === todayOf(now);
  const due = dueAt(task);
  return due === null || due <= new Date(`${todayOf(now)}T23:59:59`).getTime();
}

/** The meta line under a card's title. */
function metaOf(task: Task, column: ColumnTitle, department: string | null, now: Date): string {
  const suffix = department ? ` · ${department}` : '';
  if (column === 'Completed') {
    const at = clockFromIso(task.completed_at) || clockFromIso(task.verified_at);
    return at ? `Completed ${at}` : 'Completed today';
  }
  if (column === 'In progress') {
    const started = clockFromIso(task.assigned_at);
    return `${started ? `Started ${started}` : 'In progress'}${suffix}`;
  }
  if (!task.due_date) return `No due date${suffix}`;
  const time = clockFromTime(task.due_time);
  if (task.due_date !== todayOf(now)) return `Due ${time ? `${time} ` : ''}${dayOf(task.due_date)}${suffix}`;
  return `${time ? `Due ${time}` : 'Due today'}${suffix}`;
}

export interface BoardSources {
  tasks: Task[];
  employees: Employee[];
  departments: Department[];
  now: Date;
}

export function buildBoard({ tasks, employees, departments, now }: BoardSources): TaskColumn[] {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const departmentById = new Map(departments.map((department) => [department.id, department.name]));

  const columns: TaskColumn[] = COLUMN_TITLES.map((title) => ({ title, dot: COLUMN_DOT[title], cards: [] }));
  const byTitle = new Map(columns.map((column) => [column.title, column]));

  // Overdue first, then by priority, then by when they are due — the order a
  // manager works the board in.
  const ordered = [...tasks].sort((left, right) => {
    const overdue = Number(isOverdue(right, now)) - Number(isOverdue(left, now));
    if (overdue !== 0) return overdue;
    const priority = (PRIORITY_RANK[left.priority] ?? 9) - (PRIORITY_RANK[right.priority] ?? 9);
    if (priority !== 0) return priority;
    return (dueAt(left) ?? Number.MAX_SAFE_INTEGER) - (dueAt(right) ?? Number.MAX_SAFE_INTEGER);
  });

  for (const task of ordered) {
    if (!onTodaysBoard(task, now)) continue;
    const column = columnOf(task);
    if (!column) continue;

    // Tasks carry no department of their own; the accountable person's is the one that applies.
    const assignee = task.assigned_supervisor_id ? employeeById.get(task.assigned_supervisor_id) : undefined;
    const department = assignee?.department_id ? departmentById.get(assignee.department_id) ?? null : null;

    byTitle.get(column)?.cards.push({
      id: task.id,
      title: task.title,
      meta: metaOf(task, column, department, now),
      priority: PRIORITY_LABEL[task.priority] ?? task.priority,
      tone: PRIORITY_TONE[task.priority] ?? 'neutral',
      assignee: assignee ? `${assignee.first_name} ${assignee.last_name}`.trim() : 'Unassigned',
      assigneeId: task.assigned_supervisor_id,
      done: isDone(task),
      status: task.task_status,
      overdue: isOverdue(task, now)
    });
  }

  return columns;
}

/** The toolbar's filter and search, applied to the built board. */
export function filterBoard(columns: TaskColumn[], filter: TaskFilter, query: string, myEmployeeId: string | null): TaskColumn[] {
  const needle = query.trim().toLowerCase();
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
      if (needle && !`${card.title} ${card.assignee}`.toLowerCase().includes(needle)) return false;
      if (filter === 'Unassigned') return card.assigneeId === null;
      if (filter === 'Overdue') return card.overdue;
      if (filter === 'Mine') return myEmployeeId !== null && card.assigneeId === myEmployeeId;
      return true;
    })
  }));
}

export const boardTotal = (columns: TaskColumn[]): number => columns.reduce((total, column) => total + column.cards.length, 0);

/** The toolbar's right-hand count — "6 tasks", or what the filter left. */
export function tasksCount(columns: TaskColumn[], filter: TaskFilter): string {
  const shown = boardTotal(columns);
  return filter === 'All' ? plural(shown, 'task') : `${plural(shown, 'task')} · ${filter.toLowerCase()}`;
}

/** "Main Branch · today". */
export const tasksSubtitle = (branchName: string): string => `${branchName} · today`;

/** Yesterday's date, for the empty state's "Copy yesterday". */
export function yesterdayOf(now: Date): string {
  const at = new Date(now);
  at.setDate(at.getDate() - 1);
  return todayOf(at);
}
