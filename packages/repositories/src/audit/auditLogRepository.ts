import { BaseRepository, type DatabaseClient } from '@shiftos/database';
import { DatabaseError } from '@shiftos/errors';
import type { RepositoryQueryOptions } from '@shiftos/types';

export interface AuditLogEntry extends Record<string, unknown> {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * audit_logs is append-only by design (supabase/migrations/024: RLS defines
 * no UPDATE/DELETE policy at all, backed by a trigger that rejects both
 * unconditionally, independent of RLS bypass — see GOV-003 DEC-031). This
 * repository enforces the same contract at the application layer: update/
 * delete/softDelete are overridden to fail fast with a clear error instead
 * of silently inheriting BaseRepository's generic versions and only failing
 * when the database trigger rejects the SQL.
 */
export class AuditLogRepository extends BaseRepository<AuditLogEntry> {
  constructor(client: DatabaseClient) {
    super(client, 'audit_logs');
  }

  async record(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<AuditLogEntry> {
    return this.create(entry as Partial<AuditLogEntry>);
  }

  async listForOrganization(organizationId: string, options?: RepositoryQueryOptions): Promise<AuditLogEntry[]> {
    return this.findAll({ ...options, filters: { ...(options?.filters ?? {}), organization_id: organizationId } });
  }

  async listForEntity(organizationId: string, entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return this.findAll({ filters: { organization_id: organizationId, entity_type: entityType, entity_id: entityId }, orderBy: 'created_at desc' });
  }

  override async update(): Promise<never> {
    throw new DatabaseError('audit_logs is append-only; records cannot be updated');
  }

  override async delete(): Promise<never> {
    throw new DatabaseError('audit_logs is append-only; records cannot be deleted');
  }

  override async softDelete(): Promise<never> {
    throw new DatabaseError('audit_logs is append-only; records cannot be deleted');
  }
}
