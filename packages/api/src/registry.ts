import { RpcRegistry } from './rpc.js';
import { getMyContext } from './operations/context.js';
import { getOrganization, updateOrganization, listAccessibleOrganizations } from './operations/organization.js';
import { createBranch, updateBranch, archiveBranch, getBranch, listBranches } from './operations/branch.js';
import { createEmployee, getEmployee, updateEmployee, archiveEmployee, listEmployees, getEmployeeHistory } from './operations/employee.js';
import {
  createSchedule, getSchedule, updateSchedule, archiveSchedule, listSchedules,
  listScheduleVersions, getLatestScheduleVersion,
  createShift, getShift, updateShift, cancelShift, archiveShift, listShiftsForSchedule,
  assignEmployee, updateAssignmentStatus, removeAssignment, listAssignmentsForShift,
  publishSchedule
} from './operations/scheduling.js';

/**
 * The full set of ShiftOS RPC operations, registered explicitly one at a
 * time. Not a loop over a combined array: RpcRegistry.register<TInput,TOutput>
 * is generic per call, and TypeScript can't soundly infer a single TOutput
 * for a loop variable whose static type is a union across operations with
 * different output types (confirmed by attempting exactly that here first —
 * it produced real TS2345 errors, not a style preference).
 */
export function createDefaultRegistry(): RpcRegistry {
  const registry = new RpcRegistry();

  registry.register(getMyContext);

  registry.register(getOrganization);
  registry.register(updateOrganization);
  registry.register(listAccessibleOrganizations);

  registry.register(createBranch);
  registry.register(updateBranch);
  registry.register(archiveBranch);
  registry.register(getBranch);
  registry.register(listBranches);

  registry.register(createEmployee);
  registry.register(getEmployee);
  registry.register(updateEmployee);
  registry.register(archiveEmployee);
  registry.register(listEmployees);
  registry.register(getEmployeeHistory);

  registry.register(createSchedule);
  registry.register(getSchedule);
  registry.register(updateSchedule);
  registry.register(archiveSchedule);
  registry.register(listSchedules);
  registry.register(listScheduleVersions);
  registry.register(getLatestScheduleVersion);
  registry.register(createShift);
  registry.register(getShift);
  registry.register(updateShift);
  registry.register(cancelShift);
  registry.register(archiveShift);
  registry.register(listShiftsForSchedule);
  registry.register(assignEmployee);
  registry.register(updateAssignmentStatus);
  registry.register(removeAssignment);
  registry.register(listAssignmentsForShift);
  registry.register(publishSchedule);

  return registry;
}
