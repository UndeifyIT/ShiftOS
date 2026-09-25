import { describe, it, expect } from 'vitest';
import {
  attendanceCounts,
  attendanceSubtitle,
  buildAttendanceRows,
  countLabel,
  filterAttendance,
  lateMinutes,
  pageWindow,
  pendingChanges,
  shiftLabel,
  statusOf
} from '../../../apps/web/src/pages/attendance/attendanceModel.js';

const BASE = { organization_id: 'org', created_at: '2025-05-16T06:00:00Z', updated_at: '2025-05-16T06:00:00Z', deleted_at: null };
const TODAY = '2025-05-16';
const at = (hour: number, minute: number): string => new Date(2025, 4, 16, hour, minute).toISOString();

const shifts = [
  { ...BASE, id: 'sh-morning', branch_id: 'br', template_id: null, department_id: 'dep-sales', title: 'Morning', description: null, shift_date: TODAY, start_time: '09:00:00', end_time: '17:00:00', crosses_midnight: false, break_minutes: 60, status: 'published' as const, published_at: BASE.created_at, is_active: true }
];

const assignment = (id: string, employeeId: string, status: 'assigned' | 'cancelled' = 'assigned') => ({
  ...BASE,
  id,
  shift_id: 'sh-morning',
  employee_id: employeeId,
  assignment_status: status,
  assigned_at: BASE.created_at,
  confirmed_at: null,
  declined_at: null,
  cancelled_at: null,
  assigned_by: 'u',
  notes: null
});

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

const record = (id: string, assignmentId: string, employeeId: string, fields: Record<string, unknown>) => ({
  ...BASE,
  id,
  branch_id: 'br',
  shift_assignment_id: assignmentId,
  employee_id: employeeId,
  attendance_status: 'scheduled' as const,
  clock_in_at: null,
  clock_out_at: null,
  break_minutes: 0,
  worked_minutes: 0,
  overtime_minutes: 0,
  // The database zeroes this on every write (011/018), so the model must not rely on it.
  late_minutes: 0,
  early_departure_minutes: 0,
  notes: null,
  recorded_by: 'u',
  updated_by: null,
  version: 1,
  ...fields
});

const departments = [
  { ...BASE, id: 'dep-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true },
  { ...BASE, id: 'dep-bakery', branch_id: 'br', name: 'Bakery', description: null, is_active: true }
];

const sources = {
  assignments: [assignment('a1', 'e1'), assignment('a2', 'e2'), assignment('a3', 'e3'), assignment('a4', 'e4'), assignment('a5', 'e5', 'cancelled')],
  shifts,
  employees: [employee('e1', 'Amaka', 'Nwosu', 'dep-sales'), employee('e2', 'Bola', 'Ade', 'dep-sales'), employee('e3', 'Chidi', 'Obi', 'dep-bakery'), employee('e4', 'Dami', 'Eze', null), employee('e5', 'Emeka', 'Cut', 'dep-sales')],
  departments,
  records: [
    record('r1', 'a1', 'e1', { attendance_status: 'present', clock_in_at: at(8, 55) }),
    record('r2', 'a2', 'e2', { attendance_status: 'present', clock_in_at: at(9, 12) }),
    record('r3', 'a3', 'e3', { attendance_status: 'absent', notes: 'Called in sick' })
  ],
  pending: {}
};

describe('Attendance today (design handoff kindAttendance / ATT_SEED)', () => {
  const rows = buildAttendanceRows(sources);

  it('builds a row per active assignment, with the status its record implies', () => {
    expect(rows.map((r) => [r.name, r.role, r.status, r.time, r.timeMeta, r.note])).toEqual([
      ['Amaka Nwosu', 'Sales Floor', 'Present', '08:55 AM', 'On time', ''],
      ['Bola Ade', 'Sales Floor', 'Late', '09:12 AM', '12m late', ''],
      ['Chidi Obi', 'Bakery', 'Absent', '—', '', 'Called in sick'],
      ['Dami Eze', 'Unassigned', 'Not Marked', '—', 'Not recorded', '']
    ]);
  });

  it('works out lateness from the shift start, because the database zeroes late_minutes', () => {
    expect(lateMinutes(sources.records[1], shifts[0])).toBe(12);
    expect(lateMinutes(sources.records[0], shifts[0])).toBe(0);
    expect(statusOf(sources.records[1], shifts[0])).toBe('Late');
    expect(statusOf(undefined, shifts[0])).toBe('Not Marked');
    expect(statusOf(record('r9', 'a9', 'e9', { attendance_status: 'no_show' }), shifts[0])).toBe('Absent');
  });

  it('counts each status for the tabs', () => {
    expect(attendanceCounts(rows)).toEqual({ Present: 1, Late: 1, Absent: 1, 'Not Marked': 1 });
  });

  it('applies unsaved edits over the saved status and flags them dirty', () => {
    const edited = buildAttendanceRows({ ...sources, pending: { a4: { status: 'Present' }, a1: { note: 'Opened the till' } } });
    const dami = edited.find((r) => r.name === 'Dami Eze')!;
    expect([dami.status, dami.time, dami.timeMeta, dami.dirty]).toEqual(['Present', 'Now', 'Marking now', true]);
    expect(edited.find((r) => r.name === 'Amaka Nwosu')).toMatchObject({ note: 'Opened the till', dirty: true, status: 'Present' });
    // Re-picking the status it already had is not a change.
    expect(buildAttendanceRows({ ...sources, pending: { a1: { status: 'Present' } } })[0].dirty).toBe(false);
  });

  it('only sends the rows that actually changed', () => {
    const pending = { a4: { status: 'Absent' as const }, a1: { status: 'Present' as const } };
    const edited = buildAttendanceRows({ ...sources, pending });
    expect(pendingChanges(edited, pending)).toEqual([{ assignmentId: 'a4', status: 'Absent', note: '', at: null }]);
    // Marking someone present vouches for them from the shift's start, so the derived lateness doesn't undo the choice.
    const present = { a4: { status: 'Present' as const } };
    expect(pendingChanges(buildAttendanceRows({ ...sources, pending: present }), present)).toEqual([
      { assignmentId: 'a4', status: 'Present', note: '', at: new Date(2025, 4, 16, 9, 0).toISOString() }
    ]);
  });

  it('filters by tab, search and department', () => {
    expect(filterAttendance(rows, 'Late', '', 'all').map((r) => r.name)).toEqual(['Bola Ade']);
    expect(filterAttendance(rows, 'All Employees', 'obi', 'all').map((r) => r.name)).toEqual(['Chidi Obi']);
    expect(filterAttendance(rows, 'All Employees', '', 'dep-sales').map((r) => r.name)).toEqual(['Amaka Nwosu', 'Bola Ade']);
    expect(filterAttendance(rows, 'Present', 'bola', 'all')).toEqual([]);
  });

  it('writes the handoff subtitle, count line and pager window', () => {
    expect(attendanceSubtitle(shifts, TODAY)).toBe('Mark attendance for Morning (9:00 AM – 5:00 PM) · May 16, 2025');
    // Shifts running the same hours under the same name read as one.
    expect(attendanceSubtitle([...shifts, { ...shifts[0], id: 'sh-2' }], TODAY)).toBe('Mark attendance for Morning (9:00 AM – 5:00 PM) · May 16, 2025');
    expect(attendanceSubtitle([...shifts, { ...shifts[0], id: 'sh-2', title: 'Evening', start_time: '14:00:00', end_time: '22:00:00' }], TODAY)).toBe('Mark attendance for 2 shifts · May 16, 2025');
    expect(attendanceSubtitle([], TODAY)).toBe('Mark attendance for today · May 16, 2025');
    expect(shiftLabel(undefined)).toBe('Unscheduled');
    expect(countLabel(8, 20, 1, 8)).toBe('1–8 of 20 employees');
    expect(countLabel(4, 20, 3, 8)).toBe('17–20 of 20 employees');
    expect(countLabel(0, 0, 1, 8)).toBe('0 of 0 employees');
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 6)).toEqual([4, 5, 6]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
