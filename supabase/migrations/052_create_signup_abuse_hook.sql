-- 052_create_signup_abuse_hook.sql
-- Migration: signup-attempt IP tracking + the "Before User Created" Supabase
-- Auth Hook that blocks disposable-email signups and rate-limits signup bursts
-- per IP (design spec:
-- docs/superpowers/specs/2026-09-02-auth-abuse-protection-design.md).
--
-- Depends on 051_create_disposable_email_domains.sql, which created
-- public.disposable_email_domains and public.is_disposable_email_domain(text).
--
-- WHY A POSTGRES AUTH HOOK AND NOT APPLICATION CODE: signup goes straight from
-- the browser to Supabase Auth's REST API with the public anon key. It never
-- reaches this project's Render backend, so there is no request for our own
-- code to intercept. A Postgres function registered as Supabase's "Before User
-- Created" hook is the only chokepoint that runs no matter what calls the
-- signup endpoint -- including an attacker calling Supabase Auth directly.
--
-- !! MANUAL STEP REQUIRED AFTER THIS MIGRATION !!
-- Creating the function does NOT enable it. There is no SQL statement and no
-- Management API call that registers a hook. A human must do this once, in the
-- Supabase dashboard:
--   Project -> Authentication -> Hooks -> "Before User Created"
--     -> enable -> type "Postgres Function"
--     -> schema "public", function "hook_before_user_created" -> Save
-- Until that toggle is flipped, this function is inert and every signup
-- (disposable domains included) proceeds exactly as it does today.


-- ---------------------------------------------------------------------------
-- 1. signup_attempts: one row per signup ATTEMPT (allowed or blocked)
-- ---------------------------------------------------------------------------
-- One row per attempt -- not per created user -- so that counting rows in a
-- time window IS the rate check; no counter column to increment, no race on an
-- upsert. Blocked attempts are recorded too, so a burst of disposable-domain
-- attempts from one IP also trips the rate limit on subsequent tries.
--
-- Retention: not addressed here. The table grows one row per signup attempt
-- and has no pruning job yet; at this project's signup volume that is
-- negligible for a long time, but it is a known follow-up, not an oversight.
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index supporting the only query the hook runs against this table:
--   WHERE ip_address = $1 AND created_at > now() - interval '10 minutes'
-- Leading equality column then the range column -- the standard ordering for
-- a composite btree serving an equality + range predicate.
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip_created
  ON public.signup_attempts (ip_address, created_at);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- No permissive policy for anon/authenticated and no table grant to them:
-- this table records raw IP addresses of people attempting to sign up. It is
-- never read by a client query, only by the hook function below. RLS with no
-- matching policy is default-deny, which is exactly the wanted behavior for
-- every client role (same reasoning as 051's disposable_email_domains).
REVOKE ALL ON public.signup_attempts FROM anon, authenticated;

-- supabase_auth_admin is the Postgres role Supabase Auth uses to invoke hook
-- functions. It needs BOTH of the following, and neither one alone is enough:
--
--   (a) the table-level GRANT below, and
--   (b) the permissive RLS policy below.
--
-- This is the exact trap that 051's review caught. supabase_auth_admin does
-- NOT have BYPASSRLS (verified live this session:
-- `SELECT rolbypassrls FROM pg_roles WHERE rolname = 'supabase_auth_admin'`
-- -> false) and does not own this table, so RLS applies to it in full. With
-- the GRANT but no policy, the failure is SILENT AND DIRECTIONAL:
--   * the INSERT would raise (visible), but
--   * the window-count SELECT would return ZERO ROWS, not an error --
--     so the rate limiter would compute a count of 0 forever and never fire,
--     with nothing logged anywhere to say why.
-- Supabase's own auth-hooks documentation states this requirement plainly:
-- "You will need to alter your row-level security (RLS) policies to allow the
-- supabase_auth_admin role to access tables". The policy is scoped TO
-- supabase_auth_admin only, so client roles remain fully default-deny.
GRANT SELECT, INSERT ON public.signup_attempts TO supabase_auth_admin;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'signup_attempts'
      AND policyname = 'signup_attempts_select_auth_admin'
  ) THEN
    CREATE POLICY signup_attempts_select_auth_admin
      ON public.signup_attempts
      FOR SELECT
      TO supabase_auth_admin
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'signup_attempts'
      AND policyname = 'signup_attempts_insert_auth_admin'
  ) THEN
    CREATE POLICY signup_attempts_insert_auth_admin
      ON public.signup_attempts
      FOR INSERT
      TO supabase_auth_admin
      WITH CHECK (true);
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- 2. security_events access for supabase_auth_admin
-- ---------------------------------------------------------------------------
-- public.security_events (016, hardened in 024) is this project's existing
-- append-only audit log, with nullable organization_id/user_id precisely so
-- that pre-org, pre-user security events can be recorded. The hook writes
-- there rather than inventing a second log table.
--
-- Checked live before writing this migration: security_events had NO grants at
-- all for supabase_auth_admin (only anon/authenticated/postgres/service_role),
-- because until now nothing has ever written to it from outside an
-- authenticated ApplicationContext. Without this grant the hook's INSERT would
-- raise "permission denied for table security_events", which -- on the
-- disposable-email path -- would surface to the signing-up user as an opaque
-- 500 instead of the intended 400 message.
GRANT INSERT ON public.security_events TO supabase_auth_admin;

-- No new RLS *policy* is needed on security_events: its existing
-- security_events_insert policy is declared TO PUBLIC (pg_policy.polroles =
-- '{-}'), so it already applies to supabase_auth_admin. Its WITH CHECK is
--   (organization_id IS NULL OR organization_id IN (SELECT get_user_organizations()))
-- and every row this hook inserts has organization_id = NULL, satisfying the
-- first branch.
--
-- BUT the grant below is still REQUIRED, and this was found empirically rather
-- than reasoned about -- the first draft of this migration asserted that the
-- `organization_id IS NULL` branch would short-circuit and that EXECUTE on
-- get_user_organizations() therefore did not matter. THAT ASSERTION WAS WRONG.
-- Verified live against a disposable probe role scoped identically to
-- supabase_auth_admin: the INSERT failed with
--   ERROR 42501: permission denied for function get_user_organizations
-- even though organization_id was NULL. Postgres initializes the
-- `IN (SELECT ...)` subplan and performs the function ACL check at executor
-- init, before -- and independently of -- any boolean short-circuiting of the
-- surrounding OR. Checked live: get_user_organizations()'s ACL is
-- {postgres, authenticated, service_role, anon} -- supabase_auth_admin is NOT
-- in it, because until now only JWT-bearing roles ever touched this table.
--
-- Without this grant the hook raises instead of returning its error object, so
-- a disposable-email signup would surface to the user as an opaque failure
-- rather than the intended 400 with the specified message, and the
-- security_events audit row would never be written.
--
-- This grant exposes nothing: get_user_organizations() is SECURITY DEFINER
-- over auth.uid(), which is NULL for supabase_auth_admin (no JWT), so it
-- returns the empty set for this role. anon and authenticated already hold
-- EXECUTE on it.
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO supabase_auth_admin;

-- The append-only trigger on security_events blocks UPDATE/DELETE only, not
-- INSERT (verified: trg_security_events_block_mutation).


-- ---------------------------------------------------------------------------
-- 3. The hook function
-- ---------------------------------------------------------------------------
-- Signature is fixed by Supabase: one jsonb argument, returns jsonb.
-- Return contract, quoted from Supabase's Before User Created docs:
--   allow  -> {}                 ("Returning an empty object ... allows the
--                                  request to proceed")
--   reject -> { "error": { "http_code": <4xx>, "message": <string> } }
-- There is no explicit "continue" payload for this hook (unlike Password
-- Verification Attempt); absence of an `error` key IS the allow signal.
--
-- Deliberately NOT SECURITY DEFINER. Supabase's docs recommend against marking
-- hook functions SECURITY DEFINER; the correct pattern is to grant
-- supabase_auth_admin direct, narrowly-scoped table access (done in sections 1
-- and 2 above) so the function runs with exactly the privileges of the role
-- Auth already uses -- no privilege escalation surface, and the grants are
-- auditable in the catalog instead of implied by the function body.
--
-- search_path is pinned so unqualified names cannot be hijacked and so the
-- function does not depend on supabase_auth_admin's own search_path, which
-- Supabase controls and could change. (Every reference below is also
-- schema-qualified; the pin is belt-and-braces.)
CREATE OR REPLACE FUNCTION public.hook_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_email          text;
  v_domain         text;
  v_ip             inet;
  v_ip_raw         text;
  v_recent_count   integer;
  -- 8 attempts per 10 minutes per IP. Chosen to comfortably clear shared NAT:
  -- a university or office network doing genuine signups will not produce 8
  -- signup attempts from one egress IP inside 10 minutes, while a scripted
  -- burst trips it almost immediately.
  c_window         constant interval := interval '10 minutes';
  c_max_attempts   constant integer  := 8;
BEGIN
  v_email := event -> 'user' ->> 'email';

  -- Normalize the DOMAIN ONLY. The local part is never touched -- no '+alias'
  -- stripping, no case folding -- per the design spec's explicit guardrail.
  IF v_email IS NULL OR position('@' in v_email) = 0 THEN
    v_domain := NULL;
  ELSE
    v_domain := lower(split_part(v_email, '@', 2));
  END IF;

  -- Parse the caller IP defensively. A missing or unparseable ip_address must
  -- NEVER block a legitimate signup, so an unparseable value degrades to "skip
  -- the IP-based check" instead of raising out of the hook (which Supabase
  -- would surface as a failed signup).
  v_ip_raw := event -> 'metadata' ->> 'ip_address';
  IF v_ip_raw IS NULL OR btrim(v_ip_raw) = '' THEN
    v_ip := NULL;
  ELSE
    BEGIN
      v_ip := btrim(v_ip_raw)::inet;
    EXCEPTION WHEN others THEN
      v_ip := NULL;
    END;
  END IF;

  -- ---- Check 1: disposable / temporary email domain -----------------------
  -- Exact match against the generated blocklist only. An unfamiliar domain is
  -- never treated as disposable.
  IF v_email IS NOT NULL AND public.is_disposable_email_domain(v_email) THEN
    -- Record the attempt even though it is being rejected, so that a burst of
    -- disposable-domain attempts from one IP also counts toward the rate
    -- limit on that IP's subsequent tries.
    IF v_ip IS NOT NULL THEN
      INSERT INTO public.signup_attempts (ip_address, email_domain)
      VALUES (v_ip, v_domain);
    END IF;

    INSERT INTO public.security_events
      (organization_id, user_id, event_type, details, ip_address)
    VALUES
      (NULL, NULL, 'DISPOSABLE_EMAIL_SIGNUP_BLOCKED',
       jsonb_build_object('domain', v_domain), v_ip);

    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'Please use a permanent email address to create your account.'
      )
    );
  END IF;

  -- ---- Check 2: per-IP signup rate limit ----------------------------------
  -- Skipped entirely when no usable IP was supplied: no IP means no rate key,
  -- and failing open is the required behavior for a legitimate signup.
  IF v_ip IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
    FROM public.signup_attempts
    WHERE ip_address = v_ip
      AND created_at > now() - c_window;

    IF v_recent_count >= c_max_attempts THEN
      INSERT INTO public.signup_attempts (ip_address, email_domain)
      VALUES (v_ip, v_domain);

      INSERT INTO public.security_events
        (organization_id, user_id, event_type, details, ip_address)
      VALUES
        (NULL, NULL, 'SIGNUP_RATE_LIMITED',
         jsonb_build_object('ip_attempts_in_window', v_recent_count), v_ip);

      -- Deliberately generic: the threshold, the window and the observed count
      -- never reach the client.
      RETURN jsonb_build_object(
        'error', jsonb_build_object(
          'http_code', 429,
          'message', 'Too many attempts. Please wait a few minutes and try again.'
        )
      );
    END IF;
  END IF;

  -- ---- Allow ---------------------------------------------------------------
  -- A future "HIGH risk -> challenge" branch belongs immediately above this
  -- point; nothing calls one today (no CAPTCHA dependency is being added).
  --
  -- The bookkeeping INSERT is wrapped: this is the ALLOW path, and a
  -- legitimate signup must not fail because an audit row could not be written.
  -- The failure is re-raised as a WARNING so it lands in the Postgres logs
  -- instead of vanishing -- fail-open, but never fail-silent.
  IF v_ip IS NOT NULL THEN
    BEGIN
      INSERT INTO public.signup_attempts (ip_address, email_domain)
      VALUES (v_ip, v_domain);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'hook_before_user_created: could not record signup_attempts row (%): %',
        SQLSTATE, SQLERRM;
    END;
  END IF;

  RETURN '{}'::jsonb;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4. Hook function grants (exactly the pattern Supabase's docs specify)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.hook_before_user_created(jsonb)
  TO supabase_auth_admin;

-- The hook must not be reachable through the Data APIs (PostgREST exposes
-- public functions as RPC endpoints to anon/authenticated by default). Note
-- that revoking FROM public is what removes the default PUBLIC EXECUTE grant;
-- the explicit anon/authenticated revokes are belt-and-braces for the case
-- where either role was ever granted EXECUTE directly.
REVOKE EXECUTE ON FUNCTION public.hook_before_user_created(jsonb)
  FROM authenticated, anon, public;
