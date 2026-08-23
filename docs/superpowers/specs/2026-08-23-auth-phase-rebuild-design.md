# Auth Phase Rebuild — Design

## Context

Part of the phased frontend rebuild (Marketing phase completed in `ee42be9`). This
phase rebuilds the 7 in-scope auth screens against
`Local file check/design_handoff_shiftos/ShiftOS Auth.dc.html` (source of truth for
exact copy/content per screen — its `CFG` object) and that bundle's `README.md`,
using the canonical design tokens already established in `packages/ui/src/tokens.ts`.
All auth flows already talk to real Supabase auth today (no mocks); this phase
changes visual structure, adds missing state handling, and closes the small
backend gaps the new designs need.

Screens in scope: Sign In, Sign Up, Forgot Password, Reset Password, Verify Email,
Accept Invitation, Complete Profile.

**Explicitly out of scope** (per product decisions made during design review):
- No Role selector on Sign Up. Self-service signup always creates the org Owner;
  other roles only ever come from invitations (existing decision, DEC-017 in
  `SignUpPage.tsx`). The design file's Role field on Sign Up is not implemented.
- No "Admin Invitation" screen. It depends on an Admin role/console that does not
  exist anywhere in the backend yet (verified: no `Admin` role in
  `ensure_standard_roles`, no admin-console schema). That screen is deferred to
  the future Admin-console phase.

## Architecture

### Shared components (new, in `apps/web/src/pages/auth/`)

**`AuthShell.tsx`** — replaces both `AuthMarketingLayout.tsx` (light two-column
shell used by Sign In/Sign Up today) and `AuthLayout.tsx` (bare centered card used
by Verify Email/Accept Invitation/Complete Profile today). One component for all
7 screens, matching the design's split layout:
- Dark left brand panel (hidden below ~720px, matching the design's
  `@media (max-width: 720px)` breakpoint): eyebrow, title + accent span, body
  copy, an optional highlight callout card, and a 4-item benefits list.
- Right form panel: white card, max-width 462px, renders `children` (the
  screen's actual form/status content).
- Top bar: `Logo` + a "topRight" prompt/link pair (e.g. "Don't have an account? /
  Sign up"), taken directly from each screen's config.

Props shape mirrors the design's per-screen `CFG` entries directly (eyebrow,
title, accent, body, highlight, benefits, topRight) so each page file just
supplies its own literal config object copied from the design file, rather than
reinventing prop names per screen.

**`AuthStatusPanel.tsx`** — renders the non-idle views every screen can hit:
Loading, Success, Network error, Expired link, Used link (per the design's
`STATES`/`TONES`). Takes `{ icon, tone, title, body, meta?, cta, onCta, secondary?,
onSecondary? }`. Tone maps to existing semantic color tokens (`ok`/`warn`/`bad`/
`info`/brand `primary`) already defined in `packages/ui/src/tokens.ts`. Replaces
today's hand-rolled per-page success/expired blocks (currently only
`ResetPasswordPage.tsx` has any of this).

**`lib/password.ts`** (new, in `apps/web/src/lib/`) — `checklistFor(password)` and
`strengthFor(checks)`, extracted verbatim from `ResetPasswordPage.tsx`'s current
inline implementation (4 rules: length, uppercase, lowercase, number — matches
the design's `RULES` constant). Used by Sign Up, Reset Password, and Accept
Invitation (all three show the strength meter per the design's `strength: true`
flag).

**`PasswordStrengthMeter.tsx`** (new) — the visual meter (label + colored bar +
checklist), extracted from `ResetPasswordPage.tsx`'s inline JSX, parameterized by
the `checks`/`strength` values from `lib/password.ts`.

**`lib/authErrors.ts`** (new) — one helper, `isNetworkError(error: unknown):
boolean`, checking for `TypeError`/`Failed to fetch`-style thrown errors from
`supabase-js` (which throws directly on network failure rather than returning a
Supabase `AuthError`). Used by every screen's submit handler to decide between
rendering `AuthStatusPanel`'s "Network error" tone vs. an inline validation
error, since these auth calls don't go through `apiClient.ts` (whose
`NETWORK_ERROR` handling only covers the Tier-1 `callRpc` path).

### Per-screen pages (rebuilt in place, same file paths)

Each page keeps its existing responsibility (real Supabase call + local state)
but is rebuilt on `AuthShell` + `AuthStatusPanel` instead of the current shells,
and its config literal (eyebrow/title/body/benefits/etc.) is copied from the
design file's `CFG[screen]` entry so copy matches exactly:

- `SignInPage.tsx` — unchanged logic (`signIn`, Google OAuth), new shell.
- `SignUpPage.tsx` — unchanged logic (`supabase.auth.signUp`), new shell,
  Role field omitted (see Scope).
- `ForgotPasswordPage.tsx` — unchanged logic (`resetPasswordForEmail`), new shell
  + `AuthStatusPanel` for the sent-confirmation state.
- `ResetPasswordPage.tsx` — unchanged logic, but its four inline states
  (checking/form/expired/success) move onto `AuthStatusPanel` + the shared
  password components. The design distinguishes "Expired link" from "Used
  link", but for password recovery specifically, Supabase's client SDK doesn't
  expose enough information to tell these apart reliably — both a never-valid
  and an already-consumed recovery link end up the same way client-side (no
  session established, or `updateUser` failing with no more specific error).
  Unlike Accept Invitation below, there's no authoritative server-side status
  to check here. This phase keeps today's two-state simplification
  (checking/form/**expired**/success) and does not add a distinct "Used link"
  state for Reset Password — a documented scope trim, not a silent gap.
- `VerifyEmailPage.tsx` — rebuilt: real 6-digit OTP form
  (`supabase.auth.verifyOtp({ email, token, type: 'signup' })`) + resend
  (`supabase.auth.resend({ type: 'signup', email })`), replacing the current
  passive "check your email, click the link" page. Email address comes from
  the pending signup (`authUser.email` once a session exists, or the value
  stashed in `sessionStorage` by `SignUpPage` before email confirmation
  completes).
- `AcceptInvitationPage.tsx` — adds an invite-preview card (org, role, branch,
  invited-by, expiry) fetched via the new `get_pending_invitation()` RPC on
  mount, rendered above the password form; keeps existing `updateUser`
  password-set logic; adds "Expired"/"Used" `AuthStatusPanel` states driven by
  the RPC result (`status: 'expired' | 'used' | 'pending'`) instead of only
  reacting to `updateUser` failing.
- `CompleteProfilePage.tsx` — adds Job Title (optional) and photo upload;
  extends `completeProfile()`'s input type and the `users` insert.

## Backend changes (one new migration)

New migration `044_add_job_title_and_pending_invitation_lookup.sql`:

1. `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title text;` — optional,
   no backfill needed.
2. `get_pending_invitation()` — `SECURITY DEFINER`, `REVOKE ALL ... FROM PUBLIC;
   GRANT EXECUTE ... TO authenticated`, mirroring `accept_invitation()`'s exact
   pattern (031/033): matches the calling identity's `auth.email()` against
   `public.invitations`, but does **not** filter to `status = 'pending' AND
   expires_at > now()` the way `accept_invitation()` does — it must also surface
   already-`accepted` or `revoked`/expired rows so the frontend can render the
   right "Used link"/"Expired link" state instead of a bare 404. Returns a single
   row (or null): organization name, role name, an array of branch names (via
   `invitation_branch_access` → `branches`), inviter's full name, `expires_at`,
   and `status`. Read-only — never mutates `invitations`.

No changes to `accept_invitation()` itself; it remains the sole function that
performs the actual acceptance (unchanged from 031/033).

Avatar photo upload needs **no backend changes** — `users.avatar_url` and the
private `avatars` bucket's `users/{authUserId}/...` self-manage RLS policy
already exist (migration 030) and are unused by the current Complete Profile
form.

## Error handling

- Validation errors (empty/malformed fields, password rules, mismatched
  confirmation) stay inline (`InlineError`), same as today — no state-machine
  change needed, these are synchronous and cheap to compute before any network
  call.
- Auth-level errors (wrong password, expired/used link, invitation not found)
  render via `AuthStatusPanel` using each screen's `invalid`/`expired`/`used`
  config, matching the design's copy.
- Network failures (caught via `isNetworkError`) render `AuthStatusPanel`'s
  "Network error" tone ("Couldn't reach ShiftOS") distinctly from an auth
  rejection, on every screen that makes a network call.

## Testing

- `pnpm --filter @shiftos/web build` and `pnpm --filter @shiftos/ui build` must
  stay clean, as with the Marketing phase.
- No automated test suite currently covers these pages (none existed before this
  phase); this phase does not introduce one — consistent with the rest of the
  frontend rebuild, which has relied on build success + the user's manual
  verification against the running dev server.
- The new `get_pending_invitation()` function should be exercised against the
  linked Supabase project the same way prior backend work was (per
  `docs/backend-completion-audit.md`'s precedent): create a real invitation,
  call the RPC as that identity, confirm it returns the right preview data, and
  confirm it still returns a usable row after the invitation is marked
  `accepted` (so the "Used link" state is reachable in practice, not just in
  theory).
