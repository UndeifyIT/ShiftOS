-- 027_restore_anon_execute_on_rls_helpers.sql
-- Migration: revert part of 025/026 -- discovered to break anon queries entirely
-- Purpose: 025 revoked anon's EXECUTE on get_user_organizations() and
-- user_has_permission()/user_accessible_branches(); 026 additionally revoked the
-- PUBLIC grant on get_user_organizations(). Live testing (SET ROLE anon; SELECT
-- count(*) FROM public.branches) showed this causes a hard
-- "permission denied for function get_user_organizations" error for ANY anon query
-- against an RLS-protected table, instead of the intended empty result set --
-- because these functions are invoked TRANSITIVELY as part of RLS policy
-- evaluation for every role that queries a protected table, not only when called
-- directly. Revoking EXECUTE from anon does not "hide" anything (an unauthenticated
-- caller has auth.uid() = null and the functions already resolve to
-- empty/false for them); it just turns a safe empty response into a hard error.
--
-- This migration restores anon EXECUTE on the three functions that are called
-- transitively from RLS predicates. It deliberately does NOT restore anon EXECUTE
-- on create_organization_with_owner(), which is only ever invoked directly by a
-- client (never from within an RLS predicate), where the existing anon restriction
-- correctly produces a clean, intentional "permission denied to call this RPC"
-- rather than breaking unrelated queries.

GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.user_accessible_branches(uuid) TO anon;
