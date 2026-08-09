import { BaseRepository, type DatabaseClient } from '@shiftos/database';
import { DatabaseError } from '@shiftos/errors';
import type { RepositoryQueryOptions } from '@shiftos/types';

export interface SecurityEvent extends Record<string, unknown> {
  id: string;
  /** Nullable: platform-level events (e.g. a failed login before any org context is known) may have no organization. */
  organization_id: string | null;
  user_id: string | null;
  event_type: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Append-only, same contract as AuditLogRepository — see supabase/migrations/024. */
export class SecurityEventRepository extends BaseRepository<SecurityEvent> {
  constructor(client: DatabaseClient) {
    super(client, 'security_events');
  }

  async record(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<SecurityEvent> {
    return this.create(event as Partial<SecurityEvent>);
  }

  async listForOrganization(organizationId: string, options?: RepositoryQueryOptions): Promise<SecurityEvent[]> {
    return this.findAll({ ...options, filters: { ...(options?.filters ?? {}), organization_id: organizationId } });
  }

  async listForUser(userId: string, options?: RepositoryQueryOptions): Promise<SecurityEvent[]> {
    return this.findAll({ ...options, filters: { ...(options?.filters ?? {}), user_id: userId } });
  }

  override async update(): Promise<never> {
    throw new DatabaseError('security_events is append-only; records cannot be updated');
  }

  override async delete(): Promise<never> {
    throw new DatabaseError('security_events is append-only; records cannot be deleted');
  }

  override async softDelete(): Promise<never> {
    throw new DatabaseError('security_events is append-only; records cannot be deleted');
  }
}
