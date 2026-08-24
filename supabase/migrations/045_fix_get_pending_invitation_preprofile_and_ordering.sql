-- 045_fix_get_pending_invitation_preprofile_and_ordering.sql
-- Migration: fixes for get_pending_invitation() (044) found by the Auth
-- phase's final whole-branch review.
--
-- Fix 1 (Critical): a genuinely new invitee has an authenticated session
-- (the invite-link email establishes one, same as a password-recovery link)
-- but no public.users row yet -- CompleteProfilePage creates that row later,
-- after Accept Invitation runs. The original 044 body resolved identity
-- purely via public.users.auth_user_id -> email, so for this exact case it
-- always found v_user_email IS NULL and returned zero rows, making the
-- invite-preview unreachable for the only audience it's for. Fall back to
-- the verified email claim on the caller's own JWT (auth.jwt() ->> 'email')
-- -- still fully server-verified, never client-supplied -- when no
-- public.users row exists yet.
--
-- Fix 2 (Important): the previous ORDER BY i.created_at DESC could surface
-- a newer accepted/revoked invitation ahead of an older still-pending one
-- for the same email, disagreeing with accept_invitation() (031/033), which
-- only ever matches status='pending' AND expires_at > now(). Prefer a
-- pending-and-unexpired row first, then fall back to recency.

CREATE OR REPLACE FUNCTION public.get_pending_invitation()
RETURNS TABLE (
  organization_name text,
  role_name text,
  branch_names text[],
  invited_by_name text,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_invitation record;
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
    END;
END;
$$;

COMMENT ON FUNCTION public.get_pending_invitation() IS
  'Read-only preview of the current authenticated identity''s most relevant invitation. Matches by the caller''s own verified email, resolved server-side -- prefers public.users.auth_user_id -> email when a profile row already exists, and falls back to the JWT''s own email claim (auth.jwt() ->> ''email'') for a genuinely new invitee who is authenticated but has no public.users row yet (that row is only created later, by Complete Profile). Never trusts a client-supplied email or JWT claim value from request parameters -- both resolution paths read only server-verified identity. Prefers a still-pending, unexpired invitation over a newer accepted/revoked one for the same email, matching accept_invitation()''s own filter (031/033). Returns organization/role/branch/inviter/expiry plus a computed status (pending/accepted/revoked/expired) so the Accept Invitation screen can render the right card and state before the invitee submits a password. Unlike accept_invitation(), never mutates public.invitations and does not filter out non-pending or expired rows -- the frontend needs those to render "already accepted"/"expired" states.';
