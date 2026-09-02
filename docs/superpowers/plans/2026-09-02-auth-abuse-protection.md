# Auth abuse protection — implementation plan

**Spec:** docs/superpowers/specs/2026-09-02-auth-abuse-protection-design.md (read this
first — it is the binding authority for every decision below; this plan only sequences
the work).

## Global Constraints

(Copied from the spec so every dispatched task sees them without re-reading the whole
spec — see the spec for the reasoning behind each.)

- Exact user-facing strings — never paraphrase:
  - Disposable email at signup: `Please use a permanent email address to create your account.`
  - Rate limited: `Too many attempts. Please wait a few minutes and try again.`
  - Sign-in failure (any reason, never distinguish "no such user" from "wrong password"): `Invalid email or password.`
  - Password reset: leave `ForgotPasswordPage.tsx`'s existing generic copy untouched.
- `security_events.event_type` values, verbatim: `DISPOSABLE_EMAIL_SIGNUP_BLOCKED`,
  `SIGNUP_RATE_LIMITED`, `EXISTING_ACCOUNT_DISPOSABLE_EMAIL_FLAGGED`.
- Domain matching is **exact string equality only**, on `lower(split_part(email, '@', 2))`.
  Never substring/`.includes()` matching. Never strip or reinterpret the local part
  (`+alias` stays intact) — that field of the address is out of scope for this feature.
- Never delete, deactivate, or hard-block an existing account for having a disposable
  email domain — sign-in still succeeds; only a dismissible nudge is added.
- No raw password, verification token, or reset token in any log, `security_events` row,
  or committed file.
- New migrations continue the sequence at `051_...sql`, `052_...sql`, etc., using
  `IF NOT EXISTS` guards around every `CREATE`/`ALTER`/policy/trigger, matching
  migrations 048–050's idiom exactly.
- Migrations are applied to the live project (`etodmfsmvhewihboxcrp`) via the Supabase
  MCP `apply_migration` tool, the same way this session applied 048–050 — never a raw
  destructive `execute_sql` DDL call outside that tool, and never against a table with
  existing rows without an `IF NOT EXISTS`/idempotency guard.
- After every task: `pnpm -w exec tsc -b` clean, and any test files added/touched by
  that task pass. The final task runs the whole `packages/tests` suite, the web app
  production build, and `tsc --noEmit` for apps/web.
- No CAPTCHA integration, no new rate-limiting infrastructure (Redis, etc.), no new
  microservice. Everything lives in existing packages (`packages/api`,
  `packages/services`, `packages/repositories`, `apps/web`) or new Postgres migrations.

## Context for every dispatched implementer

This is ShiftOS, a pnpm monorepo at `C:\Users\DELL\Music\ShiftOS`. `apps/web` is the
Vite/React frontend; auth pages live at `apps/web/src/pages/auth/*` and call
`supabase-js` directly (no custom backend in that path). The custom backend
(`packages/api`'s RPC registry, `packages/services`, `packages/repositories`,
`packages/database`) only runs for already-authenticated, already-in-an-org operations
— it cannot see signup/sign-in/password-reset/verification-resend at all, because those
never touch it. `supabase/migrations/*.sql` holds all schema (up to 050 before this
plan). The live Supabase project ref is `etodmfsmvhewihboxcrp` (region eu-central-1),
reachable via `mcp__plugin_supabase_supabase__*` tools. This is a live production app
with real users and real deployments (Vercel frontend, Render backend) — no destructive
operations against the live database.

## Tasks

### Task 1: Disposable-domain table + generated seed migration + Postgres check function

Add `mailchecker` (confirmed this session: actively maintained, 56,359-domain
blocklist, does not include gmail.com/outlook.com/yahoo.com/icloud.com) as a dependency
of `packages/database` (`pnpm --filter @shiftos/database add mailchecker`).

Write a one-off generator script (e.g. `packages/database/scripts/generate-disposable-domains-migration.mjs`,
run with `node`, not committed to any build step — it's a manual "refresh the list"
tool, not part of the app) that:
- `require('mailchecker').blacklist()` to get the `Set<string>` of domains.
- Lowercases every entry (belt-and-suspenders; they should already be lowercase) and
  de-duplicates.
- Writes `supabase/migrations/051_create_disposable_email_domains.sql` containing:
  - `CREATE TABLE IF NOT EXISTS public.disposable_email_domains (domain text PRIMARY KEY, added_at timestamptz NOT NULL DEFAULT now())` — no organization/tenant scoping, this is a global platform list, not tenant data.
  - A single idempotent bulk insert of all ~56k domains via
    `INSERT INTO public.disposable_email_domains (domain) VALUES (...), (...), ... ON CONFLICT (domain) DO NOTHING;` (batch into a few `INSERT` statements if one statement of 56k rows is impractical for the tool to write/apply — 5-10k rows per statement is a reasonable chunk size).
  - RLS: `ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;` plus a single `SELECT`-only policy grantable to `authenticated`/`anon` is NOT needed here — this table is only ever read by `SECURITY DEFINER`-free Postgres functions running as `supabase_auth_admin` or by service-role/migration tooling, not by client queries. Add a policy that denies all client access by simply adding no permissive policy (RLS default-deny) — do not grant `anon`/`authenticated` any access.
  - `CREATE OR REPLACE FUNCTION public.is_disposable_email_domain(p_email text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.disposable_email_domains WHERE domain = lower(split_part(p_email, '@', 2))); $$;` — a single, small, well-commented function. Comment above it must state plainly: exact-match only, never substring, and that the local part of the email (before `@`) is never touched.
  - `GRANT EXECUTE ON FUNCTION public.is_disposable_email_domain(text) TO supabase_auth_admin, authenticated, anon;` (the function itself is safe to expose broadly — it only answers a boolean about a domain string, no data leak — but the underlying table stays locked down per the point above).

Run the generator, review the produced migration file for size/sanity, then apply it to
the live project with `mcp__plugin_supabase_supabase__apply_migration`. Verify with a
read-only `execute_sql` count query (`SELECT count(*) FROM public.disposable_email_domains`)
and a couple of spot-check calls to `is_disposable_email_domain` (a known disposable
domain from the generated list → true; `gmail.com`, `outlook.com`, `yahoo.com`,
`icloud.com`, `User@Example.com`-style mixed case → false, confirming the `lower()` /
`split_part` behavior on a mixed-case address).

Also write `packages/services/src/security/disposableEmail.ts`: a small, pure TS module
exporting `normalizeEmail(email: string): { email: string; domain: string }` (trims
whitespace, lowercases only the domain part, leaves the local part exactly as typed —
`User@GMAIL.com` → `{ email: 'User@gmail.com', domain: 'gmail.com' }`) and
`isDisposableDomain(domain: string): boolean` backed by a generated
`packages/services/src/security/disposableDomains.generated.ts` (a `Set<string>`
literal produced by the same generator script, so the TS-side check and the Postgres
table are generated from the exact same `mailchecker` snapshot — add a second output
mode to the generator script rather than writing this file by hand). Unit tests in
`packages/tests/unit/disposableEmail.test.ts` covering: `gmail.com`/`outlook.com`/
`yahoo.com`/`icloud.com`/a `.edu` address/a made-up corporate domain → not disposable;
3-5 real entries sampled from the generated list → disposable; `john@gmail.com` vs
`john+test@gmail.com` → both normalize to the same domain (`gmail.com`) and neither is
disposable, and critically the two full normalized emails stay distinct strings (no
alias collapsing); `User@GMAIL.com` vs `user@gmail.com` → same domain, normalized emails
differ only in local-part case exactly as input (no local-part lowercasing).

**Report file:** `.superpowers/sdd/2026-09-02-auth-abuse-protection/task-1-report.md`

### Task 2: Signup-attempt IP tracking + "Before User Created" Auth Hook

Depends on Task 1's `is_disposable_email_domain` function existing in the live database.

Write `supabase/migrations/052_create_signup_abuse_hook.sql`:
- `CREATE TABLE IF NOT EXISTS public.signup_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ip_address inet NOT NULL, email_domain text, created_at timestamptz NOT NULL DEFAULT now())` — one row per *attempt* (allowed or blocked), so counting rows in a window is the rate check. No RLS-permissive policy for client roles (same default-deny reasoning as Task 1's table); grant `INSERT`/`SELECT` to `supabase_auth_admin` only.
- An index on `(ip_address, created_at)` for the window-count query.
- The hook function itself, named `public.hook_before_user_created(event jsonb) RETURNS jsonb`, `LANGUAGE plpgsql`, matching the exact shape Supabase's docs specify for a Before User Created hook (read `event->'user'->>'email'` and `event->'metadata'->>'ip_address'`). Logic, in order:
  1. Extract `v_email := event->'user'->>'email'`, `v_ip := (event->'metadata'->>'ip_address')::inet` (guard: if the IP is null/unparseable, skip the IP-based check rather than erroring — never let a missing IP block a legitimate signup; log that edge case is not required, just don't crash).
  2. `v_domain := lower(split_part(v_email, '@', 2))`.
  3. If `public.is_disposable_email_domain(v_email)` is true: `INSERT INTO public.security_events (organization_id, user_id, event_type, details, ip_address) VALUES (NULL, NULL, 'DISPOSABLE_EMAIL_SIGNUP_BLOCKED', jsonb_build_object('domain', v_domain), v_ip);` then `RETURN jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'Please use a permanent email address to create your account.'));` — do **not** record a `signup_attempts` row for this branch beyond what's needed for the IP window count (still insert one, so a burst of disposable-domain attempts from one IP also trips the rate limit below on subsequent tries — insert into `signup_attempts` here too, before returning the error).
  4. Else, if `v_ip` is not null: count rows in `signup_attempts` where `ip_address = v_ip` and `created_at > now() - interval '10 minutes'`. Threshold: **8 attempts per 10 minutes per IP** (chosen to comfortably clear shared NAT — a university/office network doing normal signups won't hit 8 in 10 minutes; a scripted burst will). If at/over threshold: insert a `signup_attempts` row, insert a `security_events` row with `event_type = 'SIGNUP_RATE_LIMITED'` and `details = jsonb_build_object('ip_attempts_in_window', <count>)`, then return the rate-limit error object (`http_code: 429`, message `Too many attempts. Please wait a few minutes and try again.`).
  5. Else: insert a `signup_attempts` row (`ip_address = v_ip`, `email_domain = v_domain`) and return `'{}'::jsonb` (Before User Created's docs: no error object present means the signup proceeds — there is no explicit "continue" payload like Password Verification has; confirm this against the doc excerpt already in the spec/ledger before writing the return value, and if the docs show a required non-empty success shape instead, use that exact shape).
- Grants exactly as Supabase's own docs specify for a Postgres-function hook: `GRANT EXECUTE ON FUNCTION public.hook_before_user_created(jsonb) TO supabase_auth_admin;`, `GRANT USAGE ON SCHEMA public TO supabase_auth_admin;`, `REVOKE EXECUTE ON FUNCTION public.hook_before_user_created(jsonb) FROM authenticated, anon, public;`. Do **not** mark the function `SECURITY DEFINER` (Supabase's docs explicitly recommend against it for hook functions) — grant `supabase_auth_admin` direct table access instead (`GRANT INSERT, SELECT ON public.signup_attempts TO supabase_auth_admin; GRANT INSERT ON public.security_events TO supabase_auth_admin;`), checking first whether `security_events` already grants `supabase_auth_admin` anything (it may not, since nothing has written to it from outside an authenticated ApplicationContext before now) and adding the grant if missing.

Apply the migration via `apply_migration`. This task **cannot** enable the hook itself —
there is no MCP tool or SQL statement that flips Supabase's
Authentication → Hooks → "Before User Created" dashboard toggle. Verify the function
exists and is callable in isolation with a direct `execute_sql` test invocation
(`SELECT public.hook_before_user_created('{"user":{"email":"test@mailinator.com"},"metadata":{"ip_address":"1.2.3.4"}}'::jsonb);`
— pick an actual domain from the generated disposable list for this test, not a
guess — and a second call with a real-looking domain to confirm it returns `{}`).
Write out, in the report, the exact manual step the user must take in the Supabase
dashboard (project → Authentication → Hooks → Before User Created → Postgres Function
→ select `hook_before_user_created`) — this is a real, load-bearing gap the final
report must state plainly, not bury.

**Report file:** `.superpowers/sdd/2026-09-02-auth-abuse-protection/task-2-report.md`

### Task 3: Frontend signup error handling

Depends on Task 2 (the hook must exist for its error message to ever actually arrive,
though this task's code changes are independently testable/reviewable without it being
enabled yet).

In `apps/web/src/pages/auth/SignUpPage.tsx`, `supabase.auth.signUp()`'s error path
(`handleSubmit`, the `if (signUpError)` block) currently branches on
`already registered`/`rate limit`/`too many`/`email send` substrings. Add a branch that
recognizes the hook's rejection. The hook returns `http_code: 400` with the exact
message string `Please use a permanent email address to create your account.` —
Supabase Auth surfaces Postgres-hook errors as a normal `AuthError` whose `.message` is
that string verbatim (confirm this by reading how `signUpError.message` is already used
elsewhere in the file — it's already lowercased and substring-matched, so add the new
branch consistently with the existing style, checking for the message directly rather
than assuming a specific `.status` code, since the existing code doesn't rely on status
codes for its other branches either). Show that exact message to the user unchanged
(the message is already clean and safe — no further rewriting needed, unlike the
existing branches which do rewrite Supabase's raw text). Add the equivalent branch for
the rate-limit message (`Too many attempts. Please wait a few minutes and try again.`)
if the hook's rate-limit rejection can also surface through this same signUp() call
(it can — same hook, same call).

Add one test if `apps/web` has any existing test coverage for auth pages' error-mapping
logic (check `packages/tests` and any `apps/web/**/*.test.tsx` first); if no such test
harness exists for this file, do not introduce one from scratch for a single branch —
note that in the report instead (this mirrors the "don't overengineer" constraint).

Confirm no client-side disposable-domain check of any kind exists anywhere in this file
or its imports (there must not be — the check is server-side only, this task is purely
about *displaying* the server's rejection cleanly). Run `pnpm -w exec tsc -b` and the
web app production build.

**Report file:** `.superpowers/sdd/2026-09-02-auth-abuse-protection/task-3-report.md`

### Task 4: Existing-account disposable-email nudge

Depends on Task 1's `is_disposable_email_domain` function.

In `packages/api/src/operations/context.ts`, extend `getMyContext`'s handler: query
`SELECT email FROM public.users WHERE id = $1` using `context.client` and
`context.userId` (look at an existing repository or raw-query pattern already used
elsewhere in `packages/services`/`packages/repositories` for a single-column lookup by
id, and follow that pattern rather than inventing a new query style), then compute
`emailFlaggedDisposable: boolean` via a SQL call to `is_disposable_email_domain(email)`
(a single extra `SELECT public.is_disposable_email_domain($1)` query, or combine into
one query with the email lookup — implementer's choice, whichever fits the existing
repository style better) and add it to the returned object. If the email lookup returns
no row (shouldn't happen for an authenticated user, but the RPC layer overall favors
explicit handling over silent `undefined`s — check `packages/api`'s existing error
conventions in a sibling operation for how an unexpected missing-row case is normally
surfaced), default `emailFlaggedDisposable` to `false` rather than throwing — this field
is advisory UI, never worth failing the whole context fetch over.

On the frontend: `apps/web/src/auth/types.ts`'s `MyContext` type gains
`emailFlaggedDisposable: boolean`. Add a dismissible-per-session (not permanent —
re-shows next login until the email is actually changed) banner in the main app shell
(`apps/web/src/layout/AppShell.tsx` — check how existing app-wide banners, if any, are
rendered there, or the top of `RoleDashboard`/wherever a persistent top-of-app notice
would naturally sit; match whatever pattern already exists rather than inventing a new
banner primitive) reading along the lines of: "Your account's email domain isn't
accepted for new signups. To keep receiving account emails reliably, update it in
Settings → Profile." (this exact wording is not a Global Constraint string — word it
naturally, this one only needs to avoid technical jargon like "disposable" or
"blocklist"; do not use the word "disposable" or "flagged" in the user-facing copy).
Link it to wherever the existing profile-email-change UI lives (check `ProfilePage.tsx`
under `apps/web/src/pages/` for the existing email-change flow — if none exists yet,
that's a **pre-existing gap** outside this feature's scope; note it in the report rather
than building a new email-change flow here — linking to the Profile page as-is, even if
it doesn't yet support email changes, is still strictly better than not surfacing the
nudge at all).

Also, per the spec's event-logging list: when `getMyContext` computes
`emailFlaggedDisposable: true`, record a `security_events` row with
`event_type = 'EXISTING_ACCOUNT_DISPOSABLE_EMAIL_FLAGGED'` via the existing
`ApplicationContext`/`SecurityEventRepository` pattern already used elsewhere in
`applicationContext.ts` (`recordSecurityEvent`) — but only once per session, not on
every `getMyContext` call (check whether `applicationContext.ts`'s existing
`recordSecurityEvent` calls have any de-duplication precedent to follow; if not, the
simplest correct choice is to log it every time `getMyContext` runs and flags true — an
extra append-only row per session bootstrap for a flagged account is cheap and this
table is designed for exactly this kind of frequent event, so do not build new
de-duplication machinery for this alone).

Run `pnpm -w exec tsc -b`, the web app production build, and any relevant existing
tests under `packages/tests` that already cover `getMyContext` (extend them to assert
the new field's presence/shape rather than leaving it untested).

**Report file:** `.superpowers/sdd/2026-09-02-auth-abuse-protection/task-4-report.md`

### Task 5: Full auth-system audit + report

No code dependencies beyond Tasks 1-4 being complete, but this task needs the finished
state of every prior task to audit against.

Read every file the brief lists in section 17 (signup, signin, signout, email
verification, resend verification, forgot password, reset password, session handling,
auth middleware/RPC guard, protected routes, API authentication, error messages,
database access) — in this repo that means, at minimum: every file in
`apps/web/src/pages/auth/`, `apps/web/src/auth/SessionProvider.tsx`,
`packages/api/src/rpc.ts` and `httpServer.ts`, `packages/services/src/applicationContext.ts`.
For each, verify against the spec's guardrails:

- Can a disposable-email signup reach account creation by calling Supabase's Auth REST
  API directly (not through this repo's frontend or backend at all)? This is the real
  bypass surface (see spec) — verify the hook, once enabled, is Supabase Auth's own
  server-side gate regardless of caller, and write in the report exactly why this closes
  that path (or, if Task 2's hook has any gap you find, flag it as a finding rather than
  silently noting "it's fine").
- Does `ForgotPasswordPage.tsx` still return an identical response whether or not the
  account exists? Does `SignInPage.tsx`'s error handling ever distinguish "no such
  account" from "wrong password" in any code path, including network-error and
  unexpected-error branches? Quote the exact lines.
- Does `VerifyEmailPage.tsx`'s resend path (`supabase.auth.resend`) rely on anything
  other than Supabase's own built-in rate limiting? (It should — there is no other
  mechanism available per the spec; confirm nothing in this repo undermines that, e.g.
  a client-side retry loop that could hammer the endpoint).
- Confirm no code path anywhere logs a raw password, access token, or refresh token
  (grep for `console.log`/`console.error` near password/token variables in every file
  touched by this feature and its neighbors).
- Confirm `security_events` inserts introduced by Tasks 2 and 4 never include the email
  address's local part or a password in `details` — only the domain and counts.
- List, as a table in the report, Supabase Dashboard → Authentication → Rate Limits'
  current values (read via `execute_sql` against `auth.config`-equivalent if inspectable
  through the Supabase MCP tools, or state plainly in the report if this project's MCP
  access doesn't expose that config and the user needs to check the dashboard directly)
  against reasonable recommended values for signup/sign-in/OTP endpoints, per the spec's
  reliance on this as the sign-in/reset/resend enforcement layer.

Then run, and paste the output/summary of: `pnpm -w exec tsc -b`, `cd apps/web && npm run build`,
the full `packages/tests` suite (`pnpm --filter @shiftos/tests test` or whatever the
existing test script is — check `packages/tests/package.json`), and any lint script the
repo already has configured (check root `package.json` for a `lint` script before
assuming one exists or inventing one).

Produce the final implementation report in the exact shape the user's original brief's
section 19 asks for (files changed; what was implemented per sub-area; configuration —
env vars/packages/external services/migrations required, explicitly including the
Dashboard hook-enablement step from Task 2 and the plan-tier limitation on the Password
Verification hook from the spec; security considerations — how false positives and
account lockouts were prevented; tests run and their results) as this task's own report
file, since this is the document the user actually reads at the end.

**Report file:** `.superpowers/sdd/2026-09-02-auth-abuse-protection/task-5-report.md`
(this report *is* the final deliverable — write it accordingly, it will be surfaced to
the user close to verbatim).
