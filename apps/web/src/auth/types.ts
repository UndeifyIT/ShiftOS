export interface UserProfile {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BranchAccess {
  isOrgWide: boolean;
  branchIds: string[];
}

/** Mirrors packages/api/src/operations/context.ts's getMyContext output. */
export interface MyContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  branchAccess: BranchAccess;
  accessibleOrganizationIds: string[];
}

export type SessionStatus =
  | 'loading'
  | 'unauthenticated'
  | 'no-profile'
  | 'no-organization'
  | 'ready'
  | 'error';
