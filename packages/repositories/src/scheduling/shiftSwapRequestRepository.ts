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

/** No soft-delete: shift_swap_requests is a workflow state machine (see 042_create_shift_swap_requests.sql), not an append-only log — terminal statuses are the end of a row's life, not a deletion. */
export class ShiftSwapRequestRepository extends BranchScopedRepository<ShiftSwapRequest> {
  constructor(client: DatabaseClient) {
    super(client, 'shift_swap_requests');
    this.hasSoftDelete = false;
  }

  async findByAssignment(organizationId: string, shiftAssignmentId: string): Promise<ShiftSwapRequest[]> {
    return this.list(organizationId, { filters: { shift_assignment_id: shiftAssignmentId }, orderBy: 'created_at desc' });
  }

  async listForEmployee(organizationId: string, employeeId: string): Promise<ShiftSwapRequest[]> {
    const rows = await this.client.query<ShiftSwapRequest>(
      `SELECT * FROM shift_swap_requests
       WHERE organization_id = $1 AND (requested_by_employee_id = $2 OR target_employee_id = $2)
       ORDER BY created_at DESC`,
      [organizationId, employeeId]
    );
    return rows;
  }

  async listOpenForBranches(organizationId: string, branchIds: string[]): Promise<ShiftSwapRequest[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<ShiftSwapRequest>(
      `SELECT * FROM shift_swap_requests
       WHERE organization_id = $1 AND branch_id = ANY($2::uuid[]) AND status = 'pending' AND target_employee_id IS NULL
       ORDER BY created_at ASC`,
      [organizationId, branchIds]
    );
  }
}
