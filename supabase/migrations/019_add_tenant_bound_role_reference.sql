-- 019_add_tenant_bound_role_reference.sql
-- Migration: make organization_memberships.role_id tenant-safe at the constraint level
-- Purpose: fk_organization_memberships_role (002_create_identity_access.sql) is a
-- single-column FK to roles(id). Nothing in the database prevents a membership in
-- Organization A from referencing a role belonging to Organization B. Every other
-- cross-table reference in the schema uses the composite (id, organization_id)
-- pattern for exactly this reason; this migration brings organization_memberships
-- into line with that convention. Table is empty in every environment this has been
-- verified against, so this is a zero-data-risk structural correction.

-- 1. Add the composite unique key on roles required to be the target of a composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'roles' AND c.conname = 'uq_roles_id_organization_id')
  THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT uq_roles_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- 2. Also add the same composite unique key on organization_memberships, needed by
--    021_create_organization_member_branch_access.sql to safely reference a
--    membership row while enforcing tenant consistency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_id_organization_id')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- 3. Replace the single-column FK with a tenant-safe composite FK.
--    Evaluated before executing: organization_memberships holds 0 rows in every
--    environment this migration has been verified against, so dropping and
--    re-adding this constraint carries no data risk and requires no backfill.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_memberships' AND c.conname = 'fk_organization_memberships_role')
  THEN
    ALTER TABLE public.organization_memberships
      DROP CONSTRAINT fk_organization_memberships_role;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_memberships' AND c.conname = 'fk_organization_memberships_role_tenant_safe')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT fk_organization_memberships_role_tenant_safe
        FOREIGN KEY (role_id, organization_id)
        REFERENCES public.roles (id, organization_id)
        ON DELETE RESTRICT;
  END IF;
END$$;

COMMENT ON CONSTRAINT fk_organization_memberships_role_tenant_safe ON public.organization_memberships IS
  'Composite FK ensures a membership can only reference a role belonging to the same organization_id. Replaces the single-column fk_organization_memberships_role removed by this migration.';
