import { describe, it, expect } from 'vitest';
import { buildManagerOverview, type OverviewInput } from '../../../apps/web/src/pages/dashboard/manager/overviewModel.js';
import { answerQuestion } from '../../../apps/web/src/pages/dashboard/manager/askShiftOS.js';

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

describe('Manager overview model (design handoff HOME.Manager)', () => {
  it('derives the four stats from people, clock-ins, unfilled shifts and requests', () => {
    const overview = buildManagerOverview(input());
    expect(overview.subtitle).toBe('Main Branch · Friday, May 16');
    expect(overview.stats.map((s) => [s.label, s.value, s.meta])).toEqual([
      ['Employees', '4', '1 supervisor · 3 staff'],
      ['On shift now', '2', 'of 4 scheduled'],
      ['Coverage gaps', '1', 'This week, unfilled'],
      ['Open requests', '0', '0 swaps · 0 leave']
    ]);
  });

  it("scores each department's coverage only against shifts that have already started", () => {
    const rows = buildManagerOverview(input()).coverageRows;
    expect(rows.map((r) => [r.name, r.middle, r.barLabel, r.status, r.sub])).toEqual([
      ['Front End', '1 scheduled', '0 of 1 checked in', 'At risk', 'No supervisor on shift'],
      ['Sales Floor', '2 scheduled', '2 of 2 checked in', 'Healthy', 'Sarah Test · Supervisor'],
      ['Warehouse', '1 scheduled', '0 of 1 checked in', 'Upcoming', 'No supervisor on shift']
    ]);
  });

  it('lists what needs attention and nudges when next week is not published', () => {
    const overview = buildManagerOverview(input());
    expect(overview.showShifty).toBe(true);
    expect(overview.attention.map((a) => [a.title, a.tag, a.done])).toEqual([
      ['Front End has no supervisor on shift', 'Blocking', false],
      ['Warehouse has no supervisor on shift', 'Blocking', false],
      ["Next week's schedule is unpublished", 'Scheduling', false],
      ["This week's schedule is published", 'Scheduling', true]
    ]);
    expect(overview.openAttentionCount).toBe(3);

    const published = buildManagerOverview(
      input({ schedules: [...input().schedules, { ...BASE, id: 'w21', branch_id: 'br', name: 'Week 21', start_date: '2025-05-19', end_date: '2025-05-25', status: 'published' }] })
    );
    expect(published.showShifty).toBe(false);
  });

  it('shows the latest clock-ins as recent activity, late ones marked late', () => {
    const activity = buildManagerOverview(input()).activity;
    expect(activity.map((a) => [a.title, a.time])).toEqual([
      ['John Test marked late', '08:20 AM'],
      ['Sarah Test checked in', '07:55 AM']
    ]);
  });

  it('gives each activity event the Recent Activity row detail: accent, second line, person, bucket and link', () => {
    const activity = buildManagerOverview(
      input({
        tasks: [
          {
            ...BASE,
            id: 't1',
            branch_id: 'br',
            title: 'Check Cold Room Temperature',
            description: null,
            due_date: '2025-05-16',
            due_time: null,
            priority: 'normal',
            task_status: 'completed',
            assigned_supervisor_id: 'e4',
            assigned_by: 'u1',
            assigned_at: new Date(2025, 4, 16, 7, 0).toISOString(),
            completed_at: new Date(2025, 4, 16, 8, 30).toISOString(),
            completed_by: null,
            completion_notes: null,
            verified_at: null,
            verified_by: null,
            verification_notes: null,
            verification_status: 'pending',
            created_by: 'u1',
            updated_by: null,
            version: 1
          }
        ]
      })
    ).activity;
    expect(activity.map((a) => [a.headline, a.accent, a.desc, a.person, a.role, a.category, a.href])).toEqual([
      ['Task completed', null, 'Check Cold Room Temperature completed', 'Wale Test', 'Warehouse', 'Task Updates', '/tasks'],
      ['John Test marked', 'late', 'Check-in time: 08:20 AM (20m late)', 'John Test', 'Sales Floor', 'Employee Actions', '/attendance'],
      ['Sarah Test checked in', null, 'Check-in time: 07:55 AM', 'Sarah Test', 'Sales Floor', 'Employee Actions', '/attendance'],
      ['Task assigned', null, 'Check Cold Room Temperature assigned to Wale Test', 'Wale Test', 'Warehouse', 'Task Updates', '/tasks']
    ]);
  });

  it('answers Ask ShiftOS questions from the same data, with the handoff fallback otherwise', () => {
    const overview = buildManagerOverview(input());
    const working = answerQuestion("Who's working today?", overview, NOW);
    expect(working.value).toBe('2 of 4 scheduled');
    expect(working.lines).toContain('Sales Floor — 2 of 2 · John Test clocked in late (08:20)');
    expect(answerQuestion('Any coverage gaps?', overview, NOW).value).toBe('1 gap this week');
    expect(answerQuestion('Add a task', overview, NOW).kind).toBe('action');
    expect(answerQuestion('What is the meaning of life?', overview, NOW).value).toBe('I can answer that a few ways');
  });
});
