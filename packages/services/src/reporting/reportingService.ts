import {
  ReportingRepository,
  type AttendanceSummary,
  type TaskCompletionStats,
  type LeaveUsageSummary
} from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';
import { assertValidDateRange } from '../validation.js';

export interface TaskCompletionReport {
  byStatus: TaskCompletionStats[];
  overdueCount: number;
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

  async getLeaveUsageSummary(startDate: string, endDate: string, requestedBranchId?: string): Promise<LeaveUsageSummary[]> {
    await this.context.requirePermission('reports.read');
    assertValidDateRange(startDate, endDate);
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.reports.leaveUsageSummary(this.context.organizationId, branchIds, startDate, endDate);
  }
}
