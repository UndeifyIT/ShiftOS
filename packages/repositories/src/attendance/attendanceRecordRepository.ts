import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type AttendanceStatus = 'scheduled' | 'present' | 'late' | 'absent' | 'no_show' | 'left_early' | 'completed';

export interface AttendanceRecord extends BranchEntity {
  shift_assignment_id: string;
  employee_id: string;
  attendance_status: AttendanceStatus;
  clock_in_at: string | null;
  clock_out_at: string | null;
  break_minutes: number;
  /** Database-owned (see supabase/migrations/018): computed by trg_attendance_records_validate, not client-writable in practice even though the column accepts a value here. */
  worked_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
  early_departure_minutes: number;
  notes: string | null;
  recorded_by: string;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AttendanceRecordRepository extends BranchScopedRepository<AttendanceRecord> {
  constructor(client: DatabaseClient) {
    super(client, 'attendance_records');
  }

  /** Newest first, with the shift each record belongs to (date, times, title) joined in for the employee history table. */
  async findByEmployee(organizationId: string, employeeId: string, options?: { limit?: number; offset?: number }): Promise<AttendanceRecord[]> {
    const params: unknown[] = [organizationId, employeeId];
    let sql = `SELECT ar.*, s.shift_date, s.start_time AS shift_start_time, s.end_time AS shift_end_time, s.title AS shift_title
                 FROM attendance_records ar
                 LEFT JOIN shift_assignments sa ON sa.id = ar.shift_assignment_id AND sa.organization_id = ar.organization_id
                 LEFT JOIN shifts s ON s.id = sa.shift_id AND s.organization_id = ar.organization_id
                WHERE ar.organization_id = $1 AND ar.employee_id = $2 AND ar.deleted_at IS NULL
                ORDER BY ar.created_at DESC`;
    if (typeof options?.limit === 'number') {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (typeof options?.offset === 'number') {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }
    return this.client.query<AttendanceRecord>(sql, params);
  }

  async findByShiftAssignment(organizationId: string, shiftAssignmentId: string): Promise<AttendanceRecord | null> {
    const matches = await this.list(organizationId, { filters: { shift_assignment_id: shiftAssignmentId } });
    return matches[0] ?? null;
  }

  async findByBranchAndDateRange(
    organizationId: string,
    branchId: string,
    startIso: string,
    endIso: string
  ): Promise<AttendanceRecord[]> {
    return this.client.query<AttendanceRecord>(
      `SELECT * FROM attendance_records
        WHERE organization_id = $1 AND branch_id = $2 AND deleted_at IS NULL
          AND created_at BETWEEN $3 AND $4
        ORDER BY created_at DESC`,
      [organizationId, branchId, startIso, endIso]
    );
  }

  /**
   * clockIn/clockOut are exposed as separate, minimal-field patches rather
   * than a raw patch() call so callers don't accidentally try to set
   * worked_minutes/overtime_minutes/etc. themselves — those are recomputed by
   * the database trigger (018) regardless of what's sent.
   */
  async clockIn(organizationId: string, id: string, updatedBy: string): Promise<AttendanceRecord> {
    return this.patch(organizationId, id, {
      attendance_status: 'present',
      clock_in_at: new Date().toISOString(),
      updated_by: updatedBy
    } as Partial<AttendanceRecord>);
  }

  async clockOut(organizationId: string, id: string, updatedBy: string): Promise<AttendanceRecord> {
    return this.patch(organizationId, id, {
      attendance_status: 'completed',
      clock_out_at: new Date().toISOString(),
      updated_by: updatedBy
    } as Partial<AttendanceRecord>);
  }
}
