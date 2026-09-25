/**
 * The handoff's Employees directory (`ShiftOS Dashboards.dc.html`,
 * "Manager/Employees": EMP_STATS, empTabs, EMP_DIRECTORY, EMP_FILTERS,
 * DEPTS) built from the branch's real people. Pure — filtering, paging and
 * the department breakdown are all derived from the rows passed in.
 */
import { emailKey, roleNameByEmail } from '../../../lib/members.js';
import type { Department, Employee, EmploymentStatus, Member } from '../../../types/domain.js';
import type { Tone } from '../../scheduling/grid/scheduleFormat.js';

export const PAGE_SIZE = 8;

/** The tabs and the Status filter share one value; "Inactive" covers inactive and terminated people. */
export type StatusFilter = 'all' | 'active' | 'on_leave' | 'inactive';

export const STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  inactive: 'Inactive',
  terminated: 'Terminated'
};

export const STATUS_TONE: Record<EmploymentStatus, Tone> = {
  active: 'ok',
  on_leave: 'info',
  inactive: 'neutral',
  terminated: 'bad'
};

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' }
];

/** People with no ShiftOS login are listed as Staff. */
export const NO_ACCOUNT_ROLE = 'Staff';

const ROLE_TONE: Array<[RegExp, Tone]> = [
  [/owner|manager/i, 'info'],
  [/supervisor/i, 'primary'],
  [/admin/i, 'violet'],
  [/employee/i, 'ok']
];

export function roleTone(role: string): Tone {
  return ROLE_TONE.find(([pattern]) => pattern.test(role))?.[1] ?? 'neutral';
}

const DEPARTMENT_COLORS = ['#7C3AED', '#2563EB', '#2E9E62', '#E8A33D', '#EC4899'];
export const UNASSIGNED = 'Unassigned';
const UNASSIGNED_COLOR = '#DDD6D0';

export interface DirectoryRow {
  employee: Employee;
  name: string;
  number: string;
  role: string;
  roleTone: Tone;
  department: string;
  status: EmploymentStatus;
  phone: string;
  added: string;
}

export interface DirectoryFilters {
  status: StatusFilter;
  department: string;
  role: string;
  /** An employment_type value, or 'all'. */
  employmentType: string;
  query: string;
}

export const NO_FILTERS: DirectoryFilters = { status: 'all', department: 'all', role: 'all', employmentType: 'all', query: '' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Apr 12, 2025' */
export function addedLabel(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '—' : `${MONTHS[at.getMonth()]} ${at.getDate()}, ${at.getFullYear()}`;
}

export function buildRows(employees: Employee[], departments: Department[], members: Member[]): DirectoryRow[] {
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  const roleByEmail = roleNameByEmail(members);
  return employees
    .filter((e) => !e.deleted_at)
    .map((employee) => {
      const role = roleByEmail.get(emailKey(employee.email) ?? '') || NO_ACCOUNT_ROLE;
      return {
        employee,
        name: `${employee.first_name} ${employee.last_name}`.trim(),
        number: employee.employee_number,
        role,
        roleTone: roleTone(role),
        department: (employee.department_id && departmentName.get(employee.department_id)) || UNASSIGNED,
        status: employee.employment_status,
        phone: employee.phone || '—',
        added: addedLabel(employee.created_at)
      };
    })
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }) || a.name.localeCompare(b.name));
}

export function matchesStatus(status: EmploymentStatus, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'inactive') return status === 'inactive' || status === 'terminated';
  return status === filter;
}

/** Name, Employee ID, email or phone contains the text. */
export function matchesQuery(row: DirectoryRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.name, row.number, row.employee.email ?? '', row.employee.phone ?? ''].some((value) => value.toLowerCase().includes(needle));
}

export function applyFilters(rows: DirectoryRow[], filters: DirectoryFilters, toolbarQuery: string): DirectoryRow[] {
  return rows.filter(
    (row) =>
      matchesStatus(row.status, filters.status) &&
      (filters.department === 'all' || row.department === filters.department) &&
      (filters.role === 'all' || row.role === filters.role) &&
      (filters.employmentType === 'all' || row.employee.employment_type === filters.employmentType) &&
      matchesQuery(row, filters.query) &&
      matchesQuery(row, toolbarQuery)
  );
}

export function tabCounts(rows: DirectoryRow[]): Record<StatusFilter, number> {
  return {
    all: rows.length,
    active: rows.filter((r) => matchesStatus(r.status, 'active')).length,
    on_leave: rows.filter((r) => matchesStatus(r.status, 'on_leave')).length,
    inactive: rows.filter((r) => matchesStatus(r.status, 'inactive')).length
  };
}

const percent = (part: number, total: number): number => (total ? Math.round((part / total) * 100) : 0);

export interface DirectoryStat {
  label: string;
  value: string;
  meta: string;
  icon: 'users' | 'checkCircle' | 'user' | 'calendar';
  tone: Tone;
}

export function directoryStats(rows: DirectoryRow[], onShiftToday: number, branchName: string): DirectoryStat[] {
  const counts = tabCounts(rows);
  return [
    { label: 'Total Employees', value: String(counts.all), meta: branchName, icon: 'users', tone: 'primary' },
    { label: 'Active', value: String(counts.active), meta: `${percent(counts.active, counts.all)}% of total`, icon: 'checkCircle', tone: 'ok' },
    { label: 'On Shift Today', value: String(onShiftToday), meta: `${percent(onShiftToday, counts.all)}% of total`, icon: 'user', tone: 'info' },
    { label: 'On Leave', value: String(counts.on_leave), meta: `${percent(counts.on_leave, counts.all)}% of total`, icon: 'calendar', tone: 'violet' }
  ];
}

export interface BreakdownSlice {
  name: string;
  count: number;
  pct: number;
  color: string;
}

/** Handoff DEPTS: each department's share of the branch, largest first, Unassigned last in grey. */
export function departmentBreakdown(rows: DirectoryRow[]): BreakdownSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.department, (counts.get(row.department) ?? 0) + 1);
  const named = [...counts.entries()].filter(([name]) => name !== UNASSIGNED).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const slices = named.map(([name, count], index) => ({ name, count, pct: percent(count, rows.length), color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] }));
  const unassigned = counts.get(UNASSIGNED);
  if (unassigned) slices.push({ name: UNASSIGNED, count: unassigned, pct: percent(unassigned, rows.length), color: UNASSIGNED_COLOR });
  return slices;
}

/** The donut's conic-gradient, built from exact shares so the ring always closes. */
export function donutGradient(slices: BreakdownSlice[]): string {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (!total) return 'conic-gradient(#F2EEEA 0% 100%)';
  let start = 0;
  const stops = slices.map((slice) => {
    const end = start + (slice.count / total) * 100;
    const stop = `${slice.color} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

/** Handoff pager: up to three page numbers around the current page, then "→". */
export function pageWindow(page: number, pageCount: number): number[] {
  if (pageCount <= 3) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const first = Math.min(Math.max(1, page - 1), pageCount - 2);
  return [first, first + 1, first + 2];
}

export function showingLabel(page: number, total: number): string {
  if (!total) return 'Showing 0 employees';
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return `Showing ${from} to ${to} of ${total} employee${total === 1 ? '' : 's'}`;
}
