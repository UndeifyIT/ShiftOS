import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type ScheduleStatus = 'draft' | 'published' | 'archived';

export interface Schedule extends BranchEntity {
  name: string;
  start_date: string;
  end_date: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ScheduleRepository extends BranchScopedRepository<Schedule> {
  constructor(client: DatabaseClient) {
    super(client, 'schedules');
  }

  /** Exact (branch_id, start_date, end_date) match — mirrors uq_schedules_branch_active_dates, so callers can pre-check and return a clean ValidationError instead of surfacing a raw unique-constraint violation. */
  async findExact(organizationId: string, branchId: string, startDate: string, endDate: string): Promise<Schedule | null> {
    const matches = await this.list(organizationId, { filters: { branch_id: branchId, start_date: startDate, end_date: endDate } });
    return matches[0] ?? null;
  }

  async findCoveringDate(organizationId: string, branchId: string, date: string): Promise<Schedule | null> {
    const rows = await this.client.query<Schedule>(
      `SELECT * FROM schedules
        WHERE organization_id = $1 AND branch_id = $2 AND deleted_at IS NULL
          AND start_date <= $3 AND end_date >= $3
        ORDER BY start_date DESC
        LIMIT 1`,
      [organizationId, branchId, date]
    );
    return rows[0] ?? null;
  }

  async publish(organizationId: string, id: string): Promise<Schedule> {
    return this.patch(organizationId, id, { status: 'published' } as Partial<Schedule>);
  }
}
