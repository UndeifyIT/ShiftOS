-- 074_extend_admin_role.sql (ensure_standard_roles as of 073, plus the Admin grants below)
-- Migration: give the Admin role what the design handoff's Admin console needs
--
-- The handoff's Admin console (ShiftOS Admin.dc.html) is the organization's
-- oversight seat: branch health, each branch's leadership and its read-only
-- Employees / Schedule / Tasks / Announcements / Attendance / Requests tabs,
-- the subscription, and organization settings. Admins also open new branches.
-- 048 gave Admin only branches.read, employees.read, organizations.read and
-- org.members.manage, so almost every one of those screens was refused.
--
-- Added: opening and editing branches (branches.create/update) and the
-- organization's details (organizations.update), plus READ access to the
-- day-to-day data the branch tabs show. Deliberately not added: anything that
-- changes schedules, employees, leave, attendance, tasks or announcements —
-- the handoff's "NOT INCLUDED" list; day-to-day operations stay with Managers
-- and Supervisors.
--
-- Also reinstates 049's trigger. It grants every Admin access to a branch the
-- moment it is created (Admin is branch-scoped, 048) — without it an Admin who
-- adds a branch could not see it. It was missing from at least one live
-- database, so this re-creates it idempotently and backfills any branch an
-- Admin was never granted.

CREATE OR REPLACE FUNCTION public.ensure_standard_roles(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_role_id uuid;
  v_employee_role_id uuid;
  v_admin_role_id uuid;
BEGIN
  SELECT id INTO v_supervisor_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Supervisor');
  IF v_supervisor_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Supervisor', true, true, false)
    RETURNING id INTO v_supervisor_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_supervisor_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    'branches.read',
    'departments.read',
    'employees.read', 'employees.create', 'employees.update', 'employees.archive',
    'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
    'assignments.create', 'assignments.update', 'assignments.delete',
    'swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve',
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge',
    'shiftnotes.read', 'shiftnotes.create',
    'reports.read',
    'attendance.clockin', 'attendance.read', 'attendance.correct', 'attendance.update',
    'leave.read', 'leave.create', 'leave.cancel', 'leave.approve',
    'notifications.read',
    'shifttemplates.read', 'shifttemplates.create'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  SELECT id INTO v_employee_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Employee');
  IF v_employee_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Employee', true, true, false)
    RETURNING id INTO v_employee_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_employee_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    'branches.read', 'departments.read',
    'employees.read', 'schedules.read', 'shifts.read',
    'announcements.read', 'announcements.acknowledge',
    'swaps.read', 'swaps.request', 'swaps.respond',
    'attendance.read',
    'leave.read', 'leave.create', 'leave.cancel',
    'notifications.read'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  SELECT id INTO v_admin_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Admin');
  IF v_admin_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Admin', true, true, false)
    RETURNING id INTO v_admin_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    -- 048
    'branches.read', 'employees.read', 'organizations.read', 'org.members.manage',
    -- 074: open and edit branches, edit the organization
    'branches.create', 'branches.update', 'organizations.update',
    -- 074: read-only oversight of each branch
    'departments.read', 'schedules.read', 'shifts.read', 'tasks.read',
    'announcements.read', 'attendance.read', 'leave.read', 'swaps.read',
    'reports.read', 'notifications.read'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;

-- 049, reinstated.
CREATE OR REPLACE FUNCTION public.trg_grant_new_branch_to_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_member_branch_access (organization_id, membership_id, branch_id, granted_by)
  SELECT NEW.organization_id, om.id, NEW.id, NULL
  FROM public.organization_memberships om
  JOIN public.roles r ON r.id = om.role_id AND r.organization_id = NEW.organization_id
  WHERE om.organization_id = NEW.organization_id
    AND om.is_active = true
    AND om.deleted_at IS NULL
    AND lower(r.name) = lower('Admin')
  ON CONFLICT (membership_id, branch_id) WHERE deleted_at IS NULL DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branches_grant_admins ON public.branches;
CREATE TRIGGER trg_branches_grant_admins
  AFTER INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.trg_grant_new_branch_to_admins();

-- Any branch an active Admin was never granted (e.g. created while the trigger was missing).
INSERT INTO public.organization_member_branch_access (organization_id, membership_id, branch_id, granted_by)
SELECT b.organization_id, om.id, b.id, NULL
FROM public.branches b
JOIN public.organization_memberships om ON om.organization_id = b.organization_id AND om.is_active = true AND om.deleted_at IS NULL
JOIN public.roles r ON r.id = om.role_id AND lower(r.name) = lower('Admin')
WHERE b.deleted_at IS NULL
ON CONFLICT (membership_id, branch_id) WHERE deleted_at IS NULL DO NOTHING;
