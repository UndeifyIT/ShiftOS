-- 023_harden_role_permission_membership_authorization.sql
-- Migration: close the self-service privilege escalation path
-- Purpose: 017's tenant_isolation_roles / tenant_isolation_role_permissions /
-- tenant_isolation_memberships policies are FOR ALL, gated only by organization
-- membership. Any member -- regardless of role -- could create a role, grant it any
-- permission, and assign it to their own membership. This migration:
--   1. splits each policy into an org-scoped SELECT and a permission-gated write
--      (org.roles.manage / org.members.manage, seeded in 020)
--   2. adds a trigger blocking a member from changing their OWN role_id, even if
--      they hold org.members.manage (prevents self-escalation and accidental
--      last-owner lockout as the same mechanism)
--   3. adds a SECURITY DEFINER bootstrap function, since after this migration no
--      authenticated client can create the first role/membership for a brand-new
--      organization through ordinary RLS-gated writes (nobody holds any permission
--      in an organization that doesn't exist yet). The function only ever operates
--      on an organization it creates itself in the same call, so it cannot be used
--      to inject an owner role into an existing organization.

-- 1a. roles
DROP POLICY IF EXISTS tenant_isolation_roles ON public.roles;

CREATE POLICY roles_select ON public.roles
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY roles_insert ON public.roles
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.roles.manage')
  );

CREATE POLICY roles_update ON public.roles
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.roles.manage')
  ) WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.roles.manage')
  );

CREATE POLICY roles_delete ON public.roles
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.roles.manage')
  );

-- 1b. role_permissions (no organization_id column; derive via the target role)
DROP POLICY IF EXISTS tenant_isolation_role_permissions ON public.role_permissions;

CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT USING (
    role_id IN (SELECT id FROM public.roles WHERE organization_id IN (SELECT public.get_user_organizations()))
  );

CREATE POLICY role_permissions_insert ON public.role_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IN (SELECT public.get_user_organizations())
        AND public.user_has_permission(r.organization_id, 'org.roles.manage')
    )
  );

CREATE POLICY role_permissions_update ON public.role_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IN (SELECT public.get_user_organizations())
        AND public.user_has_permission(r.organization_id, 'org.roles.manage')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IN (SELECT public.get_user_organizations())
        AND public.user_has_permission(r.organization_id, 'org.roles.manage')
    )
  );

CREATE POLICY role_permissions_delete ON public.role_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id IN (SELECT public.get_user_organizations())
        AND public.user_has_permission(r.organization_id, 'org.roles.manage')
    )
  );

-- 1c. organization_memberships
DROP POLICY IF EXISTS tenant_isolation_memberships ON public.organization_memberships;

CREATE POLICY memberships_select ON public.organization_memberships
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY memberships_insert ON public.organization_memberships
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

CREATE POLICY memberships_update ON public.organization_memberships
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  ) WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

CREATE POLICY memberships_delete ON public.organization_memberships
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.user_has_permission(organization_id, 'org.members.manage')
  );

-- 2. Block a member from changing their own role_id, independent of permission
-- level. Runs SECURITY INVOKER (default): it only ever reads the caller's own
-- public.users row, which user_self_manage (017) already allows them to see.
CREATE OR REPLACE FUNCTION public.trg_organization_memberships_prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    SELECT id INTO v_current_user_id FROM public.users WHERE auth_user_id = auth.uid();
    IF v_current_user_id IS NOT NULL AND OLD.user_id = v_current_user_id THEN
      RAISE EXCEPTION 'You cannot change your own role. Ask another authorized member to make this change.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_10_organization_memberships_prevent_self_role_change' AND c.relname = 'organization_memberships')
  THEN
    CREATE TRIGGER trg_10_organization_memberships_prevent_self_role_change
      BEFORE UPDATE ON public.organization_memberships
      FOR EACH ROW EXECUTE FUNCTION public.trg_organization_memberships_prevent_self_role_change();
  END IF;
END$$;

-- 3. Organization bootstrap: the only path by which a brand-new organization gets
-- its first role and first membership, now that ordinary client writes to
-- roles/role_permissions/organization_memberships require a permission that cannot
-- exist yet for an organization nobody is a member of. SECURITY DEFINER so it can
-- perform those writes on the caller's behalf; scoped safely because it creates the
-- organization itself and never accepts an existing organization_id.
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

  INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
  VALUES (v_organization_id, p_owner_role_name, true, true, true)
  RETURNING id INTO v_role_id;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id FROM public.permissions p WHERE p.is_active = true
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  INSERT INTO public.organization_memberships (organization_id, user_id, role_id, is_active)
  VALUES (v_organization_id, v_caller_user_id, v_role_id, true);

  RETURN v_organization_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization_with_owner(text, text, text) IS
  'Creates a new organization, a default org-wide owner role holding every active permission, and a membership binding the calling user to it. The only supported path to bootstrap a new tenant now that roles/role_permissions/organization_memberships writes are permission-gated. Cannot target an existing organization_id.';

REVOKE ALL ON FUNCTION public.create_organization_with_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text) TO authenticated;
