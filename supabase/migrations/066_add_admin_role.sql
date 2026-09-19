-- 066_add_admin_role.sql
-- Migration: a real, invitable organization-wide "Admin" role
--
-- Until now the only organization-wide role was the bootstrap Owner role
-- created by create_organization_with_owner(), and MembershipService
-- .inviteMember refused EVERY org-wide role outright, so the design handoff's
-- "Invite an Admin" flow (PAGES["Manager/Admins"], MODALS.inviteAdmin) had
-- nothing it could grant. The refusal exists for a good reason — invite
-- issuance must never become a path to full organization ownership — so this
-- migration keeps that guarantee and narrows it:
--
--   1. roles.is_owner_role marks the one role an organization was
--      bootstrapped with. That role stays un-invitable, forever.
--   2. ensure_standard_roles() also provisions an org-wide, NON-owner "Admin"
--      role: billing/organization settings plus read-only visibility across
--      every branch — "Admins manage billing and view every branch. They
--      can't edit schedules, employees or approvals" (the handoff's own words
--      for this page). Deliberately NOT granted org.members.manage,
--      org.roles.manage or org.branches.manage, so an admin can never hand
--      out roles or edit permissions, and inviting one can never escalate
--      into ownership.
--   3. create_organization_with_owner() flags the role it creates.
--
-- Existing organizations are backfilled by the loop at the end.

-- ---------------------------------------------------------------------------
-- 1. is_owner_role
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_owner_role boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.roles.is_owner_role IS
  'True for the single role an organization was bootstrapped with (create_organization_with_owner). It holds every permission and can never be granted by invitation — see MembershipService.inviteMember.';

-- The bootstrap role is the organization''s oldest org-wide one: before this
-- migration that is the only way an org-wide role could exist at all.
WITH bootstrap AS (
  SELECT DISTINCT ON (organization_id) id
  FROM public.roles
  WHERE grants_org_wide_branch_access = true
  ORDER BY organization_id, created_at ASC, id ASC
)
UPDATE public.roles r
SET is_owner_role = true
FROM bootstrap b
WHERE r.id = b.id AND r.is_owner_role = false;

-- ---------------------------------------------------------------------------
-- 2. The Admin role, provisioned alongside Supervisor/Employee
-- ---------------------------------------------------------------------------
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
    'employees.read', 'employees.create', 'employees.update', 'employees.archive',
    'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
    'assignments.create', 'assignments.update', 'assignments.delete',
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge'
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
  WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read', 'announcements.read', 'announcements.acknowledge')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Admin: organization-wide, but never the owner role. Billing and
  -- organization settings, plus read-only visibility of every branch.
  SELECT id INTO v_admin_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Admin') AND is_owner_role = false;
  IF v_admin_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access, is_owner_role)
    VALUES (p_organization_id, 'Admin', true, true, true, false)
    RETURNING id INTO v_admin_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    'organizations.read', 'organizations.update',
    'branches.read', 'departments.read', 'employees.read',
    'schedules.read', 'shifts.read', 'shifttemplates.read',
    'attendance.read', 'leave.read', 'swaps.read',
    'tasks.read', 'announcements.read', 'shiftnotes.read',
    'reports.read', 'notifications.read'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_standard_roles(uuid) IS
  'Creates (if missing) and (re-)grants an organization''s standard system roles: branch-scoped Supervisor/Employee, and (066) an organization-wide, non-owner Admin holding organization settings plus read-only access across branches. Each holds a curated permission set, unlike the bootstrap Owner role. Idempotent — safe to re-run, since it only INSERTs role/permission rows that do not already exist. Called by create_organization_with_owner() for new organizations and as a backfill by 031, 035 and 066.';

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_standard_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_standard_roles(uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3. Flag the bootstrap role at creation time
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_owner_role_name text DEFAULT 'Owner'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id uuid;
  v_organization_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_caller_user_id FROM public.users WHERE auth_user_id = auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'A users profile row must exist for the current auth identity before creating an organization';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_organization_id;

  INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access, is_owner_role)
  VALUES (v_organization_id, p_owner_role_name, true, true, true, true)
  RETURNING id INTO v_role_id;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id FROM public.permissions p WHERE p.is_active = true
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  INSERT INTO public.organization_memberships (organization_id, user_id, role_id, is_active)
  VALUES (v_organization_id, v_caller_user_id, v_role_id, true);

  PERFORM public.ensure_standard_roles(v_organization_id);

  RETURN v_organization_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization_with_owner(text, text, text) IS
  'Creates a new organization, its org-wide owner role (roles.is_owner_role, holding every active permission), a membership binding the calling user to it, and the standard Supervisor/Employee/Admin roles (031, 066). The only supported path to bootstrap a new tenant now that roles/role_permissions/organization_memberships writes are permission-gated. Cannot target an existing organization_id.';

REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: every existing organization gets the Admin role and its grants.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;
