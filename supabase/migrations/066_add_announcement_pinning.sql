-- 066_add_announcement_pinning.sql
-- Migration: pin an announcement to the top of the list
--
-- The design handoff's Announcements page (ShiftOS Dashboards.dc.html,
-- "Manager/Announcements") shows a "Pinned" badge, a "Pinned" filter chip and
-- a "Pin to top" choice in the New announcement dialog. announcements had no
-- such column. It defaults to false so every existing row stays unpinned.
-- No permission catalog changes: pinning reuses announcements.create/update.

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
