-- 024_harden_audit_security_event_immutability.sql
-- Migration: make audit_logs and security_events genuinely append-only
-- Purpose: both tables are documented as immutable ("Audit log rows are intended to
-- be append-only and immutable after creation", 015_create_audit_logs.sql) but their
-- RLS was FOR ALL, gated only by organization membership -- any tenant member could
-- UPDATE or DELETE their own organization's audit trail or security event log.
-- This migration removes client UPDATE/DELETE entirely (no policy = default deny)
-- and adds a trigger backstop that blocks UPDATE/DELETE unconditionally, including
-- for the table owner, since RLS alone does not apply to a table's owning role.

-- audit_logs
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON public.audit_logs;

CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

-- Deliberately no UPDATE or DELETE policy: RLS defaults to deny for any command
-- without a matching policy. Combined with the trigger below, this holds even for
-- roles that would otherwise bypass RLS on the table.

-- security_events
DROP POLICY IF EXISTS tenant_isolation_security_events ON public.security_events;

CREATE POLICY security_events_select ON public.security_events
  FOR SELECT USING (
    organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY security_events_insert ON public.security_events
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR organization_id IN (SELECT public.get_user_organizations())
  );

-- Trigger backstop: unconditionally reject UPDATE/DELETE regardless of role or RLS
-- bypass. This is the enforcement layer DB-009 sec. 8 anticipates ("triggers may
-- assist with tenant integrity... primary tenant protection remains RLS, foreign
-- keys, application authorization") applied to immutability rather than tenancy.
CREATE OR REPLACE FUNCTION public.trg_block_immutable_table_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION '% rows are append-only and cannot be updated or deleted', TG_TABLE_NAME;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_audit_logs_block_mutation' AND c.relname = 'audit_logs')
  THEN
    CREATE TRIGGER trg_audit_logs_block_mutation
      BEFORE UPDATE OR DELETE ON public.audit_logs
      FOR EACH ROW EXECUTE FUNCTION public.trg_block_immutable_table_mutation();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_security_events_block_mutation' AND c.relname = 'security_events')
  THEN
    CREATE TRIGGER trg_security_events_block_mutation
      BEFORE UPDATE OR DELETE ON public.security_events
      FOR EACH ROW EXECUTE FUNCTION public.trg_block_immutable_table_mutation();
  END IF;
END$$;

COMMENT ON FUNCTION public.trg_block_immutable_table_mutation() IS
  'Unconditionally blocks UPDATE/DELETE on the table it is attached to. Used for append-only audit/security tables so immutability holds even for roles that bypass RLS.';
