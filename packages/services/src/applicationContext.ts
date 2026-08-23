import type { DatabaseClient } from '@shiftos/database';
import { AuthorizationError } from '@shiftos/errors';
import type { AuthenticationProvider } from '@shiftos/auth';
import { AuditLogRepository, SecurityEventRepository } from '@shiftos/repositories';
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
  /**
   * Admin-capable auth operations (currently: inviting a member). Undefined
   * when the server process has no service-role key configured — services
   * using it MUST fail closed (throw AuthorizationError) rather than treat
   * absence as "nothing to do". Never exposed to the frontend; this is a
   * server-process-only capability threaded in from packages/backend.
   */
  readonly authProvider?: AuthenticationProvider;

  hasPermission(permission: string): Promise<boolean>;
  requirePermission(permission: string): Promise<void>;
  hasBranchAccess(branchId: string): boolean;
  requireBranchAccess(branchId: string): void;

  /**
   * Records a row to the append-only audit_logs table (015/024). Centralized
   * here (rather than each service importing AuditLogRepository itself) so
   * every caller gets the same organization_id/user_id/timestamp handling
   * for free. A logging failure never masks the caller's real result — see
   * ApplicationContextImpl.audit()'s try/catch.
   */
  audit(action: string, entityType: string, entityId: string | null, oldValues?: Record<string, unknown> | null, newValues?: Record<string, unknown> | null): Promise<void>;

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
  private readonly auditLog: AuditLogRepository;
  private readonly securityEvents: SecurityEventRepository;

  constructor(
    readonly client: DatabaseClient,
    readonly authUserId: string,
    private readonly resolved: ResolvedAuthorizationContext,
    readonly accessibleOrganizationIds: string[],
    readonly authProvider?: AuthenticationProvider
  ) {
    this.permissions = new Set(resolved.user.permissions ?? []);
    this.auditLog = new AuditLogRepository(client);
    this.securityEvents = new SecurityEventRepository(client);
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
    try {
      await this.authorizationService.requirePermission(this.resolved, permission);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        await this.recordSecurityEvent('permission_denied', { permission });
      }
      throw error;
    }
  }

  hasBranchAccess(branchId: string): boolean {
    return this.branchAccess.branchIds.includes(branchId);
  }

  requireBranchAccess(branchId: string): void {
    if (!this.hasBranchAccess(branchId)) {
      void this.recordSecurityEvent('branch_access_denied', { branchId });
      throw new AuthorizationError('You do not have access to this branch');
    }
  }

  async audit(
    action: string,
    entityType: string,
    entityId: string | null,
    oldValues: Record<string, unknown> | null = null,
    newValues: Record<string, unknown> | null = null
  ): Promise<void> {
    try {
      await this.auditLog.record({
        organization_id: this.organizationId,
        user_id: this.userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: null,
        user_agent: null
      });
    } catch {
      // A logging failure must never mask the caller's real result — the
      // action this audits already happened (or is about to, for a
      // pre-write call); losing one audit row is recoverable, silently
      // failing the actual domain operation because logging broke is not.
    }
  }

  /**
   * requirePermission/requireBranchAccess call this on every denial — a
   * single wiring point that covers every service using ApplicationContext,
   * present and future, rather than each service remembering to log its own
   * denials. Fire-and-forget by design for the same reason audit() swallows
   * its own errors: a broken security_events write must never turn into a
   * misleading "you're allowed" or an unrelated 500 for the caller.
   */
  private async recordSecurityEvent(eventType: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.securityEvents.record({
        organization_id: this.organizationId,
        user_id: this.userId,
        event_type: eventType,
        details,
        ip_address: null,
        user_agent: null
      });
    } catch {
      // Same reasoning as audit(): never let logging failure change the
      // outcome of the authorization check that triggered it.
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
  organizationId: string,
  authProvider?: AuthenticationProvider
): Promise<ApplicationContext> {
  const resolved = await resolveAuthorizationContext(client, authUserId, organizationId);
  const accessibleOrganizationIds = await listAccessibleOrganizationIds(client, authUserId);
  return new ApplicationContextImpl(client, authUserId, resolved, accessibleOrganizationIds, authProvider);
}
