import { RpcRegistry } from './rpc.js';
import { getMyContext } from './operations/context.js';
import { updateProfile } from './operations/user.js';
import { listMembers, listRoles, listInvitableRoles, listInvitations, inviteMember, revokeInvitation } from './operations/membership.js';
import { getOrganization, updateOrganization, listAccessibleOrganizations } from './operations/organization.js';
import { createBranch, updateBranch, archiveBranch, getBranch, listBranches } from './operations/branch.js';
import { createEmployee, getEmployee, updateEmployee, archiveEmployee, listEmployees, getEmployeeHistory } from './operations/employee.js';
import {
  createSchedule, getSchedule, updateSchedule, archiveSchedule, listSchedules,
  listScheduleVersions, getLatestScheduleVersion,
  createShift, getShift, updateShift, cancelShift, archiveShift, listShiftsForSchedule, listShiftsForEmployeeInSchedule,
  listMyShiftAssignmentsInSchedule,
  assignEmployee, updateAssignmentStatus, removeAssignment, listAssignmentsForShift,
  publishSchedule
} from './operations/scheduling.js';
import {
  createTask, getTask, updateTask, assignTask, completeTask, verifyTask, reopenTask, cancelTask, archiveTask, listTasks, getTaskHistory
} from './operations/task.js';
import {
  createAnnouncement, updateAnnouncement, publishAnnouncement, archiveAnnouncement,
  getAnnouncement, listAnnouncements, acknowledgeAnnouncement, hasAcknowledgedAnnouncement
} from './operations/announcement.js';
import { createShiftNote, listShiftNotesForShift, archiveShiftNote } from './operations/shiftNote.js';
import {
  createDepartment,
  getDepartment,
  updateDepartment,
  archiveDepartment,
  listDepartments,
  countEmployeesInDepartment
} from './operations/department.js';
import {
  requestShiftSwap,
  respondToShiftSwap,
  cancelShiftSwap,
  approveShiftSwap,
  rejectShiftSwap,
  getShiftSwap,
  listMyShiftSwaps,
  listOpenShiftSwaps,
  listPendingShiftSwapApprovals
} from './operations/shiftSwap.js';
import { getAttendanceSummaryReport, getTaskCompletionReport, getLeaveUsageReport } from './operations/reporting.js';
import {
  clockIn, clockOut, markAttendanceAbsent, getAttendanceRecord, listAttendanceForEmployee,
  listMyAttendance, listAttendanceForBranchAndRange, recordAttendanceCorrection, listAttendanceCorrections
} from './operations/attendance.js';
import {
  createLeaveRequest, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest,
  getLeaveRequest, listLeaveForEmployee, listMyLeave, listPendingLeave
} from './operations/leave.js';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getMyNotificationPreferences,
  setMyNotificationPreference
} from './operations/notification.js';

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
  registry.register(updateProfile);
  registry.register(listMembers);
  registry.register(listRoles);
  registry.register(listInvitableRoles);
  registry.register(listInvitations);
  registry.register(inviteMember);
  registry.register(revokeInvitation);

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
  registry.register(listShiftsForEmployeeInSchedule);
  registry.register(listMyShiftAssignmentsInSchedule);
  registry.register(assignEmployee);
  registry.register(updateAssignmentStatus);
  registry.register(removeAssignment);
  registry.register(listAssignmentsForShift);
  registry.register(publishSchedule);

  registry.register(createTask);
  registry.register(getTask);
  registry.register(updateTask);
  registry.register(assignTask);
  registry.register(completeTask);
  registry.register(verifyTask);
  registry.register(reopenTask);
  registry.register(cancelTask);
  registry.register(archiveTask);
  registry.register(listTasks);
  registry.register(getTaskHistory);

  registry.register(createAnnouncement);
  registry.register(updateAnnouncement);
  registry.register(publishAnnouncement);
  registry.register(archiveAnnouncement);
  registry.register(getAnnouncement);
  registry.register(listAnnouncements);
  registry.register(acknowledgeAnnouncement);
  registry.register(hasAcknowledgedAnnouncement);

  registry.register(createShiftNote);
  registry.register(listShiftNotesForShift);
  registry.register(archiveShiftNote);

  registry.register(clockIn);
  registry.register(clockOut);
  registry.register(markAttendanceAbsent);
  registry.register(getAttendanceRecord);
  registry.register(listAttendanceForEmployee);
  registry.register(listMyAttendance);
  registry.register(listAttendanceForBranchAndRange);
  registry.register(recordAttendanceCorrection);
  registry.register(listAttendanceCorrections);

  registry.register(createLeaveRequest);
  registry.register(approveLeaveRequest);
  registry.register(rejectLeaveRequest);
  registry.register(cancelLeaveRequest);
  registry.register(getLeaveRequest);
  registry.register(listLeaveForEmployee);
  registry.register(listMyLeave);
  registry.register(listPendingLeave);

  registry.register(listMyNotifications);
  registry.register(markNotificationRead);
  registry.register(markAllNotificationsRead);
  registry.register(getMyNotificationPreferences);
  registry.register(setMyNotificationPreference);

  registry.register(createDepartment);
  registry.register(getDepartment);
  registry.register(updateDepartment);
  registry.register(archiveDepartment);
  registry.register(listDepartments);
  registry.register(countEmployeesInDepartment);

  registry.register(requestShiftSwap);
  registry.register(respondToShiftSwap);
  registry.register(cancelShiftSwap);
  registry.register(approveShiftSwap);
  registry.register(rejectShiftSwap);
  registry.register(getShiftSwap);
  registry.register(listMyShiftSwaps);
  registry.register(listOpenShiftSwaps);
  registry.register(listPendingShiftSwapApprovals);

  registry.register(getAttendanceSummaryReport);
  registry.register(getTaskCompletionReport);
  registry.register(getLeaveUsageReport);

  return registry;
}
