import { describe, it, expect } from 'vitest';
import {
  activityStats,
  activitySubtitle,
  buildActivity,
  filterActivity,
  peopleIn,
  showingLabel
} from '../../../apps/web/src/pages/activity/activityModel.js';

const BASE = { organization_id: 'org', created_at: '2025-05-16T06:00:00Z', updated_at: '2025-05-16T06:00:00Z', deleted_at: null };
const NOW = new Date(2025, 4, 16, 9, 30);
const at = (day: number, hour: number, minute: number): string => new Date(2025, 4, day, hour, minute).toISOString();

const employees = [
  { ...BASE, id: 'p1', branch_id: 'br', employee_number: 'P1', first_name: 'Mary', last_name: 'Johnson', email: 'mary@abc.test', phone: null, date_of_birth: null, hire_date: '2024-01-15', employment_status: 'active' as const, notes: null, avatar_url: null, department_id: 'dep-front', is_active: true },
  { ...BASE, id: 'p2', branch_id: 'br', employee_number: 'P2', first_name: 'John', last_name: 'Doe', email: 'john@abc.test', phone: null, date_of_birth: null, hire_date: '2024-01-15', employment_status: 'active' as const, notes: null, avatar_url: null, department_id: 'dep-sales', is_active: true }
];
const departments = [
  { ...BASE, id: 'dep-front', branch_id: 'br', name: 'Front End', description: null, is_active: true },
  { ...BASE, id: 'dep-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true }
];
const members = [
  { ...BASE, id: 'm1', user_id: 'user-sarah', role_id: 'r1', joined_at: BASE.created_at, is_active: true, user_email: 'sarah@abc.test', user_first_name: 'Sarah', user_last_name: 'Johnson', role_name: 'Supervisor' }
];
const shifts = [
  { ...BASE, id: 'sh-morning', branch_id: 'br', template_id: null, department_id: 'dep-front', title: 'Morning Shift', description: null, shift_date: '2025-05-16', start_time: '08:00:00', end_time: '16:00:00', crosses_midnight: false, break_minutes: 60, status: 'published' as const, published_at: BASE.created_at, is_active: true }
];
const assignments = [
  { ...BASE, id: 'asg-1', shift_id: 'sh-morning', employee_id: 'p1', assignment_status: 'assigned' as const, assigned_at: BASE.created_at, confirmed_at: null, declined_at: null, cancelled_at: null, assigned_by: 'user-sarah', notes: null },
  { ...BASE, id: 'asg-2', shift_id: 'sh-morning', employee_id: 'p2', assignment_status: 'assigned' as const, assigned_at: BASE.created_at, confirmed_at: null, declined_at: null, cancelled_at: null, assigned_by: 'user-sarah', notes: null }
];
const attendance = [
  { ...BASE, id: 'att-1', branch_id: 'br', shift_assignment_id: 'asg-1', employee_id: 'p1', attendance_status: 'late' as const, clock_in_at: at(16, 8, 15), clock_out_at: null, break_minutes: 0, worked_minutes: 0, overtime_minutes: 0, late_minutes: 0, early_departure_minutes: 0, notes: null, recorded_by: 'u', updated_by: null, version: 1 },
  { ...BASE, id: 'att-2', branch_id: 'br', shift_assignment_id: 'asg-2', employee_id: 'p2', attendance_status: 'present' as const, clock_in_at: at(16, 7, 55), clock_out_at: null, break_minutes: 0, worked_minutes: 0, overtime_minutes: 0, late_minutes: 0, early_departure_minutes: 0, notes: null, recorded_by: 'u', updated_by: null, version: 1 },
  { ...BASE, id: 'att-3', branch_id: 'br', shift_assignment_id: 'asg-2', employee_id: 'p2', attendance_status: 'present' as const, clock_in_at: at(15, 8, 2), clock_out_at: null, break_minutes: 0, worked_minutes: 0, overtime_minutes: 0, late_minutes: 0, early_departure_minutes: 0, notes: null, recorded_by: 'u', updated_by: null, version: 1 }
];
const tasks = [
  { ...BASE, id: 't1', branch_id: 'br', title: 'Check cold room temperature', description: null, due_date: '2025-05-16', due_time: '08:00:00', priority: 'high' as const, recurrence: 'daily' as const, task_status: 'completed' as const, assigned_supervisor_id: 'p2', assigned_by: 'user-sarah', assigned_at: at(16, 7, 20), completed_at: at(16, 8, 2), completed_by: 'user-sarah', completion_notes: null, verified_at: null, verified_by: null, verification_notes: null, verification_status: 'pending' as const, created_by: 'user-sarah', updated_by: null, version: 1 }
];
const announcements = [
  { ...BASE, id: 'a1', branch_id: 'br', title: 'New Promotion This Weekend', content: 'Displays up by 10 AM.', announcement_type: 'general' as const, visibility_type: 'branch' as const, is_published: true, is_pinned: false, requires_acknowledgement: false, published_at: at(16, 7, 30), expires_at: null, created_by: 'user-sarah' }
];

const schedules = [
  { ...BASE, id: 'sch-w20', branch_id: 'br', name: 'Week 20', start_date: '2025-05-12', end_date: '2025-05-18', status: 'published' as const, updated_at: at(16, 6, 40) },
  { ...BASE, id: 'sch-w21', branch_id: 'br', name: 'Week 21', start_date: '2025-05-19', end_date: '2025-05-25', status: 'draft' as const, updated_at: at(16, 6, 45) }
];
const leave = [
  { ...BASE, id: 'lv-1', branch_id: 'br', employee_id: 'p1', requested_by: 'user-p1', approved_by: null, rejected_by: null, cancelled_by: null, approved_at: null, rejected_at: null, cancelled_at: null, leave_type: 'annual_leave' as const, status: 'pending' as const, start_date: '2025-06-02', end_date: '2025-06-04', total_days: 3, reason: 'Family travel', manager_notes: null, cancellation_reason: null, last_status_changed_at: at(16, 7, 5), version: 1, created_by: 'user-p1', created_at: at(16, 7, 5) }
];

const feed = (): ReturnType<typeof buildActivity> =>
  buildActivity({ now: NOW, branchName: 'Main Branch', employees, departments, members, shifts, assignments, attendance, tasks, announcements, schedules, leave });

describe('recent activity', () => {
  it('builds the handoff’s rows out of what actually happened', () => {
    const titles = feed().map((event) => `${event.time} ${event.title}`);
    expect(titles).toEqual([
      '08:15 AM Mary Johnson marked',
      '08:02 AM Task completed',
      '08:00 AM Shift started',
      '07:55 AM John Doe checked in',
      '07:30 AM Announcement posted',
      '07:20 AM Task assigned',
      '07:05 AM Mary Johnson requested leave',
      '06:40 AM Schedule published',
      '08:02 AM · 15 May John Doe checked in'
    ]);
  });

  it('derives lateness from the shift, and marks it the way the design does', () => {
    const late = feed().find((event) => event.person === 'Mary Johnson');
    expect(late).toMatchObject({
      title: 'Mary Johnson marked',
      accent: 'late',
      desc: 'Check-in time: 08:15 AM (15m late)',
      tone: 'bad',
      role: 'Front End',
      type: 'Employee Actions'
    });
  });

  it('names the person behind an announcement through their membership', () => {
    expect(feed().find((event) => event.title === 'Announcement posted')).toMatchObject({
      desc: 'New Promotion This Weekend',
      person: 'Sarah Johnson',
      role: 'Supervisor',
      type: 'System Events'
    });
  });

  it('reads a shift that has started as an event, with its hours', () => {
    expect(feed().find((event) => event.title === 'Shift started')).toMatchObject({
      desc: 'Morning Shift (08:00 AM – 04:00 PM)',
      person: 'Main Branch',
      role: 'Front End'
    });
  });

  it('counts each type and its share of what is in view', () => {
    const today = filterActivity(feed(), { type: 'All Types', person: 'All People', range: 'Today', query: '', sort: 'Newest first' }, NOW);
    expect(activityStats(today).map((stat) => `${stat.label} ${stat.value} ${stat.meta}`)).toEqual([
      'Total Activities 8 In view',
      'System Events 3 38%',
      'Employee Actions 3 38%',
      'Task Updates 2 25%'
    ]);
  });

  it('filters by day, type, person and search, and can run oldest first', () => {
    const events = feed();
    const on = (range: 'Today' | 'Yesterday' | 'Last 7 days', extra: Partial<{ type: string; person: string; query: string }> = {}) =>
      filterActivity(events, { type: 'All Types', person: 'All People', range, query: '', sort: 'Newest first', ...extra }, NOW);

    expect(on('Today')).toHaveLength(8);
    expect(on('Yesterday')).toHaveLength(1);
    expect(on('Last 7 days')).toHaveLength(9);
    expect(on('Today', { type: 'Task Updates' })).toHaveLength(2);
    expect(on('Today', { person: 'Mary Johnson' })).toHaveLength(2);
    expect(on('Today', { query: 'cold room' })).toHaveLength(2); // both the assignment and the completion

    const oldest = filterActivity(events, { type: 'All Types', person: 'All People', range: 'Today', query: '', sort: 'Oldest first' }, NOW);
    expect(oldest[0]?.title).toBe('Schedule published');
  });

  it('carries the leave requests and published schedules the overview card shows', () => {
    const events = feed();
    expect(events.find((event) => event.title.includes('requested leave'))).toMatchObject({
      desc: 'Annual leave · 02 – 04 Jun',
      person: 'Mary Johnson',
      type: 'Employee Actions'
    });
    expect(events.find((event) => event.title === 'Schedule published')).toMatchObject({ desc: 'Week 20 is live for the team', type: 'System Events' });
    expect(events.some((event) => event.desc.includes('Week 21'))).toBe(false);
  });

  it('offers every person in the feed to the Person filter', () => {
    expect(peopleIn(feed())).toEqual(['John Doe', 'Main Branch', 'Mary Johnson', 'Sarah Johnson']);
  });

  it('labels the pager and the subtitle', () => {
    expect(showingLabel(24, 0)).toBe('Showing 1 to 8 of 24 activities');
    expect(showingLabel(24, 2)).toBe('Showing 17 to 24 of 24 activities');
    expect(showingLabel(1, 0)).toBe('Showing 1 to 1 of 1 activity');
    expect(showingLabel(0, 0)).toBe('Showing 0 activities');
    expect(activitySubtitle(NOW, 'Today')).toBe("All real-time activities and updates from today's shift · May 16, 2025");
  });
});
