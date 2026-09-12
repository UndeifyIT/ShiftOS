-- 062_create_schedule_day_offs.sql
-- Migration: create schedule_day_offs table
--
-- The design handoff (ShiftOS Dashboards.dc.html, "Manager/Schedules" /
-- "Supervisor/Schedules") draws an explicit grey "OFF" card for a day someone
-- was deliberately given off, and a dashed "+" placeholder for a day nobody
-- has decided yet. Those are different states, so "no shift that day" can no
-- longer stand in for both (the earlier rule in
-- docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md §2.3 is
-- superseded: wherever the handoff and the written specs conflict, the
-- handoff wins). One active row = one employee marked OFF on one date of one
-- schedule. Assigning a shift on that date clears the row (service layer).
-- No permission catalog changes: marking/clearing a day off reuses
-- assignments.create / assignments.delete, exactly like schedule_rosters (059).

CREATE TABLE IF NOT EXISTS public.schedule_day_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  off_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_day_offs' AND c.conname = 'fk_schedule_day_offs_organization')
  THEN
    ALTER TABLE public.schedule_day_offs
      ADD CONSTRAINT fk_schedule_day_offs_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  -- uq_schedules_id_organization_id / uq_employees_id_organization_id already exist (created defensively by 059).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_day_offs' AND c.conname = 'fk_schedule_day_offs_schedule')
  THEN
    ALTER TABLE public.schedule_day_offs
      ADD CONSTRAINT fk_schedule_day_offs_schedule FOREIGN KEY (schedule_id, organization_id)
        REFERENCES public.schedules (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_day_offs' AND c.conname = 'fk_schedule_day_offs_employee')
  THEN
    ALTER TABLE public.schedule_day_offs
      ADD CONSTRAINT fk_schedule_day_offs_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_day_offs' AND c.conname = 'fk_schedule_day_offs_created_by')
  THEN
    ALTER TABLE public.schedule_day_offs
      ADD CONSTRAINT fk_schedule_day_offs_created_by FOREIGN KEY (created_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_schedule_day_offs_schedule_employee_date')
  THEN
    CREATE UNIQUE INDEX uq_schedule_day_offs_schedule_employee_date
      ON public.schedule_day_offs (schedule_id, employee_id, off_date) WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_schedule_day_offs_organization_id') THEN
    CREATE INDEX idx_schedule_day_offs_organization_id ON public.schedule_day_offs (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_schedule_day_offs_schedule_id') THEN
    CREATE INDEX idx_schedule_day_offs_schedule_id ON public.schedule_day_offs (schedule_id);
  END IF;
END$$;

COMMENT ON TABLE public.schedule_day_offs IS 'Explicit "OFF" decisions on the weekly schedule grid (handoff OFF card), distinct from a day nobody has filled in yet.';
COMMENT ON COLUMN public.schedule_day_offs.off_date IS 'Must fall within the schedule''s start_date..end_date (enforced in SchedulingService).';

-- RLS enabled per the same convention as schedule_rosters (059): no
-- per-table policies yet, authorization is enforced in the service layer
-- via ApplicationContext.requirePermission/requireBranchAccess.
ALTER TABLE public.schedule_day_offs ENABLE ROW LEVEL SECURITY;
