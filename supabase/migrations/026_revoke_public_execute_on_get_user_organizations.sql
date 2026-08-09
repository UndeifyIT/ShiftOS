-- 026_revoke_public_execute_on_get_user_organizations.sql
-- Migration: finish closing the anon-EXECUTE gap on get_user_organizations()
-- Purpose: 025 revoked anon's explicit EXECUTE grant on get_user_organizations(),
-- but pg_proc.proacl showed a SEPARATE bare PUBLIC entry ("=X/postgres") left over
-- from its original creation in 017 (which never ran a REVOKE FROM PUBLIC, unlike
-- the functions introduced in 020/021/023). Since PUBLIC grants apply to every
-- role including anon, anon could still execute it through that path even with its
-- own explicit grant revoked. Confirmed live: has_function_privilege('anon', ...)
-- was still true after 025. This migration revokes the PUBLIC grant; the existing
-- explicit grants to postgres/authenticated/service_role are untouched by this
-- (REVOKE ... FROM PUBLIC only removes the PUBLIC entry itself).

REVOKE EXECUTE ON FUNCTION public.get_user_organizations() FROM PUBLIC;
