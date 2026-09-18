-- 065_add_employee_profile_fields.sql
-- Migration: gender, employment type and "reports to" on employees
--
-- The design handoff's Add Employee and Employee Profile screens
-- (ShiftOS Dashboards.dc.html, "Manager/Add Employee" / "Manager/Employee
-- Profile") collect Gender, Employment Type ("e.g. Full-time, Part-time,
-- Contract") and Reports To ("the manager or supervisor this employee will
-- report to"), and the Employees directory filters by Employment Type. None
-- of these existed on employees. All three are nullable so existing rows
-- and imports stay valid. Reports To points at another employee in the same
-- organization and is cleared (not the whole row) if that person is removed.
-- No permission catalog changes: these fields reuse employees.create/update.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reports_to_employee_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_gender') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_gender CHECK (gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_employment_type') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_employment_type CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract', 'temporary'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_reports_to_not_self') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_reports_to_not_self CHECK (reports_to_employee_id IS NULL OR reports_to_employee_id <> id);
  END IF;

  -- uq_employees_id_organization_id already exists (created defensively by 059).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employees' AND c.conname = 'fk_employees_reports_to')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_reports_to FOREIGN KEY (reports_to_employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE SET NULL (reports_to_employee_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_reports_to_employee_id') THEN
    CREATE INDEX idx_employees_reports_to_employee_id ON public.employees (reports_to_employee_id) WHERE reports_to_employee_id IS NOT NULL;
  END IF;
END$$;

COMMENT ON COLUMN public.employees.gender IS 'female | male | non_binary | prefer_not_to_say (handoff Add Employee "Gender").';
COMMENT ON COLUMN public.employees.employment_type IS 'full_time | part_time | contract | temporary (handoff "Employment Type").';
COMMENT ON COLUMN public.employees.reports_to_employee_id IS 'The manager or supervisor this employee reports to — another employee in the same organization.';
