# Onboarding, Context-Awareness & Empty-State UX — Design Spec

Source brief: user's "Complete Onboarding, Context-Awareness & Empty-State UX Audit + Implementation" request, 2026-09-03. This spec is the output of Phase 0 (full audit) and exists to separate **confirmed real problems** from **things the brief assumed were broken but aren't**, before any implementation plan is written.

Audit was performed by 4 parallel read-only research passes over the codebase at `main @ a5c664e` (post auth-abuse-protection merge), plus a live read-only query against the production Supabase Postgres instance. Full findings are folded into this document; nothing below is speculative — every claim traces to a specific file:line or a live query result.

## 0. Role model correction (affects every phase below)

The brief's language ("Manager", "Supervisor", "Employee", "Admin" as if they were fixed system roles) doesn't match the schema. Roles are **per-organization rows** in `public.roles` (`002_create_identity_access.sql`), not a global enum. Out of the box, only "Owner" is a true system role (org-wide access, created at signup by `create_organization_with_owner`); "Supervisor" and "Employee" are seeded per-org by `ensure_standard_roles()`; "Admin" was added later (048). Dashboards are chosen by **capability signal**, not role name (`RoleDashboard.tsx:19-32`): org-wide branch access → Manager-style dashboard; branch-scoped + a management permission → Supervisor-style dashboard; else → Employee-style dashboard. There's also a separate org-level `/admin` console.

This spec keeps using "Manager/Supervisor/Employee/Admin" as shorthand for these capability tiers, matching the brief's language, but every implementation task must resolve behavior from `myContext.branchAccess`/`permissions`, never from a role-name string.

## 1. Corrections — claims in the brief that do not reproduce in current code

These are important to state plainly so the plan doesn't spend effort "fixing" things that already work, and so any live testing later isn't surprised.

1. **"Supervisor can register and get sent to dashboard without creating a password"** — not found. `AcceptInvitationPage.tsx` requires `supabase.auth.updateUser({ password })` (line ~100) before the view becomes `'success'` and routing proceeds. Password creation is mandatory on the password-based path. **Open question for live testing (Phase I):** does this gate get bypassed if the invited user completes acceptance via "Continue with Google" instead of setting a password? OAuth identity wouldn't need a password by definition — need to verify this is handled sanely (e.g., OAuth-completed invitees never see the password step at all, rather than the step being skippable while still nominally password-auth). Flagged as a verification item, not an assumed bug.
2. **Role tampering via direct API calls** — not found. `accept_invitation()` (`031_add_supervisor_role_and_invitations.sql:377-431`, hardened in `033`) takes zero client-supplied identity/role/org/branch parameters; role_id and branch grants come entirely from the server-written `invitations`/`invitation_branch_access` rows, keyed off the caller's own verified `auth.uid()`. There is no role selector on the acceptance UI to hide, either — it was never there. This part of the brief (Phase 4) is **already implemented correctly**; no code change needed, just confirm live and document.
3. **Timezone auto-detection** — already implemented per spec. `OnboardingWizard.tsx`'s `BranchStep` (lines 57-77, 187-197) populates a searchable select from `Intl.supportedValuesOf('timeZone')` with a static IANA fallback, and (per the brief's own requirement) this needs live confirmation of auto-selection-from-browser, but the plumbing described in Phase 2's timezone section already exists. Scope for Phase 2 shrinks to country/state/city only.
4. **Manager providing more than "just an email" to invite a Supervisor** — partially true and worth noting precisely: the current `InviteMemberForm` (`InvitationsPage.tsx`) collects **First name, Last name, Email, Role, Branches** — not password/phone/employee-number/other personal info (those genuinely aren't collected), but first/last name IS collected today, which the brief's Phase 3 says shouldn't happen. This is a real, scoped finding (see §3.3 below), smaller than the brief implied.

None of the above changes the plan's obligation to verify these live in the browser (Phase I) — "audited in code" is not "verified working." But it does mean Phases 4 and (mostly) 2's timezone sub-section are verification-only, not implementation.

## 2. Confirmed real problems, by phase

### Phase 2 — Branch setup geography

- Country/state/city are free text in both `OnboardingWizard.tsx`'s `BranchStep` (lines 159-180) and `BranchDetailPage.tsx` (lines 191-207, the same form reused for every later branch). Country is sometimes pre-filled-and-disabled from org metadata, but state/city are never validated against country and have no cascading data source.
- The separate org-level country field (`OrganizationStep.tsx:47-59`) is a hand-maintained 10-country array, not backed by any ISO dataset.
- No `country-state-city`/`world-countries`/similar package exists anywhere in the repo's dependencies (checked via repo-wide grep).
- **Decision**: introduce one reliable, MIT-licensed structured geography dataset (see plan for the specific package) used consistently by both the org-level country select and the branch-level country→state→city cascade. This is the one new dependency this whole feature justifies — the brief explicitly permits it ("introduce a sensible dependency" if none exists).

### Phase 3 — Supervisor invitation flow

- `InviteMemberForm` collects first/last name in addition to email (`InvitationsPage.tsx`). Per the brief's stated goal, drop these — the invitee provides their own name at `CompleteProfilePage` regardless (confirmed: `CompleteProfilePage.tsx` already collects first/last name post-acceptance), so collecting it twice is exactly the "asking for what it'll ask again" pattern the brief is about. Removing it also shrinks the invite RPC's required input, which is backward-compatible (the column(s) become optional/unused, not dropped from the schema — invitations already in flight are unaffected).
- Branch checkbox list on the invite form is always shown, even for a single-branch org / a branch-scoped inviter who can only ever grant their own branch. Auto-select-and-hide when there's exactly one selectable branch, consistent with the pattern already used elsewhere (see §2 Phase 10).
- Invitation status surfacing (Pending/Accepted/Expired/Revoked) — confirmed already present via `get_pending_invitation()`'s computed status and the Invitations list page; resend functionality needs a quick confirmation pass (not confirmed broken, not confirmed present with certainty — verify in Phase I, implement only if actually missing).

### Phase 4 — Role from invitation

No implementation gap found (§1.2). Task: write the committed regression test this claim currently lacks (nothing today asserts server-side that a tampered `accept_invitation` call can't self-assign a role), and confirm live.

### Phase 5 — Supervisor account creation

No implementation gap found for the password-based path (§1.1). Tasks: (a) verify the Google-OAuth-invitee edge case live and fix only if it's actually broken; (b) implement the two real invitation edge-case gaps found by the audit:
  1. A second organization's pending invite to an already-invited email becomes silently unreachable once the first is accepted (`get_pending_invitation()`/`accept_invitation()` both pick a single pending-and-unexpired row with no tie-breaking or multi-invite awareness). Low-severity UX gap — fix by surfacing all pending invitations for the caller's verified email, not just one, or at minimum a clear message when more than one exists.
  2. A bad/expired/consumed Supabase invite magic-link redirects with an `#error=access_denied&error_code=otp_expired...` URL hash that nothing in the frontend parses — the user lands on `/accept-invitation` with no session and no explicit "this link is invalid, request a new one" messaging. Real, cheap, user-facing fix.

### Phase 6 — Other invited roles

Confirmed: Employee and Admin invitations run through the exact same `invite_member`/`accept_invitation` pipeline as Supervisor — no role-specific branching exists to audit separately. No additional work beyond what Phases 3-5 already cover, except the name-field removal (§Phase 3) and geography (n/a) apply identically since the form is role-agnostic.

### Phase 7 — First-login / onboarding experience

- The only role-aware "what do I do first" flow that exists is the one-time `OnboardingWizard`, and it's Owner-only, shown once, then gone forever (`metadata.onboardingCompletedAt` gate in `App.tsx:202-205`).
- After that, Manager/Supervisor/Employee/Admin dashboards render their full normal widget set unconditionally — no "you have no data yet, here's what to do next" state distinct from a normal populated dashboard, except one good existing example: `EmployeeDashboardPage.tsx`'s "No workforce profile yet" `EmptyState` for an Owner who isn't scheduled as an employee. This is the pattern to generalize, not invent from scratch.
- **Decision**: add a lightweight, role-agnostic "next action" banner/card driven purely by existing data shape (employee count, schedule/task existence) computed from RPCs each dashboard already calls — no new tables, no new "setup state" persisted anywhere (avoids the over-engineering trap of a stored onboarding-progress record that can drift from reality).

### Phase 8 — Intelligent empty states

- Confirmed raw-zero renders on every dashboard's stat tiles (`ManagerDashboardPage`, `SupervisorDashboardPage`, `EmployeeDashboardPage`, `AdminConsolePage` — see audit for exact lines). Contrast: dedicated list pages (`EmployeeDirectoryPage`, `BranchListPage`, `TasksPage`) already have a decent `EmptyState` component with title/description/CTA.
- **Decision**: reuse the existing `EmptyState` component/pattern on dashboard stat tiles and panels rather than inventing new UI language. This is a frontend-only, additive change — no schema/API changes required, since the underlying counts are already fetched.
- One cosmetic-but-real item found along the way: `AdminConsolePage.tsx:215-218` shows a hardcoded `"Trial ₦0 / month"` / seat-cap line that reads oddly for a fresh org — reword only, not a functional bug, low priority.

### Phase 9 — Manager add employee

- Branch selector: only pre-filled for single-branch orgs (`EmployeeFormPage.tsx:125-126`), not hidden — user still sees a dropdown with one option they must click. Same gap exists in `ScheduleBuilderPage.tsx`'s `CreateScheduleForm` (no auto-select or hide at all) and the invitation branch checkboxes (Phase 3).
- Employee number: required, free text, no auto-generation anywhere in the codebase (confirmed via grep — zero hits for `EMP-`/`generateEmployeeNumber`).
- **Decision**: (a) extract the single-branch auto-hide pattern already used correctly in `TasksPage`/`AttendancePage`/`ScheduleListPage` into one shared frontend helper/hook, apply it to `EmployeeFormPage`, `ScheduleBuilderPage`, and the invitation form, rather than each page reinventing it (three different ad hoc implementations exist today — consolidate, don't multiply); (b) auto-generate employee numbers server-side (`EMP-0001` style, sequential per org) and make the field optional/read-only in the primary creation flow, editable only if a manager deliberately wants a custom value.

### Phase 10 — Role + branch context

- No centralized "resolve my accessible branch(es)" concept exists in `ApplicationContext`/`get_my_context` — only the raw `branchAccess.branchIds` array is exposed; every page that wants "the one branch this user is scoped to" reimplements its own auto-select (three different versions found, one of them — mobile's `BranchScheduleScreen.tsx` — unconditionally takes `branchIds[0]` even in a genuinely multi-branch scenario, which is a real correctness gap on mobile, not just a UX one).
- **Decision**: add a computed field to `get_my_context`'s response (e.g. `branchAccess.singleBranchId: string | null`, non-null only when the user has exactly one accessible branch) and a shared frontend hook consuming it, then migrate the existing ad hoc implementations onto it. This is the Phase A "data/context architecture" work everything else in Phases 9-10 builds on — do this first among the implementation phases.

### Phase 11 — Profile image / Supabase Storage

- **Root cause of "Bucket not found", confirmed via live query**: migration 030 (creates the `avatars` bucket + its RLS policies + `employees.avatar_url` column) was **never applied** to the production database — `storage.buckets` is empty, `employees.avatar_url` doesn't exist. Migration 046 (org-logo policies, which assumes 030 already ran) WAS applied, so it's currently orphaned — policies referencing a bucket that doesn't exist.
- **SECURITY (minor, pre-existing, documented in 030's own comment as accepted)**: current `avatars_employees_*` policies scope by org membership only, not "self or a manager" — any active member of an org can overwrite any other employee's avatar within that same org. Cross-org isolation is intact; this is intra-org only.
- **SECURITY**: no server-side file-size/MIME enforcement — `storage.buckets` insert in 030 omits `file_size_limit`/`allowed_mime_types`, so a caller hitting the Storage REST API directly (bypassing the React upload components' client-side checks) can upload arbitrarily large or non-image files, limited only by RLS path/org checks.
- **Decision**: (a) fix the migration-ordering defect properly — apply 030 (or a new corrective migration if 030 can't simply be re-run, given it may already be marked differently in this environment's tracking) so the bucket and its policies actually exist in production, verified live afterward; (b) add `file_size_limit`/`allowed_mime_types` to the bucket config; (c) tighten the avatar write policy to self-or-permission rather than any-org-member, without breaking the legitimate manager-sets-employee-photo case.

### Phase 12 — Database + security audit (spot-check, not exhaustive)

Live `pg_policy`/`relrowsecurity` spot-check across `employees`, `shifts`, `shift_assignments`, `invitations`, `organizations`, `branches`, `organization_member_branch_access` found **no cross-tenant or cross-branch read/write gap** — every policy consistently gates on `get_user_organizations()` and, where relevant, `user_accessible_branches()` or an explicit permission check. The only concrete gaps found anywhere in this audit are the two Storage items in Phase 11 above. This phase's deliverable is therefore the corrective storage migration plus a written record of what was checked and found clean (so this doesn't need re-auditing next time), not a large defect list.

The permanent, re-runnable record of this spot-check — exact policy names/conditions, the live queries used, the identity-simulation technique this whole feature's live verification relies on, and what Tasks 1-9 of the implementation plan touched that's RLS-relevant — is `docs/superpowers/specs/2026-09-03-onboarding-ux-audit-security-record.md` (Task 10).

## 3. Explicit non-goals / deferred items

Consistent with the brief's own "do not over-engineer" rule and this plan's job to separate signal from noise:

- **Role-change-after-invitation-acceptance**: no RPC/UI exists to change a member's role once assigned. Real gap, but not requested by the brief (which is about onboarding/first-run, not role administration) — noted as a recommendation in the final report, not a task.
- **City-level structured data**: full worldwide city datasets are large and of inconsistent quality; the plan uses a country→state cascade with city as a plain (but now country/state-scoped-hint) text field rather than pulling in a heavyweight, hard-to-maintain city database, unless the chosen country/state package already bundles reasonable city data at no extra dependency cost (evaluated during implementation, decision recorded in the plan).
- **Mobile app parity**: the brief's flows are web-first (`apps/web`); `BranchScheduleScreen.tsx`'s unconditional `branchIds[0]` bug is flagged as a real correctness issue but fixing full mobile parity for every phase here is out of scope — only the specific mobile bug found is fixed, using the same shared context field from Phase 10.
- **Billing/seat-cap copy** (`AdminConsolePage`'s "Trial ₦0/month"): reworded only if trivial to do alongside the empty-state pass; not a dedicated task.

## 4. Testing strategy

- Unit/integration tests added per task, following this repo's existing Vitest conventions (see `packages/tests`).
- Every RLS/grant change verified live against the real Supabase project via disposable probe roles / rolled-back transactions, per this repo's established practice (see the auth-abuse-protection feature's ledger for the exact methodology) — never assumed correct from reading policy SQL alone.
- Full browser testing (Playwright MCP) for every role's flow per the brief's Phase 14, run against a local dev server pointed at the same Supabase project (not production) so test data doesn't pollute real org/employee tables — decision to be confirmed against how the previous feature's live-verification was done, since that one did test directly against `shiftos-web.vercel.app`. Given this feature touches org/employee/branch creation (not just an auth hook), test data cleanup matters more here — prefer a disposable throwaway org created during the test itself over reusing/mutating any existing org.
