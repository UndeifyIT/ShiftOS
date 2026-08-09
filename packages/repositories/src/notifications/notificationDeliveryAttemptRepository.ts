import { BaseRepository, type DatabaseClient } from '@shiftos/database';
import { AuthorizationError } from '@shiftos/errors';

export type DeliveryChannel = 'in_app' | 'push' | 'email' | 'sms';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

export interface NotificationDeliveryAttempt extends Record<string, unknown> {
  id: string;
  notification_id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempted_at: string;
  error_message: string | null;
}

/**
 * No organization_id column of its own (see supabase/migrations/016) —
 * tenant safety is enforced by joining to notifications and checking
 * notifications.organization_id, the same pattern RolePermissionRepository
 * uses for role_permissions.
 */
export class NotificationDeliveryAttemptRepository extends BaseRepository<NotificationDeliveryAttempt> {
  constructor(client: DatabaseClient) {
    super(client, 'notification_delivery_attempts');
  }

  async listForNotification(organizationId: string, notificationId: string): Promise<NotificationDeliveryAttempt[]> {
    return this.client.query<NotificationDeliveryAttempt>(
      `SELECT da.*
         FROM notification_delivery_attempts da
         JOIN notifications n ON n.id = da.notification_id
        WHERE da.notification_id = $1 AND n.organization_id = $2
        ORDER BY da.attempted_at DESC`,
      [notificationId, organizationId]
    );
  }

  async record(organizationId: string, attempt: { notification_id: string; channel: DeliveryChannel; status: DeliveryStatus; error_message: string | null }): Promise<NotificationDeliveryAttempt> {
    const owns = await this.client.query<{ id: string }>(
      'SELECT id FROM notifications WHERE id = $1 AND organization_id = $2',
      [attempt.notification_id, organizationId]
    );
    if (owns.length === 0) {
      throw new AuthorizationError('Notification does not belong to this organization');
    }
    return this.create(attempt);
  }
}
