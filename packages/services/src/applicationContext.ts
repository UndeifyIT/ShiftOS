import type { DatabaseClient } from '@shiftos/database';
import { AuthorizationError } from '@shiftos/errors';
import {
  resolveAuthorizationContext,
  listAccessibleOrganizationIds,
  RoleBasedAuthorizationService,
  type ResolvedAuthorizationContext
} from '@shiftos/authorization';

/**
 * The single, centralized place request context gets resolved for every
 * service call — see docs/backend/API-011 §4/API-012. Every service method
 * receives an ApplicationContext instead of re-deriving org/branch/permission
 * state itself, so authorization logic is written once, not per service.
 *
 * `hasPermission`/`requirePermission` delegate to the unmodified Milestone 1
 * RoleBasedAuthorizationService rather than re-checking `permissions` ad hoc —
 * this is the same authorization engine every other layer uses.
 */
export interface ApplicationContext {
  readonly client: DatabaseClient;
  readonly authUserId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly permissions: ReadonlySet<string>;
  readonly branchAccess: { isOrgWide: boolean; branchIds: string[] };
  /** Every organization this auth identity belongs to, not just the current one — for org-switcher style flows. */
  readonly accessibleOrganizationIds: string[];

  hasPermission(permission: string): Promise<boolean>;
  requirePermission(permission: string): Promise<void>;
  hasBranchAccess(branchId: string): boolean;
  requireBranchAccess(branchId: string): void;

  /**
   * Turns a client-supplied, untrusted branch id (or none) into a verified
   * scope for a repository call. A supplied id is checked against
   * branchAccess.branchIds and rejected if not accessible; omitting it
   * returns the full accessible set (all branches for an org-wide role,
   * explicit grants otherwise). Services should use this rather than passing
   * a client-supplied branchId straight to a repository.
   */
  resolveBranchScope(requestedBranchId?: string): string[];
}

class ApplicationContextImpl implements ApplicationContext {
  readonly permissions: ReadonlySet<string>;
  private readonly authorizationService = new RoleBasedAuthorizationService([], {});

  constructor(
    readonly client: DatabaseClient,
    readonly authUserId: string,
    private readonly resolved: ResolvedAuthorizationContext,
    readonly accessibleOrganizationIds: string[]
  ) {
    this.permissions = new Set(resolved.user.permissions ?? []);
  }

  get userId(): string { return this.resolved.user.id; }
  get organizationId(): string { return this.resolved.organizationId; }
  get membershipId(): string { return this.resolved.membershipId; }
  get roleId(): string { return this.resolved.roleId; }
  get roleName(): string { return this.resolved.roleName; }
  get branchAccess(): { isOrgWide: boolean; branchIds: string[] } { return this.resolved.branchAccess; }

  async hasPermission(permission: string): Promise<boolean> {
    const result = await this.authorizationService.canPerformAction(this.resolved, permission);
    return result.allowed;
  }

  async requirePermission(permission: string): Promise<void> {
    await this.authorizationService.requirePermission(this.resolved, permission);
  }

  hasBranchAccess(branchId: string): boolean {
    return this.branchAccess.branchIds.includes(branchId);
  }

  requireBranchAccess(branchId: string): void {
    if (!this.hasBranchAccess(branchId)) {
      throw new AuthorizationError('You do not have access to this branch');
    }
  }

  resolveBranchScope(requestedBranchId?: string): string[] {
    if (requestedBranchId) {
      this.requireBranchAccess(requestedBranchId);
      return [requestedBranchId];
    }
    return this.branchAccess.branchIds;
  }
}

/**
 * The entry point every RPC handler calls first. `organizationId` may come
 * from an untrusted client, but that's safe: resolveAuthorizationContext
 * verifies the authenticated user actually holds an active membership in
 * that organization before anything else can happen, and throws
 * AuthorizationError otherwise (never a raw NotFoundError that would hint at
 * which condition failed).
 */
export async function createApplicationContext(
  client: DatabaseClient,
  authUserId: string,
  organizationId: string
): Promise<ApplicationContext> {
  const resolved = await resolveAuthorizationContext(client, authUserId, organizationId);
  const accessibleOrganizationIds = await listAccessibleOrganizationIds(client, authUserId);
  return new ApplicationContextImpl(client, authUserId, resolved, accessibleOrganizationIds);
}
