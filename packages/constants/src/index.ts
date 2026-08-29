export const DEFAULT_LOG_LEVEL = 'info' as const;
export const SUPABASE_AUTH_COOKIE = 'sb-auth-token';

// Mirrors the 28 tables created by supabase/migrations (001-024). Keep in sync
// when a migration adds/renames a table — this is the single place repository
// code should get a table name from, instead of hardcoding string literals.
export const DATABASE_TABLES = {
  organizations: 'organizations',
  branches: 'branches',
  users: 'users',
  organizationMemberships: 'organization_memberships',
  organizationMemberBranchAccess: 'organization_member_branch_access',
  roles: 'roles',
  permissions: 'permissions',
  rolePermissions: 'role_permissions',
  employees: 'employees',
  employeeHistory: 'employee_history',
  shiftTemplates: 'shift_templates',
  schedules: 'schedules',
  scheduleVersions: 'schedule_versions',
  shifts: 'shifts',
  shiftAssignments: 'shift_assignments',
  attendanceRecords: 'attendance_records',
  attendanceCorrections: 'attendance_corrections',
  leaveRequests: 'leave_requests',
  tasks: 'tasks',
  taskAssignments: 'task_assignments',
  taskHistory: 'task_history',
  announcements: 'announcements',
  announcementAcknowledgements: 'announcement_acknowledgements',
  notifications: 'notifications',
  notificationPreferences: 'notification_preferences',
  notificationDeliveryAttempts: 'notification_delivery_attempts',
  auditLogs: 'audit_logs',
  securityEvents: 'security_events'
} as const;

/**
 * Every real in-app route the AI assistant's `navigate` tool is allowed to
 * send a user to (packages/api/src/operations/assistant.ts's
 * isAllowedRoute()) — kept in sync by hand with
 * apps/web/src/layout/Sidebar.tsx's NAV_ITEMS[].to, since a frontend .tsx
 * file can't be imported from this backend-and-frontend-shared package.
 * Adding a new page to Sidebar.tsx's NAV_ITEMS should add its path here
 * too if the assistant should be able to navigate to it.
 */
export const APP_ROUTES = [
  '/',
  '/schedules',
  '/employees',
  '/tasks',
  '/attendance',
  '/announcements',
  '/requests',
  '/branches',
  '/members',
  '/invitations',
  '/organization',
  '/admin',
  '/profile',
  '/security'
] as const;
