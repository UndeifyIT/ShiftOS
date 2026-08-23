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

/** notification_preferences (016) had a full schema but no repository, service, or API anywhere -- wired here for the first time. */
export class NotificationPreferenceRepository extends TenantScopedRepository<NotificationPreference> {
  constructor(client: DatabaseClient) {
    super(client, 'notification_preferences');
    this.hasSoftDelete = false;
  }

  async findForUser(organizationId: string, userId: string): Promise<NotificationPreference[]> {
    return this.list(organizationId, { filters: { user_id: userId } });
  }

  async findOne(organizationId: string, userId: string, channel: NotificationChannel): Promise<NotificationPreference | null> {
    const matches = await this.list(organizationId, { filters: { user_id: userId, channel } });
    return matches[0] ?? null;
  }

  /** Upserts on the (user_id, organization_id, channel) unique constraint -- a preference row is created lazily on first write, defaulting every other channel to enabled (the column default). */
  async setEnabled(organizationId: string, userId: string, channel: NotificationChannel, isEnabled: boolean): Promise<NotificationPreference> {
    const rows = await this.client.query<NotificationPreference & Record<string, unknown>>(
      `INSERT INTO notification_preferences (organization_id, user_id, channel, is_enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, organization_id, channel)
       DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = now()
       RETURNING *`,
      [organizationId, userId, channel, isEnabled]
    );
    return rows[0];
  }
}
