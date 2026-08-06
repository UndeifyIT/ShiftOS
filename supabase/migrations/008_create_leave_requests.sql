-- 008_create_leave_requests.sql
-- Migration: create leave_requests table
-- Implements: DB-005, DB-006, DB-007, DB-008, SEC-004, LEAVE-001, LEAVE-002, LEAVE-003
-- This migration creates the tenant-owned leave_requests table used for employee leave applications and approval workflow.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Ensure btree_gist is available for exclusion constraints on UUID columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    CREATE EXTENSION IF NOT EXISTS btree_gist;
  END IF;
END$$;

-- Create leave request status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_request_status_enum') THEN
    CREATE TYPE public.leave_request_status_enum AS ENUM (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  END IF;
END$$;

-- Create leave type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type_enum') THEN
    CREATE TYPE public.leave_type_enum AS ENUM (
      'annual_leave',
      'sick_leave',
      'emergency_leave',
      'unpaid_leave'
    );
  END IF;
END$$;

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  approved_by uuid,
  leave_type public.leave_type_enum NOT NULL,
  status public.leave_request_status_enum NOT NULL DEFAULT 'pending',
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer GENERATED ALWAYS AS ((end_date - start_date) + 1) STORED,
  reason text NOT NULL,
  manager_notes text,
  cancellation_reason text,
  last_status_changed_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  rejected_by uuid,
  cancelled_by uuid,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_organization')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_branch')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_employee')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  -- Actor references use organization_memberships with RESTRICT to preserve audit history
  -- and prevent hard-deletion of membership records while leave request audit metadata exists.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_requested_by')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_requested_by FOREIGN KEY (requested_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_approved_by')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_approved_by FOREIGN KEY (approved_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_created_by')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_created_by FOREIGN KEY (created_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_rejected_by')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_rejected_by FOREIGN KEY (rejected_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'leave_requests' AND c.conname = 'fk_leave_requests_cancelled_by')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT fk_leave_requests_cancelled_by FOREIGN KEY (cancelled_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Validate leave request data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leave_requests' AND c.conname = 'chk_leave_requests_date_range')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_date_range CHECK (
        end_date >= start_date
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leave_requests' AND c.conname = 'chk_leave_requests_status_timestamps')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_status_timestamps CHECK (
        (status = 'pending' AND approved_by IS NULL AND approved_at IS NULL AND rejected_by IS NULL AND rejected_at IS NULL AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
        OR (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND rejected_by IS NULL AND rejected_at IS NULL AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
        OR (status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND manager_notes IS NOT NULL AND trim(manager_notes) <> '' AND approved_by IS NULL AND approved_at IS NULL AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancellation_reason IS NULL)
        OR (status = 'cancelled' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL AND trim(cancellation_reason) <> '' AND approved_by IS NULL AND approved_at IS NULL AND rejected_by IS NULL AND rejected_at IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leave_requests' AND c.conname = 'chk_leave_requests_deleted_status')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_deleted_status CHECK (
        deleted_at IS NULL OR status IN ('approved', 'rejected', 'cancelled')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leave_requests' AND c.conname = 'chk_leave_requests_reason_required')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_reason_required CHECK (
        reason IS NOT NULL
        AND trim(reason) <> ''
        AND length(trim(reason)) >= 5
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leave_requests' AND c.conname = 'chk_leave_requests_version_positive')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_version_positive CHECK (version >= 1);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leave_requests' AND c.conname = 'chk_leave_requests_total_days_full_day')
  THEN
    ALTER TABLE public.leave_requests
      DROP CONSTRAINT IF EXISTS chk_leave_requests_total_days_full_day;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'excl_leave_requests_employee_period')
  THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT excl_leave_requests_employee_period EXCLUDE USING gist (
        organization_id WITH =,
        employee_id WITH =,
        daterange(start_date, end_date + 1, '[)') WITH &&
      )
      WHERE (
        deleted_at IS NULL
        AND status IN ('pending', 'approved')
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_organization_status_start_date') THEN
    CREATE INDEX idx_leave_requests_organization_status_start_date ON public.leave_requests (organization_id, status, start_date)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_branch_status') THEN
    CREATE INDEX idx_leave_requests_branch_status ON public.leave_requests (branch_id, status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_employee_status') THEN
    CREATE INDEX idx_leave_requests_employee_status ON public.leave_requests (employee_id, status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_employee_start_date') THEN
    CREATE INDEX idx_leave_requests_employee_start_date ON public.leave_requests (organization_id, employee_id, start_date)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_branch_start_date') THEN
    CREATE INDEX idx_leave_requests_branch_start_date ON public.leave_requests (branch_id, start_date)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_requested_by') THEN
    CREATE INDEX idx_leave_requests_requested_by ON public.leave_requests (requested_by)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_organization_leave_type_status') THEN
    CREATE INDEX idx_leave_requests_organization_leave_type_status ON public.leave_requests (organization_id, leave_type, status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_org_employee_status_start_date') THEN
    CREATE INDEX idx_leave_requests_org_employee_status_start_date ON public.leave_requests (organization_id, employee_id, status, start_date DESC)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_leave_requests_pending_org_created_at') THEN
    CREATE INDEX idx_leave_requests_pending_org_created_at ON public.leave_requests (organization_id, created_at)
      WHERE status = 'pending' AND deleted_at IS NULL;
  END IF;
END$$;

COMMENT ON TABLE public.leave_requests IS 'Tenant-owned leave request records for employee leave submission, approval and historical reporting.';
COMMENT ON COLUMN public.leave_requests.branch_id IS 'Branch scope for the leave request; denormalized for reporting and branch-level leave queries. This value is derived from the employee record at creation time (INSERT) as an immutable snapshot and is not part of the employee foreign key constraint.';
COMMENT ON COLUMN public.leave_requests.employee_id IS 'Employee requesting the leave.';
COMMENT ON COLUMN public.leave_requests.requested_by IS 'User who requested the leave on behalf of the employee; may be the employee themself or another authorized requester. This column is NOT NULL: every leave request must have an acting requester.';
COMMENT ON COLUMN public.leave_requests.created_by IS 'User who created the leave request record in the system; often the same as requested_by for self-service requests, but may differ for admin-created requests. created_by may differ from requested_by when the request originates outside the system or is imported.';
COMMENT ON COLUMN public.leave_requests.version IS 'Optimistic concurrency version. Applications MUST perform updates using a WHERE version = X clause to detect conflicts; the DB increments this value but does not enforce optimistic locking.';
COMMENT ON COLUMN public.leave_requests.cancellation_reason IS 'Optional explanation of why a leave request was cancelled; required for cancelled requests.';
COMMENT ON COLUMN public.leave_requests.last_status_changed_at IS 'Timestamp when the leave request last transitioned to its current status.';
COMMENT ON COLUMN public.leave_requests.approved_by IS 'User who approved the leave request.';
COMMENT ON COLUMN public.leave_requests.rejected_by IS 'User who rejected the leave request.';
COMMENT ON COLUMN public.leave_requests.cancelled_by IS 'User who cancelled the leave request.';
COMMENT ON COLUMN public.leave_requests.leave_type IS 'Type of leave being requested.';
COMMENT ON COLUMN public.leave_requests.status IS 'Current approval state for the leave request.';
COMMENT ON COLUMN public.leave_requests.start_date IS 'Leave period start date.';
COMMENT ON COLUMN public.leave_requests.end_date IS 'Leave period end date.';
COMMENT ON COLUMN public.leave_requests.total_days IS 'Leave duration in full leave-days. For approved leave, total_days = (end_date - start_date) + 1.';
COMMENT ON COLUMN public.leave_requests.reason IS 'Employee-provided reason for requesting leave.';
COMMENT ON COLUMN public.leave_requests.manager_notes IS 'Manager review notes; required for rejected leave requests.';
COMMENT ON COLUMN public.leave_requests.approved_at IS 'Timestamp when the leave request was approved.';
COMMENT ON COLUMN public.leave_requests.rejected_at IS 'Timestamp when the leave request was rejected.';
COMMENT ON COLUMN public.leave_requests.cancelled_at IS 'Timestamp when the leave request was cancelled.';
COMMENT ON COLUMN public.leave_requests.deleted_at IS 'Soft delete timestamp. Leave request history is retained for audit and reporting.';

-- Validate leave request workflow, audit immutability, and derived fields
CREATE OR REPLACE FUNCTION public.trg_leave_requests_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Deletion validation: prevent restoring soft-deleted records, then block any modifications
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted leave requests cannot be restored';
    END IF;

    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted leave request';
    END IF;
  END IF;

  -- Status transition validation
  -- Status transition validation: explicitly encode allowed transitions per previous state.
  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    CASE OLD.status
      WHEN 'pending' THEN
        -- Pending may stay pending or move to any terminal decision
        IF NEW.status NOT IN ('pending', 'approved', 'rejected', 'cancelled') THEN
          RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
        END IF;
      WHEN 'approved' THEN
        IF NEW.status IS DISTINCT FROM 'approved' THEN
          RAISE EXCEPTION 'Cannot transition leave request from % to %: final state is terminal', OLD.status, NEW.status;
        END IF;
      WHEN 'rejected' THEN
        IF NEW.status IS DISTINCT FROM 'rejected' THEN
          RAISE EXCEPTION 'Cannot transition leave request from % to %: final state is terminal', OLD.status, NEW.status;
        END IF;
      WHEN 'cancelled' THEN
        IF NEW.status IS DISTINCT FROM 'cancelled' THEN
          RAISE EXCEPTION 'Cannot transition leave request from % to %: final state is terminal', OLD.status, NEW.status;
        END IF;
      ELSE
        -- Unknown previous status: require explicit migration to allow transitions
        RAISE EXCEPTION 'Unsupported previous status %: explicit transition rules required', OLD.status;
    END CASE;
  END IF;

  -- Workflow state validation
  IF NEW.status = 'pending' THEN
    IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.rejected_by IS NOT NULL OR NEW.rejected_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Pending leave requests may not include approval, rejection, or cancellation metadata';
    END IF;
  ELSIF NEW.status = 'approved' THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'Approved leave requests must include approved_by and approved_at';
    END IF;
    IF NEW.rejected_by IS NOT NULL OR NEW.rejected_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Approved leave requests may not include rejection or cancellation metadata';
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    IF NEW.rejected_by IS NULL OR NEW.rejected_at IS NULL OR NEW.manager_notes IS NULL OR trim(NEW.manager_notes) = '' THEN
      RAISE EXCEPTION 'Rejected leave requests must include rejected_by, rejected_at, and manager_notes';
    END IF;
    IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Rejected leave requests may not include approval or cancellation metadata';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by IS NULL OR NEW.cancelled_at IS NULL OR NEW.cancellation_reason IS NULL OR trim(NEW.cancellation_reason) = '' THEN
      RAISE EXCEPTION 'Cancelled leave requests must include cancelled_by, cancelled_at, and cancellation_reason';
    END IF;
    IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.rejected_by IS NOT NULL OR NEW.rejected_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cancelled leave requests may not include approval or rejection metadata';
    END IF;
  END IF;

  -- Immutable audit validation for terminal states
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status = 'approved' THEN
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'approved_by may not be changed after approval';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'approved_at may not be changed after approval';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'rejected' AND NEW.status = 'rejected' THEN
    IF NEW.rejected_by IS DISTINCT FROM OLD.rejected_by THEN
      RAISE EXCEPTION 'rejected_by may not be changed after rejection';
    END IF;
    IF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
      RAISE EXCEPTION 'rejected_at may not be changed after rejection';
    END IF;
    IF NEW.manager_notes IS DISTINCT FROM OLD.manager_notes THEN
      RAISE EXCEPTION 'manager_notes may not be changed after rejection';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'cancelled' AND NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by THEN
      RAISE EXCEPTION 'cancelled_by may not be changed after cancellation';
    END IF;
    IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      RAISE EXCEPTION 'cancelled_at may not be changed after cancellation';
    END IF;
    IF NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason THEN
      RAISE EXCEPTION 'cancellation_reason may not be changed after cancellation';
    END IF;
  END IF;

  -- Timestamp ordering validation
  IF NEW.approved_at IS NOT NULL AND NEW.approved_at < NEW.created_at THEN
    RAISE EXCEPTION 'approved_at must be greater than or equal to created_at';
  END IF;
  IF NEW.rejected_at IS NOT NULL AND NEW.rejected_at < NEW.created_at THEN
    RAISE EXCEPTION 'rejected_at must be greater than or equal to created_at';
  END IF;
  IF NEW.cancelled_at IS NOT NULL AND NEW.cancelled_at < NEW.created_at THEN
    RAISE EXCEPTION 'cancelled_at must be greater than or equal to created_at';
  END IF;

  -- Status change audit fields
  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
    NEW.last_status_changed_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_at may not be modified';
    END IF;

    -- Core request fields are immutable after creation to preserve historical accuracy.
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'employee_id may not be changed after creation';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id may not be changed after creation';
    END IF;
    IF NEW.requested_by IS DISTINCT FROM OLD.requested_by THEN
      RAISE EXCEPTION 'requested_by may not be changed after creation';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by may not be changed after creation';
    END IF;
    IF NEW.leave_type IS DISTINCT FROM OLD.leave_type THEN
      RAISE EXCEPTION 'leave_type may not be changed after creation';
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date THEN
      RAISE EXCEPTION 'start_date and end_date may not be changed after creation';
    END IF;
    IF NEW.reason IS DISTINCT FROM OLD.reason THEN
      RAISE EXCEPTION 'reason may not be changed after creation';
    END IF;

    -- branch snapshot must remain immutable after creation
    IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
      RAISE EXCEPTION 'branch_id may not be changed after creation';
    END IF;

    NEW.version := OLD.version + 1;
    IF NEW.status <> OLD.status THEN
      NEW.last_status_changed_at := now();
    ELSE
      NEW.last_status_changed_at := OLD.last_status_changed_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
-- Ensure branch snapshot is recorded from the employee record (denormalized snapshot)
CREATE OR REPLACE FUNCTION public.trg_leave_requests_set_branch_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  emp_branch uuid;
BEGIN
  -- Only populate snapshot at INSERT time. Updates must not change branch_id.
  IF TG_OP = 'INSERT' THEN
    -- Ensure the referenced employee exists in the same organization and read their current branch
    SELECT branch_id INTO emp_branch
      FROM public.employees
     WHERE id = NEW.employee_id
       AND organization_id = NEW.organization_id
     LIMIT 1;

    IF emp_branch IS NULL THEN
      RAISE EXCEPTION 'employee % not found in organization %', NEW.employee_id, NEW.organization_id;
    END IF;

    -- Overwrite branch_id to capture employee's current branch as a snapshot
    NEW.branch_id := emp_branch;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_10_leave_requests_set_branch_snapshot' AND c.relname = 'leave_requests')
  THEN
    CREATE TRIGGER trg_10_leave_requests_set_branch_snapshot
      BEFORE INSERT ON public.leave_requests
      FOR EACH ROW EXECUTE FUNCTION public.trg_leave_requests_set_branch_snapshot();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_20_leave_requests_validate' AND c.relname = 'leave_requests')
  THEN
    CREATE TRIGGER trg_20_leave_requests_validate
      BEFORE INSERT OR UPDATE ON public.leave_requests
      FOR EACH ROW EXECUTE FUNCTION public.trg_leave_requests_validate();
  END IF;
END$$;

-- Attach `updated_at` trigger to leave_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_leave_requests_set_updated_at' AND c.relname = 'leave_requests')
  THEN
    CREATE TRIGGER trg_90_leave_requests_set_updated_at
      BEFORE UPDATE ON public.leave_requests
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
