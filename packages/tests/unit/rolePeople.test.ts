import { describe, it, expect } from 'vitest';
import {
  adminsCount,
  adminsSubtitle,
  buildAdminRows,
  buildSupervisorRows,
  filterSupervisors,
  nameFromEmail,
  supervisorsCount,
  supervisorsSubtitle
} from '../../../apps/web/src/pages/people/rolePeopleModel.js';

const BASE = { organization_id: 'org', created_at: '2025-05-01T09:00:00Z', updated_at: '2025-05-01T09:00:00Z', deleted_at: null };
const NOW = new Date('2025-05-16T07:58:00Z');

const roles = [
  { ...BASE, id: 'role-manager', name: 'Manager', description: null, is_system: true, is_active: true, grants_org_wide_branch_access: true },
  { ...BASE, id: 'role-supervisor', name: 'Supervisor', description: null, is_system: true, is_active: true, grants_org_wide_branch_access: false },
  { ...BASE, id: 'role-employee', name: 'Employee', description: null, is_system: true, is_active: true, grants_org_wide_branch_access: false }
];

const member = (id: string, first: string, last: string, email: string, roleId: string) => ({
  ...BASE,
  id,
  user_id: `u-${id}`,
  role_id: roleId,
  joined_at: BASE.created_at,
  is_active: true,
  user_email: email,
  user_first_name: first,
  user_last_name: last,
  role_name: roleId === 'role-manager' ? 'Manager' : 'Supervisor'
});

const employee = (id: string, first: string, last: string, email: string | null, departmentId: string | null, reportsTo: string | null = null) => ({
  ...BASE,
  id,
  branch_id: 'br',
  employee_number: id.toUpperCase(),
  first_name: first,
  last_name: last,
  email,
  phone: null,
  date_of_birth: null,
  hire_date: '2024-01-15',
  employment_status: 'active' as const,
  notes: null,
  avatar_url: null,
  department_id: departmentId,
  is_active: true,
  reports_to_employee_id: reportsTo
});

const invitation = (id: string, email: string, roleId: string, expiresAt: string, status: 'pending' | 'accepted' | 'revoked' = 'pending') => ({
  ...BASE,
  id,
  email,
  first_name: null,
  last_name: null,
  role_id: roleId,
  role_name: roleId === 'role-manager' ? 'Manager' : 'Supervisor',
  status,
  invited_by: 'u-me',
  invited_by_first_name: 'Daniel',
  invited_by_last_name: 'Okonkwo',
  accepted_by: null,
  accepted_at: null,
  revoked_by: null,
  revoked_at: null,
  expires_at: expiresAt
});

const departments = [
  { ...BASE, id: 'dep-sales', branch_id: 'br', name: 'Sales Floor', description: null, is_active: true },
  { ...BASE, id: 'dep-bakery', branch_id: 'br', name: 'Bakery', description: null, is_active: true }
];

const sources = {
  members: [
    member('m1', 'Sarah', 'Johnson', 'sarah.johnson@abc.example', 'role-supervisor'),
    member('m2', 'Grace', 'Williams', 'grace.williams@abc.example', 'role-supervisor'),
    member('m0', 'Daniel', 'Okonkwo', 'daniel@abc.example', 'role-manager'),
    member('m3', 'John', 'Doe', 'john.doe@abc.example', 'role-employee'),
    member('m4', 'Ngozi', 'Umeh', 'ngozi.umeh@abc.example', 'role-manager')
  ],
  invitations: [
    invitation('i1', 'chinedu.e@abc.example', 'role-supervisor', '2025-05-19T09:00:00Z'),
    invitation('i2', 'fatima.b@abc.example', 'role-supervisor', '2025-05-09T09:00:00Z'),
    invitation('i3', 'ngozi@abc.example', 'role-manager', '2025-05-19T09:00:00Z'),
    invitation('i4', 'gone@abc.example', 'role-supervisor', '2025-05-19T09:00:00Z', 'revoked'),
    invitation('i5', 'staff@abc.example', 'role-employee', '2025-05-19T09:00:00Z')
  ],
  roles,
  employees: [
    employee('e1', 'Sarah', 'Johnson', 'sarah.johnson@abc.example', 'dep-sales'),
    employee('e2', 'John', 'Doe', 'john.doe@abc.example', 'dep-sales'),
    employee('e3', 'Amaka', 'Nwosu', 'amaka@abc.example', 'dep-sales'),
    employee('e4', 'Grace', 'Williams', 'grace.williams@abc.example', 'dep-bakery'),
    employee('e5', 'James', 'Carter', 'james@abc.example', 'dep-bakery', 'e4'),
    employee('e6', 'Halima', 'Musa', 'halima@abc.example', 'dep-bakery', 'e4')
  ],
  departments,
  permissionCounts: { 'role-supervisor': 5, 'role-employee': 0 },
  now: NOW
};

describe('Supervisors page (design handoff PAGES["Manager/Supervisors"] / SUPERVISORS)', () => {
  const rows = buildSupervisorRows(sources);

  it('lists branch-scoped logins, then the invitations still outstanding', () => {
    expect(rows.map((r) => [r.name, r.department, r.permissions, r.teamSize, r.status])).toEqual([
      ['Grace Williams', 'Bakery', '5 permissions', '2 staff', 'Active'],
      ['Sarah Johnson', 'Sales Floor', '5 permissions', '2 staff', 'Active'],
      ['Chinedu E', '—', 'Pending setup', '—', 'Invited'],
      ['Fatima B', '—', 'Invitation expired', '—', 'Expired']
    ]);
  });

  it('leaves out org-wide roles, revoked invitations and plain staff logins', () => {
    const emails = rows.map((r) => r.sub);
    // The manager and an org-wide invitation belong on the Admins page.
    expect(emails).not.toContain('daniel@abc.example');
    expect(emails).not.toContain('ngozi@abc.example');
    expect(emails).not.toContain('gone@abc.example');
    // A branch role with no capability at all is a staff login, not a supervisor.
    expect(emails).not.toContain('john.doe@abc.example');
    expect(emails).not.toContain('staff@abc.example');
  });

  it('keeps a role whose capabilities could not be read, rather than dropping its people', () => {
    const unknown = buildSupervisorRows({ ...sources, permissionCounts: {} });
    expect(unknown.map((r) => r.sub)).toContain('john.doe@abc.example');
  });

  it('counts a team by who reports to the supervisor, else their department', () => {
    // Grace has two people reporting to her; Sarah has none, so her department's other two count.
    expect(rows.find((r) => r.name === 'Grace Williams')?.teamSize).toBe('2 staff');
    expect(rows.find((r) => r.name === 'Sarah Johnson')?.teamSize).toBe('2 staff');
    const noEmployeeRecord = buildSupervisorRows({ ...sources, employees: [] });
    expect(noEmployeeRecord[0]).toMatchObject({ department: '—', teamSize: '—' });
  });

  it('falls back to the role name until the permission counts have loaded', () => {
    expect(buildSupervisorRows({ ...sources, permissionCounts: {} }).find((r) => r.name === 'Sarah Johnson')?.permissions).toBe('Supervisor');
  });

  it('writes the handoff subtitle and toolbar count', () => {
    expect(supervisorsSubtitle(rows)).toBe('2 supervisors · 2 invitations outstanding');
    expect(supervisorsCount(rows, 'All')).toBe('4 supervisors');
    expect(supervisorsCount(rows.slice(0, 1), 'Active')).toBe('1 supervisor · active');
  });

  it('filters by status and searches name, email, department and role', () => {
    expect(filterSupervisors(rows, 'Invited', '').map((r) => r.name)).toEqual(['Chinedu E']);
    expect(filterSupervisors(rows, 'Expired', '').map((r) => r.name)).toEqual(['Fatima B']);
    expect(filterSupervisors(rows, 'All', 'bakery').map((r) => r.name)).toEqual(['Grace Williams']);
    expect(filterSupervisors(rows, 'All', 'sarah.johnson@').map((r) => r.name)).toEqual(['Sarah Johnson']);
    expect(filterSupervisors(rows, 'Active', 'chinedu')).toEqual([]);
  });

  it('makes a readable name out of an invitation email', () => {
    expect(nameFromEmail('chinedu.e@abc.example')).toBe('Chinedu E');
    expect(nameFromEmail('fatima-bello@abc.example')).toBe('Fatima Bello');
  });
});

describe('Admins page (design handoff PAGES["Manager/Admins"] / ADMINS)', () => {
  const rows = buildAdminRows(sources);

  it('lists the organization-wide logins, then org-wide invitations', () => {
    expect(rows.map((r) => [r.name, r.department, r.permissions, r.teamSize, r.status])).toEqual([
      ['Daniel Okonkwo', 'Organization-wide', 'Manager', 'Accepted 1 May', 'Active'],
      ['Ngozi Umeh', 'Organization-wide', 'Manager', 'Accepted 1 May', 'Active'],
      ['Ngozi', 'Organization-wide', 'Manager', 'Sent 15 days ago', 'Invited']
    ]);
  });

  it('leaves every branch-scoped person to the Supervisors page', () => {
    const emails = rows.map((r) => r.sub);
    expect(emails).not.toContain('sarah.johnson@abc.example');
    expect(emails).not.toContain('chinedu.e@abc.example');
    expect(emails).not.toContain('john.doe@abc.example');
  });

  it('writes the handoff subtitle and count', () => {
    expect(adminsSubtitle(rows)).toBe('3 admins · organization-wide access');
    expect(adminsCount(rows, 'All')).toBe('3 admins');
    expect(adminsCount(rows.slice(0, 1), 'Invited')).toBe('1 admin · invited');
  });
});
