import {
  NotificationRepository,
  NotificationPreferenceRepository,
  NotificationDeliveryAttemptRepository,
  UserRepository,
  type Notification,
  type NotificationPriority,
  type NotificationChannel,
  type NotificationPreference
} from '@shiftos/repositories';
import { AuthorizationError, ValidationError } from '@shiftos/errors';
import type { DatabaseClient } from '@shiftos/database';
import type { ApplicationContext } from '../applicationContext.js';
import { assertUuid, assertOneOf } from '../validation.js';
import type { NotificationDeliveryProviders, DeliveryChannel } from './deliveryProvider.js';

const DELIVERY_CHANNELS: readonly DeliveryChannel[] = ['email', 'push', 'sms'];

/**
 * Notifications service (backend completion pass). notifications (016) had a
 * full repository layer but no service or API. Unlike every other domain
 * this pass wires up, notifications rows are inherently self-scoped —
 * `user_id` is always the platform users.id, and every read/write here
 * either targets the caller's own id or an id this service resolved itself
 * (notify()), never a client-supplied one — so there is no per-row
 * ownership check to bypass the way there is for e.g. announcements.
 */
export class NotificationService {
  private readonly notifications: NotificationRepository;
  private readonly preferences: NotificationPreferenceRepository;

  constructor(private readonly context: ApplicationContext) {
    this.notifications = new NotificationRepository(context.client);
    this.preferences = new NotificationPreferenceRepository(context.client);
  }

  async listMine(options?: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<Notification[]> {
    await this.context.requirePermission('notifications.read');
    if (options?.unreadOnly) {
      return this.notifications.findUnreadForUser(this.context.organizationId, this.context.userId, options);
    }
    return this.notifications.findForUser(this.context.organizationId, this.context.userId, options);
  }

  async markRead(notificationId: string): Promise<Notification> {
    assertUuid(notificationId, 'notificationId');
    await this.context.requirePermission('notifications.read');

    const existing = await this.notifications.getByIdOrThrow(this.context.organizationId, notificationId);
    if (existing.user_id !== this.context.userId) {
      throw new AuthorizationError('You can only mark your own notifications as read');
    }
    if (existing.read_at) {
      return existing;
    }
    return this.notifications.markRead(this.context.organizationId, notificationId);
  }

  async markAllRead(): Promise<number> {
    await this.context.requirePermission('notifications.read');
    return this.notifications.markAllReadForUser(this.context.organizationId, this.context.userId);
  }

  /** Every deliverable channel's current preference for the caller -- channels with no row yet default to enabled (the column default), reported as such rather than omitted. */
  async getMyPreferences(): Promise<Array<{ channel: NotificationChannel; is_enabled: boolean }>> {
    await this.context.requirePermission('notifications.read');
    const rows = await this.preferences.findForUser(this.context.organizationId, this.context.userId);
    const byChannel = new Map(rows.map((row) => [row.channel, row.is_enabled]));
    return (['in_app', 'email', 'push', 'sms'] as const).map((channel) => ({
      channel,
      is_enabled: byChannel.get(channel) ?? true
    }));
  }

  async setMyPreference(channel: string, isEnabled: boolean): Promise<NotificationPreference> {
    assertOneOf(channel, ['in_app', 'email', 'push', 'sms'] as const, 'channel');
    await this.context.requirePermission('notifications.read');
    return this.preferences.setEnabled(this.context.organizationId, this.context.userId, channel, isEnabled);
  }
}

/**
 * Fire-and-forget creation helper for other services to call after their own
 * domain write succeeds (e.g. LeaveRequestService notifying a requester of a
 * decision). Deliberately a free function, not an RPC-exposed method on
 * NotificationService: a notification's recipient/content is decided by the
 * triggering domain event, never by arbitrary client input, so there is no
 * "create_notification" RPC operation — only this internal call point.
 */
export async function notify(
  client: DatabaseClient,
  organizationId: string,
  targetUserId: string,
  title: string,
  content: string,
  priority: NotificationPriority = 'normal',
  deliveryChannel?: DeliveryChannel,
  providers?: NotificationDeliveryProviders
): Promise<void> {
  const notifications = new NotificationRepository(client);
  const created = await notifications.insert(organizationId, {
    user_id: targetUserId,
    title,
    content,
    priority,
    channel: deliveryChannel ?? 'in_app'
  });

  // The in-app row above is the one guaranteed delivery this system can
  // actually make good on. A non-in-app channel is a *request* for
  // additional delivery, attempted (and honestly logged) below -- never
  // silently claimed as sent.
  if (!deliveryChannel) {
    return;
  }

  const deliveryAttempts = new NotificationDeliveryAttemptRepository(client);
  const preferences = new NotificationPreferenceRepository(client);

  const preference = await preferences.findOne(organizationId, targetUserId, deliveryChannel);
  if (preference && !preference.is_enabled) {
    await deliveryAttempts.record(created.id, deliveryChannel, 'failed', 'Skipped: recipient has disabled this notification channel');
    return;
  }

  const provider = providers?.[deliveryChannel];
  if (!provider) {
    await deliveryAttempts.record(
      created.id,
      deliveryChannel,
      'failed',
      `Skipped: no ${deliveryChannel} delivery provider is configured (blocked by infrastructure -- see docs/backend-completion-audit.md)`
    );
    return;
  }

  const users = new UserRepository(client);
  const user = await users.getByIdOrThrow(targetUserId);
  try {
    const result = await provider.send({ email: user.email, phone: null }, title, content);
    await deliveryAttempts.record(created.id, deliveryChannel, result.delivered ? 'delivered' : 'failed', result.error ?? null);
  } catch (error) {
    await deliveryAttempts.record(created.id, deliveryChannel, 'failed', error instanceof Error ? error.message : 'Unknown delivery error');
  }
}
