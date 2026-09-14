-- 064_create_employee_imports.sql
-- Migration: create employee_imports table
--
-- The design handoff's Import Employees wizard (ShiftOS Dashboards.dc.html,
-- "Manager/Import Employees") lists "Recent Imports — your last 5 import
-- activities" with the file name, who imported it, when, the outcome and the
-- record count, and a "View Errors" action for a failed file. One row = one
-- confirmed import of a spreadsheet into one branch. Rows the manager skipped
-- at validation never reach the server, so skipped_count is what the client
-- reports; imported/failed/invites are counted server-side as each row is
-- created. `errors` keeps the per-row failure messages for "View Errors".
-- No permission catalog changes: importing reuses employees.create.

CREATE TABLE IF NOT EXISTS public.employee_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  file_name text NOT NULL,
  imported_by uuid NOT NULL,
  status text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  invites_sent integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_employee_imports_status CHECK (status IN ('completed', 'completed_with_errors', 'failed')),
  CONSTRAINT chk_employee_imports_file_name CHECK (char_length(file_name) BETWEEN 1 AND 255)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employee_imports' AND c.conname = 'fk_employee_imports_organization')
  THEN
    ALTER TABLE public.employee_imports
      ADD CONSTRAINT fk_employee_imports_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employee_imports' AND c.conname = 'fk_employee_imports_branch')
  THEN
    ALTER TABLE public.employee_imports
      ADD CONSTRAINT fk_employee_imports_branch FOREIGN KEY (branch_id)
        REFERENCES public.branches (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employee_imports' AND c.conname = 'fk_employee_imports_imported_by')
  THEN
    ALTER TABLE public.employee_imports
      ADD CONSTRAINT fk_employee_imports_imported_by FOREIGN KEY (imported_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employee_imports_organization_created') THEN
    CREATE INDEX idx_employee_imports_organization_created ON public.employee_imports (organization_id, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employee_imports_branch_id') THEN
    CREATE INDEX idx_employee_imports_branch_id ON public.employee_imports (branch_id);
  END IF;
END$$;

COMMENT ON TABLE public.employee_imports IS 'History of spreadsheet imports into the employee directory (handoff Import Employees "Recent Imports").';
COMMENT ON COLUMN public.employee_imports.errors IS 'Per-row failures: [{ "row": <spreadsheet row number>, "name": text, "message": text }].';

-- RLS enabled per the same convention as schedule_day_offs (062): no
-- per-table policies yet, authorization is enforced in the service layer
-- via ApplicationContext.requirePermission/requireBranchAccess.
ALTER TABLE public.employee_imports ENABLE ROW LEVEL SECURITY;
