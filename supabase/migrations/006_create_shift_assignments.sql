-- 006_create_shift_assignments.sql
-- Migration: create shift_assignments table
-- Implements: DB-005, DB-006, DB-007, DB-008, SEC-004, SCH-001, SHIFT-008
-- This migration creates the tenant-owned shift_assignments table used for employee assignments to scheduled shifts.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create assignment status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status_enum') THEN
    CREATE TYPE public.assignment_status_enum AS ENUM (
      'assigned',
      'confirmed',
      'declined',
      'completed',
      'cancelled'
    );
  END IF;
END$$;

-- Create shift_assignments table
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  assignment_status public.assignment_status_enum NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  assigned_by uuid,
  notes text,
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

-- Ensure organization-scoped entity uniqueness for composite foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_organization_id')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'shifts' AND c.conname = 'uq_shifts_id_organization_id')
  THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT uq_shifts_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_organization')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_shift')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_shift FOREIGN KEY (shift_id, organization_id)
        REFERENCES public.shifts (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_employee')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_assigned_by')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- Unique assignment index (soft-delete aware)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'uq_shift_assignments_shift_employee')
  THEN
    CREATE UNIQUE INDEX uq_shift_assignments_shift_employee
      ON public.shift_assignments (shift_id, employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Lifecycle timestamp consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shift_assignments' AND c.conname = 'chk_shift_assignments_status_timestamp_consistency')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT chk_shift_assignments_status_timestamp_consistency CHECK (
        (assignment_status = 'confirmed' AND confirmed_at IS NOT NULL)
        OR (assignment_status = 'declined' AND declined_at IS NOT NULL)
        OR (assignment_status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR (assignment_status IN ('assigned', 'completed'))
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_organization_id') THEN
    CREATE INDEX idx_shift_assignments_organization_id ON public.shift_assignments (organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_shift_id') THEN
    CREATE INDEX idx_shift_assignments_shift_id ON public.shift_assignments (shift_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_employee_id') THEN
    CREATE INDEX idx_shift_assignments_employee_id ON public.shift_assignments (employee_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_status') THEN
    CREATE INDEX idx_shift_assignments_status ON public.shift_assignments (assignment_status);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_employee_status') THEN
    CREATE INDEX idx_shift_assignments_employee_status ON public.shift_assignments (employee_id, assignment_status);
  END IF;
END$$;

COMMENT ON TABLE public.shift_assignments IS 'Tenant-owned records linking employees to scheduled shifts for workforce operations, audit, and scheduling.';
COMMENT ON COLUMN public.shift_assignments.shift_id IS 'Reference to the scheduled shift being assigned.';
COMMENT ON COLUMN public.shift_assignments.employee_id IS 'Reference to the employee assigned to the shift.';
COMMENT ON COLUMN public.shift_assignments.assignment_status IS 'Current lifecycle state of the assignment.';
COMMENT ON COLUMN public.shift_assignments.assigned_at IS 'Timestamp when the employee was assigned to the shift.';
COMMENT ON COLUMN public.shift_assignments.assigned_by IS 'User who created or updated the assignment.';
COMMENT ON COLUMN public.shift_assignments.notes IS 'Optional freeform notes recorded with the assignment.';
COMMENT ON COLUMN public.shift_assignments.deleted_at IS 'Soft delete timestamp. Assignment history is retained for audit and reporting.';

-- Row-Level Security (RLS)
-- RLS is enabled to prevent accidental public access. Tenant-aware policies will be added later.
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Attach `updated_at` trigger to shift_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_shift_assignments_set_updated_at' AND c.relname = 'shift_assignments')
  THEN
    CREATE TRIGGER trg_shift_assignments_set_updated_at
      BEFORE UPDATE ON public.shift_assignments
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
