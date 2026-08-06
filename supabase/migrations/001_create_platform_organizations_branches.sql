-- 001_create_platform_organizations_branches.sql
-- Migration: create organizations and branches tables (platform domain)
-- Implements: DB-001, DB-002, DB-003, DB-004, DB-005, DB-006, DB-008, SEC-004
-- One migration only. Stop after applying this.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    -- pgcrypto is required for gen_random_uuid(); keep installation here because
    -- there is no dedicated bootstrap migration in this repository yet.
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Unique constraint on slug (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organizations' AND c.conname = 'uq_organizations_slug')
  THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT uq_organizations_slug UNIQUE (slug);
  END IF;
END$$;

-- Index to support lookups by slug (use lower(slug) for case-insensitive searches)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.relname = 'idx_organizations_slug')
  THEN
    CREATE INDEX idx_organizations_slug ON public.organizations (lower(slug));
  END IF;
END$$;

-- Validation constraints: slug and name
DO $$
BEGIN
  -- slug: not empty, only lowercase letters, numbers and hyphens, no spaces
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'organizations' AND c.conname = 'chk_organizations_slug_format')
  THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT chk_organizations_slug_format CHECK (
        slug IS NOT NULL
        AND trim(slug) <> ''
        AND slug ~ '^[a-z0-9\-]+$'
      );
  END IF;

  -- name: not empty after trimming
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'organizations' AND c.conname = 'chk_organizations_name_not_empty')
  THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT chk_organizations_name_not_empty CHECK (
        name IS NOT NULL
        AND trim(name) <> ''
      );
  END IF;
END$$;

COMMENT ON TABLE public.organizations IS 'Tenant organizations using the ShiftOS platform (platform-owned resource)';
COMMENT ON COLUMN public.organizations.metadata IS 'Arbitrary organization-level settings stored as JSONB';
-- NOTE: `metadata` is left as JSONB because current documentation (DB-005) does not define structured organization-only fields.
-- If future documentation specifies structured organization fields that are commonly queried, move them to first-class columns in a later migration for better queryability.
COMMENT ON COLUMN public.organizations.slug IS 'Canonical slug stored lowercase; application MUST normalize to lowercase and enforce allowed characters before insert/update.';
COMMENT ON COLUMN public.organizations.name IS 'Human-friendly organization name; enforced non-empty by chk_organizations_name_not_empty.';

-- Row-Level Security (RLS)
-- RLS is enabled for tenant-owned tables to avoid accidental public access. No tenant policies are
-- created in this migration because the Identity domain (Users, Organization Memberships, Roles)
-- is not yet implemented. Creating policies that depend on non-existent tables would be premature.
--
-- Decision: ENABLE RLS now to lock down the organizations table surface area. Implement tenant-aware
-- RLS policies in a later migration once the identity and membership tables exist. Do NOT add
-- permissive policies (USING (true) / WITH CHECK (true)) in the interim.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create branches table (tenant-owned)
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Foreign key constraint (restrict destructive deletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'branches' AND c.conname = 'fk_branches_organization')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT fk_branches_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique branch name per organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_org_name')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT uq_branches_org_name UNIQUE (organization_id, name);
  END IF;
END$$;

-- Branch name must not be empty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'branches' AND c.conname = 'chk_branches_name_not_empty')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT chk_branches_name_not_empty CHECK (
        name IS NOT NULL
        AND trim(name) <> ''
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_branches_organization_id') THEN
    CREATE INDEX idx_branches_organization_id ON public.branches (organization_id);
  END IF;
END$$;

COMMENT ON TABLE public.branches IS 'Physical operating locations belonging to an organization (tenant-owned)';
COMMENT ON COLUMN public.branches.settings IS 'Branch-specific settings stored as JSONB';
COMMENT ON COLUMN public.branches.address IS 'Freeform address. Consider normalizing into address table in a future migration if documentation requires structured address queries.';
-- NOTE: `settings` is left as JSONB because DB-005 does not define structured branch-level settings yet. If settings fields become commonly queried, move them to columns in a later migration.

-- Soft delete policy rationale:
-- `deleted_at` is retained because DB-005 lists it as a common column (where applicable).
-- If product policy prefers activation/deactivation only, the `deleted_at` column can be removed in a follow-up migration.

-- Audit fields (created_by/updated_by) are intentionally NOT added here because Users and membership tables are not yet implemented.
-- They will be added in a later migration after the Identity domain (Users, Organization Memberships) is implemented.

-- Row-Level Security (RLS)
-- RLS is enabled for tenant-owned tables to avoid accidental public access. No tenant policies are
-- created in this migration because the Identity domain (Users, Organization Memberships, Roles)
-- is not yet implemented. Creating policies that depend on non-existent tables would be premature
-- and potentially insecure.
--
-- Decision: ENABLE RLS now to lock down the table surface area. Implement tenant-aware RLS policies
-- in a later migration once the identity and membership tables exist. Do NOT add permissive policies
-- (USING (true) / WITH CHECK (true)) in the interim.

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
-- End of migration

-- Timestamp trigger: automatically maintain `updated_at` on row changes.
-- This trigger is safe to create now and does not depend on future tables.
-- Trigger function: update `updated_at` timestamp on row changes.
-- Placement rationale: there is no dedicated common-utilities migration in this repository yet,
-- so the reusable function is defined here. Future migrations should reuse this function and
-- avoid redefining it.
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_organizations_set_updated_at' AND c.relname = 'organizations')
  THEN
    CREATE TRIGGER trg_organizations_set_updated_at
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- Attach trigger to branches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_branches_set_updated_at' AND c.relname = 'branches')
  THEN
    CREATE TRIGGER trg_branches_set_updated_at
      BEFORE UPDATE ON public.branches
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- Deferred implementation notes:
-- - `created_by` / `updated_by` audit columns will be added after the Identity domain (Users) exists.
-- - Tenant-aware RLS policies will be implemented after Organization Memberships and Roles are created.
-- - Address normalization and settings structured columns are deferred until documentation requires them.
