-- 059_create_schedule_rosters.sql
-- Migration: create schedule_rosters table
--
-- Tracks which employees are "on" a given week's schedule, independent of
-- whether they have any shift yet -- the weekly grid UI needs to render an
-- employee's row with seven empty day-cells before any shift exists for
-- them (see docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md
-- section 2.1). No permission catalog changes here: roster membership
-- reuses the existing assignments.create/assignments.delete permissions --
-- adding someone to the roster is a precursor to assigning them shifts, and
-- PER-003-SCHEDULING.md's closest matching row ("Assign Employee to
-- Shift") already grants exactly that split: Supervisor allow, Manager deny.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.schedule_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  added_by uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Defensive uniqueness for the composite FKs below, mirroring
-- 004_create_shift_templates.sql's identical guard for branches.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'schedules' AND c.conname = 'uq_schedules_id_organization_id')
  THEN
    ALTER TABLE public.schedules ADD CONSTRAINT uq_schedules_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_organization_id')
  THEN
    ALTER TABLE public.employees ADD CONSTRAINT uq_employees_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_organization')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_schedule')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_schedule FOREIGN KEY (schedule_id, organization_id)
        REFERENCES public.schedules (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_employee')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_added_by')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_added_by FOREIGN KEY (added_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_schedule_rosters_schedule_employee')
  THEN
    CREATE UNIQUE INDEX uq_schedule_rosters_schedule_employee
      ON public.schedule_rosters (schedule_id, employee_id) WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_schedule_rosters_organization_id') THEN
    CREATE INDEX idx_schedule_rosters_organization_id ON public.schedule_rosters (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_schedule_rosters_schedule_id') THEN
    CREATE INDEX idx_schedule_rosters_schedule_id ON public.schedule_rosters (schedule_id);
  END IF;
END$$;

COMMENT ON TABLE public.schedule_rosters IS 'Which employees are on a given schedule (weekly grid roster), independent of whether they have a shift assigned yet.';
COMMENT ON COLUMN public.schedule_rosters.deleted_at IS 'Soft-removing from the roster does not touch that employee''s existing shift assignments for the week.';

-- RLS enabled per the same convention as shift_templates/shift_notes: no
-- per-table policies yet, authorization is enforced in the service layer
-- via ApplicationContext.requirePermission/requireBranchAccess.
ALTER TABLE public.schedule_rosters ENABLE ROW LEVEL SECURITY;
