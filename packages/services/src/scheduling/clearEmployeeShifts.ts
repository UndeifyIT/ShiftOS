import type { DatabaseClient } from '@shiftos/database';
import { ShiftAssignmentRepository, ShiftRepository } from '@shiftos/repositories';

/**
 * Removes every active shift assignment `employeeId` has on the branch between
 * `fromDate` and `toDate` (inclusive), cancelling any shift left with no
 * assignment so it doesn't linger as orphaned data. Pass a transaction-scoped
 * client so the caller's surrounding writes commit or roll back together.
 * Shared by "Mark day off" (one date) and removing someone from a week's
 * roster (the whole week) — both handoff actions clear that person's shifts.
 */
export async function clearEmployeeShifts(
  client: DatabaseClient,
  organizationId: string,
  branchId: string,
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<number> {
  const shiftsRepo = new ShiftRepository(client);
  const assignmentsRepo = new ShiftAssignmentRepository(client);

  const shifts = await shiftsRepo.findByBranchAndDateRange(organizationId, branchId, fromDate, toDate);
  if (shifts.length === 0) return 0;

  const assignments = await assignmentsRepo.listForShifts(organizationId, shifts.map((shift) => shift.id));
  const mine = assignments.filter(
    (assignment) => assignment.employee_id === employeeId && assignment.assignment_status !== 'cancelled' && assignment.assignment_status !== 'declined'
  );

  for (const assignment of mine) {
    await assignmentsRepo.archive(organizationId, assignment.id);
    const remaining = await assignmentsRepo.findByShift(organizationId, assignment.shift_id);
    if (remaining.length === 0) {
      await shiftsRepo.cancel(organizationId, assignment.shift_id);
    }
  }
  return mine.length;
}
