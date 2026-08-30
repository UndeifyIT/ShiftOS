-- 048_add_admin_role.sql
-- Migration: add a real, invitable "Admin" role for organization-level
-- administration (read-only branch/employee oversight, invitations,
-- organization details) -- distinct from Owner (org-wide, full access) and
-- Supervisor/Employee (workforce operations). Extends
-- ensure_standard_roles() (031, most recently extended in 043) so every
-- organization -- new and existing -- has this role available to invite
-- into, matching the same backfill pattern every prior extension used.
--
-- Admin is deliberately NOT grants_org_wide_branch_access = true:
-- inviteMember() (packages/services/src/organization/membershipService.ts)
-- hard-blocks inviting anyone into an org-wide role, specifically to
-- prevent invite issuance from ever being used for privilege escalation to
-- full org ownership. Making Admin a normal (branch-scoped) role means it
-- can be invited through the existing, already-safe invite/accept/onboarding
-- pipeline with zero changes to that pipeline -- the inviter grants it every
-- current branch explicitly at invite time, and 049 keeps that list current
-- as new branches are added later.

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
    'reports.read'
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
  WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read', 'announcements.read', 'announcements.acknowledge', 'swaps.read', 'swaps.request', 'swaps.respond')
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
