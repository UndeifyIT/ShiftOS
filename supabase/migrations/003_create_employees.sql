-- 003_create_employees.sql
-- Migration: create employees table
-- Implements: DB-005, DB-006, DB-007, DB-008, SEC-004, SEC-005, EMP-001, EMP-002, EMP-003
-- This migration creates the tenant-owned employees table and the employee status enum used by workforce management.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create employment status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status_enum') THEN
    CREATE TYPE public.employment_status_enum AS ENUM (
      'active',
      'inactive',
      'terminated',
      'on_leave'
    );
  END IF;
END$$;

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  employee_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  hire_date date NOT NULL,
  employment_status public.employment_status_enum NOT NULL DEFAULT 'active',
  notes text,
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
    WHERE c.contype = 'f' AND t.relname = 'employees' AND c.conname = 'fk_employees_organization')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employees' AND c.conname = 'fk_employees_branch')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_branch_organization')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_id_branch_organization UNIQUE (id, branch_id, organization_id);
  END IF;
END$$;

-- Unique constraint for organization-specific employee number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_org_employee_number')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_org_employee_number UNIQUE (organization_id, employee_number);
  END IF;
END$$;

-- Check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'employees' AND c.conname = 'chk_employees_first_name_not_empty')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_first_name_not_empty CHECK (
        first_name IS NOT NULL
        AND trim(first_name) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'employees' AND c.conname = 'chk_employees_last_name_not_empty')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_last_name_not_empty CHECK (
        last_name IS NOT NULL
        AND trim(last_name) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'employees' AND c.conname = 'chk_employees_employee_number_not_empty')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_employee_number_not_empty CHECK (
        employee_number IS NOT NULL
        AND trim(employee_number) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'employees' AND c.conname = 'chk_employees_hire_date_not_future')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT chk_employees_hire_date_not_future CHECK (
        hire_date <= current_date
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_organization_id') THEN
    CREATE INDEX idx_employees_organization_id ON public.employees (organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_branch_id') THEN
    CREATE INDEX idx_employees_branch_id ON public.employees (branch_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_status') THEN
    CREATE INDEX idx_employees_status ON public.employees (employment_status);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_employee_number') THEN
    CREATE INDEX idx_employees_employee_number ON public.employees (employee_number);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_employees_name') THEN
    CREATE INDEX idx_employees_name ON public.employees (lower(first_name), lower(last_name));
  END IF;
END$$;

COMMENT ON TABLE public.employees IS 'Tenant-owned workforce records representing employees managed by an organization.';
COMMENT ON COLUMN public.employees.branch_id IS 'Current primary branch assignment for the employee. Historical branch transfers will be handled by a future employee_branch_assignments table.';
COMMENT ON COLUMN public.employees.employee_number IS 'Organization-specific employee identifier; unique within the organization.';
COMMENT ON COLUMN public.employees.email IS 'Optional employee email address used for communication and identification.';
COMMENT ON COLUMN public.employees.phone IS 'Optional employee phone number.';
COMMENT ON COLUMN public.employees.hire_date IS 'Employee hire date; must not be in the future.';
COMMENT ON COLUMN public.employees.employment_status IS 'Current employment lifecycle status.';
COMMENT ON COLUMN public.employees.notes IS 'Optional internal notes about the employee.';

-- Future branch history note:
-- A later migration should create employee_branch_assignments to capture branch transfers,
-- effective dates, transfer reasons, approval history and historical reporting.
-- This migration only records the employee's current primary branch in employees.branch_id.

-- Row-Level Security (RLS)
-- RLS is enabled now to lock down employee records. Policies will be implemented in a later migration alongside tenant-aware identity and membership rules.
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Attach `updated_at` trigger to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_employees_set_updated_at' AND c.relname = 'employees')
  THEN
    CREATE TRIGGER trg_employees_set_updated_at
      BEFORE UPDATE ON public.employees
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
