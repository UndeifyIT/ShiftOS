-- 033_harden_invitation_function_grants.sql
-- Migration: tighten anon access to 031's new SECURITY DEFINER functions
-- Purpose: Supabase's security advisor (run after applying 031/032) flagged
-- accept_invitation() and ensure_standard_roles() as reachable by the `anon`
-- (unauthenticated) role via PostgREST's exposed RPC routes, despite 031's
-- `REVOKE ALL ... FROM PUBLIC`. Neither function has any legitimate reason
-- to be called by an unauthenticated caller — accept_invitation() requires
-- a real auth.uid() internally and fails safely without one; ensure_standard_roles()
-- is meant to be called only internally (via PERFORM) from
-- create_organization_with_owner(), never directly by a client. Explicit
-- per-role revokes remove any ambiguity rather than relying solely on the
-- FROM PUBLIC revoke.

REVOKE EXECUTE ON FUNCTION public.accept_invitation() FROM anon;

REVOKE EXECUTE ON FUNCTION public.ensure_standard_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_standard_roles(uuid) FROM authenticated;

COMMENT ON FUNCTION public.accept_invitation() IS
  'Turns the current authenticated identity''s matching pending invitation into a real organization_memberships row plus its branch grants. SECURITY DEFINER because the invitee holds zero permissions in the target organization before this runs, mirroring create_organization_with_owner()''s bootstrap precedent. Matches by the caller''s own verified email (public.users.email for auth.uid()), never by client-supplied input — cannot be pointed at an arbitrary invitation. Callable only by `authenticated` (033: explicitly revoked from anon) — an unauthenticated caller has no auth.uid() to match against regardless.';

COMMENT ON FUNCTION public.ensure_standard_roles(uuid) IS
  'Creates the standard branch-scoped Supervisor/Employee system roles for an organization if they do not already exist yet, each granted a curated permission set (not every permission, unlike the Owner role). Idempotent. Internal helper only — called via PERFORM from create_organization_with_owner() and the one-time 031 backfill, never granted EXECUTE to anon or authenticated directly (033) since no client should call it standalone.';
