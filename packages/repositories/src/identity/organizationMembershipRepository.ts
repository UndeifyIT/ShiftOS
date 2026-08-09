import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface OrganizationMembership extends TenantEntity {
  user_id: string;
  role_id: string;
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OrganizationMembershipRepository extends TenantScopedRepository<OrganizationMembership> {
  constructor(client: DatabaseClient) {
    super(client, 'organization_memberships');
  }

  async findByUserAndOrganization(organizationId: string, userId: string): Promise<OrganizationMembership | null> {
    const matches = await this.list(organizationId, { filters: { user_id: userId } });
    return matches[0] ?? null;
  }

  /**
   * Cross-tenant by design: this answers "which organizations does this user
   * belong to at all", the first step of resolving which organization
   * context to operate in (before any single-organization scoping applies).
   * Still safe — filtered strictly by user_id, so it can only ever return
   * memberships that actually belong to the given user.
   */
  async listForUser(userId: string): Promise<OrganizationMembership[]> {
    return this.client.query<OrganizationMembership>(
      'SELECT * FROM organization_memberships WHERE user_id = $1 AND is_active = true AND deleted_at IS NULL',
      [userId]
    );
  }

  async listByRole(organizationId: string, roleId: string): Promise<OrganizationMembership[]> {
    return this.list(organizationId, { filters: { role_id: roleId } });
  }
}
