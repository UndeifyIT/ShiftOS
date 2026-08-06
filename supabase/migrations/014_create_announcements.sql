-- 014_create_announcements.sql
-- Migration: create announcements table
-- Implements: DB-003, DB-005, DB-006, DB-008, SEC-004, COM-001, COM-004, TBL-015
-- This migration creates the tenant-owned announcements table used for organization and branch communications.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create announcement enums if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_type_enum') THEN
    CREATE TYPE public.announcement_type_enum AS ENUM (
      'general',
      'policy',
      'safety',
      'operational',
      'emergency'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_visibility_enum') THEN
    CREATE TYPE public.announcement_visibility_enum AS ENUM (
      'organization',
      'branch',
      'public'
    );
  END IF;
END$$;

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  announcement_type public.announcement_type_enum NOT NULL DEFAULT 'general',
  visibility_type public.announcement_visibility_enum NOT NULL DEFAULT 'organization',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Ensure parent tables have composite uniqueness for branch and membership references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_id_organization_id')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT uq_branches_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_user_organization')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_user_organization UNIQUE (user_id, organization_id);
  END IF;
END$$;

-- Foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'announcements' AND c.conname = 'fk_announcements_organization')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT fk_announcements_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'announcements' AND c.conname = 'fk_announcements_branch')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT fk_announcements_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'announcements' AND c.conname = 'fk_announcements_created_by')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'announcements' AND c.conname = 'chk_announcements_title_not_empty')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT chk_announcements_title_not_empty CHECK (
        title IS NOT NULL
        AND trim(title) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'announcements' AND c.conname = 'chk_announcements_content_not_empty')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT chk_announcements_content_not_empty CHECK (
        content IS NOT NULL
        AND trim(content) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'announcements' AND c.conname = 'chk_announcements_published_at_required')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT chk_announcements_published_at_required CHECK (
        is_published = false OR published_at IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'announcements' AND c.conname = 'chk_announcements_expires_after_published')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT chk_announcements_expires_after_published CHECK (
        expires_at IS NULL OR published_at IS NOT NULL AND expires_at > published_at
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_announcements_organization_id') THEN
    CREATE INDEX idx_announcements_organization_id ON public.announcements (organization_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_announcements_branch_id') THEN
    CREATE INDEX idx_announcements_branch_id ON public.announcements (branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_announcements_published') THEN
    CREATE INDEX idx_announcements_published ON public.announcements (published_at)
      WHERE deleted_at IS NULL AND is_published = true;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_announcements_created_by') THEN
    CREATE INDEX idx_announcements_created_by ON public.announcements (created_by)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

COMMENT ON TABLE public.announcements IS 'Tenant-owned announcements published by organizations and branches.';
COMMENT ON COLUMN public.announcements.visibility_type IS 'Audience scope for the announcement.';
COMMENT ON COLUMN public.announcements.announcement_type IS 'Category of announcement content.';
COMMENT ON COLUMN public.announcements.deleted_at IS 'Soft delete timestamp. Deleted announcements are retained for historical reference.';

-- Row-Level Security (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Attach updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_announcements_set_updated_at' AND c.relname = 'announcements')
  THEN
    CREATE TRIGGER trg_announcements_set_updated_at
      BEFORE UPDATE ON public.announcements
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
