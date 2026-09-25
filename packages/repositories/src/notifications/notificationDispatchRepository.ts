import type { DatabaseClient } from '@shiftos/database';

/**
 * notification_dispatches (071): one row per scheduled notification sent, so
 * a job that runs every few minutes — or on several servers — sends each one
 * once. claim() is the whole API: it records the key and says whether this
 * caller was the one that recorded it.
 */
export class NotificationDispatchRepository {
  constructor(private readonly client: DatabaseClient) {}

  async claim(organizationId: string, eventType: string, dedupeKey: string): Promise<boolean> {
    const rows = await this.client.query<{ id: string }>(
      `INSERT INTO notification_dispatches (organization_id, event_type, dedupe_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, dedupe_key) DO NOTHING
       RETURNING id`,
      [organizationId, eventType, dedupeKey]
    );
    return rows.length > 0;
  }
}
