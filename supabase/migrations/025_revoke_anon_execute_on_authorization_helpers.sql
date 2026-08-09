-- 025_revoke_anon_execute_on_authorization_helpers.sql
-- Migration: close an anon-EXECUTE gap discovered during live verification of 020/021/023
-- Purpose: those migrations issued `REVOKE ALL ... FROM PUBLIC` intending to restrict
-- the new SECURITY DEFINER helpers to authenticated callers only. That was
-- insufficient: this project has default privileges that grant EXECUTE on new
-- functions to anon/authenticated/service_role explicitly (confirmed via
-- pg_proc.proacl), and a PUBLIC-only revoke does not remove an explicit per-role
-- grant. Confirmed live with has_function_privilege('anon', ..., 'EXECUTE') = true
-- prior to this migration. This migration explicitly revokes EXECUTE from anon on
-- every SECURITY DEFINER authorization helper this remediation introduced.
--
-- Practical exploitability was low even before this fix: user_has_permission() and
-- user_accessible_branches() resolve to empty/false for an unauthenticated caller
-- (auth.uid() is null), and create_organization_with_owner() raises immediately
-- when no matching users row is found. This migration removes the gap anyway as
-- defense-in-depth, since anon should never have been able to invoke these at all.

REVOKE EXECUTE ON FUNCTION public.user_has_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_accessible_branches(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(text, text, text) FROM anon;

-- get_user_organizations() (017) has the same pre-existing exposure; tighten it to
-- match, since this remediation is explicitly closing this class of gap.
REVOKE EXECUTE ON FUNCTION public.get_user_organizations() FROM anon;
