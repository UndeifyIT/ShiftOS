-- 012_create_tasks.sql
-- Migration: create tasks table
-- Purpose: Tenant-owned operational task records with branch integrity, supervisor assignment, completion tracking, and audit history.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create task status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_enum') THEN
    CREATE TYPE public.task_status_enum AS ENUM (
      'draft',
      'assigned',
      'in_progress',
      'completed',
      'verified',
      'cancelled'
    );
  END IF;
END$$;

-- Create task priority enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority_enum') THEN
    CREATE TYPE public.task_priority_enum AS ENUM (
      'low',
      'normal',
      'high',
      'critical'
    );
  END IF;
END$$;

-- Create task verification status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_verification_status_enum') THEN
    CREATE TYPE public.task_verification_status_enum AS ENUM (
      'pending',
      'verified',
      'rework_required'
    );
  END IF;
END$$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  due_time time,
  priority public.task_priority_enum NOT NULL DEFAULT 'normal',
  task_status public.task_status_enum NOT NULL DEFAULT 'draft',
  assigned_supervisor_id uuid,
  assigned_by uuid,
  assigned_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  completion_notes text,
  verified_at timestamptz,
  verified_by uuid,
  verification_notes text,
  verification_status public.task_verification_status_enum NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  updated_by uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Ensure the parent tables have the composite uniqueness required by the foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'branches' AND c.conname = 'uq_branches_id_organization_id')
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT uq_branches_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_organization_id')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'organization_memberships' AND c.conname = 'uq_organization_memberships_user_organization')
  THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_organization_memberships_user_organization UNIQUE (user_id, organization_id);
  END IF;
END$$;

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_organization')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_branch')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_assigned_supervisor')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_assigned_supervisor FOREIGN KEY (assigned_supervisor_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_assigned_by')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_assigned_by FOREIGN KEY (assigned_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_created_by')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_updated_by')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_updated_by FOREIGN KEY (updated_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_completed_by')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_completed_by FOREIGN KEY (completed_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_verified_by')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT fk_tasks_verified_by FOREIGN KEY (verified_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_version_positive')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_version_positive CHECK (version >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_title_not_empty')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_title_not_empty CHECK (
        title IS NOT NULL
        AND trim(title) <> ''
        AND title = trim(title)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_notes_trimmed')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_notes_trimmed CHECK (
        (description IS NULL OR (trim(description) <> '' AND description = trim(description)))
        AND (completion_notes IS NULL OR (trim(completion_notes) <> '' AND completion_notes = trim(completion_notes)))
        AND (verification_notes IS NULL OR (trim(verification_notes) <> '' AND verification_notes = trim(verification_notes)))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_assignment_consistency')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_assignment_consistency CHECK (
        (
          task_status = 'draft'
          AND assigned_supervisor_id IS NULL
          AND assigned_by IS NULL
          AND assigned_at IS NULL
        )
        OR (
          task_status IN ('assigned', 'in_progress', 'completed', 'verified', 'cancelled')
          AND assigned_supervisor_id IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_completion_consistency')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_completion_consistency CHECK (
        (task_status IN ('draft', 'assigned', 'in_progress') AND completed_at IS NULL)
        OR (task_status IN ('completed', 'verified', 'cancelled') AND completed_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_verification_consistency')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_verification_consistency CHECK (
        (task_status <> 'verified' AND verified_at IS NULL)
        OR (task_status = 'verified' AND verified_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tasks' AND c.conname = 'chk_tasks_created_updated_order')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_created_updated_order CHECK (
        updated_at >= created_at
      );
  END IF;
END$$;

-- Indexes for active task queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_tasks_organization_created_at')
  THEN
    CREATE INDEX idx_tasks_organization_created_at ON public.tasks (organization_id, created_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_tasks_branch_status')
  THEN
    CREATE INDEX idx_tasks_branch_status ON public.tasks (branch_id, task_status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_tasks_assigned_supervisor')
  THEN
    CREATE INDEX idx_tasks_assigned_supervisor ON public.tasks (assigned_supervisor_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_tasks_due_date')
  THEN
    CREATE INDEX idx_tasks_due_date ON public.tasks (due_date)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_tasks_priority')
  THEN
    CREATE INDEX idx_tasks_priority ON public.tasks (priority)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Comments
COMMENT ON TABLE public.tasks IS 'Tenant-owned operational task records for branch execution, supervisor coordination, completion tracking, and verification.';
COMMENT ON COLUMN public.tasks.organization_id IS 'Tenant organization that owns the task.';
COMMENT ON COLUMN public.tasks.branch_id IS 'Branch scope for the task; must match the associated organization and supervisor branch.';
COMMENT ON COLUMN public.tasks.title IS 'Human-readable task title.';
COMMENT ON COLUMN public.tasks.description IS 'Optional task description or implementation notes.';
COMMENT ON COLUMN public.tasks.due_date IS 'Optional task due date.';
COMMENT ON COLUMN public.tasks.due_time IS 'Optional task due time.';
COMMENT ON COLUMN public.tasks.priority IS 'Operational priority for the task.';
COMMENT ON COLUMN public.tasks.task_status IS 'Current lifecycle state of the task.';
COMMENT ON COLUMN public.tasks.assigned_supervisor_id IS 'Responsible supervisor for executing and reporting the task.';
COMMENT ON COLUMN public.tasks.assigned_by IS 'Organization member who assigned the task to the supervisor.';
COMMENT ON COLUMN public.tasks.assigned_at IS 'Timestamp when the task was assigned to the supervisor.';
COMMENT ON COLUMN public.tasks.completed_at IS 'Timestamp when the supervisor marked the task as completed.';
COMMENT ON COLUMN public.tasks.completed_by IS 'Organization member who marked the task as completed.';
COMMENT ON COLUMN public.tasks.completion_notes IS 'Optional notes captured when the task was completed.';
COMMENT ON COLUMN public.tasks.verified_at IS 'Timestamp when the task was verified by an authorized manager.';
COMMENT ON COLUMN public.tasks.verified_by IS 'Organization member who verified the task.';
COMMENT ON COLUMN public.tasks.verification_notes IS 'Optional notes recorded during task verification.';
COMMENT ON COLUMN public.tasks.verification_status IS 'Current verification outcome for the task.';
COMMENT ON COLUMN public.tasks.created_by IS 'Organization member who created the task.';
COMMENT ON COLUMN public.tasks.updated_by IS 'Organization member who last updated the task.';
COMMENT ON COLUMN public.tasks.version IS 'Optimistic concurrency version. Applications should enforce version matching on updates.';
COMMENT ON COLUMN public.tasks.created_at IS 'Timestamp when the task record was created.';
COMMENT ON COLUMN public.tasks.updated_at IS 'Timestamp when the task record was last updated.';
COMMENT ON COLUMN public.tasks.deleted_at IS 'Soft delete timestamp. Deleted task history is retained for audit and reporting.';

-- Trigger: validate tenant integrity, assignment consistency, and immutable audit fields
CREATE OR REPLACE FUNCTION public.trg_tasks_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch_organization_id uuid;
  v_supervisor_branch_id uuid;
  v_supervisor_is_active boolean;
  v_supervisor_deleted timestamptz;
  v_assigned_by_membership uuid;
  v_completed_by_membership uuid;
  v_verified_by_membership uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted tasks cannot be restored';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted task';
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
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by may not be changed after creation';
    END IF;

    IF NEW.updated_by IS NULL THEN
      RAISE EXCEPTION 'updated_by is required on update';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT organization_id
      INTO v_branch_organization_id
    FROM public.branches
    WHERE id = NEW.branch_id
      AND deleted_at IS NULL;

    IF NOT FOUND OR v_branch_organization_id IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Task branch must belong to the same organization';
    END IF;

    IF NEW.assigned_supervisor_id IS NOT NULL THEN
      SELECT branch_id,
             is_active,
             deleted_at
        INTO v_supervisor_branch_id,
             v_supervisor_is_active,
             v_supervisor_deleted
      FROM public.employees
      WHERE id = NEW.assigned_supervisor_id
        AND organization_id = NEW.organization_id;

      IF NOT FOUND OR v_supervisor_deleted IS NOT NULL THEN
        RAISE EXCEPTION 'Assigned supervisor must reference an existing employee that is not deleted';
      END IF;

      IF NOT v_supervisor_is_active THEN
        RAISE EXCEPTION 'Assigned supervisor must be active';
      END IF;

      IF v_supervisor_branch_id IS DISTINCT FROM NEW.branch_id THEN
        RAISE EXCEPTION 'Assigned supervisor branch must match task branch';
      END IF;
    END IF;

    IF NEW.assigned_by IS NOT NULL THEN
      SELECT user_id
        INTO v_assigned_by_membership
      FROM public.organization_memberships
      WHERE user_id = NEW.assigned_by
        AND organization_id = NEW.organization_id
        AND deleted_at IS NULL;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'assigned_by must reference an active organization membership';
      END IF;
    END IF;

    IF NEW.completed_by IS NOT NULL THEN
      SELECT user_id
        INTO v_completed_by_membership
      FROM public.organization_memberships
      WHERE user_id = NEW.completed_by
        AND organization_id = NEW.organization_id
        AND deleted_at IS NULL;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'completed_by must reference an active organization membership';
      END IF;
    END IF;

    IF NEW.verified_by IS NOT NULL THEN
      SELECT user_id
        INTO v_verified_by_membership
      FROM public.organization_memberships
      WHERE user_id = NEW.verified_by
        AND organization_id = NEW.organization_id
        AND deleted_at IS NULL;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'verified_by must reference an active organization membership';
      END IF;
    END IF;
  END IF;

  IF NEW.title IS NOT NULL THEN
    NEW.title := trim(NEW.title);
    IF NEW.title = '' THEN
      RAISE EXCEPTION 'Title may not be blank';
    END IF;
  END IF;

  IF NEW.description IS NOT NULL THEN
    NEW.description := trim(NEW.description);
    IF NEW.description = '' THEN
      RAISE EXCEPTION 'Description may not be blank';
    END IF;
  END IF;

  IF NEW.completion_notes IS NOT NULL THEN
    NEW.completion_notes := trim(NEW.completion_notes);
    IF NEW.completion_notes = '' THEN
      RAISE EXCEPTION 'Completion notes may not be blank';
    END IF;
  END IF;

  IF NEW.verification_notes IS NOT NULL THEN
    NEW.verification_notes := trim(NEW.verification_notes);
    IF NEW.verification_notes = '' THEN
      RAISE EXCEPTION 'Verification notes may not be blank';
    END IF;
  END IF;

  IF NEW.task_status = 'completed' AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Completed tasks require completed_at';
  END IF;

  IF NEW.task_status = 'verified' AND NEW.verified_at IS NULL THEN
    RAISE EXCEPTION 'Verified tasks require verified_at';
  END IF;

  IF NEW.task_status = 'verified' AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Verified tasks require a completed record';
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
    WHERE t.tgname = 'trg_20_tasks_validate' AND c.relname = 'tasks')
  THEN
    CREATE TRIGGER trg_20_tasks_validate
      BEFORE INSERT OR UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.trg_tasks_validate();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_tasks_set_updated_at' AND c.relname = 'tasks')
  THEN
    CREATE TRIGGER trg_90_tasks_set_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- Row-Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
