-- 007_create_attendance_records.sql
-- Migration: create attendance_records table
-- Implements: DB-005, DB-006, DB-007, DB-008, SEC-004, ATT-001, ATT-002, ATT-003
-- This migration creates the tenant-owned attendance_records table used for recording attendance against scheduled shift assignments.

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
      'on_leave',
      'pending_review',
      'corrected',
      'partially_present',
      'excused'
    );
  END IF;
END$$;

-- Create attendance source enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_source_enum') THEN
    CREATE TYPE public.attendance_source_enum AS ENUM (
      'manual',
      'automatic'
    );
  END IF;
END$$;

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  shift_assignment_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  attendance_status public.attendance_status_enum NOT NULL DEFAULT 'scheduled',
  attendance_source public.attendance_source_enum NOT NULL DEFAULT 'manual',
  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz NOT NULL,
  scheduled_duration interval NOT NULL DEFAULT interval '00:00:00',
  actual_clock_in timestamptz,
  actual_clock_out timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  worked_duration interval NOT NULL DEFAULT interval '00:00:00',
  overtime_duration interval NOT NULL DEFAULT interval '00:00:00',
  late_minutes integer NOT NULL DEFAULT 0,
  early_leave_minutes integer NOT NULL DEFAULT 0,
  absence_reason text,
  correction_reason text,
  corrected_by uuid,
  corrected_at timestamptz,
  created_by uuid,
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'shift_assignments' AND c.conname = 'uq_shift_assignments_id_organization_id')
  THEN
    ALTER TABLE public.shift_assignments
      ADD CONSTRAINT uq_shift_assignments_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

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
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_shift_assignment')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_shift_assignment FOREIGN KEY (shift_assignment_id, organization_id)
        REFERENCES public.shift_assignments (id, organization_id) ON DELETE CASCADE;
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
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_shift')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_shift FOREIGN KEY (shift_id, organization_id)
        REFERENCES public.shifts (id, organization_id) ON DELETE RESTRICT;
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
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_corrected_by')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_corrected_by FOREIGN KEY (corrected_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_records' AND c.conname = 'fk_attendance_records_created_by')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_attendance_records_created_by FOREIGN KEY (created_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- Unique active attendance record per shift assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'uq_attendance_records_shift_assignment')
  THEN
    CREATE UNIQUE INDEX uq_attendance_records_shift_assignment
      ON public.attendance_records (shift_assignment_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Validate attendance data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_scheduled_range')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_scheduled_range CHECK (
        scheduled_end_at > scheduled_start_at
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_clock_order')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_clock_order CHECK (
        actual_clock_out IS NULL
        OR (actual_clock_in IS NOT NULL AND actual_clock_out > actual_clock_in)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_non_negative_minutes')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_non_negative_minutes CHECK (
        break_minutes >= 0
        AND break_minutes <= 1440
        AND late_minutes >= 0
        AND early_leave_minutes >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_non_negative_durations')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_non_negative_durations CHECK (
        worked_duration >= interval '00:00:00'
        AND overtime_duration >= interval '00:00:00'
        AND scheduled_duration >= interval '00:00:00'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_scheduled_duration')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_scheduled_duration CHECK (
        scheduled_duration = scheduled_end_at - scheduled_start_at
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_absence_reason_required')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_absence_reason_required CHECK (
        attendance_status NOT IN ('absent', 'excused', 'on_leave')
        OR (absence_reason IS NOT NULL AND trim(absence_reason) <> '')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'attendance_records' AND c.conname = 'chk_attendance_records_correction_consistency')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_records_correction_consistency CHECK (
        (attendance_status = 'corrected' AND corrected_by IS NOT NULL AND corrected_at IS NOT NULL AND correction_reason IS NOT NULL)
        OR (attendance_status != 'corrected' AND corrected_by IS NULL AND corrected_at IS NULL AND correction_reason IS NULL)
      );
  END IF;
END$$;

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_organization_id') THEN
    CREATE INDEX idx_attendance_records_organization_id ON public.attendance_records (organization_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_branch_id') THEN
    CREATE INDEX idx_attendance_records_branch_id ON public.attendance_records (branch_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_shift_assignment_id') THEN
    CREATE INDEX idx_attendance_records_shift_assignment_id ON public.attendance_records (shift_assignment_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_shift_id') THEN
    CREATE INDEX idx_attendance_records_shift_id ON public.attendance_records (shift_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_employee_id') THEN
    CREATE INDEX idx_attendance_records_employee_id ON public.attendance_records (employee_id)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_status') THEN
    CREATE INDEX idx_attendance_records_status ON public.attendance_records (attendance_status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_leave_status_scheduled_start') THEN
    CREATE INDEX idx_attendance_records_status_scheduled_date ON public.attendance_records (attendance_status, scheduled_start_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_branch_start_date') THEN
    CREATE INDEX idx_attendance_records_branch_scheduled_date ON public.attendance_records (branch_id, scheduled_start_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_scheduled_start_at') THEN
    CREATE INDEX idx_attendance_records_scheduled_start_at ON public.attendance_records (scheduled_start_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_scheduled_end_at') THEN
    CREATE INDEX idx_attendance_records_scheduled_end_at ON public.attendance_records (scheduled_end_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_org_branch_start') THEN
    CREATE INDEX idx_attendance_records_organization_branch_start_at ON public.attendance_records (organization_id, branch_id, scheduled_start_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_employee_status') THEN
    CREATE INDEX idx_attendance_records_employee_status ON public.attendance_records (employee_id, attendance_status)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_employee_start_date') THEN
    CREATE INDEX idx_attendance_records_employee_scheduled_date ON public.attendance_records (employee_id, scheduled_start_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_created_at') THEN
    CREATE INDEX idx_attendance_records_created_at ON public.attendance_records (created_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_updated_at') THEN
    CREATE INDEX idx_attendance_records_updated_at ON public.attendance_records (updated_at)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_created_by') THEN
    CREATE INDEX idx_attendance_records_created_by ON public.attendance_records (created_by)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_attendance_records_corrected_by') THEN
    CREATE INDEX idx_attendance_records_corrected_by ON public.attendance_records (corrected_by)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

COMMENT ON TABLE public.attendance_records IS 'Tenant-owned attendance records for scheduled shift assignments, used for audit, reporting and workforce analytics.';
COMMENT ON COLUMN public.attendance_records.shift_assignment_id IS 'Reference to the scheduled shift assignment for this attendance record.';
COMMENT ON COLUMN public.attendance_records.shift_id IS 'Reference to the scheduled shift associated with this attendance event.';
COMMENT ON COLUMN public.attendance_records.employee_id IS 'Reference to the employee whose attendance is recorded.';
COMMENT ON COLUMN public.attendance_records.attendance_status IS 'Current attendance state for the scheduled shift assignment.';
COMMENT ON COLUMN public.attendance_records.attendance_source IS 'How the attendance event was captured.';
COMMENT ON COLUMN public.attendance_records.scheduled_start_at IS 'Snapshot of the scheduled start timestamp for the assigned shift.';
COMMENT ON COLUMN public.attendance_records.scheduled_end_at IS 'Snapshot of the scheduled end timestamp for the assigned shift.';
COMMENT ON COLUMN public.attendance_records.actual_clock_in IS 'Actual clock-in timestamp recorded for this attendance event.';
COMMENT ON COLUMN public.attendance_records.actual_clock_out IS 'Actual clock-out timestamp recorded for this attendance event.';
COMMENT ON COLUMN public.attendance_records.worked_duration IS 'Recorded worked duration for the attendance event.';
COMMENT ON COLUMN public.attendance_records.overtime_duration IS 'Recorded overtime duration earned during the attendance event.';
COMMENT ON COLUMN public.attendance_records.late_minutes IS 'Number of minutes the employee arrived late for the scheduled shift.';
COMMENT ON COLUMN public.attendance_records.early_leave_minutes IS 'Number of minutes the employee left before the scheduled end of the shift.';
COMMENT ON COLUMN public.attendance_records.absence_reason IS 'Optional reason for an absence when the employee did not attend the scheduled shift.';
COMMENT ON COLUMN public.attendance_records.correction_reason IS 'Optional explanation for why this attendance record was corrected.';
COMMENT ON COLUMN public.attendance_records.corrected_by IS 'User who corrected the attendance record.';
COMMENT ON COLUMN public.attendance_records.corrected_at IS 'Timestamp when the attendance correction was recorded.';
COMMENT ON COLUMN public.attendance_records.created_by IS 'User who created the attendance record.';
COMMENT ON COLUMN public.attendance_records.deleted_at IS 'Soft delete timestamp. Attendance history is retained for audit and reporting.';

-- Row-Level Security (RLS)
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Attach `updated_at` trigger to attendance_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_attendance_records_set_updated_at' AND c.relname = 'attendance_records')
  THEN
    CREATE TRIGGER trg_attendance_records_set_updated_at
      BEFORE UPDATE ON public.attendance_records
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;
