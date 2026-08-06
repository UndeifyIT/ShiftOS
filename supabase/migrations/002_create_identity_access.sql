-- 002_create_identity_access.sql
-- Migration: create identity and authorization tables
-- Implements: DB-003, DB-005, DB-006, DB-008, SEC-004, USR-002, USR-008, PER-001, PER-002
-- This migration creates the core identity/access tables required for user, role and permission management.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  module text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'permissions' AND c.conname = 'uq_permissions_code')
  THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT uq_permissions_code UNIQUE (code);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'permissions' AND c.conname = 'chk_permissions_code_format')
  THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT chk_permissions_code_format CHECK (
        code IS NOT NULL
        AND trim(code) <> ''
        AND code = lower(code)
        AND code ~ '^[a-z0-9]+(\.[a-z0-9]+)+$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'permissions' AND c.conname = 'chk_permissions_module_not_empty')
  THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT chk_permissions_module_not_empty CHECK (
        module IS NOT NULL
        AND trim(module) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'permissions' AND c.conname = 'chk_permissions_name_not_empty')
  THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT chk_permissions_name_not_empty CHECK (
        name IS NOT NULL
        AND trim(name) <> ''
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_permissions_code') THEN
    CREATE INDEX idx_permissions_code ON public.permissions (code);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_permissions_module') THEN
    CREATE INDEX idx_permissions_module ON public.permissions (module);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_permissions_active') THEN
    CREATE INDEX idx_permissions_active ON public.permissions (is_active);
  END IF;
END$$;

COMMENT ON TABLE public.permissions IS 'Global platform permissions used by role-based authorization';
COMMENT ON COLUMN public.permissions.code IS 'Stable permission code used by authorization logic; lowercase dot notation required.';
COMMENT ON COLUMN public.permissions.module IS 'Functional module that groups permission codes.';
COMMENT ON COLUMN public.permissions.name IS 'Human-readable permission name.';

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'users' AND c.conname = 'uq_users_auth_user_id')
  THEN
    ALTER TABLE public.users
      ADD CONSTRAINT uq_users_auth_user_id UNIQUE (auth_user_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'users' AND c.conname = 'uq_users_email')
  THEN
    ALTER TABLE public.users
      DROP CONSTRAINT uq_users_email;
  END IF;
END$$;

-- Use a partial unique index for email so soft-deleted users do not permanently reserve an email.
-- Active users (deleted_at IS NULL) must still maintain unique email addresses.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'uq_users_email_active')
  THEN
    DROP INDEX IF EXISTS public.idx_users_email;
    CREATE UNIQUE INDEX uq_users_email_active ON public.users (email)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.conname = 'chk_users_first_name_not_empty')
  THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_first_name_not_empty CHECK (
        first_name IS NOT NULL
        AND trim(first_name) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.conname = 'chk_users_last_name_not_empty')
  THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_last_name_not_empty CHECK (
        last_name IS NOT NULL
        AND trim(last_name) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.conname = 'chk_users_email_lowercase')
  THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_email_lowercase CHECK (
        email IS NOT NULL
        AND trim(email) <> ''
        AND email = lower(email)
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_users_auth_user_id') THEN
    CREATE INDEX idx_users_auth_user_id ON public.users (auth_user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_users_is_active') THEN
    CREATE INDEX idx_users_is_active ON public.users (is_active);
  END IF;
END$$;

COMMENT ON TABLE public.users IS 'Authenticated platform users; application profile data only. Authentication credentials are managed by Supabase Auth.';
COMMENT ON COLUMN public.users.auth_user_id IS 'Supabase Auth user ID. This is maintained by the application and is not a DB foreign key to the Supabase auth schema.';
COMMENT ON COLUMN public.users.email IS 'Login email address; application should be normalized to lowercase and trimmed before insert/update.';

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'roles' AND c.conname = 'fk_roles_organization')
  THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT fk_roles_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'roles' AND c.conname = 'uq_roles_org_name')
  THEN
    ALTER TABLE public.roles
      DROP CONSTRAINT uq_roles_org_name;
  END IF;
END$$;

-- Enforce case-insensitive role names within an organization.
-- This prevents separate roles such as Manager, manager, and MANAGER.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'uq_roles_org_lower_name')
  THEN
    DROP INDEX IF EXISTS public.idx_roles_org_name_lower;
    CREATE UNIQUE INDEX uq_roles_org_lower_name
      ON public.roles (organization_id, lower(name));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'roles' AND c.conname = 'chk_roles_name_not_empty')
  THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT chk_roles_name_not_empty CHECK (
        name IS NOT NULL
        AND trim(name) <> ''
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_roles_organization_id') THEN
    CREATE INDEX idx_roles_organization_id ON public.roles (organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_roles_active') THEN
    CREATE INDEX idx_roles_active ON public.roles (is_active);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_roles_system') THEN
    CREATE INDEX idx_roles_system ON public.roles (is_system);
  END IF;
END$$;

COMMENT ON TABLE public.roles IS 'Organization-specific roles used to group permissions for organization members.';
COMMENT ON COLUMN public.roles.name IS 'Role name; application should normalize case and whitespace before insert/update.';
COMMENT ON COLUMN public.roles.description IS 'Optional human-readable role description.';

-- Create organization_memberships table
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_memberships' AND c.conname = 'fk_organization_memberships_organization')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT fk_organization_memberships_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_memberships' AND c.conname = 'fk_organization_memberships_user')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT fk_organization_memberships_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'organization_memberships' AND c.conname = 'fk_organization_memberships_role')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT fk_organization_memberships_role FOREIGN KEY (role_id)
        REFERENCES public.roles (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_org_user')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_org_user UNIQUE (organization_id, user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_user_organization')
  THEN
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = 'uq_organization_memberships_user_organization')
    THEN
      ALTER TABLE public.organization_memberships
        ADD CONSTRAINT uq_organization_memberships_user_organization UNIQUE USING INDEX uq_organization_memberships_user_organization;
    ELSE
      ALTER TABLE public.organization_memberships
        ADD CONSTRAINT uq_organization_memberships_user_organization UNIQUE (user_id, organization_id);
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_organization_memberships_user_id') THEN
    CREATE INDEX idx_organization_memberships_user_id ON public.organization_memberships (user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_organization_memberships_organization_id') THEN
    CREATE INDEX idx_organization_memberships_organization_id ON public.organization_memberships (organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_organization_memberships_role_id') THEN
    CREATE INDEX idx_organization_memberships_role_id ON public.organization_memberships (role_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_organization_memberships_is_active') THEN
    CREATE INDEX idx_organization_memberships_is_active ON public.organization_memberships (is_active);
  END IF;
END$$;

COMMENT ON TABLE public.organization_memberships IS 'Links users to organizations and assigns their organization-specific role.';
COMMENT ON COLUMN public.organization_memberships.joined_at IS 'Timestamp when the user joined the organization.';

-- Future branch-level access support:
-- This migration does not implement branch-scoped membership assignments.
-- A later migration should add a dedicated table such as
-- `membership_branch_assignments` to map organization_memberships to authorized branches
-- and enforce branch-specific access within an organization.
-- Do not add branch-scoped membership fields here so the current core identity model remains focused on organization membership.

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'role_permissions' AND c.conname = 'fk_role_permissions_role')
  THEN
    ALTER TABLE public.role_permissions
      ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id)
        REFERENCES public.roles (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'role_permissions' AND c.conname = 'fk_role_permissions_permission')
  THEN
    ALTER TABLE public.role_permissions
      ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id)
        REFERENCES public.permissions (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'role_permissions' AND c.conname = 'uq_role_permissions_role_permission')
  THEN
    ALTER TABLE public.role_permissions
      ADD CONSTRAINT uq_role_permissions_role_permission UNIQUE (role_id, permission_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_role_permissions_role_id') THEN
    CREATE INDEX idx_role_permissions_role_id ON public.role_permissions (role_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_role_permissions_permission_id') THEN
    CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions (permission_id);
  END IF;
END$$;

COMMENT ON TABLE public.role_permissions IS 'Maps organization roles to the platform permissions they grant.';

-- Authorization audit note:
-- Role, permission and membership changes are security-sensitive and must be captured by the audit system.
-- A later migration should introduce audit logging for:
--   * role creation, updates and deletion
--   * permission assignment changes
--   * organization membership role changes
-- This migration intentionally does not create audit tables or audit policies.

-- Row-Level Security (RLS)
-- RLS is enabled to lock down the identity and authorization surface area.
-- Policies are intentionally deferred until a later migration can implement:
--   * tenant isolation for organization-owned records
--   * membership checks for organization and branch access
--   * permission checks for role/permission enforcement
-- Do not add permissive or incomplete policies in this migration.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Attach `updated_at` trigger to tables that include it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_permissions_set_updated_at' AND c.relname = 'permissions')
  THEN
    CREATE TRIGGER trg_permissions_set_updated_at
      BEFORE UPDATE ON public.permissions
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_users_set_updated_at' AND c.relname = 'users')
  THEN
    CREATE TRIGGER trg_users_set_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_roles_set_updated_at' AND c.relname = 'roles')
  THEN
    CREATE TRIGGER trg_roles_set_updated_at
      BEFORE UPDATE ON public.roles
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_organization_memberships_set_updated_at' AND c.relname = 'organization_memberships')
  THEN
    CREATE TRIGGER trg_organization_memberships_set_updated_at
      BEFORE UPDATE ON public.organization_memberships
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
