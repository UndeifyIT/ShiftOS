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

/** `listWithUserAndRole()`'s row shape — the membership plus the user/role fields WEB-009 needs to render a name and a role label. */
export interface MembershipWithDetails extends OrganizationMembership {
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  role_name: string;
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
   * One joined query instead of one membership-list query plus a per-row
   * user/role lookup — the same N+1-avoidance requirement API-012 §... (see
   * ShiftAssignmentRepository.listForShifts) applies here: a member
   * administration screen should never fan out a query per row.
   */
  async listWithUserAndRole(organizationId: string): Promise<MembershipWithDetails[]> {
    return this.client.query<MembershipWithDetails>(
      `SELECT om.*, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name, r.name AS role_name
         FROM organization_memberships om
         JOIN users u ON u.id = om.user_id
         JOIN roles r ON r.id = om.role_id
        WHERE om.organization_id = $1 AND om.deleted_at IS NULL
        ORDER BY u.first_name ASC, u.last_name ASC`,
      [organizationId]
    );
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
