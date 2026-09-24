/**
 * The Supervisor's Attendance page, after the design handoff's
 * "Supervisor/Attendance" (attVals: ATT_STATUSES, the overview counts, tabs,
 * rows and legend): today's shift, one row per person, statuses edited as a
 * draft and saved together. Pure — `now` is injected.
 */
import type { AttendanceRecord } from '../../types/domain.js';
import { fullName, type Tone } from '../scheduling/grid/scheduleFormat.js';
import type { TodayAssignment } from '../dashboard/manager/overviewModel.js';
import { clock12 } from '../dashboard/manager/overviewModel.js';

export type AttStatus = 'Present' | 'Late' | 'Absent' | 'Not Marked';
export const ATT_STATUSES: AttStatus[] = ['Present', 'Late', 'Absent', 'Not Marked'];
export type AttTab = 'All Employees' | AttStatus;
export const ATT_TABS: AttTab[] = ['All Employees', 'Present', 'Late', 'Absent', 'Not Marked'];

export const ATT_TONE: Record<AttStatus, Tone> = { Present: 'ok', Late: 'warn', Absent: 'bad', 'Not Marked': 'neutral' };
export const ATT_ICON = { Present: 'checkCircle', Late: 'clock', Absent: 'x', 'Not Marked': 'minus' } as const;

export interface AttRow {
  /** The shift assignment. */
  id: string;
  employeeId: string;
  name: string;
  role: string;
  departmentId: string | null;
  record: AttendanceRecord | undefined;
  /** What is saved now. */
  saved: AttStatus;
  savedNote: string;
}

export interface AttDraft {
  status: AttStatus;
  note: string;
}

export function savedStatus(record: AttendanceRecord | undefined): AttStatus {
  if (!record || record.attendance_status === 'scheduled') return 'Not Marked';
  if (record.attendance_status === 'absent' || record.attendance_status === 'no_show') return 'Absent';
  return record.attendance_status === 'late' || record.late_minutes > 0 ? 'Late' : 'Present';
}

export function buildAttRows(members: TodayAssignment[]): AttRow[] {
  return [...members]
    .sort((a, b) => (a.employee?.employee_number ?? '').localeCompare(b.employee?.employee_number ?? '', undefined, { numeric: true }))
    .map((row) => ({
      id: row.assignment.id,
      employeeId: row.assignment.employee_id,
      name: row.employee ? fullName(row.employee) : 'Unknown employee',
      role: row.departmentName,
      departmentId: row.shift.department_id ?? row.employee?.department_id ?? null,
      record: row.record,
      saved: savedStatus(row.record),
      savedNote: row.record?.notes ?? ''
    }));
}

/**
 * Which statuses a row can move to. Late is worked out from the clock-in time
 * (migration 047 — nobody hand-assigns it), so someone already clocked in can't
 * be switched between Present and Late; everything else is open.
 */
export function allowedStatuses(row: AttRow): AttStatus[] {
  if (row.record?.clock_in_at && (row.saved === 'Present' || row.saved === 'Late')) return [row.saved, 'Absent', 'Not Marked'];
  return ATT_STATUSES;
}

/** Handoff timeMeta: 'On time', '15m late', 'Not recorded', or nothing for an absence. */
export function timeLines(row: AttRow, status: AttStatus): { time: string; meta: string } {
  if (status === 'Absent') return { time: '—', meta: '' };
  if (status === 'Not Marked') return { time: '—', meta: 'Not recorded' };
  if (row.saved === status && row.record?.clock_in_at) {
    return { time: clock12(new Date(row.record.clock_in_at)), meta: row.record.late_minutes > 0 ? `${row.record.late_minutes}m late` : 'On time' };
  }
  return { time: 'On save', meta: 'Checked in as of saving' };
}

export type SaveStep =
  | { kind: 'mark'; row: AttRow; status: 'present' | 'absent' | 'scheduled'; notes: string | null }
  | { kind: 'note'; row: AttRow; note: string };

/**
 * What saving the draft does, row by row. A status change is one
 * mark_attendance call — it fills in a new record, or corrects a saved one
 * with a logged correction — carrying the note; a note-only change just
 * updates the note. Present and Late both mark an arrival: the database
 * decides which from the check-in time (047).
 */
export function saveSteps(rows: AttRow[], drafts: Record<string, AttDraft>): SaveStep[] {
  const steps: SaveStep[] = [];
  for (const row of rows) {
    const draft = drafts[row.id];
    if (!draft) continue;
    const note = draft.note.trim();
    if (draft.status !== row.saved) {
      if (draft.status === 'Not Marked' && (!row.record || row.record.attendance_status === 'scheduled')) continue;
      const status = draft.status === 'Not Marked' ? 'scheduled' : draft.status === 'Absent' ? 'absent' : 'present';
      steps.push({ kind: 'mark', row, status, notes: status === 'scheduled' ? null : note || null });
    } else if (note !== row.savedNote.trim() && row.record && row.saved !== 'Not Marked') {
      steps.push({ kind: 'note', row, note });
    }
  }
  return steps;
}

/** 'Last updated: 07:50 AM', or 'Never' when nothing on this shift has been recorded. */
export function lastUpdated(rows: AttRow[]): string {
  const stamps = rows.map((r) => r.record?.updated_at).filter((v): v is string => Boolean(v)).sort();
  return stamps.length ? `Last updated: ${clock12(new Date(stamps[stamps.length - 1]))}` : 'Last updated: Never';
}

export function attendanceCsv(rows: AttRow[], shiftDate: string, shiftTitle: string): string[][] {
  return [
    ['Date', 'Shift', 'Employee', 'Department', 'Status', 'Check-in', 'Late minutes', 'Notes'],
    ...rows.map((r) => [
      shiftDate,
      shiftTitle,
      r.name,
      r.role,
      r.saved,
      r.record?.clock_in_at ? clock12(new Date(r.record.clock_in_at)) : '',
      r.record?.late_minutes ? String(r.record.late_minutes) : '',
      r.savedNote
    ])
  ];
}
