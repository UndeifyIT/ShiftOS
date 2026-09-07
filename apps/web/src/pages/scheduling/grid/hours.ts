import type { Shift, ShiftAssignment } from '../../../types/domain.js';

export interface EmployeeHoursSummary {
  employeeId: string;
  hours: number;
  overtime: boolean;
}

/** Hardcoded for Phase 1, not an org setting (spec §3.5). */
const OVERTIME_THRESHOLD_HOURS = 40;

function durationToHours(duration: string): number {
  const [hours, minutes] = duration.split(':').map(Number);
  return hours + minutes / 60;
}

/** Sums each roster employee's active-assignment hours for the week (breaks subtracted); flags anyone over the 40-hour threshold. */
export function computeHoursSummary(
  shifts: Shift[],
  assignments: ShiftAssignment[],
  rosterEmployeeIds: string[]
): EmployeeHoursSummary[] {
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const hoursByEmployee = new Map<string, number>();

  for (const assignment of assignments) {
    if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
    const shift = shiftsById.get(assignment.shift_id);
    if (!shift) continue;
    const hours = durationToHours(shift.duration) - shift.break_minutes / 60;
    hoursByEmployee.set(assignment.employee_id, (hoursByEmployee.get(assignment.employee_id) ?? 0) + hours);
  }

  return rosterEmployeeIds.map((employeeId) => {
    const hours = hoursByEmployee.get(employeeId) ?? 0;
    return { employeeId, hours, overtime: hours > OVERTIME_THRESHOLD_HOURS };
  });
}
