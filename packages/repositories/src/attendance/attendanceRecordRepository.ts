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

  async findByEmployee(organizationId: string, employeeId: string, options?: { limit?: number; offset?: number }): Promise<AttendanceRecord[]> {
    return this.list(organizationId, { ...options, filters: { employee_id: employeeId }, orderBy: 'created_at desc' });
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
