import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface ScheduleRosterEntry extends TenantEntity {
  schedule_id: string;
  employee_id: string;
  added_by: string;
  added_at: string;
  deleted_at: string | null;
}

/**
 * Not branch-scoped directly (no branch_id column) -- roster membership is
 * scoped through the parent schedule, which already carries branch_id.
 */
export class ScheduleRosterRepository extends TenantScopedRepository<ScheduleRosterEntry> {
  constructor(client: DatabaseClient) {
    super(client, 'schedule_rosters');
  }

  async listForSchedule(organizationId: string, scheduleId: string): Promise<ScheduleRosterEntry[]> {
    return this.list(organizationId, { filters: { schedule_id: scheduleId }, orderBy: 'added_at asc' });
  }

  async findEntry(organizationId: string, scheduleId: string, employeeId: string): Promise<ScheduleRosterEntry | null> {
    const rows = await this.list(organizationId, { filters: { schedule_id: scheduleId, employee_id: employeeId } });
    return rows[0] ?? null;
  }
}
