-- 072_grant_employee_branch_reads.sql
-- Migration: Staff can read their own branch and its departments
-- Purpose: The design handoff's Staff screens (ShiftOS Dashboards.dc.html,
--   role Staff) name the person's branch — the sidebar's Branch card, "My
--   profile · Sales Associate · Main Branch" — and give shift times "in your
--   branch time zone (Africa/Lagos)", and label every shift with its
--   department ("Morning Shift · Sales Floor"). The standard Employee role
--   could read neither: list_branches needs branches.read, list_departments
--   needs departments.read.
--
-- Scope: both only read what the role already has access to —
--   BranchService.listAccessibleBranches keeps the caller's own branches and
--   DepartmentService.listDepartments resolves the caller's branch scope — so a
--   Staff login sees its own branch and that branch's department names, nothing
--   more. Supervisor already holds both.
--
-- Safety: additive only. Grants the two permissions to the system Employee role in
--   every organization, and to Employee roles created from now on.

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Employee')
  AND p.code IN ('branches.read', 'departments.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() (last defined in 060) so future
-- organizations' Employee role picks up both at creation time too.
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
    'attendance.clockin', 'attendance.read',
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
  WHERE p.is_active = true AND p.code IN ('branches.read', 'employees.read', 'organizations.read', 'org.members.manage')
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
