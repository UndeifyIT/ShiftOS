-- 063_add_shift_department.sql
-- Migration: optional department on each shift
--
-- The Schedules shift form lets a manager tag a shift with the department it
-- covers (e.g. Bakery, Front End), shown on the shift's card. Additive and
-- nullable, mirroring employees.department_id (041): existing shifts are
-- unaffected, and archiving/deleting a department clears the tag rather than
-- blocking. That the department belongs to the shift's own branch is enforced
-- in SchedulingService (same rule 041's employee trigger applies).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'department_id') THEN
    ALTER TABLE public.shifts ADD COLUMN department_id uuid;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shifts' AND c.conname = 'fk_shifts_department')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT fk_shifts_department FOREIGN KEY (department_id, organization_id)
        -- Only department_id is nulled: a plain SET NULL on this composite key would also null the NOT NULL organization_id (PG15+ column list).
        REFERENCES public.departments (id, organization_id) ON DELETE SET NULL (department_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shifts_department_id') THEN
    CREATE INDEX idx_shifts_department_id ON public.shifts (department_id);
  END IF;
END$$;

COMMENT ON COLUMN public.shifts.department_id IS 'Optional department this shift covers, shown on the schedule grid card. Must belong to the shift''s branch (enforced in SchedulingService).';
