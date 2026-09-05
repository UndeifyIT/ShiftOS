# ShiftOS Onboarding, Context-Awareness & Empty-State UX Audit — Final Report

Branch: `onboarding-ux-audit` (base: `main` @ `a5c664e`)
25 commits total (15 from the 10-task plan + final review fix, plus 10 more from
live Phase I browser testing — now fully complete: five real bugs found and
fixed, plus this report's own updates).

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
  9's UI-visible behavior exactly as designed, and **surfaced and fixed five real
  bugs no task-level review could have caught — one critical (§4a) and four more
  found and fixed in pass 2/3 (§4b, §4c) — all outside the original 10 tasks'
  scope.** Pass 3: a real Employee and a real Admin invitee, each taken through the
  full accept-invitation → complete-profile flow to their own dashboard (and, for
  the Admin, the Admin Console). Pass 4: Task 4's multi-organization
  pending-invitation collision scenario, live — confirmed already correctly
  handled, not a gap (see §4d). **Phase I is now fully complete.**

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

**✅ Done and independently re-verified end-to-end:** `SITE_URL=https://shiftos-web.vercel.app`
was added to the `shiftos-backend-api` Render service (the one
`apps/web/vercel.json` actually routes `/rpc/*` to in production — a second,
older `shiftos-backend` service also exists on Render but is not in the
production path and was left alone), which triggered a live redeploy
(`dep-dade46ajnfac73fig5g0`, confirmed `live`). Once Supabase's email-send
rate limit cleared, a real invite was sent through the live production
backend to a real inbox — the user confirmed clicking the actual delivered
email landed on `/accept-invitation` with the acceptance form, not the
generic sign-in page. The fix is confirmed working in production.

## 4b. Two more real bugs found and fixed completing Phase I

Found while testing the invitation-acceptance flow end-to-end as the invitee, using
the fix from §4a. Both are real, reproducible defects in existing code (not
introduced by this branch), surfaced only because Phase I exercises the full,
real click-through flow rather than individual RPC calls in isolation. Both were
root-caused with temporary, instrumented `console.log` statements (removed before
committing) rather than guessed at, then fixed and re-verified live end-to-end.
Fix commit: `400637b`.

**1. (Fixed) Setting a password on `/accept-invitation` gave no visible
confirmation.** The page's own code calls `setView('success')` after the password
update succeeds, but the screen visibly stayed on the same password-entry form.
**Root cause, confirmed via live instrumentation**: `updateUser()` fires a
`USER_UPDATED` auth event that `SessionProvider` reacts to by re-running its own
session bootstrap — captured with real timestamps, the page genuinely **unmounts
~18ms after `setView('success')` and remounts ~358ms later**; the fresh mount has
no memory of the local success state and re-derives the plain form from the
invitation's still-`pending` status. The account itself was never actually stuck —
navigating elsewhere correctly redirected to `CompleteProfilePage` — but a real
invitee staying on the page saw nothing happen. **Fix**: persist a "just accepted"
flag in `sessionStorage` (survives the remount, unlike component state) written
before `setView('success')` and checked first on mount; cleared once the invitee
clicks through to `/complete-profile`. Re-tested live end-to-end with a fresh
invitee (a real invite through the actual `invite_member` RPC, a real session, a
real password submission): "Welcome to ShiftOS" now correctly appears and survives.

**2. (Fixed) Task 4's "invalid invitation link" message didn't reliably appear.**
Navigating to `/accept-invitation` with the exact hash shape a real expired
Supabase link produces showed the generic "No invitation found" message instead.
**Root cause, confirmed via the same instrumentation**: the hash-error branch
strips the error out of the URL via `history.replaceState` as a side effect, and
the effect genuinely ran a second time ~104ms later (captured live) — by then the
hash was already empty, so the second run fell through to the normal fetch, got a
`401`, and overwrote the correct message with the generic one. This is consistent
with React 18 StrictMode's dev-only effect replay. **Correction to this report's
own earlier claim**: an earlier pass believed this also reproduced in a genuine,
from-scratch production build, ruling out StrictMode — that observation was made
against a `vite preview` server that this same session later confirmed can silently
serve a stale, not-yet-rebuilt `dist/` folder, so that specific "confirmed in
production" claim should not be relied on; it is not re-asserted here. **Fix**: a
`useRef` guard so the hash-error branch's side effect only ever runs once per
mount, mirroring the `cancelled`-flag protection the adjacent fetch branch already
had. Re-tested live in both the dev server and a freshly-rebuilt production
preview: the correct "This invitation link is no longer valid" message now appears
consistently.

Both fixes verified: `tsc -b` clean, full test suite 133/134 passing (the one
failure, in `attendance.integration.test.ts`, reproduced as a pre-existing,
unrelated shared-live-fixture flake — confirmed passing 4/4 in isolation), and
live browser re-testing of both exact scenarios end-to-end.

## 4c. Two more real bugs found and fixed testing the Employee and Admin dashboards

Found completing Phase I: a real Employee invitee and a real Admin invitee, each
sent through the actual `invite_member` RPC and taken through the full
accept-invitation → complete-profile flow to their own dashboard. Both are real,
reproducible copy/labeling defects in existing code, surfaced only by exercising
the full flow for roles the earlier passes hadn't reached yet. Fix commit:
`4e3e968`.

**3. (Fixed) `EmployeeDashboardPage`'s empty-state copy was factually wrong for the
common case.** Every fresh Employee (and Admin) invitee lands on this dashboard
with no linked `employees` record yet — expected, since accepting an invitation
links an `organization_memberships` row, not an `employees` one, and the two are
created independently — but the empty state's description read "This is normal
for administrators who manage ShiftOS without being scheduled themselves," shown
verbatim to a plain Employee. **Root cause**: this audit's own Phase 7 design
notes (§1 of this report's design spec) generalized this empty state having only
considered the Owner-without-a-staff-record case, without accounting for
`RoleDashboard`'s capability-based routing sending every non-managerial invitee —
Employee and Admin alike — to this same page. **Fix**: reworded to be role-agnostic
and actionable ("...ask your manager to add you as an employee"); also corrected
the file's own doc comment, which had the same Owner-only framing. Re-verified
live for both the Employee and Admin test invitees.

**4. (Fixed) Sidebar account-menu role label had no bucket for the Admin role.**
`Sidebar.tsx` derived its uppercase role-label badge from a 3-way capability-signal
ternary (org-wide access → "Manager", a supervisor-permission signal →
"Supervisor", else → "Staff") that never accounted for the separate Admin role
(migration 048) — a real Admin invitee's badge read "Staff" despite the sidebar
simultaneously showing a full admin-only nav section (Employees, Branches,
Members & Roles, Invitations, Organization, Admin Console). Confirmed against a
live `role_permissions` query that `org.members.manage` is granted to Admin and to
neither Supervisor nor Employee, making it a safe, non-overlapping signal. **Fix**:
added an Admin bucket keyed on that permission, between the Supervisor check and
the "Staff" fallback. Re-verified live: the same Admin invitee's badge and sidebar
label both now correctly read "Admin".

The Admin Console page itself (`/admin`) was also confirmed rendering correctly:
a "Read-only for Admins" indicator appropriately reflects the role's read-only
`organizations.read` grant, and its Overview tab's zero-state stat tiles and
"Needs Attention" panel are correctly populated. No further bugs found there.

Both fixes verified: `tsc --noEmit` on `@shiftos/web` clean (pure frontend
copy/label logic, no RPC/schema changes to re-test).

## 4d. Task 4's multi-organization collision scenario — confirmed already correct

Set up a genuine collision: a second real organization, then two real pending
`invitations` rows for the same email address across both organizations
(inserted with the exact shape `membershipService.inviteMember` itself writes,
after `invite_member`'s own email-send step hit Supabase's built-in email-rate
limit from this session's volume of real invites — this substitutes only the
email-delivery side effect, not the DB state under test). A fresh confirmed
auth user and real magic-link session were used to reach `/accept-invitation`
exactly as in every other Phase I test.

**Result: already correctly handled, not a gap.** The page immediately showed
a dedicated "You have more than one pending invitation" screen with working
"Contact support" and "Back to sign in" actions — neither invitation was
silently picked or lost, contrary to what the original Phase 0 finding
described. This is Task 4's own delivered fix (migration `056`'s
`has_other_pending_invitations` flag, branched on in
`AcceptInvitationPage.tsx`) for exactly the gap the Phase 0 audit flagged —
already documented as delivered in §2's "Invitation flow (Tasks 3, 4)" section,
just not live-tested via real UI until now. No bug found, no code change
needed. **This was the last remaining item in Phase I's original scope —
Phase I is now fully complete.**

## 4e. Role-specific "what's next" step added for Manager and Employee (user follow-up)

Requested directly after the report above was delivered and merged: a
role-specific "next thing to try" prompt after initial setup — Manager sees a
"create your first announcement" step, and Employee/Supervisor get their own
version specific to what they can actually do.

Checked before building anything: Supervisor already had a full 5-step
"what's next" chain from Task 8 (profile → team member → schedule → publish →
tasks awaiting review) — genuinely feature-specific already, nothing added.
Manager's chain stopped after publishing a schedule, and Employee only had a
single passive, no-CTA message — both real gaps.

**Added:**
- Manager: a 5th stage — once branches/employees/schedules are all set up and
  no announcement has been posted yet, "Share your first announcement" → links
  to `/announcements`.
- Employee: once the branch has a published schedule (resolving the existing
  "nothing published yet" message), "Request time off when you need it" →
  links to `/requests`, shown only if they've never made a leave request and
  hold the permission to make one.

Both were verified live end-to-end against real fixtures (a real employee,
schedule, and published shift created through the actual RPCs) — confirmed
rendering correctly for both the Owner/Manager and a real Employee invitee.

Did not add a generic "Ask Shifty" step to any role's chain: there's no real
data signal for "has this org tried the assistant yet" without inventing new
persisted progress state, which this codebase deliberately avoids for these
banners (computed purely from existing data). Flagged rather than faked.

**Side-finding, not a new bug:** verifying this surfaced that two of this
session's own test invitees (sent by calling `invite_member` directly rather
than through the real Invite form) had no branch assigned, which correctly —
per existing routing logic — left them without branch access after accepting.
This is a live demonstration of an already-disclosed gap (§5 below:
`invite_member` has no server-side "at least one branch" check), not a new
defect. Fixed for the two test accounts by granting the missing branch access
directly, which also served as incidental re-confirmation that Supervisor's
pre-existing Task 8 steps render correctly once branch access is present.

## 5. Remaining issues

**Phase I browser testing — now fully complete:**
- Live-verified: Owner signup, `CompleteProfilePage` (including a real file-upload
  avatar test), the full 5-step onboarding wizard (org/branch geography selects,
  email-only supervisor invite, departments), the Manager dashboard through employee
  form creation, the invitation-acceptance flow as the invitee end-to-end (password
  set → `CompleteProfilePage` → real Supervisor dashboard), Task 4's invalid-link
  hash-error path (found broken, then fixed and re-verified — see §4b), the
  Employee dashboard and Admin Console views (found two copy/labeling bugs, fixed
  and re-verified — see §4c), and Task 4's multi-organization pending-invitation
  collision scenario (confirmed already correctly handled — see §4d).
- **Phase I is now fully complete** — every item in its original scope has been
  live-tested via real UI interaction.

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

1. ~~Add `SITE_URL=https://shiftos-web.vercel.app` to production's environment
   variables and redeploy~~ — **done**: set on the `shiftos-backend-api` Render
   service, redeployed live, and confirmed working with a real delivered
   invitation email (§4a).
2. Add browser-based timezone auto-detection (`Intl.DateTimeFormat().resolvedOptions().timeZone`,
   still overridable) to the organization and branch setup steps — genuinely missing,
   not a false alarm from the original audit.
3. ~~Debug and fix the two real bugs found completing Phase I (§4b)~~ — **done**:
   both the missing password-success confirmation and Task 4's unreliable
   "invalid link" message were root-caused with live instrumentation and fixed
   (commit `400637b`), verified end-to-end via live browser re-testing.
4. ~~Complete Employee/Admin dashboard Phase I coverage~~ — **done**: both found
   working correctly overall, but surfaced and fixed two copy/labeling bugs
   (§4c, commit `4e3e968`). ~~Complete Task 4's multi-organization
   pending-invitation collision scenario via real UI interaction~~ — **done**:
   confirmed already correctly handled, no bug found (§4d). Phase I is now
   fully complete.
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
