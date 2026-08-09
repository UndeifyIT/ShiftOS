import { BaseRepository, type DatabaseClient } from '@shiftos/database';
import type { RepositoryQueryOptions } from '@shiftos/types';
import { NotFoundError } from '@shiftos/errors';

export interface Organization extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * organizations is the tenant boundary itself, so it has no organization_id
 * column to scope by — it doesn't extend TenantScopedRepository. Creating an
 * organization is a privileged, platform-level operation (see
 * create_organization_with_owner() in supabase/migrations/023); this
 * repository's create()/insert are still available for completeness but
 * callers should generally go through that bootstrap path, not this
 * repository directly, when provisioning a brand-new tenant.
 */
export class OrganizationRepository extends BaseRepository<Organization> {
  constructor(client: DatabaseClient) {
    super(client, 'organizations');
  }

  async list(options?: RepositoryQueryOptions): Promise<Organization[]> {
    return this.findAll(options);
  }

  async getByIdOrThrow(id: string): Promise<Organization> {
    const record = await this.findById(id);
    if (!record) {
      throw new NotFoundError(`Organization ${id} not found`);
    }
    return record;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const rows = await this.client.query<Organization>(
      'SELECT * FROM organizations WHERE lower(slug) = lower($1) AND deleted_at IS NULL',
      [slug]
    );
    return rows[0] ?? null;
  }

  async archive(id: string): Promise<Organization> {
    return this.softDelete(id);
  }
}
