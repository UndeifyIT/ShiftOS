import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';
import type { NotificationChannel } from './notificationRepository.js';

export interface NotificationPreference extends TenantEntity {
  user_id: string;
  channel: NotificationChannel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** No deleted_at column — a preference row is toggled (is_enabled), not soft-deleted. */
export class NotificationPreferenceRepository extends TenantScopedRepository<NotificationPreference> {
  constructor(client: DatabaseClient) {
    super(client, 'notification_preferences');
    this.hasSoftDelete = false;
  }

  async listForUser(organizationId: string, userId: string): Promise<NotificationPreference[]> {
    return this.list(organizationId, { filters: { user_id: userId } });
  }

  async setEnabled(organizationId: string, id: string, isEnabled: boolean): Promise<NotificationPreference> {
    return this.patch(organizationId, id, { is_enabled: isEnabled } as Partial<NotificationPreference>);
  }

  async upsertForUser(organizationId: string, userId: string, channel: NotificationChannel, isEnabled: boolean): Promise<NotificationPreference> {
    const existing = await this.list(organizationId, { filters: { user_id: userId, channel } });
    if (existing[0]) {
      return this.setEnabled(organizationId, existing[0].id, isEnabled);
    }
    return this.insert(organizationId, { user_id: userId, channel, is_enabled: isEnabled });
  }
}
