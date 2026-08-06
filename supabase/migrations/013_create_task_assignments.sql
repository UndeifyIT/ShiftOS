-- 013_create_task_assignments.sql
-- Migration: create task_assignments table
-- Implements: DB-005, DB-006, DB-013, TBL-014, SEC-004
-- This migration creates the tenant-owned task_assignments table used for assigning employees to operational tasks.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create task assignment status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_assignment_status_enum') THEN
    CREATE TYPE public.task_assignment_status_enum AS ENUM (
      'assigned',
      'accepted',
      'in_progress',
      'completed',
      'cancelled'
    );
  END IF;
END$$;

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  task_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  assignment_status public.task_assignment_status_enum NOT NULL DEFAULT 'assigned',
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Ensure organization-scoped target uniqueness for composite foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'tasks' AND c.conname = 'uq_tasks_id_organization_id')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT uq_tasks_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_organization_id')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'task_assignments' AND c.conname = 'fk_task_assignments_organization')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT fk_task_assignments_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'task_assignments' AND c.conname = 'fk_task_assignments_task')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id, organization_id)
        REFERENCES public.tasks (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'task_assignments' AND c.conname = 'fk_task_assignments_employee')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT fk_task_assignments_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'task_assignments' AND c.conname = 'fk_task_assignments_assigned_by')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT fk_task_assignments_assigned_by FOREIGN KEY (assigned_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique active task assignment index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_task_assignments_org_task_employee')
  THEN
    CREATE UNIQUE INDEX uq_task_assignments_org_task_employee
      ON public.task_assignments (organization_id, task_id, employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'task_assignments' AND c.conname = 'chk_task_assignments_assigned_at_present')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT chk_task_assignments_assigned_at_present CHECK (
        assigned_at IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'task_assignments' AND c.conname = 'chk_task_assignments_completed_at_consistency')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT chk_task_assignments_completed_at_consistency CHECK (
        (assignment_status = 'completed' AND completed_at IS NOT NULL)
        OR (assignment_status <> 'completed' AND completed_at IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'task_assignments' AND c.conname = 'chk_task_assignments_updated_at_order')
  THEN
    ALTER TABLE public.task_assignments
      ADD CONSTRAINT chk_task_assignments_updated_at_order CHECK (
        updated_at >= created_at
      );
  END IF;
END$$;

-- Indexes for assignment queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_task_assignments_organization_id') THEN
    CREATE INDEX idx_task_assignments_organization_id ON public.task_assignments (organization_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_task_assignments_task_id') THEN
    CREATE INDEX idx_task_assignments_task_id ON public.task_assignments (task_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_task_assignments_employee_id') THEN
    CREATE INDEX idx_task_assignments_employee_id ON public.task_assignments (employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_task_assignments_status') THEN
    CREATE INDEX idx_task_assignments_status ON public.task_assignments (assignment_status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

COMMENT ON TABLE public.task_assignments IS 'Tenant-owned employee assignments for operational tasks.';
COMMENT ON COLUMN public.task_assignments.assignment_status IS 'Current lifecycle status of the task assignment.';
COMMENT ON COLUMN public.task_assignments.assigned_by IS 'Organization member who assigned the task.';
COMMENT ON COLUMN public.task_assignments.assigned_at IS 'Timestamp when the task was assigned.';
COMMENT ON COLUMN public.task_assignments.completed_at IS 'Completion timestamp for finished task assignments.';
COMMENT ON COLUMN public.task_assignments.deleted_at IS 'Soft delete timestamp. Deleted task assignments are retained for historical reporting.';

-- Row-Level Security (RLS)
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Attach `updated_at` trigger to task_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_task_assignments_set_updated_at' AND c.relname = 'task_assignments')
  THEN
    CREATE TRIGGER trg_task_assignments_set_updated_at
      BEFORE UPDATE ON public.task_assignments
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
