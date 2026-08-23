import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export interface ShiftNote extends BranchEntity {
  shift_id: string;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftNoteRepository extends BranchScopedRepository<ShiftNote> {
  constructor(client: DatabaseClient) {
    super(client, 'shift_notes');
  }

  async listForShift(organizationId: string, shiftId: string): Promise<ShiftNote[]> {
    return this.list(organizationId, { filters: { shift_id: shiftId }, orderBy: 'created_at desc' });
  }
}
