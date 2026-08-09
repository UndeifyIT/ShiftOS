import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface Branch extends TenantEntity {
  name: string;
  address: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class BranchRepository extends TenantScopedRepository<Branch> {
  constructor(client: DatabaseClient) {
    super(client, 'branches');
  }

  /** All active branches for an organization — the set an org-wide role (roles.grants_org_wide_branch_access) resolves to. */
  async listAllBranchIds(organizationId: string): Promise<string[]> {
    const branches = await this.list(organizationId);
    return branches.map((branch) => branch.id);
  }

  async findByName(organizationId: string, name: string): Promise<Branch | null> {
    const matches = await this.list(organizationId, { filters: { name } });
    return matches[0] ?? null;
  }
}
