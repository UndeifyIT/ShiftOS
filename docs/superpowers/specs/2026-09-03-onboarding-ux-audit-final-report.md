# ShiftOS Onboarding, Context-Awareness & Empty-State UX Audit — Final Report

Branch: `onboarding-ux-audit` (base: `main` @ `a5c664e`, head: `8a31dcc`)
18 commits total (15 from the 10-task plan + final review fix, plus 3 more from live
Phase I browser testing: a real production bug found and fixed, and this report's own
updates).

## 1. Problems found (Phase 0 audit)

A 4-agent parallel audit of the app's onboarding, context-awareness, and empty-state
behavior across all four roles (Admin, Manager, Supervisor, Employee) found:

**Real, confirmed problems:**
- Branch setup used free-text country/state fields with no structured dataset.
- The invite-a-member form collected first/last name at invite time, contradicting the
  brief's "manager provides only email" requirement — role/org/branch were already
  correctly server-resolved and untamperable, but the collected fields were redundant.
- A bad/expired invitation magic link fell through to a generic "not found" screen
  instead of a clear message.
- A caller with more than one pending invitation across organizations had the second
  one silently, permanently unreachable with no warning.
- No server-side employee-number generation existed anywhere in the codebase (`grep`
  for `EMP-`/`generateEmployeeNumber` returned zero hits) — the field was required,
  free-text, and manually typed every time.
- Three different ad hoc "auto-select my one branch" implementations existed
  (`EmployeeFormPage`, `ScheduleBuilderPage`, invitation branch checkboxes), one of
  which (`BranchScheduleScreen.tsx` on mobile) had a real correctness bug: it took
  `branchIds[0]` unconditionally even for a genuinely multi-branch user.
- Every dashboard rendered raw, unadorned zeros on stat tiles with no context or call
  to action, while list pages elsewhere in the app already had a good `EmptyState`
  pattern.
- No dashboard told a user what to do next once onboarded — only the one-time,
  Owner-only setup wizard offered any guidance.
- **Root cause of "Bucket not found" on avatar upload**: migration `030` (creating the
  `avatars` Storage bucket) had been written and merged but **never actually applied**
  to the production database — confirmed live (`storage.buckets` was empty). A later
  migration (`046`, organization-logo policies) assumed `030` had run and was live with
  orphaned policies referencing a bucket that didn't exist.
- The avatar Storage RLS policies had no upload size/MIME enforcement, and let any
  active org member overwrite any other employee's avatar (intra-org only, not a
  cross-tenant gap).

**Claims that did NOT reproduce** (verified, not fixed, because there was nothing to fix):
- "Password not required after invitation acceptance" — already correctly enforced.
- "Role can be tampered with via the client" — already impossible;
  `accept_invitation()` takes zero parameters and resolves everything server-side from
  the caller's own verified email.
- ~~"Timezone not auto-detected" — already working correctly~~ — **this claim did
  not hold.** Live Phase I browser testing (§4/§5 below) found timezone is not
  auto-detected anywhere in this codebase; both the org- and branch-level Time Zone
  fields require manual selection. Struck through rather than deleted, so this
  report is honest about what changed since the original audit rather than quietly
  rewriting history.
- A live RLS spot-check across 7 core tenant tables (`employees`, `shifts`,
  `shift_assignments`, `invitations`, `organizations`, `branches`,
  `organization_member_branch_access`) found no cross-tenant or cross-branch gap.

## 2. Changes implemented, grouped by area

### Branch setup & geography (Task 2)
- New `packages/geography` package (MIT `country-region-data`) providing searchable
  country → state/province cascades.
- New `SearchableSelect.tsx` UI primitive (WAI-ARIA 1.2 compliant combobox) in
  `packages/ui`.
- `OrganizationStep.tsx`, `OnboardingWizard.tsx`'s `BranchStep`, and
  `BranchDetailPage.tsx` all migrated onto it. Legacy stored values (old display names
  from before this change) are resolved and shown correctly via
  `resolveCountryValue`/`resolveStateValue`, not silently dropped.
- City intentionally stays plain text — the chosen dataset has no city-level data, and
  a full worldwide city database was judged disproportionate (documented non-goal).
- Timezone auto-detection was believed already correct per the Phase 0 audit and was
  left untouched — **later found by live Phase I testing to not exist at all; see §5.**

### Invitation flow (Tasks 3, 4)
- Invite-a-member form (`InvitationsPage.tsx`, and the Owner-only wizard's
  `SupervisorStep`) reduced to email-only — first/last name fields removed
  client-side, columns made nullable server-side (migration `055`, additive, no data
  loss).
- Added a previously-missing invitation **resend** feature.
- `AcceptInvitationPage.tsx` now parses Supabase's auth-error redirect hash (expired/
  invalid magic links) and shows a clear "ask for a new invitation" message instead of
  falling through to a generic screen.
- New migration `056` adds `has_other_pending_invitations` to `get_pending_invitation()`
  so a caller with a second pending invitation across organizations sees a clear
  warning instead of one silently becoming unreachable forever.
- New committed regression test proving `accept_invitation()`'s role/org/branch
  resolution cannot be influenced by a forged JWT or any client-supplied parameter —
  the function genuinely takes zero arguments.
- Verified (no code change needed) that Google OAuth sign-in is not wired into the
  invitation-acceptance journey at all, so there is no password-skip gap to close.

### Employee creation (Task 6)
- New migration `057`: server-side, per-organization, advisory-lock-protected
  sequential employee-number generation (`EMP-0001` style, continuing correctly past
  any existing non-conforming values, never rewriting existing rows).
- `EmployeeFormPage.tsx`'s employee-number field is now read-only-by-default with an
  explicit "customize" escape hatch, not a required manual entry.
- `useDefaultBranchId()` (below) applied to `EmployeeFormPage.tsx` and
  `ScheduleBuilderPage.tsx`'s `CreateScheduleForm` — auto-selects AND hides the branch
  field for single-branch, non-org-wide callers.

### Shared branch context (Task 1)
- New `branchAccess.singleBranchId` field on `get_my_context`'s response — a plain,
  server-computed value, non-null only when the caller has exactly one accessible
  branch and is not org-wide.
- New shared frontend hook `useDefaultBranchId()`, adopted consistently by Tasks 3
  and 6 (see "Remaining issues" for the one place this pattern was NOT extended to).
- Fixed a real correctness bug on mobile: `BranchScheduleScreen.tsx` was taking
  `branchIds[0]` unconditionally even for a genuinely multi-branch user; now has an
  explicit picker/empty-state fallback.

### Dashboard empty states & guidance (Tasks 7, 8)
- New `DashEmptyPanel` component and an optional `DashStat.action` CTA prop, applied
  to every raw-zero stat tile/panel across all four dashboards (Manager, Supervisor,
  Employee, Admin).
- Employee dashboard's two distinct "zero upcoming shifts" cases — no schedule
  published at all, vs. a schedule exists but nothing is assigned to me — now have
  genuinely different framing (one more actionable, one routine/low-alarm) instead of
  identical generic text.
- New `DashNextStepBanner` component: one role-aware "what's next" banner per
  dashboard, computed purely from data each page already fetches (no new persisted
  "onboarding progress" state, so it can never drift from reality). Every suggested
  action is gated on the viewer's real permissions — never a role-name string, never
  an action the viewer can't actually take.
- The pre-existing one-time, Owner-only `OnboardingWizard` was left completely
  untouched — this is a different, ongoing, all-roles mechanism.
- Reworded the "Trial ₦0/month" line for a fresh org (trivial copy change, done
  alongside the empty-state pass as the brief allowed).

### Storage / avatars (Task 9)
- New migration `058`: finally applies the never-actually-live `avatars` bucket +
  `employees.avatar_url` column, adds `file_size_limit`/`allowed_mime_types` (5MB /
  `image/*`, matching the client-side checks already shown to users), and tightens the
  employee-avatar write/update/delete RLS policies from "any active org member" to a
  real permission check (`employees.create`/`employees.update`) — "self, or a
  permission holder" correctly collapses to "permission holder only" here since
  `public.employees` has no auth-identity column to check a self-identity against.
- Full live end-to-end verification: upload → replace → signed-URL read-back →
  logout/fresh-login persistence → server-side MIME/size rejection → delete, all
  through the real Storage API.
- New committed regression test proving the permission tightening and cross-org
  isolation, using this repo's established `SET LOCAL ROLE authenticated` +
  `set_config` RLS-simulation technique.

### Security documentation (Task 10)
- New permanent, live-reverified record (`docs/superpowers/specs/2026-09-03-
  onboarding-ux-audit-security-record.md`) of the Phase 0 RLS spot-check: exact policy
  names, conditions, and the identity-simulation verification method, so a future audit
  doesn't have to redo this blind.

### Unrelated, directly user-requested fix
- `DemoPage.tsx`'s ("Request a demo") form fields now each render on their own line
  (removed a multi-column grid at wider viewports) — a small, direct fix outside the
  10-task plan's scope, applied and committed at the user's explicit request.

## 3. Files / DB changes

**New migrations** (all additive, all live-applied and independently verified against
production `etodmfsmvhewihboxcrp`, none dropping or renaming a column):
- `055_make_invitation_names_optional.sql`
- `056_detect_multiple_pending_invitations.sql`
- `057_generate_employee_number.sql`
- `058_apply_missing_avatars_bucket_and_tighten_employee_policies.sql`

**New packages:** `packages/geography` (country/state data + resolvers).

**New shared frontend pieces:** `useDefaultBranchId()` hook,
`SearchableSelect.tsx`, `DashEmptyPanel`/`DashNextStepBanner`/`DashStat.action`
(all in `dashboardWidgets.tsx`), `parseAuthHashError`.

**New committed tests:**
`acceptInvitationRoleIntegrity.integration.test.ts`,
`avatarPolicyPermissionTightening.integration.test.ts`,
`employees.integration.test.ts`, plus extensions to
`invitations.integration.test.ts`, `context.integration.test.ts`, and a new
`geography.test.ts`.

**New documentation:** the design spec, the 10-task plan, the security record, and
this report — all under `docs/superpowers/`.

## 4. Tests performed

- Every task's diff was independently reviewed by a fresh subagent (task-scoped spec +
  quality gate), with scoped re-reviews after every fix round. 4 of 10 tasks needed
  one fix round; 6 needed none.
- `tsc -b` (whole monorepo project-reference graph) and the `apps/web` production
  build were run and confirmed clean after every task and after the final whole-branch
  review's fix round.
- Full test suite (`vitest run`) confirmed green multiple times across the branch's
  history, most recently: **25 test files, 123 tests, all passing.**
- A dedicated final whole-branch review (most capable model, Opus) read the entire
  4,788-line diff across all 15 commits, independently re-verified live-DB claims
  itself rather than trusting task reports, and found zero Critical findings. It
  surfaced 3 Important, cross-task-only findings (visible only with the whole branch
  in view — see below), which were fixed and independently re-verified clean in one
  additional fix round.
- **Phase I browser testing was performed in two passes**, both live against real
  dedicated dev servers on this branch's own code. Pass 1: fresh Owner signup → email
  confirmation (via Supabase's Admin API, not real email delivery) →
  `CompleteProfilePage` → the full 5-step onboarding wizard (organization, branch,
  supervisor invite, departments, finish) → Manager dashboard → employee creation
  form. Pass 2 (after Playwright MCP needed a manual reconnect mid-session): the
  invitation-acceptance flow as the invitee, using the real redirect fix from §4a —
  password set → `CompleteProfilePage` with a genuine file-upload avatar test →
  the resulting Supervisor dashboard, live-confirming the whole-branch review's
  CTA-deduplication fix. Together these live-confirmed Tasks 1, 2, 3, 6, 7, 8, and
  9's UI-visible behavior exactly as designed, and **surfaced three real bugs no
  task-level review could have caught — one critical (§4a) and two more found in
  pass 2 (§4b) — all outside the original 10 tasks' scope.** Not yet covered:
  Employee/Admin dashboard views and Task 4's multi-organization collision scenario
  via real UI interaction (see Remaining Issues).

## 4a. Critical bug found and fixed during Phase I testing (not part of the original 10 tasks)

**Real invitation emails sent every invitee to the generic sign-in page instead of
the invitation-acceptance flow.** Discovered from the user's own live experience of
a real invitation email — clicking the link "took me straight to the sign in page"
instead of asking for account details.

Root cause, confirmed by generating a real Supabase invite link and inspecting its
`redirect_to`: `packages/auth/src/index.ts`'s `inviteUser()` called Supabase's
`inviteUserByEmail()` with no `redirectTo` option at all, so Supabase Auth fell back
to the project's dashboard-configured Site URL — confirmed live to be
`https://shiftos-web.vercel.app/sign-in`, not `/accept-invitation`. This has been
true for every invitation this app has ever sent, in every environment, since
before this audit began — it is not something Tasks 3 or 4 introduced, but their
new email-only invite form and hardened acceptance flow were never exercised via a
real delivered email during either task's review, so the gap survived both.

**Fix (commit `8a31dcc`):** added an optional `SITE_URL` config value, threaded from
`packages/config` through `packages/backend/src/server.ts` into `packages/auth`'s
`SupabaseAuthProvider`, used to pass `redirectTo: '${SITE_URL}/accept-invitation'`
to `inviteUserByEmail()` whenever it's configured. When absent, behavior degrades to
the previous (broken) default rather than throwing, so this cannot regress any
environment that hasn't set the variable yet. Verified against the Supabase JS SDK's
own source that `redirectTo` is read directly from the options object and forwarded.
Re-ran the invitation integration test suite (5/5 passing) and `tsc -b` (clean)
afterward.

**⚠️ Action required: this fix does not take effect in production until `SITE_URL`
is set there.** Add `SITE_URL=https://shiftos-web.vercel.app` to production's
environment variables (e.g. the Vercel project's environment settings) and redeploy.

## 4b. Two more real bugs found completing Phase I (documented, not fixed — need their own debugging task)

Found while testing the invitation-acceptance flow end-to-end as the invitee, using
the fix from §4a. Both are real, reproducible defects in existing code (not
introduced by this branch), surfaced only because Phase I exercises the full,
real click-through flow rather than individual RPC calls in isolation.

**1. (Important) Setting a password on `/accept-invitation` gives no visible
confirmation.** The page's own code calls `setView('success')` after the password
update succeeds (confirmed server-side — the account's password genuinely changes),
but the screen visibly stays on the same password-entry form, both right after
clicking and on a fresh reload of the same URL. The account is not actually stuck:
navigating elsewhere (e.g. `/sign-in`) correctly redirects to `CompleteProfilePage`
as expected for an authenticated, profile-incomplete user — so the flow silently
still works underneath. But a real invitee who stays on the page after clicking
"Accept invitation" sees nothing happen, which reads as a failure. Suspected cause:
`updateUser()` fires a `USER_UPDATED` auth event that `SessionProvider` reacts to by
re-running its own session bootstrap, plausibly racing with (and winning over) the
page's own local success state before it renders. Recommend: have the submit handler
explicitly navigate to `/complete-profile` on success instead of relying on a local
view state.

**2. (Important) Task 4's "invalid invitation link" message doesn't reliably
appear.** Navigating to `/accept-invitation` with the exact hash shape a real
expired Supabase link produces (`#error=access_denied&error_code=otp_expired...`)
as a genuinely unauthenticated visitor shows the generic "No invitation found"
message instead of Task 4's intended "This invitation link is no longer valid"
message. **Confirmed reproducible in both the dev server and a real production
build** (ruling out React StrictMode's dev-only double-effect-invocation as the
cause — checked specifically and ruled out). Console evidence shows the hash error
IS correctly detected and logged by Task 4's own code, but is immediately followed
by an unexpected, failing `get_pending_invitation` call that overwrites the correct
state. The exact trigger for that second call was investigated but not conclusively
identified (several plausible mechanisms — a dev-mode artifact, a session-status
remount, `SessionProvider` calling the RPC itself — were each checked and ruled
out); this needs focused, instrumented debugging as its own follow-up task.

Both were left as documented findings rather than live-patched, since a rushed fix
to a subtle React state/lifecycle interaction risks introducing a worse regression
than the bug itself.

## 5. Remaining issues

**Not yet done — Phase I is substantially complete, not fully done:**
- Live-verified: Owner signup, `CompleteProfilePage` (including a real file-upload
  avatar test), the full 5-step onboarding wizard (org/branch geography selects,
  email-only supervisor invite, departments), the Manager dashboard through employee
  form creation, the invitation-acceptance flow as the invitee end-to-end (password
  set → `CompleteProfilePage` → real Supervisor dashboard), and Task 4's
  invalid-link hash-error path (found broken — see §4b).
- **Not yet covered:** Employee-role and Admin Console dashboard views, and Task 4's
  multi-organization pending-invitation collision scenario via real UI interaction
  (only unit/integration-tested today, not click-tested).

**New finding from live testing — contradicts a Phase 0 audit claim:**
- **Timezone is NOT auto-detected from the browser anywhere in this codebase.** The
  design spec's §1 stated this was already working correctly and needed no fix.
  Live testing found otherwise: both the organization-level and branch-level Time
  Zone fields initialize blank (`useState('')`) and must be manually selected — a
  repo-wide search for `Intl.DateTimeFormat`/`resolvedOptions` (the API that would
  perform such detection) returns zero matches anywhere in `apps/web/src`. Not
  fixed in this session (discovered after the 10-task plan's work was already
  reviewed and merged) — recommend a small follow-up task to default both fields to
  `Intl.DateTimeFormat().resolvedOptions().timeZone` on mount, still overridable.
- **Minor, cosmetic:** the onboarding wizard's "Shifty" setup-assistant sidebar on
  the Supervisor step still references "name, email and phone" and shows "Pointing
  at: Full Name" — stale copy from before Task 3 removed those fields from the form
  itself. Not functional, just an inconsistent hint.

**Known, disclosed, non-blocking gaps** (all recorded in the committed security
record, not just this report, so they survive the merge):
- Whether Supabase's Dashboard-configured invite-email template personalizes by first
  name is unverifiable from this repo (Dashboard config, not code) — worth a human
  checking directly, now that names are optional at invite time.
- `invite_member` has no server-side "at least one branch" validation for a
  branch-scoped invitation — only a client-side check exists today (pre-existing, not
  introduced by this branch).
- `ResetPasswordPage.tsx`/`ForgotPasswordPage.tsx`/`VerifyEmailPage.tsx` likely share
  the same magic-link hash-error fallthrough gap Task 4 fixed only for
  `/accept-invitation` — a good candidate for a focused follow-up task.
- `resendInvitation` doesn't check `role.is_active` (unlike `inviteMember`); the
  explicit-duplicate-employee-number path has a check-then-insert race with no clean
  error mapping. Both pre-existing-pattern, low-severity.
- `generate_next_employee_number` has broader grants (`anon`/`PUBLIC`) than its sibling
  functions — confirmed, including by live-testing the RPC as `anon`, that this is not
  exploitable (it's `SECURITY INVOKER`, so RLS still filters what it can see), but
  worth tidying to match this repo's usual grant hygiene.
- `organization_member_branch_access`'s SELECT policy lacks the permission check its
  own write policies have — intra-org read only, no cross-tenant reach, pre-existing.

**Whole-branch-only findings** (only visible with all 10 tasks in view; non-blocking,
recommended follow-ups):
- Two competing definitions of "single branch" now coexist: the new
  `useDefaultBranchId()` hook (used by Tasks 3 and 6) treats an org-wide caller as
  never "single-branch" regardless of branch count, while `TasksPage.tsx`'s
  pre-existing `requireBranchPicker` and `AttendancePage.tsx`'s branch default react
  only to raw branch count with no org-wide distinction — the two disagree for an
  Owner whose org has exactly one branch. This wasn't a violation of any single task's
  scope, but is a real product question ("should an org-wide Owner with one branch
  ever get auto-select?") this branch didn't resolve. Comments that falsely claimed
  these were "the same idiom" have been corrected as part of the final review's fix
  round; the underlying `TasksPage.tsx`/`AttendancePage.tsx` behavior itself was
  deliberately left unmigrated pending that product decision.
- Migrations 055–058 are not recorded in `supabase_migrations.schema_migrations` (the
  same class of issue Task 9 was created to fix for migration 030) — mitigating: this
  ledger was already incomplete before this branch (33 of 58 migrations), and all four
  are safely re-runnable idempotent migrations, not a new regression.
- One orphaned, unreferenced test-fixture Storage object was left behind by Task 9's
  live end-to-end verification (`employees.avatar_url` is null on the associated
  fixture employee, so nothing points at it) — recommend deleting it.
- A handful of stale code-comment cross-references (a comment pointing at a deleted
  file path; "Task 10"/"Phase 10" citation mix-ups across a few files) — cosmetic,
  listed for a future cleanup pass, not functional issues.

## 6. Recommendations

1. **⚠️ Highest priority, production-facing:** add `SITE_URL=https://shiftos-web.vercel.app`
   to production's environment variables and redeploy — without it, real invitation
   emails keep sending invitees to the sign-in page instead of the acceptance flow
   (§4a), regardless of the code fix already merged to this branch.
2. Add browser-based timezone auto-detection (`Intl.DateTimeFormat().resolvedOptions().timeZone`,
   still overridable) to the organization and branch setup steps — genuinely missing,
   not a false alarm from the original audit.
3. **Debug and fix the two real bugs found completing Phase I (§4b)**: the missing
   success confirmation after setting a password on `/accept-invitation`, and Task
   4's "invalid link" message not reliably appearing for a genuinely expired link
   (confirmed reproducible in production, not a testing artifact). Both need
   focused, instrumented debugging of the exact React state/lifecycle interaction
   rather than a guessed fix.
4. Complete the remaining Phase I coverage: Employee/Admin dashboard views, and
   Task 4's multi-organization collision scenario via real UI interaction.
5. Resolve the "should an org-wide single-branch Owner get auto-select?" product
   question, then migrate `TasksPage.tsx`/`AttendancePage.tsx` onto
   `useDefaultBranchId()` for real consistency (or explicitly decide they're allowed
   to differ and document why).
6. A small follow-up task to extend `parseAuthHashError`'s handling to
   `ResetPasswordPage`/`ForgotPasswordPage`/`VerifyEmailPage`.
7. A human should check Supabase's Dashboard-configured invite-email template for any
   first-name personalization now that names are optional at invite time.
8. Minor grant-hygiene cleanup on `generate_next_employee_number` (add the same
   `REVOKE ... FROM anon/PUBLIC` its sibling functions already have).
9. Fix the stale "name, email and phone" copy in the onboarding wizard's Shifty
   sidebar on the Supervisor step (cosmetic, post-Task-3 leftover).
