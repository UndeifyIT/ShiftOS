import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export type AssignmentStatus = 'assigned' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

export interface ShiftAssignment extends TenantEntity {
  shift_id: string;
  employee_id: string;
  assignment_status: AssignmentStatus;
  assigned_at: string;
  confirmed_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * No branch_id column of its own — branch is derived through the parent
 * shift. Callers that need branch-filtered assignments should resolve the
 * relevant shift ids via ShiftRepository first (e.g. findByBranchesAndDateRange)
 * and then call findByShift/listForShifts, rather than this repository
 * attempting a branch join itself.
 */
export class ShiftAssignmentRepository extends TenantScopedRepository<ShiftAssignment> {
  constructor(client: DatabaseClient) {
    super(client, 'shift_assignments');
  }

  async findByShift(organizationId: string, shiftId: string): Promise<ShiftAssignment[]> {
    return this.list(organizationId, { filters: { shift_id: shiftId } });
  }

  async listForShifts(organizationId: string, shiftIds: string[]): Promise<ShiftAssignment[]> {
    if (shiftIds.length === 0) {
      return [];
    }
    return this.client.query<ShiftAssignment>(
      'SELECT * FROM shift_assignments WHERE organization_id = $1 AND shift_id = ANY($2::uuid[]) AND deleted_at IS NULL',
      [organizationId, shiftIds]
    );
  }

  async findByEmployee(organizationId: string, employeeId: string, options?: { limit?: number; offset?: number }): Promise<ShiftAssignment[]> {
    return this.list(organizationId, { ...options, filters: { employee_id: employeeId }, orderBy: 'assigned_at desc' });
  }

  async confirm(organizationId: string, id: string): Promise<ShiftAssignment> {
    return this.patch(organizationId, id, { assignment_status: 'confirmed', confirmed_at: new Date().toISOString() } as Partial<ShiftAssignment>);
  }

  async decline(organizationId: string, id: string): Promise<ShiftAssignment> {
    return this.patch(organizationId, id, { assignment_status: 'declined', declined_at: new Date().toISOString() } as Partial<ShiftAssignment>);
  }
}
