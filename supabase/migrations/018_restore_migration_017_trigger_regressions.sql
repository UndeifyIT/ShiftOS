-- 018_restore_migration_017_trigger_regressions.sql
-- Migration: restore validation/audit logic silently dropped by migration 017
-- Purpose: Migration 017 (apply_enterprise_rls_policies) redefined trg_tasks_validate,
-- trg_attendance_records_validate, and trg_leave_requests_validate as SECURITY DEFINER
-- to bypass RLS during cross-table integrity checks, but in doing so replaced their
-- entire function bodies with stripped-down versions, silently dropping:
--   - optimistic-concurrency `version` increment (tasks, attendance_records)
--   - attendance worked_minutes/overtime/late/early-departure calculation
--   - immutability enforcement on core/audit fields (all three tables)
--   - supervisor/assignee/employee active+branch validation (tasks, attendance_records)
--   - post-decision metadata mutual-exclusion checks (leave_requests)
--
-- This migration does NOT rewrite migrations 008, 011, 012, or 017 (immutable history).
-- It forward-corrects the currently-live function bodies by re-running
-- CREATE OR REPLACE FUNCTION with the original 008/011/012 validation logic,
-- merged with the SECURITY DEFINER + SET search_path hardening introduced in 017.

-- 1. Restore trg_attendance_records_validate (original body: 011, security posture: 017)
CREATE OR REPLACE FUNCTION public.trg_attendance_records_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_branch_id uuid;
  v_employee_is_active boolean;
  v_employee_deleted timestamptz;
  v_assignment_branch_id uuid;
  v_assignment_employee_id uuid;
  v_assignment_status public.assignment_status_enum;
  v_assignment_deleted timestamptz;
  v_shift_status public.shift_status_enum;
  v_shift_deleted timestamptz;
  v_worked_minutes integer;
  v_elapsed_minutes integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Deleted attendance records cannot be restored';
    END IF;
    IF OLD.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify a deleted attendance record';
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
    IF NEW.shift_assignment_id IS DISTINCT FROM OLD.shift_assignment_id THEN
      RAISE EXCEPTION 'shift_assignment_id may not be changed after creation';
    END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'employee_id may not be changed after creation';
    END IF;
    IF NEW.recorded_by IS DISTINCT FROM OLD.recorded_by THEN
      RAISE EXCEPTION 'recorded_by may not be changed after creation';
    END IF;

    IF NEW.updated_by IS NULL THEN
      RAISE EXCEPTION 'updated_by is required on update';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.overtime_minutes := 0;
    NEW.late_minutes := 0;
    NEW.early_departure_minutes := 0;

    SELECT e.branch_id,
           e.is_active,
           e.deleted_at
      INTO v_employee_branch_id,
           v_employee_is_active,
           v_employee_deleted
    FROM public.employees e
    WHERE e.id = NEW.employee_id
      AND e.organization_id = NEW.organization_id;

    IF NOT FOUND OR v_employee_deleted IS NOT NULL THEN
      RAISE EXCEPTION 'Attendance must reference an existing employee that is not deleted';
    END IF;

    IF NOT v_employee_is_active THEN
      RAISE EXCEPTION 'Attendance cannot be recorded for inactive employees';
    END IF;

    IF v_employee_branch_id IS DISTINCT FROM NEW.branch_id THEN
      RAISE EXCEPTION 'Attendance branch must match the referenced employee branch';
    END IF;

    SELECT a.branch_id,
           a.employee_id,
           a.assignment_status,
           a.deleted_at,
           s.status,
           s.deleted_at
      INTO v_assignment_branch_id,
           v_assignment_employee_id,
           v_assignment_status,
           v_assignment_deleted,
           v_shift_status,
           v_shift_deleted
    FROM public.shift_assignments a
    JOIN public.shifts s ON s.id = a.shift_id AND s.organization_id = a.organization_id
    WHERE a.id = NEW.shift_assignment_id
      AND a.organization_id = NEW.organization_id;

    IF NOT FOUND OR v_assignment_deleted IS NOT NULL OR v_shift_deleted IS NOT NULL THEN
      RAISE EXCEPTION 'Attendance must reference an existing shift assignment and shift that are not deleted';
    END IF;

    IF v_assignment_branch_id IS DISTINCT FROM NEW.branch_id THEN
      RAISE EXCEPTION 'Attendance branch must match the referenced shift assignment branch';
    END IF;

    IF v_assignment_employee_id IS DISTINCT FROM NEW.employee_id THEN
      RAISE EXCEPTION 'Attendance employee_id must match the referenced shift assignment employee_id';
    END IF;

    IF v_shift_status = 'cancelled' THEN
      RAISE EXCEPTION 'Attendance cannot be recorded for cancelled shifts';
    END IF;

    IF v_assignment_status = 'cancelled' THEN
      RAISE EXCEPTION 'Attendance cannot be recorded for cancelled assignments';
    END IF;
  END IF;

  IF NEW.attendance_status IN ('present', 'late', 'left_early', 'completed')
     AND NEW.clock_in_at IS NULL THEN
    RAISE EXCEPTION 'Attendance status % requires clock_in_at', NEW.attendance_status;
  END IF;

  IF NEW.attendance_status IN ('completed', 'left_early')
     AND NEW.clock_out_at IS NULL THEN
    RAISE EXCEPTION 'Attendance status % requires clock_out_at', NEW.attendance_status;
  END IF;

  IF NEW.attendance_status IN ('scheduled', 'absent', 'no_show')
     AND (NEW.clock_in_at IS NOT NULL OR NEW.clock_out_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Attendance status % must not include clock timestamps', NEW.attendance_status;
  END IF;

  IF NEW.notes IS NOT NULL THEN
    NEW.notes := trim(NEW.notes);
    IF NEW.notes = '' THEN
      RAISE EXCEPTION 'Notes may not be blank';
    END IF;
  END IF;

  IF NEW.clock_in_at IS NOT NULL AND NEW.clock_out_at IS NOT NULL THEN
    IF NEW.clock_out_at < NEW.clock_in_at THEN
      RAISE EXCEPTION 'clock_out_at must be greater than or equal to clock_in_at';
    END IF;

    v_elapsed_minutes := (EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 60)::integer;
    IF NEW.break_minutes < 0 THEN
      RAISE EXCEPTION 'break_minutes must be zero or positive';
    END IF;
    IF NEW.break_minutes > v_elapsed_minutes THEN
      RAISE EXCEPTION 'break_minutes may not exceed elapsed clock duration';
    END IF;

    v_worked_minutes := v_elapsed_minutes - NEW.break_minutes;
    NEW.worked_minutes := GREATEST(v_worked_minutes, 0);
  ELSE
    NEW.worked_minutes := 0;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.version := OLD.version + 1;
  ELSE
    NEW.version := 1;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Restore trg_tasks_validate (original body: 012, security posture: 017)
CREATE OR REPLACE FUNCTION public.trg_tasks_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 3. Restore trg_leave_requests_validate (original body: 008, security posture: 017)
CREATE OR REPLACE FUNCTION public.trg_leave_requests_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Status transition validation: explicitly encode allowed transitions per previous state.
  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    CASE OLD.status
      WHEN 'pending' THEN
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

COMMENT ON FUNCTION public.trg_attendance_records_validate() IS 'Restores full validation/calculation logic dropped by migration 017; see 018_restore_migration_017_trigger_regressions.sql.';
COMMENT ON FUNCTION public.trg_tasks_validate() IS 'Restores full validation logic dropped by migration 017; see 018_restore_migration_017_trigger_regressions.sql.';
COMMENT ON FUNCTION public.trg_leave_requests_validate() IS 'Restores full validation logic dropped by migration 017; see 018_restore_migration_017_trigger_regressions.sql.';
