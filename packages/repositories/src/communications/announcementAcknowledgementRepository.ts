import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface AnnouncementAcknowledgement extends TenantEntity {
  announcement_id: string;
  employee_id: string;
  acknowledged_at: string;
}

/** Append-only read receipts; no updated_at/deleted_at columns exist on this table. */
export class AnnouncementAcknowledgementRepository extends TenantScopedRepository<AnnouncementAcknowledgement> {
  constructor(client: DatabaseClient) {
    super(client, 'announcement_acknowledgements');
    this.hasSoftDelete = false;
  }

  async listForAnnouncement(organizationId: string, announcementId: string): Promise<AnnouncementAcknowledgement[]> {
    return this.list(organizationId, { filters: { announcement_id: announcementId } });
  }

  async hasAcknowledged(organizationId: string, announcementId: string, employeeId: string): Promise<boolean> {
    const matches = await this.list(organizationId, { filters: { announcement_id: announcementId, employee_id: employeeId } });
    return matches.length > 0;
  }

  async acknowledge(organizationId: string, announcementId: string, employeeId: string): Promise<AnnouncementAcknowledgement> {
    return this.insert(organizationId, { announcement_id: announcementId, employee_id: employeeId });
  }
}
