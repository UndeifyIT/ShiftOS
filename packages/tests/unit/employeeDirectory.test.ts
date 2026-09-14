import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  buildRows,
  departmentBreakdown,
  directoryStats,
  donutGradient,
  NO_FILTERS,
  pageWindow,
  showingLabel,
  tabCounts
} from '../../../apps/web/src/pages/employees/directory/directoryModel.js';

const BASE = { organization_id: 'org', updated_at: '2025-04-12T09:00:00Z', deleted_at: null };

function person(n: number, first: string, last: string, department: string | null, status: 'active' | 'on_leave' | 'inactive' | 'terminated', email: string | null = null) {
  return {
    ...BASE,
    id: `e${n}`,
    branch_id: 'br',
    employee_number: `EMP-${String(n).padStart(3, '0')}`,
    first_name: first,
    last_name: last,
    email,
    phone: n === 1 ? '+234 801 234 5678' : null,
    date_of_birth: null,
    hire_date: '2025-04-12',
    employment_status: status,
    notes: null,
    avatar_url: null,
    department_id: department,
    is_active: true,
    created_at: new Date(2025, 3, 12, 9, 0).toISOString()
  };
}

const departments = [
  { ...BASE, id: 'd-ops', branch_id: 'br', name: 'Operations', description: null, is_active: true, created_at: BASE.updated_at },
  { ...BASE, id: 'd-front', branch_id: 'br', name: 'Front End', description: null, is_active: true, created_at: BASE.updated_at }
];
const members = [
  { ...BASE, id: 'm1', user_id: 'u1', role_id: 'r', joined_at: BASE.updated_at, is_active: true, user_email: 'SARAH@abc.test', user_first_name: 'Sarah', user_last_name: 'Johnson', role_name: 'Supervisor', created_at: BASE.updated_at }
];
const employees = [
  person(2, 'Sarah', 'Johnson', 'd-ops', 'active', 'sarah@abc.test'),
  person(1, 'John', 'Doe', 'd-ops', 'active'),
  person(3, 'Emily', 'Davis', 'd-front', 'on_leave'),
  person(4, 'David', 'Wilson', null, 'inactive'),
  person(10, 'Olivia', 'Thomas', 'd-front', 'terminated')
];

describe('Employees directory (design handoff EMP_DIRECTORY / EMP_STATS / DEPTS)', () => {
  const rows = buildRows(employees, departments, members);

  it('orders people by Employee ID and fills role, department, phone and date added', () => {
    expect(rows.map((r) => [r.number, r.name, r.role, r.roleTone, r.department, r.phone])).toEqual([
      ['EMP-001', 'John Doe', 'Staff', 'neutral', 'Operations', '+234 801 234 5678'],
      ['EMP-002', 'Sarah Johnson', 'Supervisor', 'primary', 'Operations', '—'],
      ['EMP-003', 'Emily Davis', 'Staff', 'neutral', 'Front End', '—'],
      ['EMP-004', 'David Wilson', 'Staff', 'neutral', 'Unassigned', '—'],
      ['EMP-010', 'Olivia Thomas', 'Staff', 'neutral', 'Front End', '—']
    ]);
    expect(rows[0].added).toBe('Apr 12, 2025');
  });

  it('counts the tabs, with Inactive covering inactive and terminated people', () => {
    expect(tabCounts(rows)).toEqual({ all: 5, active: 2, on_leave: 1, inactive: 2 });
    expect(directoryStats(rows, 3, 'Main Branch').map((s) => [s.label, s.value, s.meta])).toEqual([
      ['Total Employees', '5', 'Main Branch'],
      ['Active', '2', '40% of total'],
      ['On Shift Today', '3', '60% of total'],
      ['On Leave', '1', '20% of total']
    ]);
  });

  it('combines the tab/status, department, role and both searches', () => {
    expect(applyFilters(rows, { ...NO_FILTERS, status: 'inactive' }, '').map((r) => r.name)).toEqual(['David Wilson', 'Olivia Thomas']);
    expect(applyFilters(rows, { ...NO_FILTERS, department: 'Operations', role: 'Supervisor' }, '').map((r) => r.name)).toEqual(['Sarah Johnson']);
    expect(applyFilters(rows, { ...NO_FILTERS, query: 'emp-00' }, 'davis').map((r) => r.name)).toEqual(['Emily Davis']);
    expect(applyFilters(rows, NO_FILTERS, '+234 801').map((r) => r.name)).toEqual(['John Doe']);
  });

  it('breaks the branch down by department, largest first, Unassigned last, and closes the donut', () => {
    expect(departmentBreakdown(rows)).toEqual([
      { name: 'Front End', count: 2, pct: 40, color: '#7C3AED' },
      { name: 'Operations', count: 2, pct: 40, color: '#2563EB' },
      { name: 'Unassigned', count: 1, pct: 20, color: '#DDD6D0' }
    ]);
    expect(donutGradient(departmentBreakdown(rows))).toBe('conic-gradient(#7C3AED 0% 40%, #2563EB 40% 80%, #DDD6D0 80% 100%)');
  });

  it('pages eight at a time with up to three page buttons', () => {
    expect(showingLabel(1, 20)).toBe('Showing 1 to 8 of 20 employees');
    expect(showingLabel(3, 20)).toBe('Showing 17 to 20 of 20 employees');
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 9)).toEqual([4, 5, 6]);
    expect(pageWindow(9, 9)).toEqual([7, 8, 9]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
