-- 049_auto_grant_new_branch_to_admins.sql
-- Migration: when a new branch is created, automatically grant every
-- active Admin-role membership access to it -- closes the one accepted
-- trade-off of making Admin a normal (non-org-wide) role in 048: unlike an
-- org-wide role (which implicitly sees every branch, including future
-- ones, via user_accessible_branches()'s own org-wide check), a
-- branch-scoped role's access list is a fixed set of explicit grants that
-- doesn't automatically include branches created after the grant. Without
-- this trigger, an existing Admin would silently stop seeing new branches
-- until someone manually re-granted them.

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

COMMENT ON FUNCTION public.trg_grant_new_branch_to_admins() IS
  'AFTER INSERT trigger on branches: grants every active Admin-role membership access to the newly created branch, so an Admin''s branch list never goes stale as the organization grows (048''s accepted trade-off for making Admin a normal, invitable role instead of org-wide). granted_by is NULL -- branches has no created_by/owner column to attribute this to.';

DROP TRIGGER IF EXISTS trg_branches_grant_admins ON public.branches;
CREATE TRIGGER trg_branches_grant_admins
  AFTER INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.trg_grant_new_branch_to_admins();
