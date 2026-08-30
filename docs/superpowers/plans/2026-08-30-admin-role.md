# ShiftOS Admin Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a real, invitable "Admin" role (read-only organization administration: branches, employees, invitations, organization details — no scheduling/attendance/task/announcement/swap operations), fix the Sidebar so its pages are actually reachable by this new role, and auto-grant new branches to existing Admins so their branch list never goes stale.

**Architecture:** Two new Postgres migrations (048 extends `ensure_standard_roles()` to also create the Admin role + backfills existing orgs; 049 adds an `AFTER INSERT ON branches` trigger that grants every active Admin membership the new branch). One frontend change (`Sidebar.tsx`'s five `orgWideOnly: true` nav items become permission-only, since that flag currently — incorrectly — assumes only org-wide roles ever hold `branches.read`/`org.members.manage`/`organizations.read`). No backend RPC or `MembershipService` changes: the invite flow, `accept_invitation()`, and `AdminConsolePage.tsx` were already built generically enough to need zero changes for a new role.

**Tech Stack:** PostgreSQL/Supabase migrations, TypeScript/React (one-line data change only).

**Spec:** `docs/superpowers/specs/2026-08-30-admin-role-design.md`

## Global Constraints

- Admin must NOT be `grants_org_wide_branch_access = true` — the existing `inviteMember()` hard-blocks inviting into any org-wide role (privilege-escalation guard); Admin must go through the exact same invite/accept/onboarding pipeline Supervisor/Employee already use, unmodified.
- Admin's permission set is exactly: `branches.read`, `employees.read`, `organizations.read`, `org.members.manage`. Never any `schedules.*`/`shifts.*`/`tasks.*`/`attendance.*`/`announcements.*`/`swaps.*`/`departments.*` write permission, and not `reports.read` (no Reports UI exists yet — trivial to add later).
- `ensure_standard_roles()` must remain idempotent and additive, matching every prior extension's pattern exactly (`SELECT ... IF NULL THEN INSERT ... ON CONFLICT DO NOTHING` for both the role row and its permission grants) — never drop or replace Supervisor's/Employee's existing logic, only add an Admin block alongside it.
- Every migration that extends `ensure_standard_roles()` must re-run the existing backfill loop (`FOR v_org IN SELECT id FROM organizations LOOP PERFORM ensure_standard_roles(v_org.id) END LOOP`) so existing organizations pick up the new role too, not just future ones.
- This repo tests schema/migration changes live against the real linked Supabase project (via the `mcp__claude_ai_Supabase__*` tools), not via a local test harness — matching migration 047's own precedent this session. Do not invent a vitest suite for pure SQL changes.
- No change to `MembershipService`, `inviteMember`, `listInvitableRoles`, `accept_invitation()`, or `AdminConsolePage.tsx` — all already work generically for any new role/permission combination; confirmed during spec research, not assumed.

---

## Task 1: Migration 048 — create the Admin role

**Files:**
- Create: `supabase/migrations/048_add_admin_role.sql`

**Interfaces:**
- Produces: an "Admin" role row (`grants_org_wide_branch_access = false`, `is_system = true`, `is_active = true`) in every organization's `roles` table, granted exactly `branches.read`, `employees.read`, `organizations.read`, `org.members.manage` via `role_permissions`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/048_add_admin_role.sql`:

```sql
-- 048_add_admin_role.sql
-- Migration: add a real, invitable "Admin" role for organization-level
-- administration (read-only branch/employee oversight, invitations,
-- organization details) — distinct from Owner (org-wide, full access) and
-- Supervisor/Employee (workforce operations). Extends
-- ensure_standard_roles() (031, most recently extended in 043) so every
-- organization — new and existing — has this role available to invite
-- into, matching the same backfill pattern every prior extension used.
--
-- Admin is deliberately NOT grants_org_wide_branch_access = true:
-- inviteMember() (packages/services/src/organization/membershipService.ts)
-- hard-blocks inviting anyone into an org-wide role, specifically to
-- prevent invite issuance from ever being used for privilege escalation to
-- full org ownership. Making Admin a normal (branch-scoped) role means it
-- can be invited through the existing, already-safe invite/accept/onboarding
-- pipeline with zero changes to that pipeline — the inviter grants it every
-- current branch explicitly at invite time, and 049 keeps that list current
-- as new branches are added later.

CREATE OR REPLACE FUNCTION public.ensure_standard_roles(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_role_id uuid;
  v_employee_role_id uuid;
  v_admin_role_id uuid;
BEGIN
  SELECT id INTO v_supervisor_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Supervisor');
  IF v_supervisor_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Supervisor', true, true, false)
    RETURNING id INTO v_supervisor_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_supervisor_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    'branches.read',
    'departments.read',
    'employees.read', 'employees.create', 'employees.update', 'employees.archive',
    'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
    'assignments.create', 'assignments.update', 'assignments.delete',
    'swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve',
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge',
    'shiftnotes.read', 'shiftnotes.create',
    'reports.read'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  SELECT id INTO v_employee_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Employee');
  IF v_employee_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Employee', true, true, false)
    RETURNING id INTO v_employee_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_employee_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read', 'announcements.read', 'announcements.acknowledge', 'swaps.read', 'swaps.request', 'swaps.respond')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  SELECT id INTO v_admin_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Admin');
  IF v_admin_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Admin', true, true, false)
    RETURNING id INTO v_admin_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN ('branches.read', 'employees.read', 'organizations.read', 'org.members.manage')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;
```

This is the complete, current body of `ensure_standard_roles()` (as of migration 043) with one new `v_admin_role_id` block appended — the Supervisor and Employee blocks above are copied verbatim, unchanged, from 043.

- [ ] **Step 2: Apply the migration to the live linked Supabase project**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with the file's contents (name: `add_admin_role`).

- [ ] **Step 3: Verify live — new-organization path**

Run via `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT r.name, r.grants_org_wide_branch_access, array_agg(p.code ORDER BY p.code) AS permission_codes
FROM roles r
JOIN organizations o ON o.id = r.organization_id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
WHERE o.name = 'ShiftOS Test Org' AND lower(r.name) = lower('Admin')
GROUP BY r.name, r.grants_org_wide_branch_access;
```

Expected: one row, `grants_org_wide_branch_access = false`, `permission_codes = {branches.read, employees.read, org.members.manage, organizations.read}` (this confirms the backfill ran against the existing "ShiftOS Test Org" used throughout this session's live testing).

- [ ] **Step 4: Verify no regression to Supervisor/Employee**

Run:

```sql
SELECT r.name, count(rp.permission_id) AS permission_count
FROM roles r
JOIN organizations o ON o.id = r.organization_id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE o.name = 'ShiftOS Test Org' AND lower(r.name) IN (lower('Supervisor'), lower('Employee'))
GROUP BY r.name;
```

Expected: Supervisor has 27 permissions, Employee has 8 — same counts as before this migration (the migration must be purely additive; if either count changed, something in the copied blocks was altered and must be fixed before continuing).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/048_add_admin_role.sql
git commit -m "feat(admin-role): add invitable Admin role for organization-level administration"
```

---

## Task 2: Migration 049 — auto-grant new branches to existing Admins

**Files:**
- Create: `supabase/migrations/049_auto_grant_new_branch_to_admins.sql`

**Interfaces:**
- Consumes: the "Admin" role created by Task 1 (matched by name, same lookup style `ensure_standard_roles()` itself already uses).
- Produces: an `AFTER INSERT ON branches` trigger that inserts an `organization_member_branch_access` row for every active Admin-role membership in that branch's organization.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/049_auto_grant_new_branch_to_admins.sql`:

```sql
-- 049_auto_grant_new_branch_to_admins.sql
-- Migration: when a new branch is created, automatically grant every
-- active Admin-role membership access to it — closes the one accepted
-- trade-off of making Admin a normal (non-org-wide) role in 048: unlike an
-- org-wide role (which implicitly sees every branch, including future
-- ones, via user_accessible_branches()'s own org-wide check), a
-- branch-scoped role's access list is a fixed set of explicit grants that
-- doesn't automatically include branches created after the grant. Without
-- this trigger, an existing Admin would silently stop seeing new branches
-- until someone manually re-granted them.

CREATE OR REPLACE FUNCTION public.trg_grant_new_branch_to_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_member_branch_access (organization_id, membership_id, branch_id, granted_by)
  SELECT NEW.organization_id, om.id, NEW.id, NULL
  FROM public.organization_memberships om
  JOIN public.roles r ON r.id = om.role_id AND r.organization_id = NEW.organization_id
  WHERE om.organization_id = NEW.organization_id
    AND om.is_active = true
    AND om.deleted_at IS NULL
    AND lower(r.name) = lower('Admin')
  ON CONFLICT (membership_id, branch_id) WHERE deleted_at IS NULL DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_grant_new_branch_to_admins() IS
  'AFTER INSERT trigger on branches: grants every active Admin-role membership access to the newly created branch, so an Admin''s branch list never goes stale as the organization grows (048''s accepted trade-off for making Admin a normal, invitable role instead of org-wide). granted_by is NULL — branches has no created_by/owner column to attribute this to (001''s own comment: audit columns were deferred until Users existed and were never added).';

DROP TRIGGER IF EXISTS trg_branches_grant_admins ON public.branches;
CREATE TRIGGER trg_branches_grant_admins
  AFTER INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.trg_grant_new_branch_to_admins();
```

- [ ] **Step 2: Apply the migration to the live linked Supabase project**

Use `mcp__claude_ai_Supabase__apply_migration` (name: `auto_grant_new_branch_to_admins`).

- [ ] **Step 3: Verify live**

This step needs an actual Admin membership to exist to verify against — if Task 4's live invite hasn't happened yet when this task runs, do a synthetic check instead:

```sql
-- Confirm the trigger and function exist and are attached correctly.
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_branches_grant_admins';
```

Expected: one row, `tgrelid` = `branches`, `tgenabled = 'O'` (enabled). Full behavioral verification (create a branch, confirm an existing Admin gets access) happens in Task 4 once a real Admin membership exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/049_auto_grant_new_branch_to_admins.sql
git commit -m "feat(admin-role): auto-grant new branches to existing Admins"
```

---

## Task 3: Fix Sidebar so Admin pages are reachable

**Files:**
- Modify: `apps/web/src/layout/Sidebar.tsx`

**Interfaces:**
- No new interfaces — removes a now-incorrect restriction (`orgWideOnly: true`) from five existing `NAV_ITEMS` entries. `requiresPermission` on each stays exactly as-is.

- [ ] **Step 1: Read the current file and confirm the five lines**

Read `apps/web/src/layout/Sidebar.tsx` — confirm these five `NAV_ITEMS` entries currently have `orgWideOnly: true` (as of this plan's writing, they are lines 39–43):

```typescript
  { to: '/branches', label: 'Branches', icon: Building2, requiresPermission: 'branches.read', orgWideOnly: true },
  { to: '/members', label: 'Members & Roles', icon: Shield, requiresPermission: 'org.members.manage', orgWideOnly: true },
  { to: '/invitations', label: 'Invitations', icon: Mail, requiresPermission: 'org.members.manage', orgWideOnly: true },
  { to: '/organization', label: 'Organization', icon: Settings, requiresPermission: 'organizations.read', orgWideOnly: true },
  { to: '/admin', label: 'Admin Console', icon: ShieldCheck, requiresPermission: 'organizations.read', orgWideOnly: true }
```

If the exact line numbers have shifted, find them by searching for `orgWideOnly: true` — there should be exactly five matches, all in `NAV_ITEMS`, and no other line in this file should use `orgWideOnly` (its type declaration and its consumption in the filter function, both further down the file, stay untouched — only these five array entries change).

- [ ] **Step 2: Remove `orgWideOnly: true` from all five**

```typescript
  { to: '/branches', label: 'Branches', icon: Building2, requiresPermission: 'branches.read' },
  { to: '/members', label: 'Members & Roles', icon: Shield, requiresPermission: 'org.members.manage' },
  { to: '/invitations', label: 'Invitations', icon: Mail, requiresPermission: 'org.members.manage' },
  { to: '/organization', label: 'Organization', icon: Settings, requiresPermission: 'organizations.read' },
  { to: '/admin', label: 'Admin Console', icon: ShieldCheck, requiresPermission: 'organizations.read' }
```

Do not touch the `NavItem` interface's `orgWideOnly?: boolean` field or the filter function that reads it (`if (item.orgWideOnly && !isOrgWide) return false;`) — leaving that mechanism in place is correct in case a genuinely org-wide-only page is added later; this task only removes it from these five items because their actual gate is (and always should have been) the permission check alone.

- [ ] **Step 3: Verify the build is clean**

Run: `cd apps/web && npm run build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/layout/Sidebar.tsx
git commit -m "fix(admin-role): stop hiding branch/member/invitation/organization/admin nav items from non-org-wide roles that hold the right permission"
```

---

## Task 4: Live end-to-end verification

**Files:** none (verification only; fix forward if something doesn't work as intended — see Step 8)

- [ ] **Step 1: Confirm dev servers are running**

Backend (`pnpm dev:backend`, port 8787) and web (`pnpm dev:web`, port 5173) should already be running in the background from this session's earlier work — confirm with `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787` and `...5173`. If either isn't running, start it.

- [ ] **Step 2: As the existing Manager/Owner account, invite a new Admin**

In the browser (already-authenticated session on "ShiftOS Test Org" as "toluwani Laioke — Manager" from earlier in this session, or sign in fresh if that session expired): navigate to Invitations, start a new invitation, confirm **Admin** appears as a selectable role (this confirms `listInvitableRoles()` picks it up with zero code changes, per the spec), select all current branches (Main Branch, Ikeja Branch), fill in a test name/email (e.g. "Adaeze Admin" / an email you can access the Supabase Auth invite link for — reuse this session's established pattern for testing invite acceptance, e.g. checking Supabase auth logs / the invite link directly if email delivery isn't set up, matching how earlier invite testing was done this session), and send it.

- [ ] **Step 3: Accept the invitation as the new Admin**

Using the invite link, set a password, accept. Confirm it lands on `/complete-profile` (not `/admin`, not any other page automatically) per the spec's explicit check that no auto-routing to the admin dashboard happens. Complete the profile.

- [ ] **Step 4: Confirm the Admin's sidebar is exactly right**

As this new Admin account, screenshot or inspect the sidebar. Expected present: Admin Console, Branches, Members & Roles, Invitations, Organization (plus any universal items every role gets, e.g. Profile/Security if those are unconditionally shown). Expected absent: Scheduling, Employees (the operational one, if distinct from a read-only view), Tasks, Attendance, Announcements, Requests — anything gated by a permission this role doesn't hold.

- [ ] **Step 5: Confirm the Admin Console itself renders correctly for this role**

Open Admin Console. Confirm Overview/Branches/Branch Detail/Subscription/Settings tabs all render real data (not the previous "renders correctly by coincidence because Owner has every permission" situation — this is the first time this page is tested against an account that does NOT hold Owner's full permission set). Confirm the Settings tab's "Your role and access" section shows exactly the four granted permissions (View branches, View employees (read-only), View invitations, View organization) and nothing under "Not included" is checked.

- [ ] **Step 6: Confirm the assistant works for this Admin**

Open "Ask ShiftOS" (TopBar or the Admin Console card) as this Admin. With `OPENAI_API_KEY` still unset, confirm it shows "AI assistant isn't configured yet." (same as every other role). This confirms the panel itself is reachable and wired for this role; the deeper "does it answer permission-appropriate questions" check is already covered by Task 9 Step 5 of the AI assistant plan (deferred until a real key exists) — do not attempt to fake that check here.

- [ ] **Step 7: Confirm the auto-grant trigger works end-to-end**

As the Manager/Owner, create a brand-new branch (e.g. "Lekki Branch") via Branches → Add Branch. Then, as the Admin from Steps 2–6 (refresh their session/page), confirm "Lekki Branch" appears in their Branches list and Admin Console's branch previews — without being re-invited or manually re-granted. Also verify directly via SQL (`mcp__claude_ai_Supabase__execute_sql`) that an `organization_member_branch_access` row exists for this Admin's membership and the new branch's id.

- [ ] **Step 8: Regression-check Employee/Supervisor are unaffected**

Using an existing Employee or Supervisor test account (e.g. "Chinedu TestEmployee" from earlier this session), confirm their sidebar still shows no Branches/Members/Invitations/Organization/Admin Console links, and that `/admin`, `/branches`, `/members`, `/invitations`, `/organization` still show empty/permission-denied states for them if navigated to directly (unchanged from before this plan — Task 3's fix only removed a redundant restriction, it must not have granted these roles anything new).

- [ ] **Step 9: Fix forward if anything in Steps 2–8 doesn't work as described**

If any check fails, root-cause it (systematic-debugging discipline: reproduce, find the actual cause, fix at the source) before considering this task — and the plan — complete. Do not mark this done with a known-broken check.

- [ ] **Step 10: Commit** (only if Step 9 required a fix)

```bash
git add -A
git commit -m "fix(admin-role): address issue found during live end-to-end verification"
```
