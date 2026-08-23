import type { DatabaseClient } from '@shiftos/database';

export interface AttendanceSummary extends Record<string, unknown> {
  attendance_status: string;
  record_count: number;
  total_worked_minutes: number;
  total_overtime_minutes: number;
  total_late_minutes: number;
}

export interface TaskCompletionStats extends Record<string, unknown> {
  task_status: string;
  task_count: number;
}

export interface LeaveUsageSummary extends Record<string, unknown> {
  leave_type: string;
  request_count: number;
  total_days: number;
}

/**
 * Read-only cross-table aggregate queries backing the reporting domain (see
 * 043_seed_reporting_permissions.sql). Deliberately does not extend
 * TenantScopedRepository/BranchScopedRepository -- those model single-table
 * CRUD with soft-delete semantics, which doesn't fit a GROUP BY rollup
 * spanning a date range and a branch-id list.
 */
export class ReportingRepository {
  constructor(private readonly client: DatabaseClient) {}

  async attendanceSummary(organizationId: string, branchIds: string[], startDate: string, endDate: string): Promise<AttendanceSummary[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<AttendanceSummary>(
      `SELECT
         attendance_status,
         count(*)::int AS record_count,
         coalesce(sum(worked_minutes), 0)::int AS total_worked_minutes,
         coalesce(sum(overtime_minutes), 0)::int AS total_overtime_minutes,
         coalesce(sum(late_minutes), 0)::int AS total_late_minutes
       FROM attendance_records
       WHERE organization_id = $1
         AND branch_id = ANY($2::uuid[])
         AND deleted_at IS NULL
         AND created_at::date >= $3::date
         AND created_at::date <= $4::date
       GROUP BY attendance_status
       ORDER BY attendance_status`,
      [organizationId, branchIds, startDate, endDate]
    );
  }

  async taskCompletionStats(organizationId: string, branchIds: string[], startDate?: string, endDate?: string): Promise<TaskCompletionStats[]> {
    if (branchIds.length === 0) {
      return [];
    }
    const params: unknown[] = [organizationId, branchIds];
    let sql = `SELECT task_status, count(*)::int AS task_count
               FROM tasks
               WHERE organization_id = $1 AND branch_id = ANY($2::uuid[]) AND deleted_at IS NULL`;
    if (startDate) {
      params.push(startDate);
      sql += ` AND created_at::date >= $${params.length}::date`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND created_at::date <= $${params.length}::date`;
    }
    sql += ' GROUP BY task_status ORDER BY task_status';
    return this.client.query<TaskCompletionStats>(sql, params);
  }

  async overdueTaskCount(organizationId: string, branchIds: string[]): Promise<number> {
    if (branchIds.length === 0) {
      return 0;
    }
    const rows = await this.client.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM tasks
       WHERE organization_id = $1 AND branch_id = ANY($2::uuid[]) AND deleted_at IS NULL
         AND due_date IS NOT NULL AND due_date < current_date
         AND task_status NOT IN ('completed', 'verified', 'cancelled')`,
      [organizationId, branchIds]
    );
    return rows[0]?.count ?? 0;
  }

  async leaveUsageSummary(organizationId: string, branchIds: string[], startDate: string, endDate: string): Promise<LeaveUsageSummary[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<LeaveUsageSummary>(
      `SELECT
         leave_type,
         count(*)::int AS request_count,
         coalesce(sum(total_days), 0)::int AS total_days
       FROM leave_requests
       WHERE organization_id = $1
         AND branch_id = ANY($2::uuid[])
         AND deleted_at IS NULL
         AND status = 'approved'
         AND start_date <= $4::date
         AND end_date >= $3::date
       GROUP BY leave_type
       ORDER BY leave_type`,
      [organizationId, branchIds, startDate, endDate]
    );
  }
}
