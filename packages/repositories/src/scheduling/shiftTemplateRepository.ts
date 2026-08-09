import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type ShiftTemplateStatus = 'active' | 'archived';

export interface ShiftTemplate extends BranchEntity {
  name: string;
  start_time: string;
  end_time: string;
  duration: string;
  crosses_midnight: boolean;
  notes: string | null;
  status: ShiftTemplateStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftTemplateRepository extends BranchScopedRepository<ShiftTemplate> {
  constructor(client: DatabaseClient) {
    super(client, 'shift_templates');
  }

  async listActiveByBranch(organizationId: string, branchId: string): Promise<ShiftTemplate[]> {
    return this.listByBranch(organizationId, branchId, { filters: { status: 'active' }, orderBy: 'name asc' });
  }
}
