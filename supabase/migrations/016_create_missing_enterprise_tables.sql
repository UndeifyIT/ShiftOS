-- 016_create_missing_enterprise_tables.sql
-- Migration: Create remaining enterprise tables documented in DB-005
-- Purpose: Complete schema coverage for ShiftOS to make the database production-ready.

-- 1. Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_schedules_date_range CHECK (end_date >= start_date)
);

-- Ensure schedules composite unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'schedules' AND c.conname = 'uq_schedules_id_organization_id')
  THEN
    ALTER TABLE public.schedules
      ADD CONSTRAINT uq_schedules_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Ensure branch/employee composite unique target exist for foreign keys
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

-- Foreign Keys for schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedules' AND c.conname = 'fk_schedules_organization')
  THEN
    ALTER TABLE public.schedules
      ADD CONSTRAINT fk_schedules_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedules' AND c.conname = 'fk_schedules_branch')
  THEN
    ALTER TABLE public.schedules
      ADD CONSTRAINT fk_schedules_branch FOREIGN KEY (branch_id, organization_id)
        REFERENCES public.branches (id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique active schedules branch date range check (soft-delete aware)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_schedules_branch_active_dates')
  THEN
    CREATE UNIQUE INDEX uq_schedules_branch_active_dates
      ON public.schedules (branch_id, start_date, end_date)
      WHERE deleted_at IS NULL;
  END IF;
END$$;

-- 2. Create schedule_versions table
CREATE TABLE IF NOT EXISTS public.schedule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  version integer NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  changes_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_schedule_versions_positive CHECK (version >= 1)
);

-- Foreign Keys for schedule_versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_versions' AND c.conname = 'fk_schedule_versions_schedule')
  THEN
    ALTER TABLE public.schedule_versions
      ADD CONSTRAINT fk_schedule_versions_schedule FOREIGN KEY (schedule_id, organization_id)
        REFERENCES public.schedules (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_versions' AND c.conname = 'fk_schedule_versions_published_by')
  THEN
    ALTER TABLE public.schedule_versions
      ADD CONSTRAINT fk_schedule_versions_published_by FOREIGN KEY (published_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- 3. Create employee_history table
CREATE TABLE IF NOT EXISTS public.employee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure employees target unique index exists for composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_organization_id')
  THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign Keys for employee_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employee_history' AND c.conname = 'fk_employee_history_employee')
  THEN
    ALTER TABLE public.employee_history
      ADD CONSTRAINT fk_employee_history_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'employee_history' AND c.conname = 'fk_employee_history_changed_by')
  THEN
    ALTER TABLE public.employee_history
      ADD CONSTRAINT fk_employee_history_changed_by FOREIGN KEY (changed_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- 4. Create attendance_corrections table
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  original_status public.attendance_status_enum NOT NULL,
  original_clock_in timestamptz,
  original_clock_out timestamptz,
  corrected_status public.attendance_status_enum NOT NULL,
  corrected_clock_in timestamptz,
  corrected_clock_out timestamptz,
  reason text NOT NULL,
  approved_by uuid,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure attendance_records unique target exists for composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'attendance_records' AND c.conname = 'uq_attendance_records_id_organization_id')
  THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT uq_attendance_records_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign Keys for attendance_corrections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_corrections' AND c.conname = 'fk_attendance_corrections_record')
  THEN
    ALTER TABLE public.attendance_corrections
      ADD CONSTRAINT fk_attendance_corrections_record FOREIGN KEY (attendance_record_id, organization_id)
        REFERENCES public.attendance_records (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'attendance_corrections' AND c.conname = 'fk_attendance_corrections_approved_by')
  THEN
    ALTER TABLE public.attendance_corrections
      ADD CONSTRAINT fk_attendance_corrections_approved_by FOREIGN KEY (approved_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- 5. Create task_history table
CREATE TABLE IF NOT EXISTS public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  status public.task_status_enum NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Ensure tasks unique target exists for composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'tasks' AND c.conname = 'uq_tasks_id_organization_id')
  THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT uq_tasks_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign Keys for task_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'task_history' AND c.conname = 'fk_task_history_task')
  THEN
    ALTER TABLE public.task_history
      ADD CONSTRAINT fk_task_history_task FOREIGN KEY (task_id, organization_id)
        REFERENCES public.tasks (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'task_history' AND c.conname = 'fk_task_history_changed_by')
  THEN
    ALTER TABLE public.task_history
      ADD CONSTRAINT fk_task_history_changed_by FOREIGN KEY (changed_by)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- 6. Create announcement_acknowledgements table
CREATE TABLE IF NOT EXISTS public.announcement_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure announcements unique target exists for composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'announcements' AND c.conname = 'uq_announcements_id_organization_id')
  THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT uq_announcements_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

-- Foreign Keys for announcement_acknowledgements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'announcement_acknowledgements' AND c.conname = 'fk_announcement_acknowledgements_announcement')
  THEN
    ALTER TABLE public.announcement_acknowledgements
      ADD CONSTRAINT fk_announcement_acknowledgements_announcement FOREIGN KEY (announcement_id, organization_id)
        REFERENCES public.announcements (id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'announcement_acknowledgements' AND c.conname = 'fk_announcement_acknowledgements_employee')
  THEN
    ALTER TABLE public.announcement_acknowledgements
      ADD CONSTRAINT fk_announcement_acknowledgements_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE CASCADE;
  END IF;
END$$;

-- Unique constraint for active mapping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'announcement_acknowledgements' AND c.conname = 'uq_announcement_acknowledgements_announcement_employee')
  THEN
    ALTER TABLE public.announcement_acknowledgements
      ADD CONSTRAINT uq_announcement_acknowledgements_announcement_employee UNIQUE (announcement_id, employee_id);
  END IF;
END$$;

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CONSTRAINT chk_notifications_priority CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  channel text NOT NULL DEFAULT 'in_app' CONSTRAINT chk_notifications_channel CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure users target UNIQUE constraint exists for composite FK reference (id already pk, but needs unique constraint matching order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'users' AND c.conname = 'uq_users_id')
  THEN
    ALTER TABLE public.users
      ADD CONSTRAINT uq_users_id UNIQUE (id);
  END IF;
END$$;

-- Foreign Keys for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'notifications' AND c.conname = 'fk_notifications_user')
  THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'notifications' AND c.conname = 'fk_notifications_organization')
  THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;
END$$;

-- 8. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  channel text NOT NULL CONSTRAINT chk_notification_preferences_channel CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign Keys for notification_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'notification_preferences' AND c.conname = 'fk_notification_preferences_user')
  THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'notification_preferences' AND c.conname = 'fk_notification_preferences_organization')
  THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT fk_notification_preferences_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Unique preference setting channel per user/org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'notification_preferences' AND c.conname = 'uq_notification_preferences_user_channel')
  THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT uq_notification_preferences_user_channel UNIQUE (user_id, organization_id, channel);
  END IF;
END$$;

-- 9. Create notification_delivery_attempts table
CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  channel text NOT NULL CONSTRAINT chk_notification_delivery_attempts_channel CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  status text NOT NULL CONSTRAINT chk_notification_delivery_attempts_status CHECK (status IN ('pending', 'delivered', 'failed')),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);

-- Foreign Keys for notification_delivery_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'notification_delivery_attempts' AND c.conname = 'fk_notification_delivery_attempts_notification')
  THEN
    ALTER TABLE public.notification_delivery_attempts
      ADD CONSTRAINT fk_notification_delivery_attempts_notification FOREIGN KEY (notification_id)
        REFERENCES public.notifications (id) ON DELETE CASCADE;
  END IF;
END$$;

-- 10. Create security_events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign Keys for security_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'security_events' AND c.conname = 'fk_security_events_organization')
  THEN
    ALTER TABLE public.security_events
      ADD CONSTRAINT fk_security_events_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'security_events' AND c.conname = 'fk_security_events_user')
  THEN
    ALTER TABLE public.security_events
      ADD CONSTRAINT fk_security_events_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE SET NULL;
  END IF;
END$$;

-- Indexing for missing enterprise tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_schedules_organization_id') THEN
    CREATE INDEX idx_schedules_organization_id ON public.schedules (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_schedules_branch_id') THEN
    CREATE INDEX idx_schedules_branch_id ON public.schedules (branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_schedule_versions_schedule_id') THEN
    CREATE INDEX idx_schedule_versions_schedule_id ON public.schedule_versions (schedule_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_employee_history_employee_id') THEN
    CREATE INDEX idx_employee_history_employee_id ON public.employee_history (employee_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_attendance_corrections_record_id') THEN
    CREATE INDEX idx_attendance_corrections_record_id ON public.attendance_corrections (attendance_record_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_task_history_task_id') THEN
    CREATE INDEX idx_task_history_task_id ON public.task_history (task_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_announcement_acknowledgements_announcement_id') THEN
    CREATE INDEX idx_announcement_acknowledgements_announcement_id ON public.announcement_acknowledgements (announcement_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_notifications_user_id') THEN
    CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_notification_preferences_user_id') THEN
    CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'idx_security_events_organization_id') THEN
    CREATE INDEX idx_security_events_organization_id ON public.security_events (organization_id);
  END IF;
END$$;

-- Enable Row-Level Security on all new tables
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Attach updated_at triggers to schedules and notification preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_schedules_set_updated_at' AND c.relname = 'schedules')
  THEN
    CREATE TRIGGER trg_schedules_set_updated_at
      BEFORE UPDATE ON public.schedules
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_notification_preferences_set_updated_at' AND c.relname = 'notification_preferences')
  THEN
    CREATE TRIGGER trg_notification_preferences_set_updated_at
      BEFORE UPDATE ON public.notification_preferences
      FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
  END IF;
END$$;

-- Comments for database self-documentation
COMMENT ON TABLE public.schedules IS 'Operational scheduling containers holding weekly planning periods.';
COMMENT ON TABLE public.schedule_versions IS 'Audit snapshot references to schedules versions as they get published.';
COMMENT ON TABLE public.employee_history IS 'Historical log tracking previous values of employee record fields.';
COMMENT ON TABLE public.attendance_corrections IS 'Pre-audit log of administrative manual adjustments to employee clocks.';
COMMENT ON TABLE public.task_history IS 'Progression history tracking tasks state machine transitions.';
COMMENT ON TABLE public.announcement_acknowledgements IS 'Employee acknowledgement records (read receipts) for published announcements.';
COMMENT ON TABLE public.notifications IS 'Notification queue containing individual generated system communication records.';
COMMENT ON TABLE public.notification_preferences IS 'User-level configurations for active communication channels.';
COMMENT ON TABLE public.notification_delivery_attempts IS 'Low-level tracking queue of retries and delivery status of push/email/sms notifications.';
COMMENT ON TABLE public.security_events IS 'Audit logs capturing login/logout, session lifecycle events, and permission privilege escalations.';
