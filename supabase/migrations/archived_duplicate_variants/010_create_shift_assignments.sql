-- 010_create_shift_assignments.sql
-- Migration: create shift_assignments table
-- Purpose: Tenant-owned assignment records linking employees to scheduled shifts with tenant, branch, and audit integrity.
-- Conventions: id, organization_id, branch_id, shift_id, employee_id, status, notes, assigned_by, updated_by, version, created_at, updated_at, deleted_at

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
      'cancelled',
      'no_show'
    );
  END IF;
END$$;

-- Create shift_assignments table
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  assignment_status public.assignment_status_enum NOT NULL DEFAULT 'assigned',
  notes text,
  assigned_by uuid NOT NULL,
  updated_by uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- Ensure organization-scoped target uniqueness for composite foreign keys
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
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_branch')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_shift')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_shift FOREIGN KEY (shift_id, organization_id)
        REFERENCES public.shifts (id, organization_id) ON DELETE RESTRICT;
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
      ADD CONSTRAINT fk_shift_assignments_assigned_by FOREIGN KEY (assigned_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'shift_assignments' AND c.conname = 'fk_shift_assignments_updated_by')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT fk_shift_assignments_updated_by FOREIGN KEY (updated_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique active assignment index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_shift_assignments_org_shift_employee')
  THEN
    CREATE UNIQUE INDEX uq_shift_assignments_org_shift_employee
      ON public.shift_assignments (organization_id, shift_id, employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shift_assignments' AND c.conname = 'chk_shift_assignments_version_positive')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT chk_shift_assignments_version_positive CHECK (version >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shift_assignments' AND c.conname = 'chk_shift_assignments_notes_trimmed')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT chk_shift_assignments_notes_trimmed CHECK (
        notes IS NULL
        OR (trim(notes) <> '' AND notes = trim(notes))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shift_assignments' AND c.conname = 'chk_shift_assignments_created_updated_order')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT chk_shift_assignments_created_updated_order CHECK (
        updated_at >= created_at
      );
  END IF;
END$$;

-- Indexes for active assignment queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_organization_id')
  THEN
    CREATE INDEX idx_shift_assignments_organization_id ON public.shift_assignments (organization_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_branch_id')
  THEN
    CREATE INDEX idx_shift_assignments_branch_id ON public.shift_assignments (branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_employee_id')
  THEN
    CREATE INDEX idx_shift_assignments_employee_id ON public.shift_assignments (employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_shift_id')
  THEN
    CREATE INDEX idx_shift_assignments_shift_id ON public.shift_assignments (shift_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_status')
  THEN
    CREATE INDEX idx_shift_assignments_status ON public.shift_assignments (assignment_status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_shift_assignments_created_at')
  THEN
    CREATE INDEX idx_shift_assignments_created_at ON public.shift_assignments (created_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Comments
COMMENT ON TABLE public.shift_assignments IS 'Tenant-owned employee assignments to scheduled shifts with audit and tenant integrity.';
COMMENT ON COLUMN public.shift_assignments.branch_id IS 'Branch scope for the assignment; validated to match the assigned shift and employee branch.';
COMMENT ON COLUMN public.shift_assignments.shift_id IS 'Scheduled shift referenced by the assignment.';
COMMENT ON COLUMN public.shift_assignments.employee_id IS 'Assigned employee referenced by organization and branch.';
COMMENT ON COLUMN public.shift_assignments.assignment_status IS 'Assignment lifecycle state for the employee shift assignment.';
COMMENT ON COLUMN public.shift_assignments.notes IS 'Optional assignment notes; blank notes are not permitted.';
COMMENT ON COLUMN public.shift_assignments.assigned_by IS 'Organization member who created the assignment.';
COMMENT ON COLUMN public.shift_assignments.updated_by IS 'Organization member who last updated the assignment.';
COMMENT ON COLUMN public.shift_assignments.version IS 'Optimistic concurrency version. Applications SHOULD enforce version matching during updates.';
COMMENT ON COLUMN public.shift_assignments.created_at IS 'Timestamp when the assignment record was created.';
COMMENT ON COLUMN public.shift_assignments.updated_at IS 'Timestamp when the assignment record was last updated.';
COMMENT ON COLUMN public.shift_assignments.deleted_at IS 'Soft delete timestamp. Deleted assignments are retained for historical reporting.';

-- Trigger: validate assignment lifecycle and immutable audit fields
CREATE OR REPLACE FUNCTION public.trg_shift_assignments_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_shift_branch_id uuid;
  v_shift_status public.shift_status_enum;
  v_employee_branch_id uuid;
  v_employee_is_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted assignments cannot be restored';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted assignment';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at may not be modified';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id may not be changed after creation';
    END IF;
    IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
      RAISE EXCEPTION 'branch_id may not be changed after creation';
    END IF;
    IF NEW.shift_id IS DISTINCT FROM OLD.shift_id THEN
      RAISE EXCEPTION 'shift_id may not be changed after creation';
    END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'employee_id may not be changed after creation';
    END IF;
    IF NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
      RAISE EXCEPTION 'assigned_by may not be changed after creation';
    END IF;
    IF NEW.updated_by IS NULL THEN
      RAISE EXCEPTION 'updated_by is required on update';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT branch_id, status
      INTO v_shift_branch_id, v_shift_status
    FROM public.shifts
    WHERE id = NEW.shift_id
      AND organization_id = NEW.organization_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assigned shift must exist, belong to the same organization, and not be deleted';
    END IF;

    IF v_shift_branch_id IS DISTINCT FROM NEW.branch_id THEN
      RAISE EXCEPTION 'Assigned shift branch must match assignment branch';
    END IF;

    IF v_shift_status <> 'active' THEN
      RAISE EXCEPTION 'Assignments cannot reference cancelled or inactive shifts';
    END IF;

    SELECT branch_id, is_active
      INTO v_employee_branch_id, v_employee_is_active
    FROM public.employees
    WHERE id = NEW.employee_id
      AND organization_id = NEW.organization_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assigned employee must exist in the organization and not be deleted';
    END IF;

    IF NOT v_employee_is_active THEN
      RAISE EXCEPTION 'Assignments cannot reference inactive employees';
    END IF;

    IF v_employee_branch_id IS DISTINCT FROM NEW.branch_id THEN
      RAISE EXCEPTION 'Assigned employee branch must match assignment branch';
    END IF;
  END IF;

  IF NEW.notes IS NOT NULL THEN
    NEW.notes := trim(NEW.notes);
    IF NEW.notes = '' THEN
      RAISE EXCEPTION 'Notes may not be blank';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.version := OLD.version + 1;
  ELSE
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
    WHERE t.tgname = 'trg_20_shift_assignments_validate' AND c.relname = 'shift_assignments')
  THEN
    CREATE TRIGGER trg_20_shift_assignments_validate
      BEFORE INSERT OR UPDATE ON public.shift_assignments
      FOR EACH ROW EXECUTE FUNCTION public.trg_shift_assignments_validate();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_shift_assignments_set_updated_at' AND c.relname = 'shift_assignments')
  THEN
    CREATE TRIGGER trg_90_shift_assignments_set_updated_at
      BEFORE UPDATE ON public.shift_assignments
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
