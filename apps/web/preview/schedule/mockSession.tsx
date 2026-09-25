/**
 * Replaces src/auth/SessionProvider.tsx inside the schedule preview only
 * (see vite.preview.config.ts). Signs in a demo Manager (org-wide, every
 * permission — the Owner role) or Supervisor (branch-scoped, migration 050's
 * permission set plus the handoff's task and announcement capabilities), or Staff (John Doe, migration 050's Employee set), chosen by the preview URL's `?as=` parameter.
 */
import React, { createContext, useContext } from 'react';
import { PREVIEW_BRANCH_ID, PREVIEW_ORGANIZATION_ID, type PreviewRole } from './mockBackend.js';

// Migration 060's Supervisor set, plus the two capabilities the handoff's Supervisor has on
// (STNG_PERMISSIONS.Supervisor: Assign tasks, Post announcements) — a manager grants them from "Manage permissions".
const SUPERVISOR_PERMISSIONS = [
  'branches.read', 'departments.read',
  'employees.read', 'employees.create', 'employees.update', 'employees.archive',
  'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
  'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
  'assignments.create', 'assignments.update', 'assignments.delete',
  'swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve',
  'tasks.read', 'tasks.complete', 'tasks.create', 'tasks.assign', 'tasks.update',
  'announcements.read', 'announcements.acknowledge', 'announcements.create', 'announcements.publish', 'announcements.update',
  'shiftnotes.read', 'shiftnotes.create',
  'reports.read',
  'attendance.clockin', 'attendance.read', 'attendance.correct', 'attendance.update',
  'leave.read', 'leave.create', 'leave.cancel', 'leave.approve',
  'notifications.read',
  'shifttemplates.read', 'shifttemplates.create', 'shift_templates.read', 'shift_templates.create'
];

// Migration 050's Employee set plus 072's branch and department reads — what a Staff login really holds.
const STAFF_PERMISSIONS = [
  'branches.read', 'departments.read',
  'employees.read', 'schedules.read', 'shifts.read',
  'announcements.read', 'announcements.acknowledge',
  'swaps.read', 'swaps.request', 'swaps.respond',
  'attendance.clockin', 'attendance.read',
  'leave.read', 'leave.create', 'leave.cancel',
  'notifications.read'
];

const SessionContext = createContext<ReturnType<typeof buildSession> | null>(null);

function buildSession(role: PreviewRole) {
  const isManager = role === 'manager';
  const isStaff = role === 'staff';
  const permissions = isManager ? ['*'] : isStaff ? STAFF_PERMISSIONS : SUPERVISOR_PERMISSIONS;
  const person = isManager
    ? { first: 'Daniel', last: 'Okonkwo', email: 'preview@example.com', title: 'Manager', roleId: 'role-owner', roleName: 'Owner' }
    : isStaff
      ? { first: 'John', last: 'Doe', email: 'john.doe@abc.example', title: 'Sales Associate', roleId: 'role-employee', roleName: 'Employee' }
      : { first: 'Sarah', last: 'Johnson', email: 'sarah.johnson@abc.example', title: 'Supervisor', roleId: 'role-supervisor', roleName: 'Supervisor' };
  const activeOrganization = { id: PREVIEW_ORGANIZATION_ID, name: 'ABC Supermarket Ltd.', slug: 'abc', metadata: { onboardingCompletedAt: '2025-01-01' } };
  return {
    status: 'ready' as const,
    authUser: null,
    profile: {
      id: 'user-me',
      auth_user_id: 'auth-me',
      first_name: person.first,
      last_name: person.last,
      email: person.email,
      phone: isStaff ? '+234 803 111 2244' : null,
      job_title: person.title,
      avatar_url: null,
      is_active: true
    },
    organizations: [activeOrganization],
    myContext: {
      userId: 'user-me',
      organizationId: PREVIEW_ORGANIZATION_ID,
      membershipId: 'mem-me',
      roleId: person.roleId,
      roleName: person.roleName,
      permissions,
      branchAccess: { isOrgWide: isManager, branchIds: [PREVIEW_BRANCH_ID], singleBranchId: isManager ? null : PREVIEW_BRANCH_ID },
      accessibleOrganizationIds: [PREVIEW_ORGANIZATION_ID],
      emailFlaggedDisposable: false
    },
    errorMessage: null,
    activeOrganization,
    hasPermission: (code: string) => isManager || permissions.includes(code),
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
