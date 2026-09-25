/**
 * The Attendance screen (`ShiftOS Dashboards.dc.html`, `PAGES["Supervisor/
 * Attendance"]` with the `kindAttendance` markup at lines 936-1094, ATT_SEED
 * / ATT_STATUSES / attStats / attTabs / attRows): today's assignments for one
 * branch, each with the status its attendance record says, plus whatever the
 * person marking them has changed but not saved yet. Pure — "now" is passed in.
 */
import type { AttendanceRecord, Department, Employee, Shift, ShiftAssignment } from '../../types/domain.js';

export type AttStatus = 'Present' | 'Late' | 'Absent' | 'Not Marked';
export const ATT_STATUSES: AttStatus[] = ['Present', 'Late', 'Absent', 'Not Marked'];
export type AttTab = 'All Employees' | AttStatus;
export const ATT_TABS: AttTab[] = ['All Employees', 'Present', 'Late', 'Absent', 'Not Marked'];

/** What `mark_attendance` stores for each of the handoff's four statuses. */
export const STATUS_TO_RECORD: Record<AttStatus, 'present' | 'late' | 'absent' | 'scheduled'> = {
  Present: 'present',
  Late: 'late',
  Absent: 'absent',
  'Not Marked': 'scheduled'
};

export interface PendingEdit {
  status?: AttStatus;
  note?: string;
}

export interface AttRow {
  /** The shift assignment is what `mark_attendance` works on. */
  id: string;
  employeeId: string;
  name: string;
  /** The line under the name — their department. */
  role: string;
  status: AttStatus;
  /** '08:05 AM', or '—' when nobody has clocked in. */
  time: string;
  /** 'On time' / '12m late' / 'Not recorded' / '' for an absence. */
  timeMeta: string;
  note: string;
  /** True when this row carries an unsaved change. */
  dirty: boolean;
  shiftId: string;
  shiftLabel: string;
  departmentId: string | null;
  /**
   * The clock-in to record when this row is marked Present: whatever they
   * already clocked, else the shift's own start. Marking someone present
   * vouches that they were there from the start — otherwise the derived
   * lateness below would immediately flip that choice to Late.
   */
  presentAt: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The ISO instant a shift starts on its own date, in local time. */
export function shiftStartIso(shift: Shift | undefined): string | null {
  if (!shift) return null;
  const [year, month, day] = shift.shift_date.slice(0, 10).split('-').map(Number);
  const [hours, minutes] = shift.start_time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

/** '08:05 AM' */
export function clock12(iso: string | null | undefined): string {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const hours = at.getHours();
  return `${String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** 'May 16, 2025' */
export function dayLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return year && month && day ? `${MONTHS[month - 1]} ${day}, ${year}` : date;
}

/** '9:00 AM – 5:00 PM' from a shift's own times. */
export function shiftLabel(shift: Shift | undefined): string {
  if (!shift) return 'Unscheduled';
  const time = (value: string): string => {
    const [h, m] = value.split(':').map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  return `${shift.title || 'Shift'} (${time(shift.start_time)} – ${time(shift.end_time)})`;
}

/**
 * How late a clock-in was, against the shift's own start time. The database
 * zeroes `late_minutes` on every write (011/018 leave it to an attendance
 * engine that doesn't exist yet), so lateness is worked out here.
 */
export function lateMinutes(record: AttendanceRecord | undefined, shift: Shift | undefined): number {
  if (!record?.clock_in_at || !shift) return record?.late_minutes ?? 0;
  const at = new Date(record.clock_in_at);
  const [h, m] = shift.start_time.split(':').map(Number);
  const start = new Date(at);
  start.setHours(h, m, 0, 0);
  return Math.max(0, Math.round((at.getTime() - start.getTime()) / 60_000));
}

export function statusOf(record: AttendanceRecord | undefined, shift: Shift | undefined): AttStatus {
  if (!record) return 'Not Marked';
  if (record.attendance_status === 'absent' || record.attendance_status === 'no_show') return 'Absent';
  if (record.attendance_status === 'scheduled' || !record.clock_in_at) return 'Not Marked';
  return record.attendance_status === 'late' || lateMinutes(record, shift) > 0 ? 'Late' : 'Present';
}

export interface AttendanceSources {
  assignments: ShiftAssignment[];
  shifts: Shift[];
  employees: Employee[];
  departments: Department[];
  records: AttendanceRecord[];
  /** Unsaved changes, keyed by assignment id. */
  pending: Record<string, PendingEdit>;
}

/** One row per person assigned to a shift today, in name order. */
export function buildAttendanceRows({ assignments, shifts, employees, departments, records, pending }: AttendanceSources): AttRow[] {
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const departmentName = new Map(departments.map((department) => [department.id, department.name]));
  const recordByAssignment = new Map(records.filter((record) => record.shift_assignment_id).map((record) => [record.shift_assignment_id, record]));

  return assignments
    .filter((assignment) => assignment.assignment_status !== 'cancelled' && !assignment.deleted_at && employeeById.has(assignment.employee_id))
    .map((assignment) => {
      const employee = employeeById.get(assignment.employee_id)!;
      const shift = shiftById.get(assignment.shift_id);
      const record = recordByAssignment.get(assignment.id);
      const edit = pending[assignment.id] ?? {};
      const saved = statusOf(record, shift);
      const status = edit.status ?? saved;
      const late = lateMinutes(record, shift);
      const note = edit.note ?? record?.notes ?? '';
      const arrived = status === 'Present' || status === 'Late';
      return {
        id: assignment.id,
        employeeId: employee.id,
        name: `${employee.first_name} ${employee.last_name}`.trim(),
        role: (employee.department_id && departmentName.get(employee.department_id)) || 'Unassigned',
        status,
        time: arrived ? clock12(record?.clock_in_at) || 'Now' : '—',
        timeMeta: status === 'Absent' ? '' : status === 'Not Marked' ? 'Not recorded' : !record?.clock_in_at ? 'Marking now' : late > 0 ? `${late}m late` : 'On time',
        note,
        dirty: Boolean(edit.status && edit.status !== saved) || Boolean(edit.note !== undefined && edit.note !== (record?.notes ?? '')),
        shiftId: assignment.shift_id,
        shiftLabel: shiftLabel(shift),
        departmentId: employee.department_id ?? null,
        presentAt: record?.clock_in_at ?? shiftStartIso(shift)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function attendanceCounts(rows: AttRow[]): Record<AttStatus, number> {
  return {
    Present: rows.filter((row) => row.status === 'Present').length,
    Late: rows.filter((row) => row.status === 'Late').length,
    Absent: rows.filter((row) => row.status === 'Absent').length,
    'Not Marked': rows.filter((row) => row.status === 'Not Marked').length
  };
}

export function filterAttendance(rows: AttRow[], tab: AttTab, query: string, departmentId: string): AttRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (tab === 'All Employees' || row.status === tab) &&
      (departmentId === 'all' || row.departmentId === departmentId) &&
      (!needle || `${row.name} ${row.role}`.toLowerCase().includes(needle))
  );
}

/** "1–8 of 20 employees" — the handoff's count line, over the page actually shown. */
export function countLabel(shown: number, total: number, page: number, perPage: number): string {
  if (shown === 0) return `0 of ${total} employees`;
  const first = (page - 1) * perPage + 1;
  return `${first}–${first + shown - 1} of ${total} ${total === 1 ? 'employee' : 'employees'}`;
}

/** The page numbers the pager shows: up to three, centred on the current one. */
export function pageWindow(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2));
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index);
}

/**
 * The header subtitle: "Mark attendance for Morning (9:00 AM – 5:00 PM) ·
 * May 16, 2025". Several shifts that run the same hours under the same name
 * read as one, since that is what the branch is actually working.
 */
export function attendanceSubtitle(shifts: Shift[], today: string): string {
  const named = shifts.filter((shift) => !shift.deleted_at);
  const label = named.length ? shiftLabel(named[0]) : '';
  const alike = named.every((shift) => shiftLabel(shift) === label);
  const what = named.length === 0 ? 'today' : alike ? label : `${named.length} shifts`;
  return `Mark attendance for ${what} · ${dayLabel(today)}`;
}

/**
 * Only the rows whose status or note actually changed, ready for
 * `mark_attendance`. Present carries the shift's start time so the person
 * reads as on time; Late leaves the clock to the server (now), unless they
 * already clocked in.
 */
export function pendingChanges(
  rows: AttRow[],
  pending: Record<string, PendingEdit>
): Array<{ assignmentId: string; status: AttStatus; note: string; at: string | null }> {
  return rows
    .filter((row) => row.dirty && pending[row.id])
    .map((row) => ({ assignmentId: row.id, status: row.status, note: row.note, at: row.status === 'Present' ? row.presentAt : null }));
}
