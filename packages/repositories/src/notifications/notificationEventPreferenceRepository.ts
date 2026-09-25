import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

/**
 * The events ShiftOS sends notifications for: the three a person gets about
 * their own requests (067), and the six the handoff gives the people who run
 * a branch (071).
 */
export type NotificationEventType =
  | 'swap_updates'
  | 'leave_decisions'
  | 'announcement_reminders'
  | 'coverage_gaps'
  | 'unpublished_schedule'
  | 'absences'
  | 'leave_requests'
  | 'announcement_digest'
  | 'invitations';
export const NOTIFICATION_EVENT_TYPES: readonly NotificationEventType[] = [
  'swap_updates',
  'leave_decisions',
  'announcement_reminders',
  'coverage_gaps',
  'unpublished_schedule',
  'absences',
  'leave_requests',
  'announcement_digest',
  'invitations'
];

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

/**
 * What a switch is before anyone touches it — the handoff's STNG_NOTIFICATIONS
 * `on` values for its six rows ([in-app, email]); the three personal events
 * start on everywhere.
 */
export const NOTIFICATION_EVENT_DEFAULTS: Record<NotificationEventType, Record<NotificationEventChannel, boolean>> = {
  swap_updates: { in_app: true, email: true },
  leave_decisions: { in_app: true, email: true },
  announcement_reminders: { in_app: true, email: true },
  coverage_gaps: { in_app: true, email: true },
  unpublished_schedule: { in_app: true, email: true },
  absences: { in_app: true, email: false },
  leave_requests: { in_app: true, email: true },
  announcement_digest: { in_app: false, email: true },
  invitations: { in_app: true, email: false }
};

/** Per-event, per-channel switches (067, 071) — the Settings → Notifications matrix. No row means the event's default. */
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
    return rows[0]?.is_enabled ?? NOTIFICATION_EVENT_DEFAULTS[eventType][channel];
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
