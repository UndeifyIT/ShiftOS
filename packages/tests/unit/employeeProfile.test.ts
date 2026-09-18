import { describe, it, expect } from 'vitest';
import { historyDays, historyRows, historyStats, previousRange, rangeFor, rangeLabel } from '../../../apps/web/src/pages/employees/profile/historyModel.js';
import {
  addEmployeeSummary,
  createPayload,
  EMPTY_ADD_EMPLOYEE,
  invitePayload,
  isBlank,
  loginEmailOf,
  parseDraft,
  validateAddEmployee,
  type AddEmployeeForm
} from '../../../apps/web/src/pages/employees/profile/addEmployeeModel.js';
import { splitPhone } from '../../../apps/web/src/pages/employees/profile/employeeFields.js';

const at = (month: number, day: number, hour: number, minute = 0): string => new Date(2025, month - 1, day, hour, minute).toISOString();

function record(id: string, fields: Record<string, unknown>) {
  return {
    id,
    organization_id: 'org',
    branch_id: 'br',
    shift_assignment_id: `sa-${id}`,
    employee_id: 'e1',
    attendance_status: 'completed' as const,
    clock_in_at: null,
    clock_out_at: null,
    break_minutes: 0,
    worked_minutes: 0,
    overtime_minutes: 0,
    late_minutes: 0,
    early_departure_minutes: 0,
    notes: null,
    recorded_by: 'u',
    updated_by: null,
    version: 1,
    created_at: at(5, 1, 8),
    updated_at: at(5, 1, 8),
    deleted_at: null,
    shift_start_time: '09:00:00',
    shift_end_time: '17:00:00',
    shift_title: null,
    ...fields
  };
}

const records = [
  record('r1', { shift_date: '2025-05-16', shift_title: 'Morning', clock_in_at: at(5, 16, 9), clock_out_at: at(5, 16, 17), worked_minutes: 480 }),
  record('r2', { shift_date: '2025-05-15', attendance_status: 'late', clock_in_at: at(5, 15, 9, 20), clock_out_at: at(5, 15, 17), worked_minutes: 460, late_minutes: 20, notes: 'Bus delay' }),
  record('r3', { shift_date: '2025-05-14', attendance_status: 'absent' }),
  record('r4', { shift_date: '2025-04-10', clock_in_at: at(4, 10, 9), clock_out_at: at(4, 10, 15, 40), worked_minutes: 400 }),
  record('r5', { shift_date: '2025-04-11', attendance_status: 'late', clock_in_at: at(4, 11, 9, 10), clock_out_at: at(4, 11, 17), worked_minutes: 470, late_minutes: 10 })
];

describe('Employee Profile history (design handoff HISTORY_STATS / HISTORY_DAYS / HISTORY_ROWS)', () => {
  const range = rangeFor('this_month', '2025-05-16');

  it('works out the ranges and their labels', () => {
    expect(range).toEqual({ start: '2025-05-01', end: '2025-05-16' });
    expect(rangeLabel(range)).toBe('May 1 – May 16, 2025');
    expect(previousRange(range, 'this_month')).toEqual({ start: '2025-04-01', end: '2025-04-16' });
    expect(previousRange(rangeFor('last_month', '2025-05-16'), 'last_month')).toEqual({ start: '2025-03-01', end: '2025-03-31' });
    expect(previousRange(rangeFor('this_month', '2025-03-30'), 'this_month')).toEqual({ start: '2025-02-01', end: '2025-02-28' });
    expect(previousRange(rangeFor('last_30', '2025-05-16'), 'last_30')).toEqual({ start: '2025-03-18', end: '2025-04-16' });
    expect(rangeLabel({ start: '2025-04-01', end: '2025-04-30' }, false)).toBe('Apr 1 – Apr 30');
    expect(rangeFor('last_month', '2025-05-16')).toEqual({ start: '2025-04-01', end: '2025-04-30' });
    expect(rangeFor('last_30', '2025-05-16')).toEqual({ start: '2025-04-17', end: '2025-05-16' });
    expect(rangeLabel({ start: '2024-12-20', end: '2025-01-18' })).toBe('Dec 20, 2024 – Jan 18, 2025');
  });

  it('compares hours, days worked, lateness and absences with the period before', () => {
    expect(historyStats(records, range, 'this_month').map((s) => [s.label, s.value, s.meta, s.good])).toEqual([
      ['Total Hours Worked', '15h 40m', '↑ 8% vs Apr 1 – Apr 16', true],
      ['Days Worked', '2', '67% of scheduled days', false],
      ['Late Arrivals', '1', 'No change', false],
      ['Absent Days', '1', '↑ 1 vs Apr 1 – Apr 16', false]
    ]);
  });

  it('marks every day of the range, worst state winning and no record meaning off', () => {
    const days = historyDays(records, range);
    expect(days).toHaveLength(16);
    expect(days[0]).toEqual({ date: '2025-05-01', dow: 'THU', label: 'May 1', state: 'off' });
    expect(days.slice(-4).map((d) => d.state)).toEqual(['off', 'absent', 'late', 'ok']);
    expect(historyDays(records, rangeFor('last_30', '2025-05-16'))).toHaveLength(30);
  });

  it('lists recent activity newest first, and filters it', () => {
    expect(historyRows(records, range, 'all').map((r) => [r.date, r.shift, r.inTime, r.late, r.out, r.total, r.status, r.tone, r.notes])).toEqual([
      ['Fri, May 16, 2025', 'Morning (9:00 AM – 5:00 PM)', '9:00 AM', false, '5:00 PM', '8h 00m', 'On Time', 'ok', '—'],
      ['Thu, May 15, 2025', 'Shift (9:00 AM – 5:00 PM)', '9:20 AM', true, '5:00 PM', '7h 40m', 'Late (20m)', 'warn', 'Bus delay'],
      ['Wed, May 14, 2025', 'Shift (9:00 AM – 5:00 PM)', '—', false, '—', '—', 'Absent', 'bad', '—']
    ]);
    expect(historyRows(records, range, 'late').map((r) => r.id)).toEqual(['r2']);
    expect(historyRows(records, range, 'absent').map((r) => r.id)).toEqual(['r3']);
    expect(historyRows(records, rangeFor('last_month', '2025-05-16'), 'on_time').map((r) => r.id)).toEqual(['r4']);
  });
});

describe('Add Employee (design handoff ADD_EMP_SECTIONS / ADD_EMP_SUMMARY)', () => {
  const filled: AddEmployeeForm = {
    ...EMPTY_ADD_EMPLOYEE,
    fullName: '  Ada Grace Obi ',
    email: 'ada@abc.test',
    phone: '801 234 5678',
    dateOfBirth: '1996-02-10',
    gender: 'female',
    departmentId: 'd-ops',
    hireDate: '2025-05-19',
    roleId: 'role-emp',
    employmentType: 'part_time'
  };
  const options = { today: '2025-05-16', canInvite: true };

  it('requires what the handoff marks with an asterisk', () => {
    expect(Object.keys(validateAddEmployee(EMPTY_ADD_EMPLOYEE, options)).sort()).toEqual(
      ['dateOfBirth', 'departmentId', 'email', 'fullName', 'gender', 'hireDate', 'loginEmail', 'phone', 'roleId'].sort()
    );
    expect(validateAddEmployee(filled, options)).toEqual({});
    expect(validateAddEmployee({ ...filled, fullName: 'Ada' }, options).fullName).toBe('Enter a first and last name');
    expect(validateAddEmployee({ ...filled, email: 'ada@' }, options).email).toBe('Enter a valid email address');
    expect(validateAddEmployee({ ...filled, dateOfBirth: '2025-05-16' }, options).dateOfBirth).toBe('Date of birth must be in the past');
  });

  it('only asks for a role and login email when a login is being sent', () => {
    const noRole = { ...filled, roleId: '' };
    expect(validateAddEmployee(noRole, options).roleId).toBe('Select a role');
    expect(validateAddEmployee({ ...noRole, sendCredentials: false }, options)).toEqual({});
    expect(validateAddEmployee(noRole, { ...options, canInvite: false })).toEqual({});
    expect(validateAddEmployee({ ...filled, loginEmail: 'nope', loginEmailEdited: true }, options).loginEmail).toBe('Enter a valid login email address');
  });

  it('uses the email above as the login email until it is edited', () => {
    expect(loginEmailOf(filled)).toBe('ada@abc.test');
    expect(loginEmailOf({ ...filled, loginEmail: 'ada.login@abc.test', loginEmailEdited: true })).toBe('ada.login@abc.test');
  });

  it('builds the create and invite payloads', () => {
    expect(createPayload(filled, 'br')).toEqual({
      branchId: 'br',
      employeeNumber: undefined,
      firstName: 'Ada',
      lastName: 'Grace Obi',
      email: 'ada@abc.test',
      phone: '+234 801 234 5678',
      dateOfBirth: '1996-02-10',
      gender: 'female',
      hireDate: '2025-05-19',
      departmentId: 'd-ops',
      employmentType: 'part_time',
      reportsToEmployeeId: undefined
    });
    expect(invitePayload(filled, 'br')).toEqual({ email: 'ada@abc.test', firstName: 'Ada', lastName: 'Grace Obi', roleId: 'role-emp', branchIds: ['br'] });
    expect(splitPhone('+234 801 234 5678')).toEqual({ code: '+234', number: '801 234 5678' });
  });

  it('fills the Employee Summary as the form is completed', () => {
    const lookups = { departments: [{ value: 'd-ops', label: 'Operations' }], roles: [{ value: 'role-emp', label: 'Employee' }], managers: [] };
    expect(addEmployeeSummary(EMPTY_ADD_EMPLOYEE, lookups).map((r) => r.value)).toEqual(Array(9).fill('—'));
    expect(addEmployeeSummary(filled, lookups).map((r) => [r.label, r.value])).toEqual([
      ['Full Name', 'Ada Grace Obi'],
      ['Employee ID', '—'],
      ['Email Address', 'ada@abc.test'],
      ['Phone Number', '+234 801 234 5678'],
      ['Department', 'Operations'],
      ['Role', 'Employee'],
      ['Date of Joining', 'May 19, 2025'],
      ['Reports To', '—'],
      ['Login Email', 'ada@abc.test']
    ]);
  });

  it('restores a saved draft only when it parses', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft('{not json')).toBeNull();
    const draft = parseDraft(JSON.stringify({ fullName: 'Ada Obi', sendCredentials: 'yes', extra: 1 }));
    expect(draft).toEqual({ ...EMPTY_ADD_EMPLOYEE, fullName: 'Ada Obi' });
    expect(isBlank(EMPTY_ADD_EMPLOYEE)).toBe(true);
    expect(isBlank(draft!)).toBe(false);
  });
});
