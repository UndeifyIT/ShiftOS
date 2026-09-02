export interface UserProfile {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  metadata: Record<string, unknown>;
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
  /** True when this account's own email domain is on the signup-blocking list — advisory UI only, never enforced post-signup. */
  emailFlaggedDisposable: boolean;
}

export type SessionStatus =
  | 'loading'
  | 'unauthenticated'
  | 'no-profile'
  | 'no-organization'
  | 'ready'
  | 'error';
