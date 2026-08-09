import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';
import type { AttendanceStatus } from './attendanceRecordRepository.js';

export interface AttendanceCorrection extends TenantEntity {
  attendance_record_id: string;
  original_status: AttendanceStatus;
  original_clock_in: string | null;
  original_clock_out: string | null;
  corrected_status: AttendanceStatus;
  corrected_clock_in: string | null;
  corrected_clock_out: string | null;
  reason: string;
  approved_by: string | null;
  approved_at: string;
  created_at: string;
}

/** Append-only correction log; no updated_at/deleted_at columns exist on this table. */
export class AttendanceCorrectionRepository extends TenantScopedRepository<AttendanceCorrection> {
  constructor(client: DatabaseClient) {
    super(client, 'attendance_corrections');
    this.hasSoftDelete = false;
  }

  async listForAttendanceRecord(organizationId: string, attendanceRecordId: string): Promise<AttendanceCorrection[]> {
    return this.list(organizationId, { filters: { attendance_record_id: attendanceRecordId }, orderBy: 'created_at desc' });
  }

  async record(organizationId: string, correction: Omit<AttendanceCorrection, keyof TenantEntity | 'created_at'>): Promise<AttendanceCorrection> {
    return this.insert(organizationId, correction);
  }
}
