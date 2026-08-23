import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type LeaveType = 'annual_leave' | 'sick_leave' | 'emergency_leave' | 'unpaid_leave';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest extends BranchEntity {
  employee_id: string;
  requested_by: string;
  approved_by: string | null;
  leave_type: LeaveType;
  status: LeaveRequestStatus;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  manager_notes: string | null;
  cancellation_reason: string | null;
  last_status_changed_at: string;
  version: number;
  created_by: string;
  rejected_by: string | null;
  cancelled_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LeaveRequestRepository extends BranchScopedRepository<LeaveRequest> {
  constructor(client: DatabaseClient) {
    super(client, 'leave_requests');
  }

  async findByEmployee(organizationId: string, employeeId: string, options?: { limit?: number; offset?: number }): Promise<LeaveRequest[]> {
    return this.list(organizationId, { ...options, filters: { employee_id: employeeId }, orderBy: 'start_date desc' });
  }

  async findPending(organizationId: string, branchIds: string[], options?: { limit?: number; offset?: number }): Promise<LeaveRequest[]> {
    return this.listByBranches(organizationId, branchIds, { ...options, filters: { status: 'pending' }, orderBy: 'created_at asc' });
  }

  /**
   * approve/reject/cancel are exposed as focused methods (not a raw patch())
   * because trg_leave_requests_validate (018) enforces exactly which fields
   * must/must not be set together per status — sending the right minimal
   * payload here avoids fighting that trigger with a generic patch call.
   *
   * The trigger also enforces `approved_at >= created_at` (created_at being
   * DB-generated via `now()`). Sourcing the timestamp from
   * `new Date().toISOString()` (the application server's own clock) is a
   * real race, not a hypothetical one: verified live, this project's DB
   * server clock runs measurably ahead of the app/test machine's clock, so
   * an approve immediately following a create could produce an approved_at
   * earlier than created_at and fail this check. serverNow() reads the
   * timestamp from the same clock the trigger will compare against.
   */
  private async serverNow(): Promise<Date> {
    const rows = await this.client.query<{ now: Date } & Record<string, unknown>>('SELECT now() AS now');
    return rows[0].now;
  }

  async approve(organizationId: string, id: string, approvedBy: string): Promise<LeaveRequest> {
    const approvedAt = await this.serverNow();
    return this.patch(organizationId, id, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: approvedAt.toISOString()
    } as Partial<LeaveRequest>);
  }

  async reject(organizationId: string, id: string, rejectedBy: string, managerNotes: string): Promise<LeaveRequest> {
    const rejectedAt = await this.serverNow();
    return this.patch(organizationId, id, {
      status: 'rejected',
      rejected_by: rejectedBy,
      rejected_at: rejectedAt.toISOString(),
      manager_notes: managerNotes
    } as Partial<LeaveRequest>);
  }

  async cancel(organizationId: string, id: string, cancelledBy: string, reason: string): Promise<LeaveRequest> {
    const cancelledAt = await this.serverNow();
    return this.patch(organizationId, id, {
      status: 'cancelled',
      cancelled_by: cancelledBy,
      cancelled_at: cancelledAt.toISOString(),
      cancellation_reason: reason
    } as Partial<LeaveRequest>);
  }
}
