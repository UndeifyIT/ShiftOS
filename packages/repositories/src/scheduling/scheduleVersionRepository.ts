import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface ScheduleVersion extends TenantEntity {
  schedule_id: string;
  version: number;
  published_at: string;
  published_by: string | null;
  changes_summary: string | null;
  created_at: string;
}

/** Append-only publish history; no updated_at/deleted_at columns exist on this table. */
export class ScheduleVersionRepository extends TenantScopedRepository<ScheduleVersion> {
  constructor(client: DatabaseClient) {
    super(client, 'schedule_versions');
    this.hasSoftDelete = false;
  }

  async listForSchedule(organizationId: string, scheduleId: string): Promise<ScheduleVersion[]> {
    return this.list(organizationId, { filters: { schedule_id: scheduleId }, orderBy: 'version desc' });
  }

  async latestForSchedule(organizationId: string, scheduleId: string): Promise<ScheduleVersion | null> {
    const versions = await this.listForSchedule(organizationId, scheduleId);
    return versions[0] ?? null;
  }

  async recordVersion(organizationId: string, entry: {
    schedule_id: string;
    version: number;
    published_by: string | null;
    changes_summary: string | null;
  }): Promise<ScheduleVersion> {
    return this.insert(organizationId, entry);
  }
}
