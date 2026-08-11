import { OrganizationMembershipRepository, RoleRepository, type MembershipWithDetails, type RoleRecord } from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';

/**
 * Read-only member/role administration (WEB-009). Deliberately narrow: it
 * exposes exactly what the existing repository layer already supports
 * (list memberships, list roles), gated by the `org.members.manage`
 * permission seeded in migration 023. It does NOT create/remove members or
 * change a member's role — those require a decision on the invitation flow
 * (WEB-010's documented gap) that is out of scope here; adding them later is
 * a straightforward extension of this same class, not a redesign.
 */
export class MembershipService {
  private readonly memberships: OrganizationMembershipRepository;
  private readonly roles: RoleRepository;

  constructor(private readonly context: ApplicationContext) {
    this.memberships = new OrganizationMembershipRepository(context.client);
    this.roles = new RoleRepository(context.client);
  }

  async listMembers(): Promise<MembershipWithDetails[]> {
    await this.context.requirePermission('org.members.manage');
    return this.memberships.listWithUserAndRole(this.context.organizationId);
  }

  async listRoles(): Promise<RoleRecord[]> {
    await this.context.requirePermission('org.members.manage');
    return this.roles.listActive(this.context.organizationId);
  }
}
