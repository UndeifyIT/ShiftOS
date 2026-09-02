# Plan: Onboarding, Context-Awareness & Empty-State UX

Spec: `docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md` (read in full before touching any task below — it documents what's already correct and must NOT be "fixed" again).

Worktree: `C:\Users\DELL\Music\ShiftOS\.claude\worktrees\onboarding-ux-audit`, branch `onboarding-ux-audit` (base: `main @ a5c664e`, which already includes the merged auth-abuse-protection feature).

Baseline: `pnpm install` clean, `pnpm test` 21/21 files, 96/96 tests passing (live-DB integration tests included).

## Global Constraints (apply to every task)

1. **Resolve role/branch behavior from `myContext.branchAccess`/`permissions`, never from a role-name string.** There is no fixed "Manager/Supervisor/Employee/Admin" enum — see spec §0.
2. **Do not re-implement anything listed as already-correct in the spec §1** (password-required invite acceptance, server-side role enforcement in `accept_invitation`, timezone auto-detection). Verify live if a task touches adjacent code; don't rebuild.
3. Every RLS/grant/migration change must be verified live against the real Supabase project (disposable probe role or rolled-back transaction), never assumed correct from reading policy SQL — this repo's established practice (see the auth-abuse-protection feature's ledger for the exact methodology, including the RLS-on-non-`SECURITY DEFINER`-functions trap that was found and fixed four times there).
4. Do not drop or rename existing columns; additive schema changes only, with sensible defaults for existing rows (backward compatibility — real orgs/branches/employees already exist).
5. No new dependency beyond the one country/state geography package decided in Task 2 (record which package and why in that task's report).
6. tsc -b clean and the relevant build clean after every task; run the full `pnpm test` before declaring a task done, not just the files it touched.
7. Never trust frontend-only restrictions for anything security-relevant — every important permission enforced server-side, matching this repo's existing pattern.
8. Each task ends with a written report (file/DB changes, verification performed, deviations from the brief and why) — same discipline as the auth-abuse-protection plan.

## Task list

Ordered by dependency. Tasks 3-5 (invitations) and Task 2 (geography) and Task 9 (storage) have no dependency on Task 1 and could run in parallel with it; Task 6 depends on Task 1's context field; Tasks 7-8 depend on nothing new (they consume RPCs that already exist).

### Task 1 — Branch-context architecture (foundation)

- Add a computed field to `get_my_context`'s response: `branchAccess.singleBranchId: string | null`, non-null only when the caller has exactly one accessible branch (org-wide/Owner callers get `null` — they're not "single-branch", they see everything).
- Add one shared frontend hook (e.g. `useDefaultBranchId()`) that reads this field, used everywhere a page currently reimplements its own single-branch auto-select.
- Fix `apps/mobile/src/screens/BranchScheduleScreen.tsx`'s unconditional `branchAccess.branchIds[0]` (a real correctness bug for genuinely multi-branch mobile users, not just a UX nicety) to use the new field and fall back to an explicit branch-selection state when `singleBranchId` is null.
- Do NOT migrate every consumer in this task — just land the context field + hook + the mobile bug fix. Tasks 6/9's forms adopt the hook when they touch those files; don't do a repo-wide refactor sweep here (avoid an oversized, hard-to-review diff).

### Task 2 — Structured branch/org geography

- Evaluate and pick one MIT/permissive-licensed country+state(+city, if bundled at no real cost) dataset package. Record the choice and why in the task report (size, maintenance activity, data shape).
- Replace `OrganizationStep.tsx`'s hardcoded 10-country array with a searchable dropdown backed by the real dataset.
- Replace `OnboardingWizard.tsx`'s `BranchStep` and `BranchDetailPage.tsx`'s free-text country/state fields with: a searchable Country select, a State/Province select that repopulates from the selected country (label the field sensibly per-country if the dataset supports it — "State" for the US, "Province" for others, etc. — a generic "State/Province/Region" label is an acceptable fallback if per-country labeling isn't practical), and a City field (structured select if the chosen dataset includes usable city data for the selected state, otherwise a plain text input — decide and document in the report per spec §3).
- Store a consistent identifier (e.g. ISO country code) internally; keep existing free-text values on existing branch/org rows untouched (no backfill/migration of old rows — pure additive UI change on new writes, matching Global Constraint 4).
- Keep the existing pre-fill-from-org-metadata behavior for branch country (don't remove a working feature while restructuring the field type).

### Task 3 — Simplify the invite-a-member form

- Remove the First name/Last name fields from `InviteMemberForm` (`InvitationsPage.tsx`) and the onboarding wizard's `SupervisorStep` equivalent — the invitee provides their own name at `CompleteProfilePage` regardless. Confirm `invite_member`'s required inputs and the `invitations` table columns before deciding whether these become fully unused or merely optional (don't break the column if other code paths still read it — check before dropping).
- Auto-hide/auto-select the branch checkbox list when the inviter has exactly one grantable branch, using Task 1's `useDefaultBranchId()`/`singleBranchId` if Task 1 has landed first; otherwise implement the same `branches.length === 1` auto-select pattern already used correctly in `TasksPage`/`AttendancePage` and note in the report that it should be migrated onto Task 1's hook once available.
- Verify live that invitation status (Pending/Accepted/Expired/Revoked) and resend actually work end-to-end on the Invitations list page; only add resend if it's genuinely missing (spec flagged this as unconfirmed, not confirmed broken).

### Task 4 — Invitation edge cases

- Parse the Supabase Auth redirect hash (`#error=access_denied&error_code=otp_expired...` and similar) on the accept-invitation route and show a clear "this invitation link is no longer valid, ask your organization to send a new one" state instead of silently falling through to a blank/unauthenticated view.
- Address the silently-unreachable-second-invitation case: when `get_pending_invitation()` finds more than one pending, unexpired invitation for the caller's verified email across different organizations, either surface all of them (preferred, if the UI can reasonably support choosing one) or at minimum show a clear message naming the situation rather than silently picking one. Decide and document the exact behavior chosen in the task report.
- Add a regression test for Phase 4's actual requirement (spec §1.2/Task naming): a committed test proving a tampered `accept_invitation` call cannot self-assign a role/org/branch different from what the server-side invitation row says.

### Task 5 — Password-creation edge case verification

- Live-verify (browser test, real invite flow) whether an invitee who completes acceptance via "Continue with Google" is ever left without a password requirement in a state that's actually a gap (vs. legitimately not needing one because OAuth is itself the credential). If it's genuinely fine, document why in the report and close this task with no code change. If it's actually broken (e.g., OAuth-linked account without a real membership row, or the password-optional path leaking into the password-based flow), fix the root cause using the existing Supabase Auth integration — no parallel auth system.

### Task 6 — Employee creation cleanup

- Add server-side sequential employee-number generation per organization (`EMP-0001` style — confirm the exact format doesn't collide with any existing employee_number values in the live database before choosing a scheme; check for existing non-conforming values and handle them as "already set, never regenerated" rather than erroring).
- Make the Employee Number field in `EmployeeFormPage.tsx` optional/auto-filled (read-only by default, editable only via an explicit "customize" affordance if the product still wants that escape hatch — decide and document; simplest compliant option is read-only-by-default, editable on click).
- Apply Task 1's `useDefaultBranchId()` to `EmployeeFormPage.tsx` (auto-select AND hide the branch field, not just pre-fill, when singleBranchId is non-null) and to `ScheduleBuilderPage.tsx`'s `CreateScheduleForm` (which currently has no auto-select/hide at all). Do not remove branch selection for genuinely multi-branch users.

### Task 7 — Dashboard empty states

- Apply the existing `EmptyState` component/pattern (already used well in `EmployeeDirectoryPage`, `BranchListPage`, `EmployeeDashboardPage`'s "No workforce profile yet" case, `TasksPage`) to every raw-zero stat tile/panel found in `ManagerDashboardPage`, `SupervisorDashboardPage`, `EmployeeDashboardPage`, and `AdminConsolePage` (see spec §2 Phase 8 for the exact file:line list from the audit). Each should read "N, plus one line of context, plus a CTA where one exists" per the brief's examples — not a redesign of the dashboards, an additive treatment of the zero/near-zero case specifically.
- Employee dashboard specifically: add a proper empty-state for zero upcoming shifts distinct from "no published schedule at all" (currently both cases render plain, ungenerous text — see spec).
- Optional, low-priority, only if trivial: reword `AdminConsolePage`'s "Trial ₦0/month" line for a brand-new org.

### Task 8 — Role-aware "what's next" guidance

- Add one lightweight, role-agnostic "next action" banner/card per dashboard, computed purely from data each dashboard already fetches (employee count, schedule/task existence) — no new persisted "onboarding progress" state, to avoid a stored value drifting from reality.
- Match the brief's own worked examples per dashboard tier: Manager (no employees → "add your first employee"; employees but no schedule → "create your first schedule"; draft exists → "ready for review"; else normal dashboard), Supervisor (profile/team/schedule/task-review prompts gated by actual permissions — only show an action the viewer can actually take), Employee (no schedule published yet → explain why, don't just show zero), Admin (no branches → create one; branches but no managers/members → invite one).
- This is additive UI only — must not gate or block access to the normal dashboard, and must not duplicate the one-time `OnboardingWizard` (which stays Owner-only, one-time, unchanged).

### Task 9 — Storage: fix the missing bucket + tighten policies

- Root cause (confirmed live, spec §2 Phase 11): migration 030 was never applied to production; migration 046 (which depends on it) was. Write and apply a corrective migration that creates the `avatars` bucket (matching 030's original intent) — check first whether 030 can simply be applied as-is now (idempotent `ON CONFLICT DO NOTHING` on the bucket insert) or whether a fresh, later-numbered migration is required per this repo's append-only migration convention (follow whichever this repo's existing convention actually calls for — check how the auth-abuse-protection feature's migrations 051-054 handled a similar "needs a live fix" situation for precedent).
- Add `file_size_limit`/`allowed_mime_types` to the bucket's config (currently omitted) — pick sane limits matching the client-side `5MB`/`image/*` checks already in the React components, so server-side enforcement matches what users are already told.
- Tighten the `avatars_employees_*` write/update/delete policies from "any org member" to "self, or a caller holding an appropriate employee-management permission" — without breaking the legitimate case of a manager setting an employee's photo on their behalf. Verify live (probe role / rolled-back transaction) that: (a) an employee can still manage their own avatar, (b) a manager/supervisor with the right permission can still set another employee's avatar, (c) a rank-and-file coworker without that permission can no longer overwrite someone else's avatar, (d) cross-org isolation is unaffected.
- Run the full upload/replace/refresh/logout/login/persistence test sequence from the brief's Phase 11 against a real (non-production-polluting) test user once the bucket exists.

### Task 10 — Security write-up (no new code expected)

- The Phase 0 live RLS spot-check (employees, shifts, shift_assignments, invitations, organizations, branches, organization_member_branch_access) found no cross-tenant/cross-branch gap. This task's job is to turn that into a permanent, committed record — not to re-audit from scratch. Write a short doc (or extend the design spec) listing exactly what was checked, the policy names, and the live verification method, so a future audit doesn't have to redo this spot-check blind.
- If, in the course of Tasks 1-9, any additional RLS-relevant surface was touched (Task 1's new context field is read-only/derived, Task 9's storage policies are already covered by Task 9 itself), note it here; otherwise this task should genuinely produce documentation only, not new migrations.

## Execution

Run via `superpowers:subagent-driven-development` — implementer → task review → fix loop → scoped re-review per task, same discipline as the auth-abuse-protection plan, followed by one final whole-branch review before declaring the plan done. Given this plan's size (10 tasks vs. the prior plan's 5), confirm task grouping/priority with the user before dispatching, per that plan's own precedent of checking in given schema/security-sensitive scope.

## Phase I — Browser testing (final verification, not a task)

Per the brief's Phase 14/Empty-State/Responsive/Error-Handling sections: after all 10 tasks are complete and whole-branch-reviewed, run the full manager/employee/supervisor/admin flows end-to-end via Playwright MCP against a disposable throwaway organization (not any existing real org/employee data), covering: branch setup with the new country/state/city selects, supervisor invite-through-acceptance with the simplified form, employee creation with auto-generated employee number and hidden branch selector (single-branch case) vs. visible (multi-branch case), every dashboard's empty state at zero data, avatar upload/replace/persist-across-login, and the invitation edge cases from Task 4. Record pass/fail per flow in the final report, same format as the auth-abuse-protection feature's deliverable report.
