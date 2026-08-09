import { BaseRepository, type DatabaseClient } from '@shiftos/database';

export interface PermissionRecord extends Record<string, unknown> {
  id: string;
  code: string;
  module: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * permissions is a global platform catalog, not organization-owned — every
 * organization shares the same permission codes (see migration 002 and
 * 020's seeded org.roles.manage/org.members.manage/org.branches.manage).
 * What's organization-specific is which permissions a given role grants
 * (role_permissions), not the permission catalog itself.
 */
export class PermissionRepository extends BaseRepository<PermissionRecord> {
  constructor(client: DatabaseClient) {
    super(client, 'permissions');
  }

  async listActive(): Promise<PermissionRecord[]> {
    return this.findAll({ filters: { is_active: true } });
  }

  async findByCode(code: string): Promise<PermissionRecord | null> {
    const rows = await this.client.query<PermissionRecord>(
      'SELECT * FROM permissions WHERE code = $1 AND is_active = true',
      [code]
    );
    return rows[0] ?? null;
  }

  async listByModule(module: string): Promise<PermissionRecord[]> {
    return this.findAll({ filters: { module, is_active: true } });
  }
}
