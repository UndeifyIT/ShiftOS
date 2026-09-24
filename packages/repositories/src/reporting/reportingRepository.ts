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

/** Attended vs recorded attendance for one department (null: no department). */
export interface DepartmentAttendance extends Record<string, unknown> {
  department_id: string | null;
  attended: number;
  recorded: number;
}

/** A published, live shift in the period: its paid minutes and how many people are on it. */
export interface ScheduledShiftRow extends Record<string, unknown> {
  shift_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  title: string;
  department_id: string | null;
  paid_minutes: number;
  assigned: number;
}

/** Confirmed attendance for one employee — the payroll hours export. */
export interface EmployeeHours extends Record<string, unknown> {
  employee_id: string;
  shifts: number;
  worked_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
}

/** Swap and leave requests raised in the period for one department, and how they ended. */
export interface DepartmentRequestActivity extends Record<string, unknown> {
  department_id: string | null;
  kind: 'swap' | 'leave';
  raised: number;
  approved: number;
  declined: number;
}

/** Statuses that mean the person turned up. */
const ATTENDED = `('present', 'late', 'left_early', 'completed')`;
/** Statuses that settle whether they did (a 'scheduled' placeholder doesn't). */
const RECORDED = `('present', 'late', 'left_early', 'completed', 'absent', 'no_show')`;

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

  /** Attendance per department for shifts dated in the period (the shift's department, else the person's). */
  async attendanceByDepartment(organizationId: string, branchIds: string[], startDate: string, endDate: string): Promise<DepartmentAttendance[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<DepartmentAttendance>(
      `SELECT coalesce(sh.department_id, e.department_id) AS department_id,
              count(*) FILTER (WHERE ar.attendance_status IN ${ATTENDED})::int AS attended,
              count(*) FILTER (WHERE ar.attendance_status IN ${RECORDED})::int AS recorded
       FROM attendance_records ar
       JOIN shift_assignments a ON a.id = ar.shift_assignment_id AND a.organization_id = ar.organization_id
       JOIN shifts sh ON sh.id = a.shift_id AND sh.organization_id = ar.organization_id
       LEFT JOIN employees e ON e.id = ar.employee_id AND e.organization_id = ar.organization_id
       WHERE ar.organization_id = $1
         AND ar.branch_id = ANY($2::uuid[])
         AND ar.deleted_at IS NULL
         AND sh.shift_date >= $3::date
         AND sh.shift_date <= $4::date
       GROUP BY 1`,
      [organizationId, branchIds, startDate, endDate]
    );
  }

  /** Every published, live shift dated in the period, with its paid minutes and live assignment count. */
  async scheduledShifts(organizationId: string, branchIds: string[], startDate: string, endDate: string): Promise<ScheduledShiftRow[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<ScheduledShiftRow>(
      `SELECT sh.id AS shift_id,
              sh.shift_date::text AS shift_date,
              sh.start_time::text AS start_time,
              sh.end_time::text AS end_time,
              sh.title,
              sh.department_id,
              greatest(0, round((extract(epoch FROM sh.end_time) - extract(epoch FROM sh.start_time)) / 60
                + CASE WHEN sh.crosses_midnight THEN 1440 ELSE 0 END - coalesce(sh.break_minutes, 0)))::int AS paid_minutes,
              (SELECT count(*) FROM shift_assignments a
                WHERE a.organization_id = sh.organization_id AND a.shift_id = sh.id AND a.deleted_at IS NULL
                  AND a.assignment_status IN ('assigned', 'confirmed', 'completed'))::int AS assigned
       FROM shifts sh
       WHERE sh.organization_id = $1
         AND sh.branch_id = ANY($2::uuid[])
         AND sh.deleted_at IS NULL
         AND sh.is_active
         AND sh.status NOT IN ('draft', 'cancelled', 'archived')
         AND sh.shift_date >= $3::date
         AND sh.shift_date <= $4::date
       ORDER BY sh.shift_date, sh.start_time`,
      [organizationId, branchIds, startDate, endDate]
    );
  }

  /** Confirmed attendance per employee for shifts dated in the period. */
  async hoursByEmployee(organizationId: string, branchIds: string[], startDate: string, endDate: string): Promise<EmployeeHours[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<EmployeeHours>(
      `SELECT ar.employee_id,
              count(*)::int AS shifts,
              coalesce(sum(ar.worked_minutes), 0)::int AS worked_minutes,
              coalesce(sum(ar.overtime_minutes), 0)::int AS overtime_minutes,
              coalesce(sum(ar.late_minutes), 0)::int AS late_minutes
       FROM attendance_records ar
       JOIN shift_assignments a ON a.id = ar.shift_assignment_id AND a.organization_id = ar.organization_id
       JOIN shifts sh ON sh.id = a.shift_id AND sh.organization_id = ar.organization_id
       WHERE ar.organization_id = $1
         AND ar.branch_id = ANY($2::uuid[])
         AND ar.deleted_at IS NULL
         AND ar.attendance_status IN ${ATTENDED}
         AND sh.shift_date >= $3::date
         AND sh.shift_date <= $4::date
       GROUP BY ar.employee_id`,
      [organizationId, branchIds, startDate, endDate]
    );
  }

  /** Swap and leave requests raised in the period, per department, and how many were approved or declined. */
  async requestActivityByDepartment(organizationId: string, branchIds: string[], startDate: string, endDate: string): Promise<DepartmentRequestActivity[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<DepartmentRequestActivity>(
      `SELECT coalesce(sh.department_id, e.department_id) AS department_id,
              'swap' AS kind,
              count(*)::int AS raised,
              count(*) FILTER (WHERE s.status = 'approved')::int AS approved,
              count(*) FILTER (WHERE s.status IN ('rejected', 'declined'))::int AS declined
       FROM shift_swap_requests s
       LEFT JOIN shift_assignments a ON a.id = s.shift_assignment_id AND a.organization_id = s.organization_id
       LEFT JOIN shifts sh ON sh.id = a.shift_id AND sh.organization_id = s.organization_id
       LEFT JOIN employees e ON e.id = s.requested_by_employee_id AND e.organization_id = s.organization_id
       WHERE s.organization_id = $1 AND s.branch_id = ANY($2::uuid[])
         AND s.created_at::date >= $3::date AND s.created_at::date <= $4::date
       GROUP BY 1
       UNION ALL
       SELECT e.department_id,
              'leave' AS kind,
              count(*)::int,
              count(*) FILTER (WHERE l.status = 'approved')::int,
              count(*) FILTER (WHERE l.status = 'rejected')::int
       FROM leave_requests l
       LEFT JOIN employees e ON e.id = l.employee_id AND e.organization_id = l.organization_id
       WHERE l.organization_id = $1 AND l.branch_id = ANY($2::uuid[]) AND l.deleted_at IS NULL
         AND l.created_at::date >= $3::date AND l.created_at::date <= $4::date
       GROUP BY 1`,
      [organizationId, branchIds, startDate, endDate]
    );
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
