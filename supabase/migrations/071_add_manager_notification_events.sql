-- 071_add_manager_notification_events.sql
-- Migration: the rest of the design handoff's Settings → Notifications rows
--
-- The handoff (ShiftOS Dashboards.dc.html, STNG_NOTIFICATIONS) lets a manager
-- or supervisor switch six events on or off: coverage gaps, an unpublished
-- schedule, absences, leave requests, a weekly acknowledgement digest and
-- invitations. 067 only knew the three events staff receive. This widens
-- notification_event_preferences to all nine, and adds the dispatch log the
-- scheduled notifications use so each one is sent once — the unpublished
-- schedule reminder, the weekly digest and invitation outcomes are found by
-- a job rather than triggered by a request, and the log is what stops two
-- runs (or two server instances) sending the same thing twice.

ALTER TABLE public.notification_event_preferences DROP CONSTRAINT IF EXISTS chk_notification_event_preferences_event;
ALTER TABLE public.notification_event_preferences
  ADD CONSTRAINT chk_notification_event_preferences_event CHECK (event_type IN (
    'swap_updates', 'leave_decisions', 'announcement_reminders',
    'coverage_gaps', 'unpublished_schedule', 'absences', 'leave_requests', 'announcement_digest', 'invitations'
  ));

CREATE TABLE IF NOT EXISTS public.notification_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
  -- What was sent, e.g. 'unpublished:<schedule id>' or 'digest:<user id>:2026-W39'.
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_dispatches UNIQUE (organization_id, dedupe_key)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notification_dispatches_organization') THEN
    ALTER TABLE public.notification_dispatches
      ADD CONSTRAINT fk_notification_dispatches_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE CASCADE;
  END IF;
END$$;

-- Written only by the server's scheduled job; no one reads it from the app.
ALTER TABLE public.notification_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notification_dispatches ON public.notification_dispatches;
CREATE POLICY tenant_isolation_notification_dispatches ON public.notification_dispatches
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));
