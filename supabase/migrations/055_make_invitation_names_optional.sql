-- 055_make_invitation_names_optional.sql
-- Migration: invite-a-member form no longer collects the invitee's name
-- (docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md §2 Phase 3,
-- Task 3). The invitee always provides their own name later, at
-- CompleteProfilePage, regardless of what the inviter typed here — so
-- `invitations.first_name`/`last_name` were pure redundant data entry.
--
-- Backward compatible: the columns are relaxed to nullable, not dropped or
-- renamed. Existing invitation rows already carrying a name (from before this
-- change) are completely unaffected — this migration only removes the
-- NOT NULL constraint going forward, it does not touch any row's data.
-- `invite_member`'s RPC input and MembershipService.inviteMember are updated
-- in the same change to stop requiring these fields; the columns remain for
-- any invitation that already has a name on file, and in case a future
-- feature wants to let an inviter optionally supply one again.

ALTER TABLE public.invitations ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.invitations ALTER COLUMN last_name DROP NOT NULL;

COMMENT ON COLUMN public.invitations.first_name IS
  'Optional. No longer collected by the invite-a-member form (055) — the invitee sets their own name at CompleteProfilePage after accepting. Nullable for every invitation created from here on; rows created before 055 may still carry the name the inviter typed at the time.';
COMMENT ON COLUMN public.invitations.last_name IS
  'Optional. No longer collected by the invite-a-member form (055) — the invitee sets their own name at CompleteProfilePage after accepting. Nullable for every invitation created from here on; rows created before 055 may still carry the name the inviter typed at the time.';
