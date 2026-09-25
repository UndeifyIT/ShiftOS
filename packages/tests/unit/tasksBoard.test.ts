import { describe, it, expect } from 'vitest';
import {
  boardTotal,
  buildBoard,
  filterBoard,
  isOverdue,
  onTodaysBoard,
  tasksCount,
  tasksSubtitle,
  todayOf,
  yesterdayOf
} from '../../../apps/web/src/pages/tasks/tasksBoardModel.js';
import type { Task } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-16T06:00:00Z', updated_at: '2025-05-16T06:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 7, 58);
const at = (hour: number, minute: number): string => new Date(2025, 4, 16, hour, minute).toISOString();

const employee = (id: string, first: string, last: string, departmentId: string | null) => ({
  ...BASE,
  id,
  branch_id: 'br',
  employee_number: id.toUpperCase(),
  first_name: first,
  last_name: last,
  email: `${first.toLowerCase()}@abc.test`,
  phone: null,
  date_of_birth: null,
  hire_date: '2024-01-15',
  employment_status: 'active' as const,
  notes: null,
  avatar_url: null,
  department_id: departmentId,
  is_active: true
});

const employees = [employee('p1', 'Grace', 'Williams', 'dep-front'), employee('p2', 'Michael', 'Brown', 'dep-ware')];
const departments = [
  { ...BASE, id: 'dep-front', branch_id: 'br', name: 'Front End', description: null, is_active: true },
  { ...BASE, id: 'dep-ware', branch_id: 'br', name: 'Warehouse', description: null, is_active: true }
];

const task = (id: string, fields: Partial<Task>): Task =>
  ({
    ...BASE,
    id,
    branch_id: 'br',
    title: id,
    description: null,
    due_date: '2025-05-16',
    due_time: null,
    priority: 'normal',
    recurrence: 'none',
    task_status: 'draft',
    assigned_supervisor_id: null,
    assigned_by: null,
    assigned_at: null,
    completed_at: null,
    completed_by: null,
    completion_notes: null,
    verified_at: null,
    verified_by: null,
    verification_notes: null,
    verification_status: 'pending',
    created_by: 'u',
    updated_by: null,
    version: 1,
    ...fields
  }) as Task;

const tasks = [
  task('restock', { title: 'Restock beverages in aisle 4', task_status: 'assigned', assigned_supervisor_id: 'p1', due_time: '10:00:00' }),
  task('bakery', { title: 'Bakery preparation check', priority: 'low', due_time: '11:00:00' }),
  task('stock-count', { title: 'Weekly stock count', priority: 'high', task_status: 'in_progress', assigned_supervisor_id: 'p2', assigned_at: at(7, 10), due_time: null }),
  task('cold-room', { title: 'Check cold room temperature', priority: 'high', task_status: 'completed', assigned_supervisor_id: 'p2', completed_at: at(7, 15) }),
  task('cancelled', { title: 'Called off', task_status: 'cancelled', assigned_supervisor_id: 'p2' })
];

const board = (): ReturnType<typeof buildBoard> => buildBoard({ tasks, employees, departments, now: NOW });

describe('tasks board', () => {
  it('splits the branch’s tasks into the handoff’s three columns', () => {
    expect(board().map((column) => [column.title, column.cards.length])).toEqual([
      ['To do', 2],
      ['In progress', 1],
      ['Completed', 1]
    ]);
  });

  it('writes the meta line the handoff shows, with the owner’s department', () => {
    const [todo, progress, done] = board();
    expect(todo.cards[0]).toMatchObject({ title: 'Restock beverages in aisle 4', meta: 'Due 10:00 AM · Front End', priority: 'Medium', assignee: 'Grace Williams' });
    expect(todo.cards[1]).toMatchObject({ meta: 'Due 11:00 AM', priority: 'Low', assignee: 'Unassigned' });
    expect(progress.cards[0].meta).toBe('Started 07:10 AM · Warehouse');
    expect(done.cards[0]).toMatchObject({ meta: 'Completed 07:15 AM', done: true });
  });

  it('says on the card when a task repeats, since nothing else can', () => {
    const [todo, , done] = buildBoard({
      tasks: [
        task('walk', { title: 'Floor walk', task_status: 'assigned', assigned_supervisor_id: 'p1', due_time: '09:00:00', recurrence: 'daily' }),
        task('cold', { title: 'Cold room', task_status: 'completed', assigned_supervisor_id: 'p2', completed_at: at(7, 15), recurrence: 'weekdays' })
      ],
      employees,
      departments,
      now: NOW
    });
    expect(todo.cards[0]).toMatchObject({ meta: 'Due 09:00 AM · Front End · repeats daily', repeats: true });
    expect(done.cards[0].meta).toBe('Completed 07:15 AM · repeats every weekday');
  });

  it('leaves a cancelled task off the board', () => {
    expect(board().flatMap((column) => column.cards).some((card) => card.title === 'Called off')).toBe(false);
  });

  it('puts the most urgent work first', () => {
    const urgent = task('spill', { title: 'Spill in aisle 2', priority: 'critical', task_status: 'assigned', assigned_supervisor_id: 'p1', due_time: '07:00:00' });
    const [todo] = buildBoard({ tasks: [...tasks, urgent], employees, departments, now: NOW });
    expect(todo.cards.map((card) => card.title)[0]).toBe('Spill in aisle 2');
    expect(todo.cards[0].overdue).toBe(true);
  });

  it('counts a task due earlier today as overdue, and one still to come as not', () => {
    expect(isOverdue(task('past', { due_time: '07:00:00' }), NOW)).toBe(true);
    expect(isOverdue(task('later', { due_time: '10:00:00' }), NOW)).toBe(false);
    expect(isOverdue(task('done', { due_time: '07:00:00', task_status: 'completed', completed_at: at(7, 5) }), NOW)).toBe(false);
  });

  it('shows what is open plus what was finished today, and nothing else', () => {
    expect(onTodaysBoard(task('undated', { due_date: null }), NOW)).toBe(true);
    expect(onTodaysBoard(task('carried', { due_date: '2025-05-15' }), NOW)).toBe(true);
    expect(onTodaysBoard(task('next-week', { due_date: '2025-05-23' }), NOW)).toBe(false);
    expect(onTodaysBoard(task('done-today', { task_status: 'completed', completed_at: at(7, 15) }), NOW)).toBe(true);
    expect(onTodaysBoard(task('done-before', { task_status: 'completed', completed_at: '2025-05-15T16:00:00Z' }), NOW)).toBe(false);
  });

  it('filters by owner, overdue and search', () => {
    const columns = board();
    expect(boardTotal(filterBoard(columns, 'Unassigned', '', null))).toBe(1);
    expect(boardTotal(filterBoard(columns, 'Mine', '', 'p2'))).toBe(2);
    expect(boardTotal(filterBoard(columns, 'Mine', '', null))).toBe(0);
    expect(boardTotal(filterBoard(columns, 'All', 'cold room', null))).toBe(1);
    expect(boardTotal(filterBoard(columns, 'All', 'grace', null))).toBe(1);
  });

  it('labels the count and the subtitle the way the handoff does', () => {
    expect(tasksCount(board(), 'All')).toBe('4 tasks');
    expect(tasksCount(filterBoard(board(), 'Unassigned', '', null), 'Unassigned')).toBe('1 task · unassigned');
    expect(tasksSubtitle('Main Branch')).toBe('Main Branch · today');
  });

  it('knows today and yesterday in the viewer’s own timezone', () => {
    expect(todayOf(NOW)).toBe('2025-05-16');
    expect(yesterdayOf(NOW)).toBe('2025-05-15');
    expect(yesterdayOf(new Date(2025, 0, 1, 9, 0))).toBe('2024-12-31');
  });
});
