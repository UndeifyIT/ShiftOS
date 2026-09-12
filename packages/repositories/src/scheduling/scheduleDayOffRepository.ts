import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface ScheduleDayOff extends TenantEntity {
  schedule_id: string;
  employee_id: string;
  /** 'YYYY-MM-DD' */
  off_date: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * Explicit "OFF" decisions on the weekly grid (migration 062). Like
 * schedule_rosters, scoped through the parent schedule's branch_id rather
 * than carrying its own.
 */
export class ScheduleDayOffRepository extends TenantScopedRepository<ScheduleDayOff> {
  constructor(client: DatabaseClient) {
    super(client, 'schedule_day_offs');
  }

  async listForSchedule(organizationId: string, scheduleId: string): Promise<ScheduleDayOff[]> {
    return this.list(organizationId, { filters: { schedule_id: scheduleId }, orderBy: 'off_date asc' });
  }

  async findForDate(organizationId: string, scheduleId: string, employeeId: string, offDate: string): Promise<ScheduleDayOff | null> {
    const rows = await this.list(organizationId, { filters: { schedule_id: scheduleId, employee_id: employeeId, off_date: offDate } });
    return rows[0] ?? null;
  }
}
