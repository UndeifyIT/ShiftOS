import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type ShiftSwapStatus = 'pending' | 'accepted' | 'declined' | 'approved' | 'rejected' | 'cancelled';

export interface ShiftSwapRequest extends BranchEntity {
  shift_assignment_id: string;
  requested_by_employee_id: string;
  target_employee_id: string | null;
  status: ShiftSwapStatus;
  notes: string | null;
  responded_by_employee_id: string | null;
  responded_at: string | null;
  decision_by: string | null;
  decision_at: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A swap with the shift it moves — the Requests page's "Gives up" side. */
export interface ShiftSwapWithShift extends ShiftSwapRequest {
  shift_date: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  shift_title: string | null;
  shift_department_id: string | null;
}

/** Every swap listing carries its shift, so the Requests page can say which shift is changing hands. */
const WITH_SHIFT = `SELECT s.*,
       sh.shift_date::text AS shift_date,
       sh.start_time::text AS shift_start_time,
       sh.end_time::text AS shift_end_time,
       sh.title AS shift_title,
       sh.department_id AS shift_department_id
  FROM shift_swap_requests s
  LEFT JOIN shift_assignments a ON a.id = s.shift_assignment_id AND a.organization_id = s.organization_id
  LEFT JOIN shifts sh ON sh.id = a.shift_id AND sh.organization_id = s.organization_id`;

/** No soft-delete: shift_swap_requests is a workflow state machine (see 042_create_shift_swap_requests.sql), not an append-only log — terminal statuses are the end of a row's life, not a deletion. */
export class ShiftSwapRequestRepository extends BranchScopedRepository<ShiftSwapRequest> {
  constructor(client: DatabaseClient) {
    super(client, 'shift_swap_requests');
    this.hasSoftDelete = false;
  }

  async findByAssignment(organizationId: string, shiftAssignmentId: string): Promise<ShiftSwapRequest[]> {
    return this.list(organizationId, { filters: { shift_assignment_id: shiftAssignmentId }, orderBy: 'created_at desc' });
  }

  async listForEmployee(organizationId: string, employeeId: string): Promise<ShiftSwapWithShift[]> {
    return this.client.query<ShiftSwapWithShift>(
      `${WITH_SHIFT}
       WHERE s.organization_id = $1 AND (s.requested_by_employee_id = $2 OR s.target_employee_id = $2)
       ORDER BY s.created_at DESC`,
      [organizationId, employeeId]
    );
  }

  /** Every swap in the given branches, newest first, joined to the shift it would move. */
  async listForBranchesWithShift(organizationId: string, branchIds: string[]): Promise<ShiftSwapWithShift[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<ShiftSwapWithShift>(
      `${WITH_SHIFT}
       WHERE s.organization_id = $1 AND s.branch_id = ANY($2::uuid[])
       ORDER BY s.created_at DESC`,
      [organizationId, branchIds]
    );
  }

  async listOpenForBranches(organizationId: string, branchIds: string[]): Promise<ShiftSwapWithShift[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<ShiftSwapWithShift>(
      `${WITH_SHIFT}
       WHERE s.organization_id = $1 AND s.branch_id = ANY($2::uuid[]) AND s.status = 'pending' AND s.target_employee_id IS NULL
       ORDER BY s.created_at ASC`,
      [organizationId, branchIds]
    );
  }
}
