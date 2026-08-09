-- 020_add_authorization_helper_functions.sql
-- Migration: permission-check helper and org-wide branch access flag
-- Purpose: prerequisite for 022 (branch-scoped RLS) and 023 (role/permission write
-- gating). Introduces the same SECURITY DEFINER helper-function pattern already
-- established by get_user_organizations() (017), so all tenant-authorization
-- decisions go through one auditable, consistent set of functions.

-- 1. Explicit, self-documenting flag distinguishing organization-wide roles
--    (e.g. Manager, per PER-018 Rule 2) from branch-scoped roles (Supervisor,
--    Staff, per PER-018 Rules 3-4). Deliberately a new column rather than
--    repurposing roles.is_system, whose semantics are undefined/unused elsewhere
--    in the schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'grants_org_wide_branch_access')
  THEN
    ALTER TABLE public.roles
      ADD COLUMN grants_org_wide_branch_access boolean NOT NULL DEFAULT false;
  END IF;
END$$;

COMMENT ON COLUMN public.roles.grants_org_wide_branch_access IS
  'When true, members holding this role see/manage every branch in the organization (PER-018 Rule 2, e.g. Manager). When false, access is limited to branches explicitly granted via organization_member_branch_access (PER-018 Rules 3-4, e.g. Supervisor/Staff).';

-- 2. Seed the permission codes referenced by the RLS policies added in migration 023.
--    Permissions are reference/lookup data (akin to an enum), not test seed data,
--    so they are shipped via migration per existing project convention (compare
--    the enum types created directly in 003-016). Idempotent: safe to re-run.
INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('org.roles.manage', 'organization', 'Manage roles', 'Create, update, and delete organization roles and their permission grants.'),
  ('org.members.manage', 'organization', 'Manage members', 'Add, remove, or change the role of organization members.'),
  ('org.branches.manage', 'organization', 'Manage branch access', 'Grant or revoke a member''s access to specific branches.')
ON CONFLICT (code) DO NOTHING;

-- 3. Permission-check helper. Mirrors get_user_organizations(): SECURITY DEFINER to
--    safely read organization_memberships/roles/role_permissions/permissions across
--    RLS boundaries, SET search_path to avoid search_path hijacking, STABLE for
--    planner efficiency within a single statement.
CREATE OR REPLACE FUNCTION public.user_has_permission(p_organization_id uuid, p_permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    JOIN public.roles r
      ON r.id = om.role_id AND r.organization_id = om.organization_id
    JOIN public.role_permissions rp
      ON rp.role_id = r.id
    JOIN public.permissions p
      ON p.id = rp.permission_id
    WHERE om.organization_id = p_organization_id
      AND om.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
      AND om.is_active = true
      AND om.deleted_at IS NULL
      AND r.is_active = true
      AND r.deleted_at IS NULL
      AND p.code = p_permission_code
      AND p.is_active = true
  );
$$;

COMMENT ON FUNCTION public.user_has_permission(uuid, text) IS
  'Returns true if the current authenticated user holds an active role in p_organization_id whose role_permissions grant p_permission_code. Used to gate writes to roles/role_permissions/organization_memberships (023) and organization_member_branch_access (021).';

REVOKE ALL ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
