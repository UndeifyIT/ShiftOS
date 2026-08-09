export interface UserProfile {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

export interface BranchAccess {
  isOrgWide: boolean;
  branchIds: string[];
}

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

export type SessionStatus = 'loading' | 'unauthenticated' | 'no-profile' | 'no-organization' | 'ready' | 'error';
