-- 070_add_shift_note_category_and_handover.sql
-- Migration: categorise shift notes and mark which ones go into the handover
--
-- The design handoff's Shift Notes page (ShiftOS Dashboards.dc.html,
-- "Supervisor/Shift Notes") files each note under Handover, Incident,
-- Inventory or Staffing, and has an "Include in handover" switch that decides
-- whether the next supervisor is shown it. shift_notes (036) had neither.
-- Existing rows become Handover notes that are in the handover, which is what
-- they were written as. No permission catalog changes: both columns are set
-- through shiftnotes.create like the note itself.

ALTER TABLE public.shift_notes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'handover';
ALTER TABLE public.shift_notes ADD COLUMN IF NOT EXISTS include_in_handover boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'c' AND t.relname = 'shift_notes' AND c.conname = 'chk_shift_notes_category')
  THEN
    ALTER TABLE public.shift_notes
      ADD CONSTRAINT chk_shift_notes_category CHECK (category IN ('handover', 'incident', 'inventory', 'staffing'));
  END IF;
END$$;

-- The branch-wide list reads a branch's recent notes newest first.
CREATE INDEX IF NOT EXISTS idx_shift_notes_branch_created ON public.shift_notes (organization_id, branch_id, created_at DESC) WHERE deleted_at IS NULL;
