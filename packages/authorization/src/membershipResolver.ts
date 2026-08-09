import type { DatabaseClient } from '@shiftos/database';
import type { AuthUser } from '@shiftos/types';
import { AuthorizationError } from '@shiftos/errors';
import {
  UserRepository,
  OrganizationMembershipRepository,
  RoleRepository,
  RolePermissionRepository,
  BranchRepository,
  OrganizationMemberBranchAccessRepository
} from '@shiftos/repositories';
import type { AuthorizationContext } from './index.js';

export interface BranchAccess {
  /** true = every branch in the organization (roles.grants_org_wide_branch_access, PER-018 Rule 2). */
  isOrgWide: boolean;
  branchIds: string[];
}

export interface ResolvedAuthorizationContext extends AuthorizationContext {
  membershipId: string;
  roleId: string;
  roleName: string;
  branchAccess: BranchAccess;
}

/**
 * The database-backed half of the architectural flow this milestone builds:
 *
 *   Authenticated User (packages/auth: SupabaseAuthProvider)
 *     -> resolveAuthorizationContext (this function)
 *     -> RoleBasedAuthorizationService.canPerformAction/requirePermission (index.ts, unchanged)
 *     -> domain repository call, scoped by context.organizationId / branchAccess.branchIds
 *
 * `authUserId` is the Supabase Auth identity (AuthUser.auth_user_id from
 * packages/auth's SupabaseAuthProvider) — authentication only identifies the
 * user; this function is what actually resolves their membership, role, and
 * permissions for a specific organization, preserving the Milestone 2
 * decision that authentication does not populate roles/permissions directly.
 *
 * Throws AuthorizationError (never a raw NotFoundError) at every step: from
 * the caller's perspective "no profile", "not a member", and "role missing"
 * are all the same outcome — access to this organization is denied — and
 * collapsing them avoids leaking which specific condition failed.
 */
export async function resolveAuthorizationContext(
  client: DatabaseClient,
  authUserId: string,
  organizationId: string
): Promise<ResolvedAuthorizationContext> {
  const userRepo = new UserRepository(client);
  const membershipRepo = new OrganizationMembershipRepository(client);
  const roleRepo = new RoleRepository(client);
  const rolePermissionRepo = new RolePermissionRepository(client);
  const branchRepo = new BranchRepository(client);
  const branchAccessRepo = new OrganizationMemberBranchAccessRepository(client);

  const user = await userRepo.findByAuthUserId(authUserId);
  if (!user || !user.is_active) {
    throw new AuthorizationError('No active platform user profile exists for this authenticated identity');
  }

  const membership = await membershipRepo.findByUserAndOrganization(organizationId, user.id);
  if (!membership || !membership.is_active) {
    throw new AuthorizationError('User is not an active member of this organization');
  }

  const role = await roleRepo.getById(organizationId, membership.role_id);
  if (!role || !role.is_active) {
    throw new AuthorizationError('Membership role is missing or inactive');
  }

  const permissions = await rolePermissionRepo.findPermissionCodesForRole(organizationId, role.id);

  const branchIds = role.grants_org_wide_branch_access
    ? await branchRepo.listAllBranchIds(organizationId)
    : await branchAccessRepo.findAccessibleBranchIds(organizationId, membership.id);

  const authUser: AuthUser = {
    id: user.id,
    auth_user_id: user.auth_user_id,
    email: user.email,
    display_name: null,
    roles: [{ id: role.id, name: role.name, organization_id: organizationId }],
    permissions
  };

  return {
    user: authUser,
    organizationId,
    membershipId: membership.id,
    roleId: role.id,
    roleName: role.name,
    branchAccess: { isOrgWide: role.grants_org_wide_branch_access, branchIds }
  };
}

/**
 * Every organization the given auth identity is an active member of — the
 * step before resolveAuthorizationContext, for flows that need to know which
 * organizations a just-signed-in user can even choose between (e.g. an
 * org-picker) before a specific organization context is resolved.
 */
export async function listAccessibleOrganizationIds(client: DatabaseClient, authUserId: string): Promise<string[]> {
  const userRepo = new UserRepository(client);
  const membershipRepo = new OrganizationMembershipRepository(client);

  const user = await userRepo.findByAuthUserId(authUserId);
  if (!user) {
    return [];
  }

  const memberships = await membershipRepo.listForUser(user.id);
  return memberships.map((membership) => membership.organization_id);
}
