-- 056_detect_multiple_pending_invitations.sql
-- Migration: Task 4 (docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md
-- §2 Phase 5) -- the "second organization's invite silently becomes
-- unreachable" edge case.
--
-- get_pending_invitation() (044, hardened in 045) and accept_invitation()
-- (031, hardened in 033) already agree on which single invitation wins for a
-- given verified email: both prefer a still-pending, unexpired row, and
-- both break ties the same way (`ORDER BY created_at DESC`), so they never
-- disagree with each other. But neither has ever told the invitee that a
-- *second* pending-and-unexpired invitation (to a different organization)
-- exists. Today that second invite just sits there, silently unreachable,
-- while the invitee accepts the first without ever knowing there was a
-- choice to make -- and once the first is accepted (status flips to
-- 'accepted'), the second becomes the new ORDER BY winner and would be
-- auto-accepted on the invitee's *next* session bootstrap (SessionProvider
-- calls accept_invitation() unconditionally on every bootstrap -- see its
-- own comment), with no preview and no password step. That auto-join
-- behavior is out of scope for this migration to change; this migration
-- only makes the *existing* single-winner behavior visible instead of
-- silent.
--
-- Fix chosen (see Task 4's report for the full reasoning): the smallest
-- well-contained option. get_pending_invitation() gains a new
-- `has_other_pending_invitations` boolean, true when the caller's verified
-- email has more than one pending-and-unexpired invitation (i.e. there is
-- at least one *besides* the one this function is about to return).
-- AcceptInvitationPage shows a dedicated "you have more than one pending
-- invitation -- contact support" state instead of the normal accept form
-- when this is true, rather than silently completing acceptance of only
-- one of them.
--
-- accept_invitation() is deliberately NOT changed here: it still takes zero
-- parameters and resolves role/org/branch purely from the caller's own
-- verified email match against `invitations`, exactly as hardened in 033.
-- Letting a client choose which of several invitations to accept would
-- require a client-supplied invitation id threaded through
-- SessionProvider's unconditional per-bootstrap accept_invitation() call
-- for every signed-in user, not just this rare multi-invite edge case --
-- materially larger than this task's scope, and the brief accepts "at
-- minimum show a clear message" as a valid outcome.

-- Postgres refuses CREATE OR REPLACE when the OUT-parameter row type itself
-- changes (adding has_other_pending_invitations below) -- "cannot change
-- return type of existing function" -- so the old signature must be dropped
-- first. No other object depends on this function's return type (it is only
-- ever called via PostgREST's RPC route, not referenced by other SQL), so
-- this is safe.
DROP FUNCTION IF EXISTS public.get_pending_invitation();

CREATE FUNCTION public.get_pending_invitation()
RETURNS TABLE (
  organization_name text,
  role_name text,
  branch_names text[],
  invited_by_name text,
  expires_at timestamptz,
  status text,
  has_other_pending_invitations boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_invitation record;
  v_pending_count integer;
BEGIN
  SELECT email INTO v_user_email FROM public.users WHERE auth_user_id = auth.uid();
  IF v_user_email IS NULL THEN
    v_user_email := lower(auth.jwt() ->> 'email');
  END IF;
  IF v_user_email IS NULL THEN
    RETURN;
  END IF;

  SELECT
    i.id,
    i.status,
    i.expires_at,
    o.name AS org_name,
    r.name AS role_nm,
    u.first_name AS inviter_first,
    u.last_name AS inviter_last
  INTO v_invitation
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  JOIN public.roles r ON r.id = i.role_id
  JOIN public.users u ON u.id = i.invited_by
  WHERE lower(i.email) = lower(v_user_email)
  ORDER BY (i.status = 'pending' AND i.expires_at > now()) DESC, i.created_at DESC
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_pending_count
  FROM public.invitations i
  WHERE lower(i.email) = lower(v_user_email)
    AND i.status = 'pending'
    AND i.expires_at > now();

  RETURN QUERY
  SELECT
    v_invitation.org_name,
    v_invitation.role_nm,
    COALESCE(
      ARRAY(
        SELECT b.name
        FROM public.invitation_branch_access iba
        JOIN public.branches b ON b.id = iba.branch_id
        WHERE iba.invitation_id = v_invitation.id
      ),
      ARRAY[]::text[]
    ),
    v_invitation.inviter_first || ' ' || v_invitation.inviter_last,
    v_invitation.expires_at,
    CASE
      WHEN v_invitation.status = 'pending' AND v_invitation.expires_at <= now() THEN 'expired'
      ELSE v_invitation.status
    END,
    v_pending_count > 1;
END;
$$;

COMMENT ON FUNCTION public.get_pending_invitation() IS
  'Read-only preview of the current authenticated identity''s most relevant invitation. Matches by the caller''s own verified email, resolved server-side -- prefers public.users.auth_user_id -> email when a profile row already exists, and falls back to the JWT''s own email claim (auth.jwt() ->> ''email'') for a genuinely new invitee who is authenticated but has no public.users row yet (that row is only created later, by Complete Profile). Never trusts a client-supplied email or JWT claim value from request parameters -- both resolution paths read only server-verified identity. Prefers a still-pending, unexpired invitation over a newer accepted/revoked one for the same email, matching accept_invitation()''s own filter (031/033). Returns organization/role/branch/inviter/expiry plus a computed status (pending/accepted/revoked/expired) so the Accept Invitation screen can render the right card and state before the invitee submits a password. has_other_pending_invitations (056) is true when more than one pending-and-unexpired invitation exists for this email across different organizations -- accept_invitation() only ever accepts the single most-recent one, so the frontend uses this flag to warn the invitee instead of silently completing just one of them. Unlike accept_invitation(), never mutates public.invitations and does not filter out non-pending or expired rows -- the frontend needs those to render "already accepted"/"expired" states.';

-- The DROP FUNCTION above also drops its grants (044/045) -- reinstated here
-- identically: never callable by anon (auth.uid() would just be null for an
-- unauthenticated caller anyway), callable by any authenticated user.
REVOKE ALL ON FUNCTION public.get_pending_invitation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pending_invitation() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_invitation() TO authenticated;
