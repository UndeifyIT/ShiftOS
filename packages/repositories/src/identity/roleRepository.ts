import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface RoleRecord extends TenantEntity {
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  /** True = every branch in the organization (PER-018 Rule 2, e.g. Manager); false = explicit grants only (organization_member_branch_access). */
  grants_org_wide_branch_access: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class RoleRepository extends TenantScopedRepository<RoleRecord> {
  constructor(client: DatabaseClient) {
    super(client, 'roles');
  }

  async findByName(organizationId: string, name: string): Promise<RoleRecord | null> {
    const rows = await this.client.query<RoleRecord>(
      'SELECT * FROM roles WHERE organization_id = $1 AND lower(name) = lower($2) AND deleted_at IS NULL',
      [organizationId, name]
    );
    return rows[0] ?? null;
  }

  async listActive(organizationId: string): Promise<RoleRecord[]> {
    return this.list(organizationId, { filters: { is_active: true } });
  }
}
