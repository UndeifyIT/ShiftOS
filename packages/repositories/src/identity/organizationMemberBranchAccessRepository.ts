import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface OrganizationMemberBranchAccess extends TenantEntity {
  membership_id: string;
  branch_id: string;
  granted_by: string | null;
  granted_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OrganizationMemberBranchAccessRepository extends TenantScopedRepository<OrganizationMemberBranchAccess> {
  constructor(client: DatabaseClient) {
    super(client, 'organization_member_branch_access');
  }

  /** The explicit branch grant list for a branch-scoped (non-org-wide) membership. */
  async findAccessibleBranchIds(organizationId: string, membershipId: string): Promise<string[]> {
    const grants = await this.list(organizationId, { filters: { membership_id: membershipId } });
    return grants.map((grant) => grant.branch_id);
  }

  async grant(organizationId: string, membershipId: string, branchId: string, grantedBy: string | null): Promise<OrganizationMemberBranchAccess> {
    return this.insert(organizationId, { membership_id: membershipId, branch_id: branchId, granted_by: grantedBy });
  }

  async revoke(organizationId: string, id: string): Promise<OrganizationMemberBranchAccess> {
    return this.archive(organizationId, id);
  }
}
