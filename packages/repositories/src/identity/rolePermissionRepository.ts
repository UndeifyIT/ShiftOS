import { BaseRepository, type DatabaseClient } from '@shiftos/database';
import { AuthorizationError } from '@shiftos/errors';

export interface RolePermission extends Record<string, unknown> {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

/**
 * role_permissions has no organization_id column of its own — tenant safety
 * for every method here is enforced by joining to roles and checking
 * roles.organization_id explicitly, the same defense migration 023's RLS
 * policies use. That check is NOT redundant here: this repository connects
 * over a direct, privileged Postgres connection (DATABASE_URL), which does
 * not go through PostgREST/auth.uid() and therefore does not get RLS
 * enforcement for free. This class is one of the actual enforcement points.
 */
export class RolePermissionRepository extends BaseRepository<RolePermission> {
  constructor(client: DatabaseClient) {
    super(client, 'role_permissions');
  }

  /** The permission codes a role currently grants — the core input to authorization resolution. */
  async findPermissionCodesForRole(organizationId: string, roleId: string): Promise<string[]> {
    const rows = await this.client.query<{ code: string }>(
      `SELECT p.code
         FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE r.id = $1
          AND r.organization_id = $2
          AND r.deleted_at IS NULL
          AND p.is_active = true`,
      [roleId, organizationId]
    );
    return rows.map((row) => row.code);
  }

  async listForRole(organizationId: string, roleId: string): Promise<RolePermission[]> {
    await this.assertRoleBelongsToOrganization(organizationId, roleId);
    return this.client.query<RolePermission>(
      'SELECT * FROM role_permissions WHERE role_id = $1',
      [roleId]
    );
  }

  async grant(organizationId: string, roleId: string, permissionId: string): Promise<RolePermission> {
    await this.assertRoleBelongsToOrganization(organizationId, roleId);
    return this.create({ role_id: roleId, permission_id: permissionId });
  }

  async revoke(organizationId: string, roleId: string, permissionId: string): Promise<void> {
    await this.assertRoleBelongsToOrganization(organizationId, roleId);
    await this.client.query(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );
  }

  private async assertRoleBelongsToOrganization(organizationId: string, roleId: string): Promise<void> {
    const rows = await this.client.query<{ id: string }>(
      'SELECT id FROM roles WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [roleId, organizationId]
    );
    if (rows.length === 0) {
      throw new AuthorizationError('Role does not belong to this organization');
    }
  }
}
