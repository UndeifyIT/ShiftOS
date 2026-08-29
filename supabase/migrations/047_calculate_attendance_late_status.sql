-- 047_calculate_attendance_late_status.sql
-- Migration: implement automatic late-status calculation for attendance
-- records (ATT-005 Late Rules), closing a gap the schema left as a
-- placeholder since 011: late_minutes was hardcoded to 0 on every write
-- (see 011/018/038's own trg_attendance_records_validate — the column's
-- own comment even says "will be calculated by a future attendance
-- engine"), and AttendanceRecordRepository.clockIn() always set
-- attendance_status to 'present' unconditionally, never 'late', regardless
-- of the shift's actual scheduled start time. Every attendance record in
-- the live database has late_minutes = 0 today, including ones recorded
-- well after their shift's start time — there was no "generic timeline"
-- being used either; nothing was being calculated at all.
--
-- Per ATT-005: an employee is late when their clock-in exceeds the
-- scheduled shift start plus an optional grace period. No grace period is
-- configured anywhere in this schema yet, so the documented default
-- applies (section 4: "If no grace period is configured, lateness begins
-- immediately after the scheduled start time") — 0 minutes grace. Section
-- 6: late status is system-calculated only; "Users cannot manually assign
-- or remove a Late classification" — so this recomputes attendance_status
-- (choosing only between 'present'/'late') and late_minutes from the
-- actual clock_in_at whenever a caller writes a 'present'/'late' status
-- with a clock-in time present, rather than trusting whichever of the two
-- the caller sent. That covers both a normal clock-in (clockIn() always
-- sends 'present') and a correction that adjusts the clock-in time — the
-- system still decides late vs. on-time from the corrected time, matching
-- "Override Late Status: Deny" in section 8. Every other status
-- (absent/no_show/left_early/completed/scheduled) and every other
-- validation this trigger already performs is untouched; clocking out
-- (which moves 'late'/'present' to 'completed') preserves the already
-- computed late_minutes rather than erasing it, since lateness reporting
-- (section 7) needs it after the shift ends too.
--
-- The scheduled start is the shift's shift_date+start_time, interpreted as
-- wall-clock time in the branch's own configured time zone
-- (branches.settings->>'timeZone', collected by the Add/Edit Branch
-- frontend fix landing alongside this migration) via Postgres's own
-- AT TIME ZONE, which accounts for DST using the server's own tzdata. A
-- branch with no time zone configured (any branch created before that
-- frontend fix, or one where it was left blank) falls back to UTC — a
-- deliberate, visible default rather than silently guessing the server's
-- or a viewer's own zone. An unrecognized time zone string falls back to
-- UTC the same way, so a bad value can never make clock-in itself fail.

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
  v_shift_date date;
  v_shift_start_time time;
  v_branch_time_zone text;
  v_scheduled_start timestamptz;
  v_worked_minutes integer;
  v_elapsed_minutes integer;
  v_late_minutes integer;
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

    -- Extended (047) to also pull the shift's scheduled start and the
    -- branch's configured time zone, needed for the late-status
    -- calculation below.
    SELECT s.branch_id,
           a.employee_id,
           a.assignment_status,
           a.deleted_at,
           s.status,
           s.deleted_at,
           s.shift_date,
           s.start_time,
           b.settings->>'timeZone'
      INTO v_assignment_branch_id,
           v_assignment_employee_id,
           v_assignment_status,
           v_assignment_deleted,
           v_shift_status,
           v_shift_deleted,
           v_shift_date,
           v_shift_start_time,
           v_branch_time_zone
    FROM public.shift_assignments a
    JOIN public.shifts s ON s.id = a.shift_id AND s.organization_id = a.organization_id
    JOIN public.branches b ON b.id = s.branch_id AND b.organization_id = a.organization_id
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

    IF NEW.clock_in_at IS NULL THEN
      NEW.late_minutes := 0;
    ELSIF NEW.attendance_status IN ('present', 'late') THEN
      BEGIN
        v_scheduled_start := (v_shift_date + v_shift_start_time) AT TIME ZONE COALESCE(v_branch_time_zone, 'UTC');
      EXCEPTION WHEN OTHERS THEN
        -- Unrecognized time zone string — fall back to UTC rather than
        -- letting a bad settings value make clock-in itself fail.
        v_scheduled_start := (v_shift_date + v_shift_start_time) AT TIME ZONE 'UTC';
      END;
      v_late_minutes := GREATEST(0, (EXTRACT(EPOCH FROM (NEW.clock_in_at - v_scheduled_start)) / 60)::integer);
      NEW.late_minutes := v_late_minutes;
      NEW.attendance_status := CASE WHEN v_late_minutes > 0 THEN 'late' ELSE 'present' END;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.late_minutes := OLD.late_minutes;
    ELSE
      NEW.late_minutes := 0;
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

COMMENT ON FUNCTION public.trg_attendance_records_validate() IS 'Validates/computes attendance_records rows (011, restored by 018, branch-column bug fixed by 038, late-status calculation added by 047 — see each migration''s header).';
