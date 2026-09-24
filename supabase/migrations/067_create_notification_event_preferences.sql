-- 067_create_notification_event_preferences.sql
-- Migration: per-event notification preferences
--
-- The design handoff's Settings → Notifications tab (ShiftOS Dashboards.dc.html,
-- "Manager/Settings") is a "notify me about" matrix: one row per kind of
-- event, one toggle per channel. notification_preferences (016) only holds
-- one switch per channel for the whole account, so a row could not be
-- turned off on its own. This adds the per-event switches for the events
-- ShiftOS actually sends today — notify() calls from ShiftSwapService,
-- LeaveRequestService and AnnouncementService — and notify() now checks
-- them. No row means enabled, like notification_preferences. The
-- account-wide channel switch still applies on top.

CREATE TABLE IF NOT EXISTS public.notification_event_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL
    CONSTRAINT chk_notification_event_preferences_event CHECK (event_type IN ('swap_updates', 'leave_decisions', 'announcement_reminders')),
  channel text NOT NULL
    CONSTRAINT chk_notification_event_preferences_channel CHECK (channel IN ('in_app', 'email')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_event_preferences UNIQUE (user_id, organization_id, event_type, channel)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notification_event_preferences_user') THEN
    ALTER TABLE public.notification_event_preferences
      ADD CONSTRAINT fk_notification_event_preferences_user FOREIGN KEY (user_id)
        REFERENCES public.users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notification_event_preferences_organization') THEN
    ALTER TABLE public.notification_event_preferences
      ADD CONSTRAINT fk_notification_event_preferences_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;
END$$;

ALTER TABLE public.notification_event_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_notification_event_preferences ON public.notification_event_preferences;
CREATE POLICY tenant_isolation_notification_event_preferences ON public.notification_event_preferences
  FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()))
  WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));
