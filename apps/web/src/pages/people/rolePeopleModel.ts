/**
 * The Manager's Supervisors and Admins pages (`ShiftOS Dashboards.dc.html`,
 * `PAGES["Manager/Supervisors"]` + `SUPERVISORS` and `PAGES["Manager/Admins"]`
 * + `ADMINS`), both rendered by the generic table at markup lines 378-407:
 * one row per person with a login of that kind, then the invitations that
 * haven't been accepted yet. Supervisors hold a branch-scoped role, admins an
 * org-wide one. Pure, so the counts and labels are unit-testable.
 */
import { emailKey } from '../../lib/members.js';
import type { Department, Employee, Invitation, Member, Role } from '../../types/domain.js';
import { agoText, daysAgo } from '../dashboard/manager/overviewModel.js';
import type { Tone } from '../scheduling/grid/scheduleFormat.js';

export type SupervisorFilter = 'All' | 'Active' | 'Invited' | 'Expired';
export const SUPERVISOR_FILTERS: SupervisorFilter[] = ['All', 'Active', 'Invited', 'Expired'];

export type SupervisorStatus = 'Active' | 'Invited' | 'Expired';

/**
 * Organization-level access: the org-wide bootstrap role (Owner), plus the
 * standard "Admin" role. Admin is deliberately branch-scoped (migration 048)
 * so it can be invited through the ordinary invite pipeline — inviteMember
 * never grants an org-wide role — and migration 049's trigger grants every
 * new branch to its holders, so it sees the whole organization anyway. Naming
 * is the same signal 049 itself keys off.
 */
export function isAdminRole(role: Role | undefined): boolean {
  return Boolean(role && (role.grants_org_wide_branch_access || role.name.trim().toLowerCase() === 'admin'));
}

/**
 * The roles an admin can actually be invited into — admin-level, but not
 * org-wide: the server refuses to grant an org-wide role by invitation, so
 * that issuing an invite can never hand over full organization access.
 */
export function invitableAdminRoles(roles: Role[]): Role[] {
  return roles.filter((role) => role.is_active && !role.deleted_at && isAdminRole(role) && !role.grants_org_wide_branch_access);
}

export interface SupervisorRow {
  id: string;
  name: string;
  /** The line under the name — their email. */
  sub: string;
  department: string;
  /** The Permissions column: "6 permissions", or why there are none yet. */
  permissions: string;
  teamSize: string;
  status: SupervisorStatus;
  tone: Tone;
  /** Set for a row that is still an invitation, so the page can resend or revoke it. */
  invitationId?: string;
  roleId: string;
  roleName: string;
  email: string;
}

const STATUS_TONE: Record<SupervisorStatus, Tone> = { Active: 'ok', Invited: 'warn', Expired: 'bad' };

export const UNASSIGNED = '—';

/**
 * A supervisor role is branch-scoped (org-wide roles are the Admins page) and
 * actually runs something: at least one of the role capabilities. That keeps a
 * plain staff-login role — a branch role with no management capability — off
 * this page. A role whose capabilities couldn't be read counts as a supervisor
 * rather than disappearing.
 */
export function isSupervisorRole(role: Role | undefined, permissionCounts: Record<string, number> = {}): boolean {
  if (!role || isAdminRole(role)) return false;
  const granted = permissionCounts[role.id];
  return granted === undefined || granted > 0;
}

export function supervisorRoles(roles: Role[], permissionCounts: Record<string, number>): Role[] {
  return roles.filter((role) => role.is_active && !role.deleted_at && isSupervisorRole(role, permissionCounts));
}

/** "chinedu.e@abc.com" → "Chinedu E" — invitations haven't collected names since migration 055. */
export function nameFromEmail(email: string): string {
  return (
    email
      .split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || email
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '14 May' — when an admin accepted. */
export function dayMonthText(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '—' : `${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Only pending invitations are still outstanding; one past its expiry reads as Expired (the status column itself has no "expired" value). */
function invitationStatus(invitation: Invitation, now: Date): SupervisorStatus | null {
  if (invitation.status !== 'pending') return null;
  return new Date(invitation.expires_at).getTime() < now.getTime() ? 'Expired' : 'Invited';
}

export interface SupervisorSources {
  members: Member[];
  invitations: Invitation[];
  roles: Role[];
  employees: Employee[];
  departments: Department[];
  /** roleId → how many of the role's capabilities are granted, once loaded. */
  permissionCounts: Record<string, number>;
  now: Date;
}

/**
 * Active supervisors first (by name), then the invitations still outstanding.
 * Department and team size come from the supervisor's own employee record —
 * an invitation has neither yet, so both read "—".
 */
export function buildSupervisorRows({ members, invitations, roles, employees, departments, permissionCounts, now }: SupervisorSources): SupervisorRow[] {
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const departmentName = new Map(departments.map((department) => [department.id, department.name]));
  const staff = employees.filter((employee) => !employee.deleted_at && employee.employment_status !== 'terminated');
  const employeeByEmail = new Map(staff.map((employee) => [emailKey(employee.email), employee] as const).filter((entry): entry is readonly [string, Employee] => entry[0] !== null));

  const active: SupervisorRow[] = members
    .filter((member) => member.is_active && !member.deleted_at && isSupervisorRole(roleById.get(member.role_id), permissionCounts))
    .map((member) => {
      const employee = employeeByEmail.get(emailKey(member.user_email) ?? '');
      const reports = employee ? staff.filter((person) => person.id !== employee.id && person.reports_to_employee_id === employee.id).length : 0;
      const sameDepartment = employee?.department_id
        ? staff.filter((person) => person.id !== employee.id && person.department_id === employee.department_id).length
        : 0;
      const team = reports || sameDepartment;
      const count = permissionCounts[member.role_id];
      return {
        id: member.id,
        name: `${member.user_first_name} ${member.user_last_name}`.trim() || nameFromEmail(member.user_email),
        sub: member.user_email,
        department: (employee?.department_id && departmentName.get(employee.department_id)) || UNASSIGNED,
        permissions: count === undefined ? member.role_name : plural(count, 'permission'),
        teamSize: employee ? `${team} staff` : UNASSIGNED,
        status: 'Active' as const,
        tone: STATUS_TONE.Active,
        roleId: member.role_id,
        roleName: member.role_name,
        email: member.user_email
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const outstanding: SupervisorRow[] = invitations
    .filter((invitation) => isSupervisorRole(roleById.get(invitation.role_id), permissionCounts))
    .map((invitation) => ({ invitation, status: invitationStatus(invitation, now) }))
    .filter((entry): entry is { invitation: Invitation; status: SupervisorStatus } => entry.status !== null)
    .map(({ invitation, status }) => ({
      id: invitation.id,
      name: `${invitation.first_name ?? ''} ${invitation.last_name ?? ''}`.trim() || nameFromEmail(invitation.email),
      sub: invitation.email,
      department: UNASSIGNED,
      permissions: status === 'Expired' ? 'Invitation expired' : 'Pending setup',
      teamSize: UNASSIGNED,
      status,
      tone: STATUS_TONE[status],
      invitationId: invitation.id,
      roleId: invitation.role_id,
      roleName: invitation.role_name,
      email: invitation.email
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...active, ...outstanding];
}

/**
 * The Admins page rows (`ADMINS`): everyone whose role is org-wide, then any
 * org-wide invitation. Scope is what the role grants, Access is the role
 * itself, and Invited says when they accepted or when the invite went out.
 */
export function buildAdminRows({ members, invitations, roles, now }: Pick<SupervisorSources, 'members' | 'invitations' | 'roles' | 'now'>): SupervisorRow[] {
  const roleById = new Map(roles.map((role) => [role.id, role]));

  const active: SupervisorRow[] = members
    .filter((member) => member.is_active && !member.deleted_at && isAdminRole(roleById.get(member.role_id)))
    .map((member) => ({
      id: member.id,
      name: `${member.user_first_name} ${member.user_last_name}`.trim() || nameFromEmail(member.user_email),
      sub: member.user_email,
      department: 'Organization-wide',
      permissions: member.role_name,
      teamSize: `Accepted ${dayMonthText(member.joined_at)}`,
      status: 'Active' as const,
      tone: STATUS_TONE.Active,
      roleId: member.role_id,
      roleName: member.role_name,
      email: member.user_email
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const outstanding: SupervisorRow[] = invitations
    .filter((invitation) => isAdminRole(roleById.get(invitation.role_id)))
    .map((invitation) => ({ invitation, status: invitationStatus(invitation, now) }))
    .filter((entry): entry is { invitation: Invitation; status: SupervisorStatus } => entry.status !== null)
    .map(({ invitation, status }) => ({
      id: invitation.id,
      name: `${invitation.first_name ?? ''} ${invitation.last_name ?? ''}`.trim() || nameFromEmail(invitation.email),
      sub: invitation.email,
      department: 'Organization-wide',
      permissions: invitation.role_name,
      teamSize: `Sent ${agoText(daysAgo(invitation.created_at, now))}`,
      status,
      tone: STATUS_TONE[status],
      invitationId: invitation.id,
      roleId: invitation.role_id,
      roleName: invitation.role_name,
      email: invitation.email
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...active, ...outstanding];
}

/** "2 admins · organization-wide access" */
export function adminsSubtitle(rows: SupervisorRow[]): string {
  return `${plural(rows.length, 'admin')} · organization-wide access`;
}

export function adminsCount(shown: SupervisorRow[], filter: SupervisorFilter): string {
  return filter === 'All' ? plural(shown.length, 'admin') : `${plural(shown.length, 'admin')} · ${filter.toLowerCase()}`;
}

export function filterSupervisors(rows: SupervisorRow[], filter: SupervisorFilter, query: string): SupervisorRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (filter === 'All' || row.status === filter) &&
      (!needle || [row.name, row.email, row.department, row.roleName].some((value) => value.toLowerCase().includes(needle)))
  );
}

/** "3 supervisors · 2 invitations outstanding" */
export function supervisorsSubtitle(rows: SupervisorRow[]): string {
  const active = rows.filter((row) => row.status === 'Active').length;
  const pending = rows.length - active;
  return `${plural(active, 'supervisor')} · ${plural(pending, 'invitation')} outstanding`;
}

/** The toolbar's right-hand count — "5 supervisors" for everything, or what the filter left. */
export function supervisorsCount(shown: SupervisorRow[], filter: SupervisorFilter): string {
  return filter === 'All' ? plural(shown.length, 'supervisor') : `${plural(shown.length, 'supervisor')} · ${filter.toLowerCase()}`;
}
