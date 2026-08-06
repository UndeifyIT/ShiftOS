-- 015_create_audit_logs.sql
-- Migration: create audit_logs table
-- Implements: DB-003, DB-005, DB-006, SEC-001, SEC-003, SEC-004, TBL-016
-- This migration creates the tenant-owned audit_logs table for immutable event history.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure parent rows exist for organization and optional user references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'users' AND c.conname = 'uq_users_id')
  THEN
    ALTER TABLE public.users
      ADD CONSTRAINT uq_users_id UNIQUE (id);
  END IF;
END$$;

-- Foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'audit_logs' AND c.conname = 'fk_audit_logs_organization')
  THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT fk_audit_logs_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'audit_logs' AND c.conname = 'fk_audit_logs_user')
  THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'audit_logs' AND c.conname = 'chk_audit_logs_action_not_empty')
  THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT chk_audit_logs_action_not_empty CHECK (
        action IS NOT NULL
        AND trim(action) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'audit_logs' AND c.conname = 'chk_audit_logs_entity_type_not_empty')
  THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT chk_audit_logs_entity_type_not_empty CHECK (
        entity_type IS NOT NULL
        AND trim(entity_type) <> ''
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_organization_id') THEN
    CREATE INDEX idx_audit_logs_organization_id ON public.audit_logs (organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_user_id') THEN
    CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_entity_type') THEN
    CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs (entity_type);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_entity_id') THEN
    CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs (entity_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_created_at') THEN
    CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at);
  END IF;
END$$;

COMMENT ON TABLE public.audit_logs IS 'Tenant-owned immutable audit log entries for security, compliance, and operational history.';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous data state for audited changes.';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New data state for audited changes.';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Optional source IP address for the audit event.';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'Optional client user agent for the audit event.';

-- Row-Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Immutable table guidance comment
COMMENT ON COLUMN public.audit_logs.created_at IS 'Event timestamp. Audit log rows are intended to be append-only and immutable after creation.';
