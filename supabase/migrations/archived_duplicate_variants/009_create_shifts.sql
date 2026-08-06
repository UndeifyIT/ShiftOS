-- 009_create_shifts.sql
-- Migration: create shifts table
-- Purpose: Tenant-owned shift definitions used for scheduling, reporting and attendance integration.
-- Conventions: id, organization_id, branch_id, created_by, version, created_at, updated_at, deleted_at

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Shift status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status_enum') THEN
    CREATE TYPE public.shift_status_enum AS ENUM (
      'active',
      'inactive',
      'cancelled'
    );
  END IF;
END$$;

-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,

  -- Shift identity
  name text NOT NULL,
  description text,

  -- Date/time components (local date/time without timezone)
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,

  -- Whether the shift runs overnight (end_time < start_time)
  overnight boolean GENERATED ALWAYS AS (end_time < start_time) STORED,

  -- Computed duration in minutes (maintained by trigger to avoid duplicated generated expressions)
  total_minutes integer NOT NULL DEFAULT 0,

  -- Optional unpaid break in minutes (application enforces allocation)
  break_minutes integer NOT NULL DEFAULT 0,

  -- Derived paid minutes available to assignment logic (maintained by trigger)
  paid_minutes integer NOT NULL DEFAULT 0,

  status public.shift_status_enum NOT NULL DEFAULT 'active',

  notes text,

  -- Audit
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  updated_by uuid,
  cancelled_by uuid,
  cancelled_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

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
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_created_by')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_created_by FOREIGN KEY (created_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_updated_by')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_updated_by FOREIGN KEY (updated_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_cancelled_by')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_cancelled_by FOREIGN KEY (cancelled_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Checks and validation constraints
DO $$
BEGIN
  -- shift_date integrity
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_date_present')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_date_present CHECK (shift_date IS NOT NULL);
  END IF;

  -- break_minutes bounds (non-negative and reasonable upper bound)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_break_minutes')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_break_minutes CHECK (break_minutes >= 0 AND break_minutes <= 1440);
  END IF;

  -- break cannot exceed computed total_minutes (enforced at DB level too)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_break_le_total')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_break_le_total CHECK (break_minutes <= total_minutes);
  END IF;

  -- name must be present (non-blank)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_name_required')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_name_required CHECK (name IS NOT NULL AND trim(name) <> '');
  END IF;

  -- version positive
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_version_positive')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_version_positive CHECK (version >= 1);
  END IF;

  -- timestamps ordering for cancellation
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_cancelled_at_order')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_cancelled_at_order CHECK (cancelled_at IS NULL OR cancelled_at >= created_at);
  END IF;

  -- updated_at must not be earlier than created_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_updated_at_order')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_updated_at_order CHECK (updated_at IS NULL OR updated_at >= created_at);
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_org_date_start')
  THEN
    CREATE INDEX idx_shifts_org_date_start ON public.shifts (organization_id, shift_date, start_time)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_branch_date')
  THEN
    CREATE INDEX idx_shifts_branch_date ON public.shifts (branch_id, shift_date)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Unique index to prevent duplicate shifts within the same branch/date/time/name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_shifts_branch_date_time_name') THEN
    CREATE UNIQUE INDEX uq_shifts_branch_date_time_name ON public.shifts (branch_id, organization_id, shift_date, start_time, end_time, name)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Partial index for active pending shifts by creation time (supervisor dashboards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_active_org_created_at')
  THEN
    CREATE INDEX idx_shifts_active_org_created_at ON public.shifts (organization_id, created_at)
      WHERE status = 'active' AND deleted_at IS NULL;
  END IF;
END$$;

-- Comments
COMMENT ON TABLE public.shifts IS 'Tenant-owned shift definitions for scheduling and reporting.';
COMMENT ON COLUMN public.shifts.branch_id IS 'Branch scope for the shift; validated to match organization_id via composite FK.';
COMMENT ON COLUMN public.shifts.shift_date IS 'Date on which the shift starts (local date).';
COMMENT ON COLUMN public.shifts.start_time IS 'Shift local start time (time without timezone).';
COMMENT ON COLUMN public.shifts.end_time IS 'Shift local end time (time without timezone). If end_time < start_time then the shift is overnight.';
COMMENT ON COLUMN public.shifts.overnight IS 'Computed flag: true when the shift ends on the next calendar day (overnight shift).';
COMMENT ON COLUMN public.shifts.total_minutes IS 'Computed shift duration in minutes ignoring breaks.';
COMMENT ON COLUMN public.shifts.break_minutes IS 'Unpaid break duration in minutes (cannot exceed shift duration).';
COMMENT ON COLUMN public.shifts.paid_minutes IS 'Computed paid minutes available to assignments (total_minutes - break_minutes, floored at 0).';
COMMENT ON COLUMN public.shifts.status IS 'Operational status for the shift (active, inactive, cancelled).';
COMMENT ON COLUMN public.shifts.version IS 'Optimistic concurrency version. Applications SHOULD include version checks during updates to prevent conflicting writes.';

-- Trigger: validation and immutability
CREATE OR REPLACE FUNCTION public.trg_shifts_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  t_minutes integer;
BEGIN
  -- Prevent restoring soft-deleted rows and edits to deleted rows
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted shifts cannot be restored';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted shift';
    END IF;
  END IF;

  -- Compute duration in minutes independent of generated columns so validation works in BEFORE triggers
  IF NEW.start_time = NEW.end_time THEN
    RAISE EXCEPTION 'Shift start time and end time cannot be identical';
  ELSIF NEW.end_time > NEW.start_time THEN
    t_minutes := (EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60)::integer;
  ELSE
    t_minutes := (EXTRACT(EPOCH FROM (NEW.end_time + interval '24 hours' - NEW.start_time)) / 60)::integer;
  END IF;

  -- Basic temporal validation: duration must be positive
  IF t_minutes <= 0 THEN
    RAISE EXCEPTION 'Shift duration must be positive';
  END IF;

  -- Break cannot exceed total minutes
  IF NEW.break_minutes < 0 OR NEW.break_minutes > t_minutes THEN
    RAISE EXCEPTION 'break_minutes must be between 0 and total_minutes';
  END IF;

  -- Maintain derived columns (single source of truth for duration)
  NEW.total_minutes := t_minutes;
  NEW.paid_minutes := GREATEST(t_minutes - LEAST(NEW.break_minutes, t_minutes), 0);

  -- Cancelled state must include cancelled_by and cancelled_at
  IF NEW.status = 'cancelled' THEN
    -- If cancellation metadata is not provided, prevent accidental cancellation
    IF NEW.cancelled_by IS NULL OR NEW.cancelled_at IS NULL THEN
      RAISE EXCEPTION 'Cancelled shifts must include cancelled_by and cancelled_at';
    END IF;
    -- Once cancelled, cancellation metadata becomes immutable
    IF TG_OP = 'UPDATE' AND OLD.status = 'cancelled' THEN
      IF NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
        RAISE EXCEPTION 'Cancellation metadata may not be changed after cancellation';
      END IF;
    END IF;
  ELSE
    IF NEW.cancelled_by IS NOT NULL OR NEW.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION 'Non-cancelled shifts may not include cancellation metadata';
    END IF;
  END IF;

  -- Immutable fields after creation to preserve audit integrity
  IF TG_OP = 'UPDATE' THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at may not be modified';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id may not be changed after creation';
    END IF;
    IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
      RAISE EXCEPTION 'branch_id may not be changed after creation';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by may not be changed after creation';
    END IF;

    -- version increments only on successful update
    NEW.version := OLD.version + 1;
  ELSE
    -- INSERT: initialize derived fields
    NEW.version := 1;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers: create with numeric prefixes to make order explicit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_20_shifts_validate' AND c.relname = 'shifts')
  THEN
    CREATE TRIGGER trg_20_shifts_validate
      BEFORE INSERT OR UPDATE ON public.shifts
      FOR EACH ROW EXECUTE FUNCTION public.trg_shifts_validate();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_shifts_set_updated_at' AND c.relname = 'shifts')
  THEN
    CREATE TRIGGER trg_90_shifts_set_updated_at
      BEFORE UPDATE ON public.shifts
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
