import type { DatabaseClient } from '@shiftos/database';
import type { NotificationChannel } from './notificationRepository.js';

export type NotificationDeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface NotificationDeliveryAttempt extends Record<string, unknown> {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attempted_at: string;
  error_message: string | null;
}

/**
 * notification_delivery_attempts (016) had a full schema but no repository,
 * service, or API anywhere -- wired here for the first time. No
 * organization_id column of its own (scoped transitively through
 * notification_id), so this does not extend TenantScopedRepository.
 */
export class NotificationDeliveryAttemptRepository {
  constructor(private readonly client: DatabaseClient) {}

  async record(
    notificationId: string,
    channel: NotificationChannel,
    status: NotificationDeliveryStatus,
    errorMessage: string | null = null
  ): Promise<NotificationDeliveryAttempt> {
    const rows = await this.client.query<NotificationDeliveryAttempt>(
      `INSERT INTO notification_delivery_attempts (notification_id, channel, status, error_message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [notificationId, channel, status, errorMessage]
    );
    return rows[0];
  }

  async listForNotification(notificationId: string): Promise<NotificationDeliveryAttempt[]> {
    return this.client.query<NotificationDeliveryAttempt>(
      'SELECT * FROM notification_delivery_attempts WHERE notification_id = $1 ORDER BY attempted_at DESC',
      [notificationId]
    );
  }
}
