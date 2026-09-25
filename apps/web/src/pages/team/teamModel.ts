/**
 * The Supervisor's Team page, after the design handoff's "Supervisor/Team"
 * (TEAM rows in the shared table): everyone assigned to the branch, their
 * department, today's shift, hours worked this week and where they are right
 * now. Pure — built from the Manager overview's branch data, `now` injected.
 */
import type { Employee } from '../../types/domain.js';
import { fullName, type Tone } from '../scheduling/grid/scheduleFormat.js';
import type { ManagerOverview, TodayAssignment } from '../dashboard/manager/overviewModel.js';
import type { PeopleTableRow } from '../people/RolePeopleTable.js';

export type TeamFilter = 'All' | 'On shift' | 'Off shift' | 'Absent';
export const TEAM_FILTERS: TeamFilter[] = ['All', 'On shift', 'Off shift', 'Absent'];

export interface TeamRow extends PeopleTableRow {
  employee: Employee;
  /** Which filter bucket the person is in right now. */
  bucket: Exclude<TeamFilter, 'All'>;
  department: string;
  shift: string;
  hours: string;
}

function presence(row: TodayAssignment | undefined, employee: Employee): { status: string; tone: Tone; bucket: TeamRow['bucket'] } {
  const record = row?.record;
  if (record && (record.attendance_status === 'absent' || record.attendance_status === 'no_show')) return { status: 'Absent', tone: 'bad', bucket: 'Absent' };
  if (record?.clock_in_at && !record.clock_out_at) {
    return record.attendance_status === 'late' || record.late_minutes > 0 ? { status: 'Late', tone: 'warn', bucket: 'On shift' } : { status: 'On shift', tone: 'ok', bucket: 'On shift' };
  }
  if (employee.employment_status === 'on_leave') return { status: 'On leave', tone: 'info', bucket: 'Off shift' };
  return { status: 'Off shift', tone: 'neutral', bucket: 'Off shift' };
}

/** Hours worked this week: finished shifts plus the time so far on one still open. */
function weekHours(overview: ManagerOverview, employeeId: string, now: Date): number {
  let minutes = 0;
  for (const record of overview.detail.attendanceWeek) {
    if (record.employee_id !== employeeId || !record.clock_in_at) continue;
    if (record.clock_out_at) minutes += record.worked_minutes;
    else minutes += Math.max(0, (now.getTime() - new Date(record.clock_in_at).getTime()) / 60_000);
  }
  return Math.floor(minutes / 60);
}

/** Everyone in the branch but the signed-in person themselves (`selfId`, their own employee record when they have one). */
export function buildTeamRows(overview: ManagerOverview, now: Date, selfId?: string): TeamRow[] {
  const departments = new Map(overview.detail.departments.map((d) => [d.id, d.name]));
  const todayByEmployee = new Map<string, TodayAssignment>();
  for (const row of overview.detail.today) {
    const current = todayByEmployee.get(row.assignment.employee_id);
    if (!current || row.shift.start_time < current.shift.start_time) todayByEmployee.set(row.assignment.employee_id, row);
  }
  return overview.detail.employees
    .filter((e) => e.employment_status !== 'terminated' && e.id !== selfId)
    .sort((a, b) => a.employee_number.localeCompare(b.employee_number, undefined, { numeric: true }))
    .map((employee) => {
      const today = todayByEmployee.get(employee.id);
      const department = (employee.department_id && departments.get(employee.department_id)) || 'No department';
      const shift = today ? today.shift.title : 'Not scheduled today';
      const hours = `${weekHours(overview, employee.id, now)}h this week`;
      const { status, tone, bucket } = presence(today, employee);
      return { id: employee.id, employee, name: fullName(employee), sub: employee.employee_number, department, shift, hours, cells: [department, shift, hours], status, tone, bucket };
    });
}

export function filterTeam(rows: TeamRow[], filter: TeamFilter, query: string): TeamRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) => (filter === 'All' || row.bucket === filter) && (!needle || `${row.name} ${row.sub} ${row.department} ${row.shift}`.toLowerCase().includes(needle))
  );
}

export function teamCsv(rows: TeamRow[]): string[][] {
  return [['Employee number', 'Name', 'Department', 'Shift today', 'Hours this week', 'Status'], ...rows.map((r) => [r.sub, r.name, r.department, r.shift, r.hours.replace(' this week', ''), r.status])];
}
