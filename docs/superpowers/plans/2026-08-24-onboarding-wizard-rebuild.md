# Onboarding Wizard rebuild — implementation plan

Spec: `docs/superpowers/specs/2026-08-24-onboarding-wizard-rebuild-design.md`
(read it in full before starting any task — it documents the backend audit,
all 10 scope-decision rulings, and exactly why each trim was made).

## Global Constraints

- No new Supabase migration — the spec confirmed `organizations.metadata`,
  `branches.settings`, and the existing Departments backend (migration 041)
  cover every new field this phase needs.
- No new dependencies. Reuse `@shiftos/ui` components and
  `apps/web/src/components/shifty/` exactly as they exist today.
- Supervisor step's permission checklist is **read-only display**, never an
  editable control (spec decision 4) — do not add a per-invitation
  permission-override capability.
- Do not build a photo-upload control for supervisor invites (spec
  decision 6) — there is no account yet to attach a photo to.
- Every step must remain reachable and functional if a user reloads
  mid-wizard (each step's data already lives in the DB by the time you
  advance past it — branch/department/invitation rows, or the
  organization's own metadata — so re-fetching on mount, not
  client-only wizard state, is the source of truth for "what's already
  done").
- Keep `apps/web`'s build clean (`tsc -p tsconfig.json && vite build`) after
  every task.

## Task 1 — Shared wizard shell

Extract the outer chrome currently inline in
`apps/web/src/pages/onboarding/OnboardingWizard.tsx` (logo header, step-dot
progress row, `Card` wrapper, `ShiftyPanel` slot, `Shifty` chat widget) into
a new `apps/web/src/pages/onboarding/OnboardingWizardShell.tsx` component
that takes the full 5-step list (`Organization, Branch, Supervisor,
Department, Finish`) and a `currentStep` prop, and renders `children` inside
the card. This is the component both the Organization step (task 2,
rendered from `App.tsx`'s `no-organization` branch) and the remaining wizard
(task 3+, rendered from the existing `OnboardingGate` branch) will share, so
the two route branches feel like one continuous wizard even though they're
separate mounts (spec decision 1 — read it for the full reasoning before
touching `App.tsx`).

Match the design's sidebar/stepper visual structure
(`Local file check/design_handoff_shiftos/ShiftOS Onboarding.dc.html`,
roughly lines 29-97 for the sidebar markup and the `STEPS`/`stepList`
config around lines 344-350 and 520+) as closely as reasonably possible
using existing `@shiftos/ui` primitives and Tailwind utility classes — don't
introduce new design tokens, and don't attempt pixel-perfect fidelity to the
static mock's inline styles; match structure, spacing rhythm and the
five-step-with-checkmarks progression, not literal CSS values.

Keep the existing `Shifty`/`ShiftyPanel` per-step guidance slot — update its
copy to match the design's `SCRIPT` array (lines 353-387) for all 5 steps,
including a new Organization-step entry (the design's own SCRIPT already
has one, first in the array).

## Task 2 — Organization step + routing swap

Read `apps/web/src/pages/onboarding/OrganizationSetupPage.tsx` in full
(existing name/slug logic to carry over) and the design's `Organization`
CFG entry (lines 397-415 of the design file) for the exact field set:
Organization Name, Business Type, Number of Departments (a small preset
list, not free text — check the design's own `value` examples like
"4 – 6" for the expected shape), Estimated Employees (same preset-range
pattern), Country, Time Zone, Workspace Name (this is the existing `slug`
field, keep its live-slugify-from-name behavior), and Organization Logo
(optional upload).

Create `apps/web/src/pages/onboarding/steps/OrganizationStep.tsx`:
- Renders inside `OnboardingWizardShell`.
- All fields except name/slug/logo are stored in a single object passed to
  `create_organization_with_owner`'s existing call — but that RPC only
  accepts `p_name`/`p_slug`/`p_owner_role_name` today. After creating the
  organization, immediately call `update_organization` (already used by the
  existing Finish step — check its exact RPC name/shape in
  `OnboardingWizard.tsx`'s current `FinishStep`) to merge the extra fields
  into `metadata` (`businessType`, `departmentCountEstimate`,
  `estimatedEmployees`, `country`, `timeZone`) in the same shape decision 2
  describes.
- Logo upload: read `apps/web/src/lib/avatars.ts` in full and add a
  `uploadOrganizationLogo(organizationId, file)` function there (mirror
  `uploadUserAvatar`'s exact structure/error-throwing convention, just a
  different path prefix: `organizations/${organizationId}/${Date.now()}.${ext}`
  in the same `avatars` bucket). **Already confirmed during plan-writing:**
  the bucket's existing RLS (030) only recognized `users/`/`employees/`
  prefixes, so `supabase/migrations/046_add_organization_logo_storage_policy.sql`
  was already written (mirrors 030's `avatars_employees_*` policies exactly,
  just for an `organizations/` prefix) and is committed to the repo — **it
  still needs to be live-applied** to the linked Supabase project before
  this feature will actually work end-to-end (the Supabase MCP tools were
  unavailable/disconnected when this plan was written; apply it via
  `mcp__claude_ai_Supabase__apply_migration` or `supabase db push` before
  or during this task, whichever is available at execution time — do not
  skip this and assume it's already live).
- Since `create_organization_with_owner` must run before an
  `organizationId` exists to upload a logo against, the logo field can only
  be actionable *after* the org is created — either defer the logo field to
  a second in-place state within this same step (create org on submit of
  the other fields, then reveal a logo uploader before advancing to Branch),
  or make logo genuinely optional and skippable with a "you can add this
  later from Settings" note, matching the design's own optional framing.
  Prefer the second (simpler, matches the design's "Optional — your
  initials are used until you upload one" copy exactly) unless reading the
  design markup more closely reveals it's meant to block progression, which
  it doesn't appear to (no `req: true` on that field).

Then in `apps/web/src/App.tsx`, replace the `status === 'no-organization'`
branch's `<OrganizationSetupPage />` with `<OnboardingWizardShell
currentStep="Organization"><OrganizationStep /></OnboardingWizardShell>`
(exact prop names depend on Task 1's shell interface — match it).

## Task 3 — Branch step rebuild

Read the design's `Branch` CFG entry (lines 416-434). Rebuild
`OnboardingWizard.tsx`'s `BranchStep` with the fuller field set (Branch
Name, Store Type, Country — default from the organization's own
`metadata.country`, read via `useSession()`'s `activeOrganization`, not
asked twice — State, City, Branch Address optional, Time Zone required).
Store Type/State/City/Time Zone go into `create_branch`'s existing
`settings` jsonb parameter (`packages/api/src/operations/branch.ts:5-12`
already accepts it — no backend change).

Keep the existing "already has a branch → skip straight to Continue"
short-circuit at the top of the current `BranchStep` (this is what makes
the step idempotent on reload) — preserve that logic, just extend the
creation form beneath it.

## Task 4 — Supervisor step rebuild (multi-invite + read-only permissions)

Read the design's `Supervisor` CFG entry (lines 435-462) and its
`permissions` array (lines 448-457) — this is the exact static list to
render read-only (spec decision 4): label + on/off/locked state, no
checkboxes, no state that feeds into `invite_member`'s call.

Rebuild `OnboardingWizard.tsx`'s `SupervisorStep`:
- After a successful `invite_member` call, instead of only showing a
  single "invited" success message with Continue/Skip, add an "Invite
  another supervisor" action that clears the form fields and returns to
  the invite form (design's `repeat: true`), while keeping a running list
  of who's been invited so far visible above the form (name + email, no
  backend list call needed — this is just an accumulation of what this
  step's own successful `invite_member` calls returned, held in local
  state).
- Keep the existing "Continue"/"Skip for now" pair at the bottom
  (`skip: true`), now advancing regardless of how many supervisors were
  invited (zero or more).
- Do not add a photo field (spec decision 6).

## Task 5 — Department step (real implementation)

Read the design's `Department` CFG entry (lines 463-473) and the
`SUGGESTIONS` array (line 485). Replace `OnboardingWizard.tsx`'s
`DepartmentsStep` placeholder entirely:
- List the branch's current departments (`list_departments` with the
  branch id from `list_branches`'s first result, same pattern `BranchStep`/
  `SupervisorStep` already use to find the just-created branch).
- Render the `SUGGESTIONS` chips (Sales Floor, Cashiers, Warehouse,
  Inventory, Customer Service, Security, Administration) as one-click
  "add this department" buttons calling `create_department`, plus a
  free-text custom-name field with its own "Add" action for anything not
  in the suggestion list. Already-added departments (by name, case-
  insensitive) should render as disabled/checked in the suggestion row
  rather than allowing a duplicate create attempt (the DB has a unique
  branch+name constraint per migration 041 that would reject it anyway —
  better to prevent the attempt client-side).
- Keep this step skippable ("Skip for now", per spec decision 7 — do not
  block continuing on zero departments, even though the design's own
  `validation` copy implies it should).

## Task 6 — Finish step rebuild (real summary)

Read the design's `Finish` CFG entry (lines 474-482) and the completion
markup around lines 103-118 (the counts sentence + `nextSteps` tiles).
Rebuild `OnboardingWizard.tsx`'s `FinishStep`:
- Real counts: branches via `list_branches`, departments via
  `list_departments` (across all the org's branches — check if it needs a
  per-branch call or accepts no `branchId` for an org-wide list; read
  `DepartmentService.listDepartments` in `packages/services` to confirm),
  and invitations via `list_invitations` (count entries, not just the ones
  from this session — an org that already existed and is only just now
  finishing onboarding again after a reload should still get accurate
  numbers).
- Compose a summary sentence matching the design's shape ("{org name} is
  set up with {N} branch(es), {N} supervisor(s) and {N} department(s)")
  from those real counts, not hardcoded copy.
- Keep the existing "next steps" tiles (Create your first schedule / Add
  your first employee) and the existing `update_organization` call that
  stamps `onboardingCompletedAt` — don't change that mechanism, only the
  summary content above it.

## Task 7 — Delete superseded files, final routing check

- Delete `apps/web/src/pages/onboarding/OrganizationSetupPage.tsx` (fully
  superseded by Task 2's `OrganizationStep`).
- Grep the whole repo for `AuthLayout` — if `OrganizationSetupPage.tsx` was
  its only consumer (confirmed during spec-writing, re-verify since Task 2
  may have changed things), delete
  `apps/web/src/pages/auth/AuthLayout.tsx` too.
- Confirm `App.tsx` has no remaining reference to the deleted
  `OrganizationSetupPage` import.
- Run the full `apps/web` build/typecheck and confirm clean.

## Self-review checklist (before dispatching any task)

- Every task's field list checked against the design file's exact CFG
  entries (done above during plan-writing; task implementers should still
  re-check against the live file, not just this plan's paraphrase).
- No task introduces a new migration, new dependency, or an editable
  permission control on the Supervisor step.
- Task 2's storage-policy question (organizations/ prefix) is flagged
  explicitly rather than silently assumed either way.
