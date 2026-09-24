import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

/** The events ShiftOS sends notifications for today (067). */
export type NotificationEventType = 'swap_updates' | 'leave_decisions' | 'announcement_reminders';
export const NOTIFICATION_EVENT_TYPES: readonly NotificationEventType[] = ['swap_updates', 'leave_decisions', 'announcement_reminders'];

/** Channels a per-event switch exists for. */
export type NotificationEventChannel = 'in_app' | 'email';
export const NOTIFICATION_EVENT_CHANNELS: readonly NotificationEventChannel[] = ['in_app', 'email'];

export interface NotificationEventPreference extends TenantEntity {
  user_id: string;
  event_type: NotificationEventType;
  channel: NotificationEventChannel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Per-event, per-channel switches (067) — the Settings → Notifications matrix. No row means enabled. */
export class NotificationEventPreferenceRepository extends TenantScopedRepository<NotificationEventPreference> {
  constructor(client: DatabaseClient) {
    super(client, 'notification_event_preferences');
    this.hasSoftDelete = false;
  }

  async findForUser(organizationId: string, userId: string): Promise<NotificationEventPreference[]> {
    return this.list(organizationId, { filters: { user_id: userId } });
  }

  async isEnabled(organizationId: string, userId: string, eventType: NotificationEventType, channel: NotificationEventChannel): Promise<boolean> {
    const rows = await this.list(organizationId, { filters: { user_id: userId, event_type: eventType, channel } });
    return rows[0]?.is_enabled ?? true;
  }

  async setEnabled(
    organizationId: string,
    userId: string,
    eventType: NotificationEventType,
    channel: NotificationEventChannel,
    isEnabled: boolean
  ): Promise<NotificationEventPreference> {
    const rows = await this.client.query<NotificationEventPreference & Record<string, unknown>>(
      `INSERT INTO notification_event_preferences (organization_id, user_id, event_type, channel, is_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, organization_id, event_type, channel)
       DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = now()
       RETURNING *`,
      [organizationId, userId, eventType, channel, isEnabled]
    );
    return rows[0];
  }
}
