-- 038_fix_attendance_trigger_branch_column.sql
-- Migration: fix a real bug in trg_attendance_records_validate()
-- Purpose: 018_restore_migration_017_trigger_regressions.sql's restored
-- trigger body selects `a.branch_id` from shift_assignments (aliased `a`),
-- but shift_assignments has no branch_id column of its own — it's derived
-- through the parent shift (see ShiftAssignmentRepository's own header
-- comment). Every write to attendance_records failed with
-- `column a.branch_id does not exist` (Postgres error 42703). This went
-- undetected because attendance_records has had zero rows in the live
-- database until this backend-completion pass's live verification — no
-- service ever wrote to this table before.
--
-- The rest of the function (018's restored body) is otherwise correct and
-- unchanged; this migration only swaps the one wrong source column,
-- `a.branch_id` -> `s.branch_id` (the joined shifts row), matching
-- Postgres's own hint on the original error ("Perhaps you meant to
-- reference the column \"s.branch_id\"").

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

    -- Fixed: shift_assignments has no branch_id of its own; branch comes
    -- from the joined shift (s.branch_id), not the assignment row (a).
    SELECT s.branch_id,
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

COMMENT ON FUNCTION public.trg_attendance_records_validate() IS 'Validates/computes attendance_records rows (011, restored by 018, branch-column bug fixed by 038 — see this migration''s header for why shift_assignments has no branch_id of its own).';
