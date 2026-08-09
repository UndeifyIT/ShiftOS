import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type ShiftStatus = 'draft' | 'published' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'archived';

export interface Shift extends BranchEntity {
  template_id: string | null;
  title: string;
  description: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  duration: string;
  crosses_midnight: boolean;
  break_minutes: number;
  status: ShiftStatus;
  published_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftRepository extends BranchScopedRepository<Shift> {
  constructor(client: DatabaseClient) {
    super(client, 'shifts');
  }

  async findByBranchAndDateRange(
    organizationId: string,
    branchId: string,
    startDate: string,
    endDate: string
  ): Promise<Shift[]> {
    return this.client.query<Shift>(
      `SELECT * FROM shifts
        WHERE organization_id = $1 AND branch_id = $2 AND deleted_at IS NULL
          AND shift_date BETWEEN $3 AND $4
        ORDER BY shift_date ASC, start_time ASC`,
      [organizationId, branchId, startDate, endDate]
    );
  }

  async findByBranchesAndDateRange(
    organizationId: string,
    branchIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Shift[]> {
    if (branchIds.length === 0) {
      return [];
    }
    return this.client.query<Shift>(
      `SELECT * FROM shifts
        WHERE organization_id = $1 AND branch_id = ANY($2::uuid[]) AND deleted_at IS NULL
          AND shift_date BETWEEN $3 AND $4
        ORDER BY shift_date ASC, start_time ASC`,
      [organizationId, branchIds, startDate, endDate]
    );
  }

  async publish(organizationId: string, id: string): Promise<Shift> {
    return this.patch(organizationId, id, { status: 'published', published_at: new Date().toISOString() } as Partial<Shift>);
  }

  async cancel(organizationId: string, id: string): Promise<Shift> {
    return this.patch(organizationId, id, { status: 'cancelled' } as Partial<Shift>);
  }
}
