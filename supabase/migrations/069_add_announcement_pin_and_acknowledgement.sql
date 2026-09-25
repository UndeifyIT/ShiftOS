-- 069_add_announcement_pin_and_acknowledgement.sql (first added as 067; renumbered because PR 24 had already taken 067 — safe to re-run)
-- Migration: pinning, and whether an announcement asks to be acknowledged
-- Purpose: The design handoff's Announcements screen has two controls the
--   table could not answer. A pinned announcement sits at the top of the list
--   in its own warm card ("Pinned"), and the toolbar can filter down to those;
--   and the New announcement form asks "Require acknowledgement", which
--   decides whether a post is chasing a reply or simply telling people
--   something.
--
--   `announcement_acknowledgements` (016) already records who acknowledged
--   what. What was missing is the intent: without it, every post would be
--   shown as awaiting acknowledgement from everyone, which reads as a chase
--   list for announcements nobody was ever asked to answer.
--
-- Safety: additive only. Both columns default to false, so every existing row
--   keeps today's behaviour, and no constraint, trigger or policy changes.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS requires_acknowledgement boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.announcements.is_pinned IS 'Pinned announcements sort above the rest and are highlighted in the list.';
COMMENT ON COLUMN public.announcements.requires_acknowledgement IS 'Whether recipients are asked to acknowledge this announcement; drives the receipts panel and the reminder.';

-- Pinned lists are read constantly and are a tiny slice of the table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_announcements_pinned')
  THEN
    CREATE INDEX idx_announcements_pinned ON public.announcements (organization_id, is_pinned)
      WHERE deleted_at IS NULL AND is_pinned = true;
  END IF;
END$$;
