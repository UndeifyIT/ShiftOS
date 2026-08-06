-- 005_create_shifts.sql
-- Migration: create shifts table
-- Implements: DB-005, DB-006, DB-007, DB-008, SEC-004, SCH-001, SCH-002
-- This migration creates the tenant-owned shifts table used for scheduled work records.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create shift status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status_enum') THEN
    CREATE TYPE public.shift_status_enum AS ENUM (
      'draft',
      'published',
      'scheduled',
      'active',
      'completed',
      'cancelled',
      'archived'
    );
  END IF;
END$$;

-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  template_id uuid,
  title text NOT NULL,
  description text,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration interval NOT NULL,
  crosses_midnight boolean NOT NULL DEFAULT false,
  break_minutes integer NOT NULL DEFAULT 0,
  status public.shift_status_enum NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Ensure branch tenancy integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_id_organization_id')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT uq_branches_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_organization')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_branch')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'shift_templates' AND c.conname = 'uq_shift_templates_id_organization_id')
  THEN
    ALTER TABLE public.shift_templates
      ADD CONSTRAINT uq_shift_templates_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_template')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_template FOREIGN KEY (template_id, organization_id)
        REFERENCES public.shift_templates (id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Validate shift data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_title_not_empty')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_title_not_empty CHECK (
        title IS NOT NULL
        AND trim(title) <> ''
        AND title = trim(title)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_break_minutes_non_negative')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_break_minutes_non_negative CHECK (
        break_minutes >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_overnight_logic')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_overnight_logic CHECK (
        (crosses_midnight = false AND end_time > start_time)
        OR (crosses_midnight = true AND end_time < start_time)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_duration_matches_time_range')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_duration_matches_time_range CHECK (
        (crosses_midnight = false AND duration = end_time - start_time)
        OR (crosses_midnight = true AND duration = end_time + interval '24 hours' - start_time)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_published_at_lifecycle')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_published_at_lifecycle CHECK (
        (status IN ('draft', 'scheduled') AND published_at IS NULL)
        OR (status NOT IN ('draft', 'scheduled') AND published_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_start_end_not_equal')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_start_end_not_equal CHECK (
        start_time <> end_time
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_organization_id') THEN
    CREATE INDEX idx_shifts_organization_id ON public.shifts (organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_branch_date') THEN
    CREATE INDEX idx_shifts_branch_date ON public.shifts (branch_id, shift_date);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_branch_date_status') THEN
    CREATE INDEX idx_shifts_branch_date_status ON public.shifts (branch_id, shift_date, status);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_status') THEN
    CREATE INDEX idx_shifts_status ON public.shifts (status);
  END IF;
END$$;

COMMENT ON TABLE public.shifts IS 'Scheduled work shifts owned by an organization and scoped to a branch.';
COMMENT ON COLUMN public.shifts.template_id IS 'Optional reference to the source shift template used to create this shift.';
COMMENT ON COLUMN public.shifts.title IS 'Human-readable shift title.';
COMMENT ON COLUMN public.shifts.description IS 'Optional description or notes for the shift.';
COMMENT ON COLUMN public.shifts.shift_date IS 'The scheduled date for the shift.';
COMMENT ON COLUMN public.shifts.start_time IS 'Planned start time for the shift.';
COMMENT ON COLUMN public.shifts.end_time IS 'Planned end time for the shift.';
COMMENT ON COLUMN public.shifts.duration IS 'Stored duration snapshot for the shift. This preserves historical schedules even if the template changes later.';
COMMENT ON COLUMN public.shifts.crosses_midnight IS 'Indicates whether this shift spans midnight; used together with start_time and end_time.';
COMMENT ON COLUMN public.shifts.break_minutes IS 'Unpaid break duration in minutes.';
COMMENT ON COLUMN public.shifts.status IS 'Current lifecycle state of the shift.';
COMMENT ON COLUMN public.shifts.published_at IS 'Timestamp when the shift was published.';
COMMENT ON COLUMN public.shifts.is_active IS 'Flag indicating whether the shift record is active.';

-- Row-Level Security (RLS)
-- RLS is enabled to prevent accidental public access. Tenant-aware policies will be added later.
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Attach `updated_at` trigger to shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_shifts_set_updated_at' AND c.relname = 'shifts')
  THEN
    CREATE TRIGGER trg_shifts_set_updated_at
      BEFORE UPDATE ON public.shifts
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
