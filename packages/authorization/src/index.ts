import type { Permission, Role, AuthUser } from '@shiftos/types';
import { AuthorizationError } from '@shiftos/errors';

// Database-backed resolution of AuthorizationContext from a real authenticated
// identity (Milestone 3). See membershipResolver.ts for the full flow.
export * from './membershipResolver.js';

export interface AuthorizationContext {
  user: AuthUser;
  organizationId: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

export interface AuthorizationRule {
  permission: Permission;
  allowed: boolean;
  reason?: string;
}

export abstract class AuthorizationService {
  abstract canPerformAction(context: AuthorizationContext, permission: Permission): Promise<PolicyResult>;

  async requirePermission(context: AuthorizationContext, permission: Permission): Promise<void> {
    const result = await this.canPerformAction(context, permission);
    if (!result.allowed) {
      throw new AuthorizationError(result.reason ?? 'Permission denied');
    }
  }
}

export function buildUserOrganizationContext(user: AuthUser, organizationId: string): AuthorizationContext {
  return { user, organizationId };
}

export class RoleBasedAuthorizationService extends AuthorizationService {
  constructor(private rules: AuthorizationRule[], private rolePermissionMap: Record<string, Permission[]>) {
    super();
  }

  async canPerformAction(context: AuthorizationContext, permission: Permission): Promise<PolicyResult> {
    if (!context.user) {
      return { allowed: false, reason: 'User context is required' };
    }

    // Explicit rules take precedence over the role-derived permission set, so
    // callers can grant/deny a specific permission outside the normal role
    // mapping (e.g. a temporary override) without editing rolePermissionMap.
    const explicitRule = this.rules.find((rule) => rule.permission === permission);
    if (explicitRule) {
      return { allowed: explicitRule.allowed, reason: explicitRule.reason };
    }

    const userPermissions = new Set<Permission>(context.user.permissions ?? []);
    const userRoles = context.user.roles ?? [];
    for (const role of userRoles) {
      const rolePermissions = this.rolePermissionMap[role.name] ?? [];
      rolePermissions.forEach((perm) => userPermissions.add(perm));
    }

    return userPermissions.has(permission)
      ? { allowed: true }
      : { allowed: false, reason: 'User does not hold required permission' };
  }
}
