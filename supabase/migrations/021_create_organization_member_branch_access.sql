-- 021_create_organization_member_branch_access.sql
-- Migration: organization-member-to-branch authorization table
-- Purpose: implements PER-018 branch isolation using AUTHORIZATION identity
-- (organization_memberships), not WORKFORCE identity (employees). An organization
-- owner/administrator must be able to hold branch-scoped or org-wide access without
-- being forced to also have an employees row. A member may be explicitly granted
-- access to multiple branches (PER-018 acknowledges Regional/Area Manager futures);
-- organization-wide roles (roles.grants_org_wide_branch_access, added in 020) do not
-- need rows here at all and implicitly see every branch in the org.

CREATE TABLE IF NOT EXISTS public.organization_member_branch_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Foreign keys: tenant-safe composite FKs throughout, consistent with the rest of
-- the schema (and the fix applied to organization_memberships.role_id in 019).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_member_branch_access' AND c.conname = 'fk_member_branch_access_organization')
  THEN
    ALTER TABLE public.organization_member_branch_access
      ADD CONSTRAINT fk_member_branch_access_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_member_branch_access' AND c.conname = 'fk_member_branch_access_membership')
  THEN
    ALTER TABLE public.organization_member_branch_access
      ADD CONSTRAINT fk_member_branch_access_membership FOREIGN KEY (membership_id, organization_id)
        REFERENCES public.organization_memberships (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_member_branch_access' AND c.conname = 'fk_member_branch_access_branch')
  THEN
    ALTER TABLE public.organization_member_branch_access
      ADD CONSTRAINT fk_member_branch_access_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_member_branch_access' AND c.conname = 'fk_member_branch_access_granted_by')
  THEN
    ALTER TABLE public.organization_member_branch_access
      ADD CONSTRAINT fk_member_branch_access_granted_by FOREIGN KEY (granted_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- One active grant per (membership, branch)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_member_branch_access_membership_branch')
  THEN
    CREATE UNIQUE INDEX uq_member_branch_access_membership_branch
      ON public.organization_member_branch_access (membership_id, branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_member_branch_access_organization_id') THEN
    CREATE INDEX idx_member_branch_access_organization_id ON public.organization_member_branch_access (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_member_branch_access_membership_id') THEN
    CREATE INDEX idx_member_branch_access_membership_id ON public.organization_member_branch_access (membership_id)
      WHERE deleted_at IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relname='idx_member_branch_access_branch_id') THEN
    CREATE INDEX idx_member_branch_access_branch_id ON public.organization_member_branch_access (branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

COMMENT ON TABLE public.organization_member_branch_access IS
  'Explicit grants of branch access to an organization_memberships row (authorization identity), independent of any employees record (workforce identity). A member may hold multiple grants. Roles with grants_org_wide_branch_access = true (roles.grants_org_wide_branch_access, see 020) do not need rows here.';
COMMENT ON COLUMN public.organization_member_branch_access.membership_id IS 'The organization_memberships row being granted branch access; NOT an employees.id.';
COMMENT ON COLUMN public.organization_member_branch_access.granted_by IS 'User who granted this branch access, for audit purposes.';
COMMENT ON COLUMN public.organization_member_branch_access.deleted_at IS 'Soft delete timestamp. Revoked grants are retained for audit/history rather than hard-deleted.';

ALTER TABLE public.organization_member_branch_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_member_branch_access_set_updated_at' AND c.relname = 'organization_member_branch_access')
  THEN
    CREATE TRIGGER trg_member_branch_access_set_updated_at
      BEFORE UPDATE ON public.organization_member_branch_access
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- Branch-scope resolution helper. Returns every branch_id the current authenticated
-- user may access within p_organization_id: all org branches if their role grants
-- org-wide access (PER-018 Rule 2), otherwise only explicitly granted branches
-- (PER-018 Rules 3-4). SECURITY DEFINER so it can read organization_memberships/
-- roles/organization_member_branch_access regardless of the caller's own RLS view,
-- mirroring get_user_organizations() (017) and user_has_permission() (020).
CREATE OR REPLACE FUNCTION public.user_accessible_branches(p_organization_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_membership AS (
    SELECT om.id AS membership_id, om.role_id
    FROM public.organization_memberships om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
      AND om.is_active = true
      AND om.deleted_at IS NULL
  )
  SELECT b.id
  FROM public.branches b
  WHERE b.organization_id = p_organization_id
    AND b.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM my_membership mm
      JOIN public.roles r ON r.id = mm.role_id AND r.organization_id = p_organization_id
      WHERE r.grants_org_wide_branch_access = true
        AND r.is_active = true
        AND r.deleted_at IS NULL
    )
  UNION
  SELECT mba.branch_id
  FROM public.organization_member_branch_access mba
  JOIN my_membership mm ON mm.membership_id = mba.membership_id
  WHERE mba.organization_id = p_organization_id
    AND mba.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.user_accessible_branches(uuid) IS
  'Returns the set of branch_ids the current authenticated user may access within p_organization_id, per PER-018. Used by branch-scoped RLS policies added in 022.';

REVOKE ALL ON FUNCTION public.user_accessible_branches(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_accessible_branches(uuid) TO authenticated;

-- RLS: visible to any org member (consistent with roles/role_permissions being
-- org-visible today); writes gated by org.branches.manage (023 pattern applied here
-- directly since the permission already exists as of 020).
DROP POLICY IF EXISTS tenant_isolation_member_branch_access_select ON public.organization_member_branch_access;
CREATE POLICY tenant_isolation_member_branch_access_select ON public.organization_member_branch_access
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS member_branch_access_write ON public.organization_member_branch_access;
CREATE POLICY member_branch_access_write ON public.organization_member_branch_access
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.branches.manage')
  );

DROP POLICY IF EXISTS member_branch_access_update ON public.organization_member_branch_access;
CREATE POLICY member_branch_access_update ON public.organization_member_branch_access
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.branches.manage')
  ) WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.branches.manage')
  );

DROP POLICY IF EXISTS member_branch_access_delete ON public.organization_member_branch_access;
CREATE POLICY member_branch_access_delete ON public.organization_member_branch_access
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.branches.manage')
  );
