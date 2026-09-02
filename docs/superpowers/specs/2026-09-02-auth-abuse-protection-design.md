# Auth abuse protection — design spec

**Date:** 2026-09-02
**Status:** approved (user gave a fully-specified brief; this doc resolves it against the actual codebase)

## Problem

Prevent disposable/temporary email signups and general auth abuse (signup, sign-in,
password reset, verification resend) without blocking legitimate users (Gmail,
Outlook, Yahoo, iCloud, corporate/university domains, Gmail `+` aliases) and without
building a second auth system alongside Supabase Auth.

## Existing architecture (as found)

- **Supabase Auth is called directly from the browser.** `apps/web/src/pages/auth/*`
  (SignUpPage, SignInPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage) call
  `supabase.auth.signUp/signInWithPassword/resend/resetPasswordForEmail` straight from
  the client with the public anon key. There is no custom backend endpoint in this path
  today.
- **The custom backend (packages/api's RPC registry, `apps/web/vercel.json` proxying
  `/rpc/*` to the Render service) only runs for already-authenticated, already-in-an-
  organization operations.** `RpcRegistry.execute()` (packages/api/src/rpc.ts) always
  calls `createApplicationContext(client, authUserId, organizationId, ...)` — it has no
  path for a caller with no `authUserId` (pre-signup) or no `organizationId` (a user who
  signed up but hasn't created/joined an org yet). `httpServer.ts` enforces both a
  Bearer token and a body `organizationId` on every request, no exceptions.
- **Consequence:** because signup/sign-in/password-reset/verification-resend all go
  directly client → Supabase (never touching our own Render backend), *our own backend
  code cannot see or gate these calls at all* — not through the RPC layer, not through
  middleware, because there is no request to intercept. Anything we build in
  packages/api only ever helps *after* a session already exists.
- **This means the actual bypass threat model is bigger than "bypass the frontend and
  call our backend directly"** (mentioned in the user's brief) — a motivated attacker
  can call Supabase Auth's own REST API directly with the public anon key, skipping our
  frontend *and* our backend entirely. Only something Supabase Auth itself invokes,
  server-side, as part of its own signup/signin pipeline can be truly unbypassable.
- **Supabase Auth Hooks** (confirmed via Supabase's own docs, this session) are exactly
  that mechanism: a Postgres function Supabase Auth invokes synchronously inside its own
  request handling, before/around the actual auth event. Two are relevant here:
  - **Before User Created** — fires before a row is inserted into `auth.users`; payload
    includes the candidate user (email) *and* `metadata.ip_address`; returning an error
    object rejects the signup outright, string quoted from Supabase's own docs as the
    intended use: *"blocking disposable email domains... enforce custom signup policies
    Supabase Auth does not handle natively."* **Available on Free and Pro plans.**
  - **Password Verification Attempt** — fires on every password sign-in attempt, could
    otherwise host sign-in throttling/lockout logic. **Available on Teams and Enterprise
    plans only** — confirmed via Supabase's docs table. This project's plan tier was not
    re-verified against a paid tier, but nothing in this session's history suggests
    Teams/Enterprise; this hook is being treated as **unavailable** and is not used. This
    is a real, load-bearing constraint on what sign-in-time protection can look like (see
    Global Constraint below) — flagged for the user in the final report, not silently
    designed around.
- **`public.security_events`** (supabase/migrations/016, hardened in 024) already exists,
  is already append-only (trigger-enforced), already has nullable `organization_id`/
  `user_id` specifically because — per its own repository docstring —
  *"a failed login before any org context is known"* may have no organization. This is
  the correct home for every new security event type in this feature; no new table is
  needed for logging.
- **`packages/repositories/src/audit/securityEventRepository.ts`** already provides
  `SecurityEventRepository.record()`. It's constructed from a raw `DatabaseClient`, not
  from an `ApplicationContext`, so it's already usable from contexts with no
  authenticated user (e.g. a standalone script, or — relevantly — nothing inside a
  Postgres hook function, since hook functions are pure plpgsql and can't import this TS
  class; the hook writes to `security_events` with a plain `INSERT`, following the same
  shape).
- **No existing rate-limiting, CAPTCHA, or disposable-email infrastructure anywhere in
  the repo** (grepped for `rateLimit`/`rate-limit`/`rate_limit`, `captcha`/`turnstile`/
  `hcaptcha`, `disposable`; only tsbuildinfo noise and one unrelated `testEnv.ts` hit for
  the last).
- **Supabase Auth already has its own project-wide rate limits** (Dashboard:
  Authentication → Rate Limits) covering signup, sign-in, OTP/magic-link/email sends,
  token refresh, etc. — active by default on every plan, independent of Hooks. This is
  the *existing rate-limit infra* the brief says to reuse rather than duplicate, for
  every auth action that never reaches our backend.
- `public.users` (app-level profile table, distinct from `auth.users`) already has an
  `email` column, already copied at profile-completion time
  (`CompleteProfilePage`/`SessionProvider.completeProfile`). `SessionProvider.bootstrap()`
  already loads this row every app load, before deciding `no-profile` / `no-organization`
  / `ready`.
- `ForgotPasswordPage.tsx` already returns a generic "if that email belongs to a ShiftOS
  account..." message regardless of whether the account exists (verified by reading the
  file this session) — the anti-enumeration requirement for password reset is **already
  met**; this feature only needs to verify it stays that way, not build it.
- Chosen disposable-domain data source: **`mailchecker`** (npm, `FGRibreau/mailchecker`).
  Checked this session: last published 2026-07-18 (actively maintained, unlike
  `disposable-email-domains` which is stale since 2022), ships `blacklist(): Set<string>`
  with 56,359 entries, confirmed `gmail.com`/`outlook.com`/`yahoo.com`/`icloud.com` are
  *not* in it. Used only as a **build-time data source** — its list is baked into a
  Postgres table via a generated migration, not required at runtime by the hook or by
  the Node backend (no new runtime dependency on Render).

## Architecture decisions

1. **Disposable-domain data lives in Postgres**, in a new
   `public.disposable_email_domains(domain text primary key)` table, seeded from
   `mailchecker`'s list via a one-time generation script whose *output* (a migration
   file) is committed — not a live npm dependency the hook or backend calls at runtime.
   Refreshing the list later means: bump `mailchecker`, re-run the generator, commit a
   new migration. The check itself (`public.is_disposable_email_domain(text)`) never
   changes when the list does — satisfies "list can be updated without modifying
   authentication logic" directly.
2. **Signup blocking + signup-attempt IP tracking + signup security-event logging all
   live in one Postgres "Before User Created" Auth Hook function**, because it's the
   only chokepoint that runs no matter what calls Supabase Auth's signup endpoint. Steps
   inside the hook, in order: normalize the email (lowercase domain only, never touch
   the local part — no alias stripping), extract the domain, check
   `is_disposable_email_domain` → reject with the exact user-facing message if true (and
   log `DISPOSABLE_EMAIL_SIGNUP_BLOCKED`); else check a small `signup_attempts` table
   keyed by `ip_address` over a rolling window → reject with a generic rate-limit message
   if over threshold (and log `SIGNUP_RATE_LIMITED`); else record the attempt and allow
   (`decision: continue` is implicit — Before User Created only needs to *not* return an
   error to proceed, no explicit continue payload like Password Verification has).
   Enabling the hook itself (Dashboard → Authentication → Hooks → Before User Created →
   select the Postgres function) is a one-time manual step in Supabase's dashboard — no
   MCP tool or migration can flip that toggle; this mirrors the Google OAuth-provider
   enablement earlier in this project's history. The report must say so plainly.
3. **Sign-in-time handling of an *existing* disposable-email account is a soft, non-
   blocking nudge, not a hook**, because the one hook that could gate sign-in itself
   (Password Verification Attempt) is plan-gated and unavailable. Instead: extend
   `get_my_context` (packages/api/src/operations/context.ts) — already called on every
   successful bootstrap once a user has an organization — to look up
   `public.users.email` for `context.userId` and return
   `emailFlaggedDisposable: boolean` alongside the existing fields, computed live against
   `is_disposable_email_domain` (no new column, no stored flag, nothing to migrate on the
   `users` table itself). The frontend shows a dismissible-but-persistent banner/prompt
   (not a hard lockout — the brief is explicit that existing accounts must never be
   destroyed or broken) directing the user to Settings → Profile to change their email;
   Supabase's own `updateUser({ email })` flow (already how email changes would work,
   confirmed by there being no custom email-change RPC) re-verifies the new address
   before it takes effect. A user who never changes it keeps working normally — the
   nudge does not expire access.
4. **Sign-in brute-force / rate limiting, password-reset abuse, and verification-resend
   abuse are covered by Supabase Auth's existing, already-active project rate limits**
   (Dashboard → Authentication → Rate Limits), *not* new application code — because, as
   above, none of these calls ever reach our backend, and the one hook that could add
   custom logic to sign-in specifically is unavailable on this plan. The plan's audit
   task documents current-vs-recommended limit values for the user to (optionally) tighten
   in the dashboard, and separately audits our own frontend error copy so it never
   contradicts Supabase's own anti-enumeration behavior (e.g. never turning a generic
   "Invalid login credentials" into "no such user" text).
5. **Risk scoring is implemented once, in plpgsql, inside the Before User Created hook**
   — not as a separate TypeScript module — because the only place it can act (rejecting
   a signup before Supabase creates the user) is inside that hook, and a TS module the
   hook can't call would just be dead code duplicating the real logic in a second
   language. A parallel, deliberately identical-by-construction TS function
   (`packages/services/src/security/disposableEmail.ts`) *is* still written, but purely
   as (a) the shared normalization helper the frontend and any future backend code can
   import so error-message logic never re-implements domain parsing, and (b) a unit-
   tested mirror of `is_disposable_email_domain`'s domain-matching rule, generated from
   the same committed domain list, so the test suite can assert the exact behaviors the
   brief's section 16 asks for without needing a live Postgres connection.
6. **No CAPTCHA is added.** None exists today; the brief says not to add a paid
   dependency preemptively. The hook's reject path is structured so a future "HIGH risk
   → challenge" branch has an obvious insertion point (a single `if` before the final
   `insert ... allow` in the hook function), but nothing calls it yet.

## Explicit non-goals / guardrails carried into every task

- Never treat "unfamiliar domain" as disposable — only exact matches against the
  generated table.
- Never strip or normalize the local part of an email (no `+alias` handling) —
  normalization touches only `lower(split_part(email, '@', 2))`.
- Never delete, deactivate, or block sign-in for an existing account because its email
  domain is now on the disposable list.
- Every user-facing message is one of the three exact strings the brief specifies
  (permanent-email, rate-limit, invalid-credentials/generic) — no internal detail
  (blocklist name, IP, risk score, threshold) ever reaches a response body or UI string.
- No raw password or verification token is ever written to `security_events` or logged
  anywhere.

## Global Constraints (binding on every task)

- Exact user-facing strings:
  - Disposable email at signup: `Please use a permanent email address to create your account.`
  - Rate limited: `Too many attempts. Please wait a few minutes and try again.`
  - Sign-in failure (any reason): `Invalid email or password.`
  - Password reset (always, regardless of account existence): the existing
    `ForgotPasswordPage` copy — do not change it, just verify it.
- `security_events.event_type` values to use, verbatim: `DISPOSABLE_EMAIL_SIGNUP_BLOCKED`,
  `SIGNUP_RATE_LIMITED`, `EXISTING_ACCOUNT_DISPOSABLE_EMAIL_FLAGGED`.
- New migrations continue the existing `supabase/migrations/NNN_description.sql`
  sequence (next is 051) and follow the file's own established idiom: `IF NOT EXISTS`
  guards around every `CREATE`/`ALTER`, matching migrations 048–050's style.
- New Postgres functions/tables follow migration 024's pattern for anything append-only
  or security-sensitive (grant `supabase_auth_admin` explicitly for the hook function
  per Supabase's own documented grant pattern; revoke from `anon`/`authenticated`).
- No destructive operation against the live Supabase project. Verify every migration
  against the project's `list_tables`/`execute_sql` (read-only) before applying, and
  apply via `apply_migration` the same way this session's migrations 048–050 were
  applied and verified (temp test org create/delete pattern where relevant).
- `pnpm -w exec tsc -b`, the web app's production build, and the existing test suite
  (`packages/tests`) must stay clean after every task.
