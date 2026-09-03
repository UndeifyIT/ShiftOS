# ShiftOS Onboarding, Context-Awareness & Empty-State UX Audit — Final Report

Branch: `onboarding-ux-audit` (base: `main` @ `a5c664e`, head: `b971fb2`)
15 commits, 51 files changed, ~3,470 insertions / ~230 deletions.

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
- "Timezone not auto-detected" — already working correctly.
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
- Timezone auto-detection was already correct and was left untouched.

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
- **Phase I full-flow browser testing (Manager/Supervisor/Employee/Admin end-to-end
  against a disposable throwaway org) was NOT performed.** The Playwright MCP browser
  tool failed to connect twice (persistent `CONNECT_TIMEOUT`, not a transient blip),
  and no alternative browser-automation tool was available this session. This is
  flagged here explicitly rather than silently skipped or claimed as done — see
  Remaining Issues.

## 5. Remaining issues

**Not yet done:**
- **Phase I browser testing was not performed** (environment limitation, not a code
  gap) — recommend running it as a follow-up once browser automation is available:
  full role-based flows including branch setup with the new geography selects,
  supervisor invite-through-acceptance, employee creation with auto-generated numbers
  and hidden/visible branch selectors, every dashboard's zero-data empty state, and
  avatar upload/replace/persist-across-login.

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

1. Run Phase I browser testing as a follow-up once a working browser-automation tool
   is available, before considering this feature fully verified end-to-end.
2. Resolve the "should an org-wide single-branch Owner get auto-select?" product
   question, then migrate `TasksPage.tsx`/`AttendancePage.tsx` onto
   `useDefaultBranchId()` for real consistency (or explicitly decide they're allowed
   to differ and document why).
3. A small follow-up task to extend `parseAuthHashError`'s handling to
   `ResetPasswordPage`/`ForgotPasswordPage`/`VerifyEmailPage`.
4. A human should check Supabase's Dashboard-configured invite-email template for any
   first-name personalization now that names are optional at invite time.
5. Minor grant-hygiene cleanup on `generate_next_employee_number` (add the same
   `REVOKE ... FROM anon/PUBLIC` its sibling functions already have).
