-- 034_add_invitation_fk_indexes.sql
-- Migration: index the foreign key columns 031 left uncovered
-- Purpose: Supabase's performance advisor flagged fk_invitations_role,
-- fk_invitations_invited_by, fk_invitations_accepted_by,
-- fk_invitations_revoked_by, and fk_invitation_branch_access_branch as
-- foreign keys without a covering index — Postgres does not automatically
-- index the referencing side of a FK, only the referenced side. Real gap in
-- 031, not pre-existing schema (unlike the similar shifts.fk_shifts_branch/
-- fk_shifts_template findings from migration 005, left untouched here —
-- out of this migration's scope). InvitationRepository.listWithRole() joins
-- on role_id and invited_by for every call, so this is a genuine, not
-- theoretical, query pattern.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_invitations_role_id') THEN
    CREATE INDEX idx_invitations_role_id ON public.invitations (role_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_invitations_invited_by') THEN
    CREATE INDEX idx_invitations_invited_by ON public.invitations (invited_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_invitations_accepted_by') THEN
    CREATE INDEX idx_invitations_accepted_by ON public.invitations (accepted_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_invitations_revoked_by') THEN
    CREATE INDEX idx_invitations_revoked_by ON public.invitations (revoked_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_invitation_branch_access_branch_id') THEN
    CREATE INDEX idx_invitation_branch_access_branch_id ON public.invitation_branch_access (branch_id);
  END IF;
END$$;
