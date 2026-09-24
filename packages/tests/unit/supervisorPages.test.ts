import { describe, it, expect } from 'vitest';
import { buildManagerOverview, type OverviewInput } from '../../../apps/web/src/pages/dashboard/manager/overviewModel.js';
import { answerSupervisorQuestion } from '../../../apps/web/src/pages/dashboard/manager/askShiftOS.js';
import { buildTodaysShift } from '../../../apps/web/src/pages/dashboard/supervisor/todaysShiftModel.js';
import { buildTeamRows, filterTeam } from '../../../apps/web/src/pages/team/teamModel.js';
import { allowedStatuses, buildAttRows, saveSteps, savedStatus, timeLines } from '../../../apps/web/src/pages/attendance/shiftAttendanceModel.js';
import type { Task } from '../../../apps/web/src/types/domain.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 9, 0); // Friday May 16, 2025, 09:00 local

function person(id: string, first: string, department: string, email: string | null = null) {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    employee_number: id,
    first_name: first,
    last_name: 'Test',
    email,
    phone: null,
    date_of_birth: null,
    hire_date: '2024-01-01',
    employment_status: 'active' as const,
    notes: null,
    avatar_url: null,
    department_id: department,
    is_active: true
  };
}

function shift(id: string, date: string, department: string, start = '08:00:00') {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    template_id: null,
    department_id: department,
    title: 'Shift',
    description: null,
    shift_date: date,
    start_time: start,
    end_time: '16:00:00',
    crosses_midnight: false,
    break_minutes: 60,
    status: 'published' as const,
    published_at: BASE.created_at,
    is_active: true
  };
}

function assignment(id: string, shiftId: string, employeeId: string) {
  return {
    ...BASE,
    id,
    shift_id: shiftId,
    employee_id: employeeId,
    assignment_status: 'assigned' as const,
    assigned_at: BASE.created_at,
    confirmed_at: null,
    declined_at: null,
    cancelled_at: null,
    assigned_by: null,
    notes: null
  };
}

function clockIn(assignmentId: string, employeeId: string, hours: number, minutes: number, lateMinutes = 0) {
  const at = new Date(2025, 4, 16, hours, minutes).toISOString();
  return {
    ...BASE,
    id: `att-${assignmentId}`,
    created_at: at,
    updated_at: at,
    branch_id: 'br',
    shift_assignment_id: assignmentId,
    employee_id: employeeId,
    attendance_status: lateMinutes ? ('late' as const) : ('present' as const),
    clock_in_at: at,
    clock_out_at: null,
    break_minutes: 0,
    worked_minutes: 0,
    overtime_minutes: 0,
    late_minutes: lateMinutes,
    early_departure_minutes: 0,
    notes: null,
    recorded_by: 'u',
    updated_by: null,
    version: 1
  };
}

function input(overrides: Partial<OverviewInput> = {}): OverviewInput {
  return {
    now: NOW,
    branch: { ...BASE, id: 'br', name: 'Main Branch', address: null, settings: {}, is_active: true },
    employees: [person('e1', 'Sarah', 'd-sales', 'sarah@x.test'), person('e2', 'John', 'd-sales'), person('e3', 'Mary', 'd-front'), person('e4', 'Wale', 'd-ware')],
    departments: [
      { ...BASE, id: 'd-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true },
      { ...BASE, id: 'd-front', branch_id: 'br', name: 'Front End', description: null, is_active: true },
      { ...BASE, id: 'd-ware', branch_id: 'br', name: 'Warehouse', description: null, is_active: true }
    ],
    members: [
      { ...BASE, id: 'm1', user_id: 'u1', role_id: 'r', joined_at: BASE.created_at, is_active: true, user_email: 'SARAH@x.test', user_first_name: 'Sarah', user_last_name: 'Test', role_name: 'Supervisor' }
    ],
    schedules: [{ ...BASE, id: 'w20', branch_id: 'br', name: 'Week 20', start_date: '2025-05-12', end_date: '2025-05-18', status: 'published' }],
    shifts: [shift('s1', '2025-05-16', 'd-sales'), shift('s2', '2025-05-16', 'd-sales'), shift('s3', '2025-05-16', 'd-front'), shift('s4', '2025-05-16', 'd-ware', '13:00:00'), shift('gap', '2025-05-17', 'd-front')],
    assignments: [assignment('a1', 's1', 'e1'), assignment('a2', 's2', 'e2'), assignment('a3', 's3', 'e3'), assignment('a4', 's4', 'e4')],
    attendance: [clockIn('a1', 'e1', 7, 55), clockIn('a2', 'e2', 8, 20, 20)],
    pendingLeave: [],
    pendingSwaps: [],
    invitations: [],
    announcements: [],
    tasks: [],
    ...overrides
  };
}


function task(id: string, patch: Partial<Task>): Task {
  return {
    ...BASE,
    id,
    branch_id: 'br',
    title: id,
    description: null,
    due_date: '2025-05-16',
    due_time: null,
    priority: 'normal',
    task_status: 'assigned',
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
    ...patch
  } as Task;
}

const TASKS = [
  task('Check cold room', { priority: 'high', task_status: 'completed', completed_at: new Date(2025, 4, 16, 8, 15).toISOString(), assigned_supervisor_id: 'e2' }),
  task('Restock', { due_time: '10:00:00', assigned_supervisor_id: 'e3' }),
  task('Floor check', { priority: 'low', due_time: '14:00:00' }),
  task('Tomorrow', { due_date: '2025-05-17' })
];

describe("Supervisor Today's Shift (design handoff HOME.Supervisor)", () => {
  const overview = buildManagerOverview(input({ tasks: TASKS }));
  const shift = buildTodaysShift(overview, NOW)!;

  it('picks the shift running now and titles it like the handoff', () => {
    expect(shift.title).toBe('Shift · in progress');
    expect(shift.subtitle).toBe('08:00 AM – 04:00 PM · 3 scheduled · Main Branch');
  });

  it('counts present, late, absent and tasks done', () => {
    expect(shift.stats.map((s) => [s.label, s.value, s.meta])).toEqual([
      ['Present', '1', '33% of scheduled'],
      ['Late', '1', 'John Test'],
      ['Absent', '0', 'Nobody absent'],
      ['Tasks done', '1/3', '2 due before 2 PM']
    ]);
  });

  it('lists exceptions first and fills in only people with no record', () => {
    expect(shift.checkIns.map((r) => [r.name, r.status, r.barLabel])).toEqual([
      ['John Test', 'Late', '20m late'],
      ['Mary Test', 'Not in', 'Not clocked in yet'],
      ['Sarah Test', 'Checked in', 'On time']
    ]);
    expect(shift.unrecorded.map((r) => r.assignment.id)).toEqual(['a3']);
  });

  it("shows today's tasks with who owns them and their priority", () => {
    expect(shift.tasks.map((t) => [t.title, t.meta, t.tag, t.done])).toEqual([
      ['Check cold room', 'Completed 08:15 AM · John Test', 'High', true],
      ['Restock', 'Due 10:00 AM · Mary Test', 'Medium', false],
      ['Floor check', 'Due 02:00 PM · Unassigned', 'Low', false]
    ]);
  });

  it('answers the supervisor chips from their own permissions', () => {
    expect(answerSupervisorQuestion('Can I add a task?', overview, NOW, { editSchedules: false, createTasks: false }).value).toBe('Only managers create tasks');
    expect(answerSupervisorQuestion('Can I add a task?', overview, NOW, { editSchedules: false, createTasks: true }).kind).toBe('action');
    expect(answerSupervisorQuestion('How do I see the schedule?', overview, NOW, { editSchedules: true, createTasks: false }).value).toBe('You can build and publish schedules');
  });

  it('has nothing to show when no shift is published today', () => {
    expect(buildTodaysShift(buildManagerOverview(input({ assignments: [] })), NOW)).toBeNull();
  });
});

describe('Supervisor Team page (design handoff Supervisor/Team)', () => {
  const overview = buildManagerOverview(input());
  const rows = buildTeamRows(overview, NOW, 'e1');

  it('lists everyone but yourself with where they are now', () => {
    expect(rows.map((r) => [r.name, r.department, r.shift, r.status])).toEqual([
      ['John Test', 'Sales Floor', 'Shift', 'Late'],
      ['Mary Test', 'Front End', 'Shift', 'Off shift'],
      ['Wale Test', 'Warehouse', 'Shift', 'Off shift']
    ]);
    expect(rows[0].hours).toBe('0h this week');
  });

  it('filters by bucket and search', () => {
    expect(filterTeam(rows, 'On shift', '').map((r) => r.name)).toEqual(['John Test']);
    expect(filterTeam(rows, 'All', 'ware').map((r) => r.name)).toEqual(['Wale Test']);
  });
});

describe('Supervisor Attendance page (design handoff Supervisor/Attendance)', () => {
  const shift = buildTodaysShift(buildManagerOverview(input()), NOW)!;
  const rows = buildAttRows(shift.members);
  const [sarah, john, mary] = rows;

  it('reads each saved record as Present, Late, Absent or Not Marked', () => {
    expect(rows.map((r) => [r.name, r.saved])).toEqual([
      ['Sarah Test', 'Present'],
      ['John Test', 'Late'],
      ['Mary Test', 'Not Marked']
    ]);
    expect(savedStatus({ ...john.record!, attendance_status: 'no_show' })).toBe('Absent');
    expect(timeLines(john, 'Late')).toEqual({ time: '08:20 AM', meta: '20m late' });
  });

  it("never lets someone clocked in be switched between Present and Late — that comes from the clock", () => {
    expect(allowedStatuses(sarah)).toEqual(['Present', 'Absent', 'Not Marked']);
    expect(allowedStatuses(mary)).toEqual(['Present', 'Late', 'Absent', 'Not Marked']);
  });

  it('saves each status change as one mark_attendance call and a note-only change as a note', () => {
    const steps = saveSteps(rows, {
      [mary.id]: { status: 'Present', note: '' },
      [john.id]: { status: 'Absent', note: 'Went home sick' },
      [sarah.id]: { status: 'Present', note: 'Opened the store' }
    });
    expect(steps.map((s) => [s.row.name, s.kind, s.kind === 'mark' ? s.status : null, s.kind === 'mark' ? s.notes : s.note])).toEqual([
      ['Sarah Test', 'note', null, 'Opened the store'],
      ['John Test', 'mark', 'absent', 'Went home sick'],
      ['Mary Test', 'mark', 'present', null]
    ]);
    expect(saveSteps(rows, { [mary.id]: { status: 'Not Marked', note: '' } })).toEqual([]);
  });
});
