-- 073_revoke_employee_self_clock_in.sql
-- Migration: Staff no longer clock themselves in or out
-- Purpose: Attendance for Staff is marked by their supervisor (the
--   Attendance screen's mark_attendance / "Mark all present"), as in the
--   design handoff, where the Staff screens have no clock-in. The standard
--   Employee role held attendance.clockin, which let clock_in / clock_out
--   record a Staff member's own attendance. It is taken away here.
--
-- Reading your own attendance (list_my_attendance) now needs attendance.read,
--   which the Employee role already holds, so Staff still see their hours.
--   Supervisor keeps attendance.clockin. A custom role an organization gave
--   attendance.clockin keeps it: only the system Employee role changes.
--
-- Safety: removes one grant from the system Employee role in every
--   organization; ensure_standard_roles() no longer grants it to new ones.

DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.is_system = true
  AND lower(r.name) = lower('Employee')
  AND p.code = 'attendance.clockin';

-- ensure_standard_roles() as of 072, without attendance.clockin for Employee.
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
