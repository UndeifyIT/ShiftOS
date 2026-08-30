# ShiftOS Admin role — design spec

Status: approved-by-default (user explicitly said "yes do the fix and add
the auto grant feature too" in response to the in-chat design this spec
formalizes — see "Decisions" below).

## Why

`AdminConsolePage.tsx` was already built assuming a real "Admin" persona
distinct from Manager/Supervisor — its own comments and its "Your role and
access" panel describe exactly what an Admin can/can't do (view branches,
view employees read-only, view invitations, view organization; NOT manage
schedules/employees/attendance/tasks). This matches an already-approved
architectural decision in this repo's own docs (`GOV-003-DECISION-LOG.md`,
DEC-027: "Managers and Supervisors manage workforce operations. Future Admin
users manage organization-level administration.").

But no such role has ever actually been created — today the page is only
reachable by the org's Owner (labeled "Manager" in the UI), who happens to
hold every permission the page checks, so it renders correctly by
coincidence while showing copy written for a lesser-privileged role that
doesn't exist yet. The user asked for this role to be built for real: a
person can be invited specifically as an Admin, must accept the invite and
complete onboarding like anyone else, and gets exactly this read-only
administrative slice of the app — including the "Ask ShiftOS" assistant.

## Decisions (asked directly, answered by the user)

1. **Admin is a real, new system role** (not just a UI label for Owner) —
   confirmed by the user's explicit "I think you should give admins their
   own role" request and confirmed necessary by the code: every gate in this
   app (`hasPermission()`, `requirePermission()`, the Sidebar, invite
   role-selection) is keyed off role → permission grants, not labels.
2. **Scope: administrative tasks only** ("option 1" from the earlier
   three-way choice, and exactly what `AdminConsolePage.tsx` already
   describes). Admin's permission set: `branches.read`, `employees.read`
   (read-only), `organizations.read`, `org.members.manage` (this is also
   what lets an Admin send invitations). Explicitly NOT granted: any
   `schedules.*`, `shifts.*`, `tasks.*`, `attendance.*`, `announcements.*`,
   `swaps.*`, `departments.*` write permission, or `reports.read` (Reports
   has no real UI yet per the AI-assistant spec's own note; easy to add
   later once it does — the existing Admin Console page doesn't show a
   Reports tab today either, so this matches what's actually built, not
   just the older decision-log wording that also mentioned "reporting").
3. **Admin is NOT an org-wide role — it's invited like Supervisor/Employee,
   granted access to every current branch at invite time.** This was the
   one real fork, and it's forced by existing, deliberate code: `inviteMember()`
   throws `AuthorizationError('This role cannot be assigned via invitation.')`
   for any role with `grants_org_wide_branch_access = true` — a hard
   privilege-escalation guard (its own doc comment: "invite issuance can
   never be used for privilege escalation to full org ownership"). Making
   Admin org-wide would mean it could never be invited through the normal
   flow the user explicitly asked for ("the admin is required to accept the
   invite and do some onboarding things"). Making it a normal, branch-scoped
   (but branch-list = "all current branches") role instead means zero
   changes to the invite/accept/onboarding pipeline — it already works
   generically for any non-org-wide role.
4. **New branches auto-grant existing Admins** (the one accepted trade-off
   of decision 3, closed as its own small feature per the user's explicit
   "add the auto grant feature too"): when a branch is created, every active
   Admin-role membership automatically gets an `organization_member_branch_access`
   row for it, so an Admin's branch list never silently goes stale.
5. **Who can invite an Admin:** anyone holding `org.members.manage` — Owner
   and any existing Admin — the same, single mechanism every other
   invitable role already uses. No extra restriction requested or needed;
   `inviteMember()`'s existing org-wide-role block already prevents this
   from ever escalating to Owner.
6. **The assistant works for Admin automatically, no code change needed** —
   confirmed by tracing the AI assistant's tool-dispatch logic (built
   earlier): every tool call re-checks the caller's real permissions via the
   same `ApplicationContext.requirePermission()`/`requireBranchAccess()`
   used everywhere else. Once Admin holds `branches.read`/`employees.read`,
   `list_branches`/`list_employees`/`list_members`/`list_invitations` calls
   from the assistant just work; anything requiring a permission Admin
   lacks (e.g. `get_attendance_summary_report`) correctly degrades to "not
   permitted," exactly like every other role.

## What "nobody should auto-route to the admin dashboard" actually needs

Investigated directly rather than assumed. Two distinct things were meant,
and they get two different treatments:

- **A fresh Admin shouldn't land on `/admin` automatically after
  onboarding.** Checked: there's no such behavior today. `accept_invitation()`
  is fully role-agnostic (copies whatever `invitation_branch_access` rows
  exist, no role-specific logic at all) and `AcceptInvitationPage.tsx`
  always sends a newly-activated account to `/complete-profile`, and from
  there to the default `/` (`RoleDashboard`) — never to `/admin`. **No code
  change needed here** — confirmed clean, not assumed.
- **The Admin Console link (and `/branches`, `/members`, `/invitations`,
  `/organization`) would be invisible to the new Admin role even once it
  has the right permissions.** Found a real bug during this investigation:
  `Sidebar.tsx`'s `NAV_ITEMS` marks all five of these `orgWideOnly: true` —
  a leftover assumption from when only the org-wide Owner could ever hold
  these permissions. Since our new Admin role deliberately isn't org-wide
  but does hold `branches.read`/`org.members.manage`/`organizations.read`,
  it would pass the `requiresPermission` check but still get filtered out
  by `orgWideOnly`, hiding exactly the pages it needs. **Fix: drop
  `orgWideOnly` from these five items** — the underlying permission checks
  already correctly restrict them (Supervisor/Employee never hold these
  permissions per the seed migrations, confirmed), so removing the flag
  exposes nothing new to anyone who doesn't already qualify by permission
  alone; it only fixes visibility for the role this spec adds.
- **Direct-URL access to `/admin` (typing it in the address bar) has no
  route-level guard, but neither does any other route in this app** —
  confirmed by reading all of `AppShellRoutes()`: zero routes have a
  permission guard; every page relies entirely on its own RPC calls being
  permission-checked server-side (an unauthorized visitor sees empty stat
  cards, not real data). This is a pre-existing, app-wide pattern, not an
  `/admin`-specific gap — adding a bespoke guard to just this one route
  would be inconsistent with every other page and out of proportion to the
  actual risk (no data is exposed; the RPCs already refuse). **Out of scope
  for this spec** — noted here so it isn't silently dropped, but treated as
  a pre-existing, app-wide characteristic to fix uniformly later if ever
  addressed, not a new problem this feature introduces.

## Architecture

### Database (new migration, e.g. `048_add_admin_role.sql`)

- Extend `ensure_standard_roles(p_organization_id)` (currently creates
  Supervisor + Employee) to also create an **Admin** role per organization:
  `grants_org_wide_branch_access = false`, `is_system = true`, granted
  exactly `branches.read`, `employees.read`, `organizations.read`,
  `org.members.manage`.
- Backfill: run the same `DO $$ FOR v_org IN SELECT id FROM organizations
  LOOP PERFORM ensure_standard_roles(v_org.id) END $$` pattern every prior
  role-adding migration (031, 043, etc.) already uses, so existing
  organizations get the Admin role too, not just new ones.
- **Auto-grant trigger**: a new trigger function on `branches` (`AFTER
  INSERT`) that, for the new row's `organization_id`, finds every active
  `organization_memberships` row whose `role_id` belongs to a role named
  "Admin" in that org, and inserts an `organization_member_branch_access`
  row for the new branch for each one (`granted_by` = the branch's own
  creator, mirroring how `accept_invitation()` sets `granted_by` to the
  inviter). Matched by role name (`lower(r.name) = lower('Admin')`), the
  same lookup style `ensure_standard_roles()` itself already uses for
  Supervisor/Employee — no new "is this an Admin" marker needed beyond the
  existing role name.

### Backend

- No new RPC operations needed. `listInvitableRoles()` already returns any
  active, non-org-wide role — Admin appears there automatically once
  created, with zero code change.
- No `MembershipService`/`inviteMember` changes needed — the org-wide block
  that forced decision 3 already does exactly the right thing for every
  role, Admin included.

### Frontend

- `apps/web/src/layout/Sidebar.tsx`: remove `orgWideOnly: true` from the
  `/branches`, `/members`, `/invitations`, `/organization`, `/admin`
  `NAV_ITEMS` entries (the `requiresPermission` on each stays exactly as-is
  — this is a one-line-per-item deletion, not a rewrite of the filter
  logic in `useVisibleNavItems`/wherever `orgWideOnly` is consumed).
- No other frontend change is required: `AdminConsolePage.tsx` already
  renders correctly for any account holding its checked permissions (it
  was written generically, not Owner-specifically — confirmed by reading
  it: every section gates on `hasPermission(...)`, never on a role name or
  `isOrgWide`), and the invite form / accept-invitation / complete-profile
  flow are already fully role-agnostic.

## Out of scope (deferred, named so they aren't silently dropped)

- A dedicated route-level permission guard for `/admin` or any other
  route — pre-existing, app-wide characteristic, not something this
  feature should fix unilaterally for one page.
- `reports.read` for Admin — no Reports UI exists yet; trivial one-line
  addition once it does.
- Any change to who can create/invite an **Owner** — untouched, still
  exclusively bootstrap-only via `create_organization_with_owner`.
- The much larger "audit every endpoint/button in the app" request is
  being tracked and executed as a separate effort after this feature ships
  and is tested, not folded into this spec.

## Testing

- Automated: a unit/integration test (or a direct SQL check via the
  Supabase MCP tools, matching how earlier migrations in this session were
  verified) confirming `ensure_standard_roles()` creates an Admin role with
  exactly the four permissions above, for both a fresh org and (via the
  backfill) an existing one.
- Live, end-to-end (per this session's established pattern — real linked
  Supabase project, not mocks):
  1. As the Owner, invite a new person as **Admin**, granting all current
     branches.
  2. Accept that invite in a separate session/account, set a password,
     complete profile — confirm it lands on the normal dashboard, not
     `/admin` automatically.
  3. As that Admin, confirm the sidebar shows exactly: Admin Console,
     Branches, Members & Roles, Invitations, Organization (plus whatever
     universal items everyone gets, e.g. Profile/Security) — and does
     **not** show Scheduling/Employees-write/Tasks/Attendance/Announcements/Requests.
  4. Open Admin Console — confirm Overview/Branches/Branch
     Detail/Subscription/Settings all render real data, and "Your role and
     access" correctly shows the four granted permissions and nothing else.
  5. Ask the assistant (once `OPENAI_API_KEY` is set — otherwise confirm
     the "not configured" message) a factual question like "how many people
     are in Main Branch" as this Admin — confirm it answers, and that a
     question requiring a permission Admin lacks (e.g. attendance) degrades
     to "not permitted."
  6. As the Owner, create a brand-new branch — confirm the existing Admin
     immediately sees it (auto-grant) without being re-invited or manually
     re-granted.
  7. Confirm an Employee/Supervisor account still cannot see or reach any
     of the Admin-only pages (regression check on the Sidebar change).
