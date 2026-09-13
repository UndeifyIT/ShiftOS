import { useMemo } from 'react';
import { useRpcQuery } from '../../../lib/useRpc.js';
import type {
  Department,
  Employee,
  Schedule,
  ScheduleConflict,
  ScheduleDayOff,
  ScheduleRosterEntry,
  Shift,
  ShiftAssignment
} from '../../../types/domain.js';
import { fullName, paidMinutes, weekDays } from './scheduleFormat.js';

export interface ShiftBlock {
  /** 'HH:MM' */
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

/** One card inside a grid cell: a real shift assignment, or an explicit day off. */
export type GridCard =
  | { kind: 'shift'; id: string; assignment: ShiftAssignment; shift: Shift; block: ShiftBlock; note: string; departmentId: string | null; departmentName: string }
  | { kind: 'off'; id: string; dayOff: ScheduleDayOff };

/** A shift built in the drafts tray — frontend-only until it's dropped onto someone. */
export interface TrayDraft {
  id: string;
  off: boolean;
  blocks: ShiftBlock[];
  note: string;
  departmentId: string | null;
}

export interface RosterRow {
  employee: Employee;
  name: string;
  meta: string;
}

export interface EmployeeWeekHours {
  employeeId: string;
  paidMinutes: number;
  shiftDays: number;
  offDays: number;
  minutesByDate: Map<string, number>;
}

export const cellKey = (employeeId: string, date: string): string => `${employeeId}:${date}`;

export const SCHEDULE_DATA_QUERIES = ['list_assignments_for_schedule', 'list_shifts_for_schedule', 'get_schedule_conflicts', 'list_schedule_day_offs'];

export function blockOf(shift: Shift): ShiftBlock {
  return { startTime: shift.start_time.slice(0, 5), endTime: shift.end_time.slice(0, 5), breakMinutes: shift.break_minutes };
}

export interface GridDay {
  date: string;
  weekday: string;
  label: string;
  /** False for days of the displayed Mon–Sun week that fall outside the schedule's own dates (older, non-weekly schedules). */
  inSchedule: boolean;
}

/**
 * Fetches everything the weekly grid shows for one schedule and derives the
 * per-cell cards, conflicts and hours. Columns are always the Mon–Sun week
 * being viewed; a schedule that doesn't line up with it (e.g. Tue–next Wed)
 * simply has its out-of-range days marked, instead of mislabelled columns.
 */
export function useScheduleWeek(schedule: Schedule, weekStart: string) {
  const scheduleId = schedule.id;
  const roster = useRpcQuery<ScheduleRosterEntry[]>('list_schedule_roster', { scheduleId });
  const employees = useRpcQuery<Employee[]>('list_employees', { branchId: schedule.branch_id });
  const departments = useRpcQuery<Department[]>('list_departments', { branchId: schedule.branch_id });
  const shifts = useRpcQuery<Shift[]>('list_shifts_for_schedule', { scheduleId });
  const assignments = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', { scheduleId });
  const conflicts = useRpcQuery<ScheduleConflict[]>('get_schedule_conflicts', { scheduleId });
  const dayOffs = useRpcQuery<ScheduleDayOff[]>('list_schedule_day_offs', { scheduleId });

  const days = useMemo<GridDay[]>(
    () => weekDays(weekStart).map((day) => ({ ...day, inSchedule: day.date >= schedule.start_date && day.date <= schedule.end_date })),
    [weekStart, schedule.start_date, schedule.end_date]
  );

  const model = useMemo(() => {
    const employeesById = new Map((employees.data ?? []).map((e) => [e.id, e]));
    const departmentsById = new Map((departments.data ?? []).map((d) => [d.id, d]));
    const shiftsById = new Map((shifts.data ?? []).map((s) => [s.id, s]));

    const rosterRows: RosterRow[] = (roster.data ?? [])
      .map((entry) => employeesById.get(entry.employee_id))
      .filter((e): e is Employee => Boolean(e))
      .map((employee) => ({
        employee,
        name: fullName(employee),
        meta: (employee.department_id && departmentsById.get(employee.department_id)?.name) || employee.employee_number
      }));

    const cells = new Map<string, GridCard[]>();
    for (const assignment of assignments.data ?? []) {
      if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
      const shift = shiftsById.get(assignment.shift_id);
      if (!shift) continue;
      const key = cellKey(assignment.employee_id, shift.shift_date);
      const list = cells.get(key) ?? [];
      const departmentId = shift.department_id ?? null;
      list.push({
        kind: 'shift',
        id: assignment.id,
        assignment,
        shift,
        block: blockOf(shift),
        note: assignment.notes ?? '',
        departmentId,
        departmentName: (departmentId && departmentsById.get(departmentId)?.name) || ''
      });
      cells.set(key, list);
    }
    for (const list of cells.values()) {
      list.sort((a, b) => (a.kind === 'shift' && b.kind === 'shift' ? a.block.startTime.localeCompare(b.block.startTime) : 0));
    }
    for (const dayOff of dayOffs.data ?? []) {
      const key = cellKey(dayOff.employee_id, dayOff.off_date);
      if (!cells.has(key)) cells.set(key, [{ kind: 'off', id: dayOff.id, dayOff }]);
    }

    const conflictsByCell = new Map<string, ScheduleConflict>();
    for (const conflict of conflicts.data ?? []) conflictsByCell.set(cellKey(conflict.employeeId, conflict.date), conflict);
    const rosterIndex = new Map(rosterRows.map((row, index) => [row.employee.id, index]));
    const orderedConflicts = [...(conflicts.data ?? [])]
      .filter((c) => rosterIndex.has(c.employeeId))
      .sort((a, b) => (rosterIndex.get(a.employeeId)! - rosterIndex.get(b.employeeId)!) || a.date.localeCompare(b.date));

    const scheduleDayCount = days.filter((day) => day.inSchedule).length;
    const hours = new Map<string, EmployeeWeekHours>();
    let totalPaidMinutes = 0;
    let decidedCells = 0;
    let scheduledPeople = 0;
    for (const row of rosterRows) {
      const summary: EmployeeWeekHours = { employeeId: row.employee.id, paidMinutes: 0, shiftDays: 0, offDays: 0, minutesByDate: new Map() };
      for (const day of days) {
        if (!day.inSchedule) continue;
        const cards = cells.get(cellKey(row.employee.id, day.date)) ?? [];
        if (cards.length) decidedCells += 1;
        if (cards[0]?.kind === 'off') summary.offDays += 1;
        const worked = cards.filter((card): card is Extract<GridCard, { kind: 'shift' }> => card.kind === 'shift');
        if (worked.length) summary.shiftDays += 1;
        const dayMinutes = worked.reduce((sum, card) => sum + paidMinutes(card.block.startTime, card.block.endTime, card.block.breakMinutes), 0);
        summary.paidMinutes += dayMinutes;
        summary.minutesByDate.set(day.date, dayMinutes);
      }
      if (summary.shiftDays) scheduledPeople += 1;
      totalPaidMinutes += summary.paidMinutes;
      hours.set(row.employee.id, summary);
    }

    return {
      employeesById,
      rosterRows,
      cells,
      conflictsByCell,
      orderedConflicts,
      hours,
      totalPaidMinutes,
      scheduledPeople,
      coverage: rosterRows.length && scheduleDayCount ? Math.round((decidedCells / (rosterRows.length * scheduleDayCount)) * 100) : 0,
      branchEmployeeCount: (employees.data ?? []).length
    };
  }, [roster.data, employees.data, departments.data, shifts.data, assignments.data, conflicts.data, dayOffs.data, days]);

  const isLoading = roster.isLoading || employees.isLoading || shifts.isLoading || assignments.isLoading || conflicts.isLoading || dayOffs.isLoading;
  const error = roster.error ?? employees.error ?? shifts.error ?? assignments.error ?? conflicts.error ?? dayOffs.error ?? null;

  return {
    days,
    isLoading,
    error,
    employees: employees.data ?? [],
    departmentsById: new Map((departments.data ?? []).map((d) => [d.id, d])),
    departments: departments.data ?? [],
    refetch: () => Promise.all([roster.refetch(), shifts.refetch(), assignments.refetch(), conflicts.refetch(), dayOffs.refetch()]),
    ...model
  };
}
