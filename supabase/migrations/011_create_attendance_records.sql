-- 011_create_attendance_records.sql
-- Migration: create attendance_records table
-- Purpose: Tenant-owned attendance records for scheduled shift assignments with audit, branch, and organization integrity.

-- Ensure pgcrypto for gen_random_uuid() is available (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

-- Create attendance status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
    CREATE TYPE public.attendance_status_enum AS ENUM (
      'scheduled',
      'present',
      'late',
      'absent',
      'no_show',
      'left_early',
      'completed'
    );
  END IF;
END$$;

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  shift_assignment_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  attendance_status public.attendance_status_enum NOT NULL DEFAULT 'scheduled',
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  late_minutes integer NOT NULL DEFAULT 0,
  early_departure_minutes integer NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid NOT NULL,
  updated_by uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_organization')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_branch')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_shift_assignment')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_shift_assignment FOREIGN KEY (shift_assignment_id, organization_id)
        REFERENCES public.shift_assignments (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_employee')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_recorded_by')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_recorded_by FOREIGN KEY (recorded_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_updated_by')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_updated_by FOREIGN KEY (updated_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique attendance record per shift assignment within an organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_attendance_records_org_shift_assignment')
  THEN
    CREATE UNIQUE INDEX uq_attendance_records_org_shift_assignment
      ON public.attendance_records (organization_id, shift_assignment_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_version_positive')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_version_positive CHECK (version >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_updated_at_order')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_updated_at_order CHECK (
        updated_at >= created_at
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_clock_order')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_clock_order CHECK (
        clock_out_at IS NULL
        OR (clock_in_at IS NOT NULL AND clock_out_at >= clock_in_at)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_non_negative_minutes')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_non_negative_minutes CHECK (
        break_minutes >= 0
        AND worked_minutes >= 0
        AND overtime_minutes >= 0
        AND late_minutes >= 0
        AND early_departure_minutes >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_notes_trimmed')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_notes_trimmed CHECK (
        notes IS NULL
        OR (trim(notes) <> '' AND notes = trim(notes))
      );
  END IF;
END$$;

-- Indexes for active attendance records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_employee_id')
  THEN
    CREATE INDEX idx_attendance_records_employee_id ON public.attendance_records (employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_org_created_at')
  THEN
    CREATE INDEX idx_attendance_records_org_created_at ON public.attendance_records (organization_id, created_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_branch_created_at')
  THEN
    CREATE INDEX idx_attendance_records_branch_created_at ON public.attendance_records (branch_id, created_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_shift_assignment_id')
  THEN
    CREATE INDEX idx_attendance_records_shift_assignment_id ON public.attendance_records (shift_assignment_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_status')
  THEN
    CREATE INDEX idx_attendance_records_status ON public.attendance_records (attendance_status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Comments
COMMENT ON TABLE public.attendance_records IS 'Tenant-owned attendance records for scheduled shift assignments with audit and branch and organization integrity.';
COMMENT ON COLUMN public.attendance_records.branch_id IS 'Branch scope for the attendance event; must match the associated shift, employee, and assignment.';
COMMENT ON COLUMN public.attendance_records.shift_assignment_id IS 'Reference to the scheduled shift assignment for this attendance event.';
COMMENT ON COLUMN public.attendance_records.employee_id IS 'Reference to the employee whose attendance is recorded.';
COMMENT ON COLUMN public.attendance_records.attendance_status IS 'Current attendance state for this shift assignment.';
COMMENT ON COLUMN public.attendance_records.clock_in_at IS 'Timestamp when the employee clocked in for the attendance event.';
COMMENT ON COLUMN public.attendance_records.clock_out_at IS 'Timestamp when the employee clocked out for the attendance event.';
COMMENT ON COLUMN public.attendance_records.break_minutes IS 'Unpaid break duration in minutes for this attendance event.';
COMMENT ON COLUMN public.attendance_records.worked_minutes IS 'Calculated worked minutes based on clock-in/clock-out timestamps minus break minutes. This value is owned by the database.';
COMMENT ON COLUMN public.attendance_records.overtime_minutes IS 'Overtime minutes recorded for this attendance event. This field is database-owned and will be calculated by a future attendance engine.';
COMMENT ON COLUMN public.attendance_records.early_departure_minutes IS 'Minutes the employee left before the scheduled end of the shift. This field is database-owned and will be calculated by a future attendance engine.';
COMMENT ON COLUMN public.attendance_records.late_minutes IS 'Minutes the employee arrived after the scheduled start of the shift. This field is database-owned and will be calculated by a future attendance engine.';
COMMENT ON COLUMN public.attendance_records.notes IS 'Optional notes for the attendance event; blank notes are not permitted.';
COMMENT ON COLUMN public.attendance_records.recorded_by IS 'Organization member who recorded the attendance event.';
COMMENT ON COLUMN public.attendance_records.updated_by IS 'Organization member who last updated the attendance record.';
COMMENT ON COLUMN public.attendance_records.version IS 'Optimistic concurrency version. Applications should enforce version matching on updates.';
COMMENT ON COLUMN public.attendance_records.created_at IS 'Timestamp when the attendance record was created.';
COMMENT ON COLUMN public.attendance_records.updated_at IS 'Timestamp when the attendance record was last updated.';
COMMENT ON COLUMN public.attendance_records.deleted_at IS 'Soft delete timestamp. Deleted attendance rows are retained for audit and reporting.';

-- Trigger: validate attendance lifecycle, audit immutability, and database-controlled attendance calculations
CREATE OR REPLACE FUNCTION public.trg_attendance_records_validate()
RETURNS trigger
LANGUAGE plpgsql
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

-- Triggers: create with numeric prefixes to make order explicit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_20_attendance_records_validate' AND c.relname = 'attendance_records')
  THEN
    CREATE TRIGGER trg_20_attendance_records_validate
      BEFORE INSERT OR UPDATE ON public.attendance_records
      FOR EACH ROW EXECUTE FUNCTION public.trg_attendance_records_validate();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_90_attendance_records_set_updated_at' AND c.relname = 'attendance_records')
  THEN
    CREATE TRIGGER trg_90_attendance_records_set_updated_at
      BEFORE UPDATE ON public.attendance_records
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
