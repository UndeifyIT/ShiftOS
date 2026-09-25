import {
  ReportingRepository,
  type AttendanceSummary,
  type DepartmentAttendance,
  type DepartmentRequestActivity,
  type EmployeeHours,
  type ScheduledShiftRow,
  type TaskCompletionStats,
  type LeaveUsageSummary
} from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';
import { assertValidDateRange } from '../validation.js';

export interface TaskCompletionReport {
  byStatus: TaskCompletionStats[];
  overdueCount: number;
}

/**
 * One period of a branch's operations — the Manager Reports page's metrics,
 * department bars and downloads. Covers published schedules and confirmed
 * attendance only; drafts and 'scheduled' placeholders are left out.
 */
export interface OperationsSummaryReport {
  startDate: string;
  endDate: string;
  attendance: { attended: number; recorded: number };
  departments: DepartmentAttendance[];
  /** Paid minutes across every live assignment on a published shift. */
  scheduledMinutes: number;
  shiftCount: number;
  /** Published shifts nobody is on — the coverage gaps. */
  unfilledShifts: ScheduledShiftRow[];
  swapRequests: number;
  hoursByEmployee: EmployeeHours[];
  requestActivity: DepartmentRequestActivity[];
}

/** Read-only aggregate reports over existing operational tables. See 043_seed_reporting_permissions.sql for the permission model. */
export class ReportingService {
  private readonly reports: ReportingRepository;

  constructor(private readonly context: ApplicationContext) {
    this.reports = new ReportingRepository(context.client);
  }

  async getAttendanceSummary(startDate: string, endDate: string, requestedBranchId?: string): Promise<AttendanceSummary[]> {
    await this.context.requirePermission('reports.read');
    assertValidDateRange(startDate, endDate);
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.reports.attendanceSummary(this.context.organizationId, branchIds, startDate, endDate);
  }

  async getTaskCompletionStats(requestedBranchId?: string, startDate?: string, endDate?: string): Promise<TaskCompletionReport> {
    await this.context.requirePermission('reports.read');
    if (startDate && endDate) {
      assertValidDateRange(startDate, endDate);
    }
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    const [byStatus, overdueCount] = await Promise.all([
      this.reports.taskCompletionStats(this.context.organizationId, branchIds, startDate, endDate),
      this.reports.overdueTaskCount(this.context.organizationId, branchIds)
    ]);
    return { byStatus, overdueCount };
  }

  async getOperationsSummary(startDate: string, endDate: string, requestedBranchId?: string): Promise<OperationsSummaryReport> {
    await this.context.requirePermission('reports.read');
    assertValidDateRange(startDate, endDate);
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    const organizationId = this.context.organizationId;
    const [departments, shifts, hoursByEmployee, requestActivity] = await Promise.all([
      this.reports.attendanceByDepartment(organizationId, branchIds, startDate, endDate),
      this.reports.scheduledShifts(organizationId, branchIds, startDate, endDate),
      this.reports.hoursByEmployee(organizationId, branchIds, startDate, endDate),
      this.reports.requestActivityByDepartment(organizationId, branchIds, startDate, endDate)
    ]);
    return {
      startDate,
      endDate,
      attendance: {
        attended: departments.reduce((sum, row) => sum + row.attended, 0),
        recorded: departments.reduce((sum, row) => sum + row.recorded, 0)
      },
      departments,
      scheduledMinutes: shifts.reduce((sum, row) => sum + row.paid_minutes * row.assigned, 0),
      shiftCount: shifts.length,
      unfilledShifts: shifts.filter((row) => row.assigned === 0),
      swapRequests: requestActivity.filter((row) => row.kind === 'swap').reduce((sum, row) => sum + row.raised, 0),
      hoursByEmployee,
      requestActivity
    };
  }

  async getLeaveUsageSummary(startDate: string, endDate: string, requestedBranchId?: string): Promise<LeaveUsageSummary[]> {
    await this.context.requirePermission('reports.read');
    assertValidDateRange(startDate, endDate);
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.reports.leaveUsageSummary(this.context.organizationId, branchIds, startDate, endDate);
  }
}
