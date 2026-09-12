/**
 * Replaces src/auth/SessionProvider.tsx inside the schedule preview only
 * (see vite.preview.config.ts). Signs in a demo Manager (org-wide, every
 * permission — the Owner role) or Supervisor (branch-scoped, migration 050's
 * permission set), chosen by the preview URL's `?as=` parameter.
 */
import React, { createContext, useContext } from 'react';
import { PREVIEW_BRANCH_ID, PREVIEW_ORGANIZATION_ID, type PreviewRole } from './mockBackend.js';

const SUPERVISOR_PERMISSIONS = [
  'employees.read', 'employees.create', 'employees.update',
  'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
  'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
  'assignments.create', 'assignments.update', 'assignments.delete',
  'shift_templates.read', 'shift_templates.create', 'tasks.read', 'attendance.read', 'announcements.read', 'swaps.read'
];

const SessionContext = createContext<ReturnType<typeof buildSession> | null>(null);

function buildSession(role: PreviewRole) {
  const isManager = role === 'manager';
  const permissions = isManager ? ['*'] : SUPERVISOR_PERMISSIONS;
  const activeOrganization = { id: PREVIEW_ORGANIZATION_ID, name: 'ABC Supermarket Ltd.', slug: 'abc', metadata: { onboardingCompletedAt: '2025-01-01' } };
  return {
    status: 'ready' as const,
    authUser: null,
    profile: {
      id: 'user-me',
      auth_user_id: 'auth-me',
      first_name: isManager ? 'Daniel' : 'Sarah',
      last_name: isManager ? 'Okonkwo' : 'Johnson',
      email: 'preview@example.com',
      phone: null,
      job_title: isManager ? 'Manager' : 'Supervisor',
      avatar_url: null,
      is_active: true
    },
    organizations: [activeOrganization],
    myContext: {
      userId: 'user-me',
      organizationId: PREVIEW_ORGANIZATION_ID,
      membershipId: 'mem-me',
      roleId: isManager ? 'role-owner' : 'role-supervisor',
      roleName: isManager ? 'Owner' : 'Supervisor',
      permissions,
      branchAccess: { isOrgWide: isManager, branchIds: [PREVIEW_BRANCH_ID], singleBranchId: isManager ? null : PREVIEW_BRANCH_ID },
      accessibleOrganizationIds: [PREVIEW_ORGANIZATION_ID],
      emailFlaggedDisposable: false
    },
    errorMessage: null,
    activeOrganization,
    hasPermission: (code: string) => isManager || SUPERVISOR_PERMISSIONS.includes(code),
    signIn: async () => ({ error: null }),
    signOut: async () => undefined,
    completeProfile: async () => ({ error: null }),
    switchOrganization: async () => undefined,
    refresh: async () => undefined
  };
}

export function SessionProvider({ children, role = 'manager' }: { children: React.ReactNode; role?: PreviewRole }): React.ReactElement {
  return <SessionContext.Provider value={buildSession(role)}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside the preview SessionProvider');
  return value;
}
