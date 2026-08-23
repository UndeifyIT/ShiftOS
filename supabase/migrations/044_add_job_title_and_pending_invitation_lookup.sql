-- 044_add_job_title_and_pending_invitation_lookup.sql
-- Migration: Auth phase rebuild backend additions
-- Purpose: (1) Complete Profile's new optional Job Title field needs a
-- column that doesn't exist yet (phone/avatar_url already exist per 002/030).
-- (2) Accept Invitation's new invite-preview card (org, role, branch,
-- inviter, expiry) needs a read-only lookup — accept_invitation() (031/033)
-- only ever consumes an invitation, it never previews one, and it only
-- matches status='pending' AND expires_at > now(), so it can't tell the
-- frontend "this was already used" vs. "no such invitation" vs. "expired".

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;

COMMENT ON COLUMN public.users.job_title IS
  'Optional free-text role label shown on the schedule (e.g. "Floor Supervisor") — distinct from roles.name, which drives permissions. Set during Complete Profile, editable later from Settings.';

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
  ORDER BY i.created_at DESC
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
  'Read-only preview of the current authenticated identity''s most recent invitation (matched by the caller''s own verified email, resolved server-side via auth.uid() -> public.users.auth_user_id -> email, same pattern as accept_invitation() in 031/033 — never trusts a client-supplied email or JWT claim) — returns organization/role/branch/inviter/expiry plus a computed status (pending/accepted/revoked/expired) so the Accept Invitation screen can render the right card and state before the invitee submits a password. Unlike accept_invitation(), never mutates public.invitations and does not filter out non-pending or expired rows — the frontend needs those to render "already accepted"/"expired" states.';

REVOKE ALL ON FUNCTION public.get_pending_invitation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pending_invitation() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_invitation() TO authenticated;
