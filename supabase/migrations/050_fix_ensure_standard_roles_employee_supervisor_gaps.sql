-- 050_fix_ensure_standard_roles_employee_supervisor_gaps.sql
-- Migration: fix a regression in ensure_standard_roles() that would have
-- shipped a broken Employee/Supervisor role set to any BRAND-NEW
-- organization created from now on -- found during a full-system audit
-- (048_add_admin_role.sql's own Employee/Supervisor blocks were copied
-- verbatim from 043's function body, trusting it was the complete,
-- cumulative state; it wasn't).
--
-- Root cause, traced precisely: 037_seed_attendance_permissions.sql,
-- 039_seed_leave_permissions.sql, and 040_seed_notification_permissions.sql
-- each correctly extended ensure_standard_roles() to grant Employee and
-- Supervisor their attendance/leave/notification permissions. But
-- 041_create_departments.sql's own CREATE OR REPLACE of the same function
-- (adding departments.read to Supervisor) silently reverted to an OLDER,
-- shorter Employee/Supervisor list in the process -- a copy-paste
-- regression that 042/043 then perpetuated unmodified. Every EXISTING
-- organization was unaffected because 037/039/040 also ran a one-time
-- direct backfill INSERT against every existing Supervisor/Employee role
-- row (by name) at the time each of them shipped -- that data survived,
-- it just never made it back into the function template those migrations
-- also updated. Confirmed via live SQL: ShiftOS Test Org's actual Employee
-- role already holds 14 permissions and Supervisor holds 38, but 043's
-- (and 048's) function body would only grant a new org's Employee 8 and
-- Supervisor 29.
--
-- Fix: restore the missing codes to both blocks, matching the real,
-- currently-correct live permission sets exactly (verified via direct SQL
-- query against ShiftOS Test Org before writing this migration). Re-runs
-- the backfill loop -- a harmless no-op for every existing organization
-- (ON CONFLICT DO NOTHING, and they already hold every one of these codes)
-- -- this migration only changes behavior for organizations created after
-- it runs.

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
    'notifications.read'
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
