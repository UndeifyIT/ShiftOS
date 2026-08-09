import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export interface Notification extends TenantEntity {
  user_id: string;
  title: string;
  content: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  read_at: string | null;
  created_at: string;
}

/** Notification records are effectively append-only/mutate-once (read_at); no updated_at/deleted_at columns exist. */
export class NotificationRepository extends TenantScopedRepository<Notification> {
  constructor(client: DatabaseClient) {
    super(client, 'notifications');
    this.hasSoftDelete = false;
  }

  async findForUser(organizationId: string, userId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    return this.list(organizationId, { ...options, filters: { user_id: userId }, orderBy: 'created_at desc' });
  }

  async findUnreadForUser(organizationId: string, userId: string, options?: { limit?: number; offset?: number }): Promise<Notification[]> {
    const params: unknown[] = [organizationId, userId];
    let sql = `SELECT * FROM notifications WHERE organization_id = $1 AND user_id = $2 AND read_at IS NULL ORDER BY created_at DESC`;
    if (typeof options?.limit === 'number') {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (typeof options?.offset === 'number') {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }
    return this.client.query<Notification>(sql, params);
  }

  async markRead(organizationId: string, id: string): Promise<Notification> {
    return this.patch(organizationId, id, { read_at: new Date().toISOString() } as Partial<Notification>);
  }
}
