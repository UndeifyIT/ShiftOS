-- 032_fix_shift_published_at_constraint_and_publish_cascade.sql
-- Migration: allow cancelling/archiving a shift that was never published
-- Purpose: chk_shifts_published_at_lifecycle (005) requires published_at IS
-- NOT NULL for any status other than 'draft'/'scheduled' — including
-- 'cancelled' and 'archived'. But SchedulingService.cancelShift()/
-- archiveShift() (packages/services/src/scheduling/schedulingService.ts)
-- can transition a shift directly from 'draft' to 'cancelled'/'archived'
-- without ever publishing it, which is a completely normal operation (a
-- Supervisor drafts a shift, then decides to cancel or remove it before
-- publishing). That UPDATE would violate this CHECK constraint at the
-- database level today — found by code audit, not by triggering it live
-- (this session has no reachable database). Fixing the constraint's
-- semantics rather than fabricating a published_at timestamp for a shift
-- that was, factually, never published: 'cancelled'/'archived' no longer
-- require published_at either way — it stays NULL if the shift was
-- cancelled/archived while still in draft, and stays whatever it was if the
-- shift had already been published first.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_published_at_lifecycle'
      AND pg_get_constraintdef(c.oid) LIKE '%cancelled%archived%')
  THEN
    -- Already the new (post-032) definition — nothing to do.
    NULL;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'shifts' AND c.conname = 'chk_shifts_published_at_lifecycle')
    THEN
      ALTER TABLE public.shifts
        DROP CONSTRAINT chk_shifts_published_at_lifecycle;
    END IF;

    ALTER TABLE public.shifts
      ADD CONSTRAINT chk_shifts_published_at_lifecycle CHECK (
        (status IN ('draft', 'scheduled') AND published_at IS NULL)
        OR (status IN ('published', 'active', 'completed') AND published_at IS NOT NULL)
        OR (status IN ('cancelled', 'archived'))
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT chk_shifts_published_at_lifecycle ON public.shifts IS
  'published_at is required once a shift is published/active/completed, and forbidden while still draft/scheduled. cancelled/archived are exempt either way: a shift can be cancelled or archived either before it was ever published (published_at stays NULL) or after (published_at keeps its original value).';
