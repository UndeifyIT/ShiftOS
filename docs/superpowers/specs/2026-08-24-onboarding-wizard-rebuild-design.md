# Onboarding Wizard rebuild — design spec

Status: approved-by-default (user unavailable; proceeding per explicit
standing instruction to keep moving autonomously, recommended options
chosen throughout, documented as rulings below).

## Why

The Auth phase rebuilt every Auth screen onto the new design system. The
Onboarding wizard is next in the originally-approved phase list. Current
state is a pre-redesign implementation: a standalone `OrganizationSetupPage`
(old `AuthLayout`, Graphite-Editorial-era styling) followed by a separate
4-step `OnboardingWizard` (Branch → Supervisor → Departments-placeholder →
Finish) styled with plain Tailwind/Card, not the new AuthShell-family design
system. The design handoff (`ShiftOS Onboarding.dc.html`) specifies a
single continuous 5-step experience — Organization → Branch → Supervisor →
Department → Finish — with a persistent sidebar (logo, step list, progress,
support card) and a Shifty mascot guidance panel per step.

## Backend audit (done before writing this spec)

- `organizations` table: `metadata jsonb` already exists and is already used
  for soft org-level facts (`onboardingCompletedAt`). No schema change
  needed for the new Organization step's extra fields.
- `branches` table: `settings jsonb` already exists and is already accepted
  by `create_branch`'s RPC signature. No schema change needed for the new
  Branch step's extra fields.
- **Departments already has full backend support** (migration 041): table,
  RLS, permission catalog (`departments.read/create/update/archive`), and
  RPCs `create_department`/`get_department`/`update_department`/
  `archive_department`/`list_departments`/`count_employees_in_department`
  (`packages/api/src/operations/department.ts`) — this is NOT a stub. The
  current wizard's "Department support isn't built yet" copy is stale; the
  backend has existed since migration 041 and the frontend was never
  updated to use it.
- `invite_member` (`packages/api/src/operations/membership.ts`) takes
  `email/firstName/lastName/roleId/branchIds` only — no per-invitation
  permission override capability exists.
- `create_organization_with_owner` already provisions Owner + Supervisor +
  Employee roles with curated permission sets (031). `list_invitable_roles`
  already exists for the Supervisor step's role lookup.

No migration is required for this phase. Everything needed is either
already built (Departments) or fits the existing `metadata`/`settings` jsonb
columns.

## Scope decisions (rulings — no user available to approve interactively; each is the recommended option, documented so it can be revisited)

1. **Fold Organization Setup into the wizard as step 1**, replacing the
   standalone `OrganizationSetupPage`. Implementation approach: rather than
   collapsing `no-organization` and `no-branch-yet` into one session status
   (a deeper `SessionProvider` state-machine change), keep them as two
   separate `App.tsx`-routed branches as today, but have both render the
   *same* shared wizard shell component (sidebar + stepper + Shifty panel),
   so the experience is visually one continuous 5-step flow even though
   it's two mounted route branches under the hood — matching this
   project's own documented convention (migration 041's comment: "small
   ambiguity → pick the option preserving existing architecture, document
   it"). Cost if wrong: low/medium — if a true single-state-machine merge
   is wanted later, the shell is already shared and only the routing glue
   in `App.tsx` needs revisiting, not the step components themselves.
2. **New Organization-step fields** (Business Type, Number of Departments
   estimate, Estimated Employees, Country, Time Zone) are stored in
   `organizations.metadata` (no new columns). Workspace Name is the
   existing `slug` field (already implemented in the current
   `OrganizationSetupPage`, carried into the new step). **Organization
   Logo** is implemented for real: upload to the existing private `avatars`
   Storage bucket under a new `organizations/{organizationId}/` prefix
   (same bucket/RLS pattern as user/employee avatars — no new bucket or
   migration), with the resulting path stored in
   `organizations.metadata.logoPath`. Falls back to initials (matching
   Complete Profile's own established pattern) when absent.
3. **New Branch-step fields** (Store Type, State, City, Time Zone) are
   stored in `branches.settings` (already passed through by `create_branch`
   / `update_branch`). Country defaults to the organization's own
   metadata-stored country and isn't asked twice.
4. **Supervisor step's permission toggles are read-only display, not an
   editable per-invitation override.** The design shows a checklist of
   permissions next to each supervisor invite. Implementing true
   per-invitation permission overrides would require a new backend
   capability (an overrides table, plus every permission-check call site
   consulting it) — a materially bigger scope item than an onboarding
   nicety. Instead: show the Supervisor role's actual fixed permission set
   (from `ensure_standard_roles`, mirrored as a static list in the frontend
   the same way the design's own mock hardcodes on/off/locked per label) as
   informational, non-interactive rows — communicates what a Supervisor
   can do without implying a choice the backend doesn't support. This
   mirrors the Auth phase's own precedent (Sign Up's Role field dropped for
   the same reason: don't show a control that implies a choice that isn't
   real).
5. **Supervisor step supports inviting multiple supervisors before
   continuing** (design's `repeat: true`) via an "Invite another
   supervisor" action after a successful invite, reusing `invite_member`
   per invite — and remains skippable (`skip: true`), matching the current
   wizard's existing skip behavior.
6. **The design's `photo: true` flag on the Supervisor step is not a real
   feature** — there is no account yet to attach a photo to (the invitee
   hasn't accepted their invitation, doesn't exist in `public.users`, and
   sets their own photo later via their own Complete Profile page, per the
   Auth phase). Treated as a design/mock artifact and not built. Documented
   here so it isn't mistaken for a missed requirement.
7. **Department step is real** (not a placeholder): uses
   `create_department`/`list_departments` against the branch created in
   step 2, with the design's suggestion chips (`SUGGESTIONS` array) plus a
   free-text custom name field. **Kept skippable** (a "Skip for now"
   secondary action, consistent with the Supervisor step's own skip
   precedent) even though the design's own validation copy implies zero
   departments blocks continuing — many organizations legitimately
   organize by branch alone (the pre-existing wizard comment already noted
   this), so forcing at least one department at signup would be a real UX
   regression for that case, not a fidelity improvement.
8. **Finish step becomes a real summary** — actual counts of
   branches/departments/pending-or-accepted invitations for the just-created
   organization (via existing `list_branches`/`list_departments`/
   `list_invitations`), the design's "next steps" tiles (Create your first
   schedule / Add your first employee — reusing the current Finish step's
   existing links), and the same `update_organization` call to stamp
   `onboardingCompletedAt`.
9. **`OrganizationSetupPage.tsx` is deleted** once its one screen's worth
   of logic (name/slug/logo fields, `create_organization_with_owner` call)
   moves into the new wizard's Organization step. Its only import,
   `AuthLayout.tsx` (the Auth phase explicitly preserved this file for
   exactly this consumer), becomes unused — grep for any other consumer
   before deleting `AuthLayout.tsx` itself; delete it too if none remain,
   matching the Auth phase's own `AuthMarketingLayout` cleanup precedent.
10. **Shifty mascot integration is kept and extended**, not rebuilt — the
    existing `Shifty`/`ShiftyPanel`/`ShiftyMascot` components
    (`apps/web/src/components/shifty/`) already implement the pose/message/
    pointer pattern the design's `SCRIPT` array specifies; only the
    per-step copy needs updating to match the design's exact 5-step text
    and the addition of an Organization-step entry.

## Out of scope for this phase

- True per-invitation permission overrides (see decision 4).
- A real photo-upload capability for not-yet-accepted supervisor invitees
  (see decision 6).
- Assigning a supervisor to a department during onboarding — the design's
  Finish-state mock data shows departments with supervisors already
  attached, but the Department step's own CFG entry defines no such field;
  that's cross-department staffing, which happens later via Employees/
  Members management, not during initial setup.
- Any change to `SessionProvider`'s status state machine — the two-branch
  shared-shell approach (decision 1) avoids needing one.

## Files affected (for the plan-writing pass)

- New: shared wizard shell (sidebar + stepper + Shifty panel) extracted
  from the current `OnboardingWizard.tsx`'s outer JSX.
- New: `OrganizationStep` (replaces `OrganizationSetupPage.tsx`'s logic,
  rendered by the `no-organization` status branch using the shared shell).
- Rewritten: `OnboardingWizard.tsx`'s `BranchStep`/`SupervisorStep` (new
  fields, multi-invite, read-only permissions display), new `DepartmentStep`
  (replacing the placeholder), rewritten `FinishStep` (real summary).
- Deleted: `OrganizationSetupPage.tsx`, and `AuthLayout.tsx` if it has no
  other consumer after that deletion.
- `App.tsx`: `no-organization` branch now renders the Organization step
  through the shared shell instead of `OrganizationSetupPage`.
