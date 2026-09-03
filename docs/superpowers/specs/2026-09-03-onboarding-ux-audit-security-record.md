# Onboarding/UX audit — security record (Task 10)

Companion to `docs/superpowers/specs/2026-09-03-onboarding-ux-audit-design.md` §2 Phase 12,
which states the Phase 0 live spot-check "found no cross-tenant or cross-branch read/write
gap" across seven tables. That claim was made during Phase 0 (before this plan's ten
implementation tasks existed) and was never written down with the actual policy names or a
re-runnable query. This document is that permanent record: it re-verifies the same spot-check
live (2026-09-03, against the production Supabase project `etodmfsmvhewihboxcrp`, the same
project used throughout this feature and the prior auth-abuse-protection feature), captures
the exact policy names/conditions found, documents the live-verification *technique* this
whole audit used so a future auditor can reproduce it without re-deriving it, and records what
Tasks 1–9 of this plan touched that's RLS/security-relevant. It is not a new audit and finds
no new cross-tenant/cross-branch gap — see §5 for one grant-hygiene deviation found while
checking Task 6, which is real but bounded, not a cross-tenant gap.

## 1. Live re-verification method

Two identity-simulation techniques are used throughout this codebase's test suite and were
used again here, both because the app's DB connection for admin queries and the app's own
integration tests connect as the Postgres `postgres` role, which has `rolbypassrls = true`
(confirmed live below) — so RLS is silently never evaluated on that connection unless the
role/identity is explicitly swapped for the duration of a query.

- **Faking `auth.uid()` only** (used when the goal is to exercise a `SECURITY DEFINER`
  function's own internal logic, e.g. `accept_invitation()`): run
  `select set_config('request.jwt.claims', '{"sub":"<uuid>", ...}', true)` inside a
  transaction, then call the function on that same connection. `true` (`is_local`) scopes the
  setting to the current transaction so it can never leak onto another query when a
  connection pool reuses the socket. See
  `packages/tests/integration/acceptInvitationRoleIntegrity.integration.test.ts`'s
  `withFakeAuth()` helper. This does **not** by itself change the executing role, so it only
  proves what a `SECURITY DEFINER` function does with a given `auth.uid()`/JWT — it does not
  exercise table-level RLS policies, because the connection is still `postgres`
  (`rolbypassrls = true`).
- **Actually exercising RLS** (used when the goal is to prove a *policy*, not a function,
  rejects/allows something): `set local role authenticated;` first (confirmed live below:
  `authenticated` has `rolbypassrls = false`), then
  `select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)`
  on the same connection/transaction, then run the query under test. Errors (expected RLS
  violations) roll back the transaction; success commits or is manually rolled back by the
  test's own cleanup. See
  `packages/tests/integration/avatarPolicyPermissionTightening.integration.test.ts`'s
  `asUser()` helper (lines ~87–91) for the exact pattern, including its own comment
  explaining why `SET LOCAL ROLE` is required and `set_config` alone is not.
- Both techniques require a dedicated connection per probe (not a pooled connection that
  might be reused mid-transaction-setting by another caller), and both were combined with a
  **positive control** — proving the same call *succeeds* for a caller who should be allowed,
  not just that it fails for one who shouldn't — to rule out a "blanket deny" false positive
  (e.g. RLS disabled entirely, or a broken query, which would also produce "no rows"/an error
  and could be misread as "correctly denied").

Live-verified today, confirming the technique's precondition:

```
SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;
 current_user | rolbypassrls
--------------+--------------
 postgres     | t
```

(`authenticated`'s `rolbypassrls = false` was independently confirmed by the Task 9
implementer/reviewer per the ledger; not re-run here since nothing about that role changed.)

## 2. Phase 0 spot-check, re-verified live and made concrete

Live query run 2026-09-03 against `etodmfsmvhewihboxcrp`:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = ANY(ARRAY['employees','shifts','shift_assignments','invitations',
                             'organizations','branches','organization_member_branch_access']);

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY(ARRAY['employees','shifts','shift_assignments','invitations',
                             'organizations','branches','organization_member_branch_access'])
ORDER BY tablename, cmd, policyname;
```

**Result: `relrowsecurity = true` on all 7 tables, `relforcerowsecurity = false` on all 7**
(the `false` is expected and not a gap — `FORCE ROW LEVEL SECURITY` only matters for the
table owner bypassing its own RLS, which the app never does through `authenticated`/`anon`;
the owner-bypass path used by this codebase's own admin connection is the separate
`rolbypassrls` superuser flag checked in §1, not `relforcerowsecurity`).

Per table, the exact policies found (condition summarized; `get_user_organizations()` and
`user_accessible_branches(organization_id)` are the two shared helper functions cited by the
design spec, both confirmed live as `SECURITY DEFINER`, `prosecdef = true`):

| Table | Policy | Command | Condition (summarized) |
|---|---|---|---|
| `organizations` | `tenant_isolation_org` | ALL | `id IN get_user_organizations()` |
| `branches` | `tenant_isolation_branches` | ALL | `organization_id IN get_user_organizations()` |
| `employees` | `tenant_branch_isolation_employees` | ALL | `organization_id IN get_user_organizations()` AND `branch_id IN user_accessible_branches(organization_id)` |
| `shifts` | `tenant_branch_isolation_shifts` | ALL | `organization_id IN get_user_organizations()` AND `branch_id IN user_accessible_branches(organization_id)` |
| `shift_assignments` | `tenant_branch_isolation_shift_assignments` | ALL | `organization_id IN get_user_organizations()` AND `shift_id IN (SELECT s.id FROM shifts s WHERE s.organization_id = shift_assignments.organization_id AND s.branch_id IN user_accessible_branches(s.organization_id))` — i.e. re-derives branch access transitively through the parent shift rather than trusting a denormalized branch column, so it can never disagree with `shifts`' own policy |
| `invitations` | `invitations_select` | SELECT | `organization_id IN get_user_organizations()` AND `user_has_permission(organization_id, 'org.members.manage')` |
| `invitations` | `invitations_insert` | INSERT | same condition, as `WITH CHECK` |
| `invitations` | `invitations_update` | UPDATE | same condition, both `USING` and `WITH CHECK` |
| `organization_member_branch_access` | `tenant_isolation_member_branch_access_select` | SELECT | `organization_id IN get_user_organizations()` (no extra permission check — any org member can see who has access to which branch) |
| `organization_member_branch_access` | `member_branch_access_write` | INSERT | `organization_id IN get_user_organizations()` AND `user_has_permission(organization_id, 'org.branches.manage')` |
| `organization_member_branch_access` | `member_branch_access_update` | UPDATE | same, both `USING` and `WITH CHECK` |
| `organization_member_branch_access` | `member_branch_access_delete` | DELETE | same, `USING` only |

Two things worth recording explicitly rather than leaving implicit:

- **`invitations` has no DELETE policy.** With RLS enabled and no policy for a command,
  Postgres denies that command outright for any non-bypassing role — this means invitations
  can never be hard-deleted through the RLS-gated path (only revoked via the existing UPDATE
  path, e.g. status → `revoked`). This is more restrictive than a gap, not a gap itself, but a
  future auditor should not read "no DELETE policy" as an oversight.
- **`organization_member_branch_access`'s SELECT policy has no permission check**, unlike its
  own INSERT/UPDATE/DELETE siblings — any active member of an org can read the full branch-
  access grid for that org (who can access which branch), not just members with
  `org.branches.manage`. This is pre-existing (not touched by this plan's 10 tasks) and is a
  read-only, intra-org-only exposure (no cross-tenant reach — still gated by
  `get_user_organizations()`), consistent with the "no cross-tenant/cross-branch gap" claim,
  but is a real intra-org information-visibility asymmetry worth a future look. Recorded here,
  not filed as a task, per this plan's explicit non-goal of not inventing new work beyond the
  brief.

**Conclusion: the Phase 0 claim holds.** All 7 tables have RLS enabled, and every policy found
consistently gates on `get_user_organizations()` and, where relevant,
`user_accessible_branches()` or `user_has_permission()` — no policy was found that omits the
tenant/branch filter, and no table was found with RLS disabled. This matches the design spec's
§2 Phase 12 summary; this document is what makes it re-runnable (the two queries above) instead
of a prose claim.

## 3. What Tasks 1–9 touched that's RLS/security-relevant

- **Task 1** (`packages/api/src/operations/context.ts`, commit `d9d8f2a`): added
  `branchAccess.singleBranchId` to `get_my_context`'s response. Read directly from the source
  file for this write-up: it is a plain derived boolean/ternary
  (`!context.branchAccess.isOrgWide && context.branchAccess.branchIds.length === 1 ? ... : null`)
  computed from fields `ApplicationContext` already resolves and returns elsewhere in the same
  payload — no new query, no new grant, no new RLS-relevant surface. Confirmed by reading the
  function in full; it is not a re-derivation from a live audit, it is a direct read of the
  current code.
- **Task 4** (migration `056_detect_multiple_pending_invitations.sql`): added
  `has_other_pending_invitations` to `get_pending_invitation()`. Confirmed live: the function
  is `SECURITY DEFINER` (`prosecdef = true`) and its grants are
  `EXECUTE` → `service_role`, `authenticated`, `postgres` only — no `anon`, no `PUBLIC` row —
  matching the 044/045 precedent exactly (query: `information_schema.role_routine_grants`
  filtered to `routine_name = 'get_pending_invitation'`). The new column is read-only (a
  `count(*) > 1` computed value); `accept_invitation()` itself is untouched and still takes no
  client-supplied parameters (per the migration's own comment and Task 4's committed
  regression test, `acceptInvitationRoleIntegrity.integration.test.ts`).
- **Task 6** (migration `057_generate_employee_number.sql`): added
  `generate_next_employee_number(p_organization_id uuid)` + a `BEFORE INSERT` trigger
  (`trg_employees_generate_employee_number`) on `public.employees`.
  - Confirmed the authorization-gap question the brief asked about: `create_employee`
    (`packages/api/src/operations/employee.ts` → `EmployeeService.createEmployee`,
    `packages/services/src/workforce/employeeService.ts:52-53`) calls
    `await this.context.requirePermission('employees.create')` **before** the insert that fires
    this trigger. The trigger/function do not themselves check any permission — they don't
    need to, because they only ever run as part of an insert that already passed that gate.
    This holds for every insert path into `employees`, since the trigger is on the table
    itself, not on a specific RPC.
  - **New finding, not previously documented**: both `generate_next_employee_number` and its
    trigger function are `prosecdef = false` (`SECURITY INVOKER`, the Postgres default —
    confirmed live) — unlike `get_pending_invitation`/`get_user_organizations`/
    `user_has_permission`/`user_accessible_branches`, which are all `SECURITY DEFINER`.
    `generate_next_employee_number`'s live grants (`information_schema.role_routine_grants`)
    are `EXECUTE` → `service_role`, `authenticated`, `postgres`, **`anon`, and `PUBLIC`** — the
    migration never added a `REVOKE ... FROM PUBLIC`/`REVOKE ... FROM anon`, unlike every
    other function this plan touched (044/045/056 all explicitly revoke from `PUBLIC`/`anon`).
    This is a real deviation from this repo's established grant-hygiene convention, and it is
    directly callable via PostgREST's `/rpc/generate_next_employee_number` endpoint by an
    unauthenticated (`anon`) caller. **It is not, however, an exploitable cross-tenant gap**:
    because the function is `SECURITY INVOKER` (not `DEFINER`), its internal
    `SELECT MAX(...) FROM public.employees WHERE organization_id = p_organization_id` runs
    under the *calling* role's own RLS — for `anon` or an `authenticated` caller with no
    membership in the target org, `tenant_branch_isolation_employees` (§2 above) filters that
    `SELECT` down to zero visible rows regardless of which `organization_id` is passed, so the
    function always returns `EMP-0001` for any org the caller can't already see — it discloses
    nothing about a foreign org's real employee count or data. Recommend tightening the grant
    to match the repo's convention (`REVOKE ALL ... FROM PUBLIC; REVOKE EXECUTE ... FROM anon;`)
    as a cheap, low-priority follow-up; not filed as a task here since it closes a hygiene gap,
    not an active leak.
  - The advisory-lock design (`pg_advisory_xact_lock(hashtext('employees_employee_number'),
    hashtext(p_organization_id::text))`) serializes number generation per-organization within
    one transaction and releases automatically at COMMIT/ROLLBACK — a concurrency-correctness
    property, not an authorization one; it introduces no new access path.
- **Task 9** (migration `058_apply_missing_avatars_bucket_and_tighten_employee_policies.sql`,
  commits `1592391`/`f7627f9`): fully covered by its own task report and a committed regression
  test, `packages/tests/integration/avatarPolicyPermissionTightening.integration.test.ts`
  (11/11 passing per the ledger) — covers both permission-tightening (a fixture Admin holding
  only `employees.read` is rejected on INSERT/UPDATE) and cross-org isolation, using the
  `SET LOCAL ROLE authenticated` technique documented in §1. Not re-covered here per the Task
  10 brief's explicit instruction; this document only points to it. One gap that test file's
  own header comment honestly discloses (also not re-covered here): DELETE-via-real-Storage-API
  isn't exercised by that test, because a pre-existing Supabase `storage.protect_delete()`
  platform trigger blocks the raw-SQL DELETE path a test would otherwise use.
- **Tasks 2, 3, 5, 7, 8**: no RLS/grant/authorization-relevant surface. Task 2 is a frontend
  geography dataset with no server change. Task 3's migration (`055`) only drops a `NOT NULL`
  constraint on `invitations.first_name`/`last_name` (loosens a data-shape constraint, not an
  access-control one). Task 5 made no code change (verified an existing OAuth-adjacent
  question and found no separate/degraded auth path exists). Tasks 7 and 8 are frontend-only
  dashboard presentation changes reusing each page's existing `hasPermission()` calls, per
  their own task reviews.

## 4. Explicitly out of scope / not re-audited

To avoid this document implying more completeness than it has:

- **Role-change-after-invitation-acceptance**: no RPC/UI exists to change a member's role once
  assigned. A real gap per the design spec §3, but out of this plan's scope (onboarding/
  first-run, not role administration) — not audited further here, not fixed, not a task.
- **`resendInvitation` (Task 3, `InvitationsPage.tsx`) doesn't check `role.is_active`** before
  resending — flagged as a Minor in Task 3's own review and deliberately deferred there, not
  re-investigated or fixed by this document.
- **Explicit-duplicate-`employeeNumber` race** (Task 6): when a caller supplies an explicit
  `employeeNumber` value (not the auto-generated path), there's a check-then-insert race with
  no clean `23505` (unique-violation) → `ValidationError` mapping — flagged as a Minor in Task
  6's own review, pre-existing to this task's scope, not fixed here.
- **`organization_member_branch_access`'s SELECT policy having no permission check** (§2
  above) — newly noted in this document but not filed as a task or fixed; recorded as a
  candidate for a future look, consistent with this plan's "spot-check, not exhaustive"
  framing.
- **`generate_next_employee_number`'s missing explicit `REVOKE` from `anon`/`PUBLIC`** (§3
  above) — newly noted, judged non-exploitable given `SECURITY INVOKER` + RLS, recommended as
  a cheap follow-up, not filed as a task or fixed here.
- **Tables/policies beyond the 7 named in Phase 12** were not re-audited by this document —
  the design spec's spot-check (and this re-verification) covers exactly
  `employees`, `shifts`, `shift_assignments`, `invitations`, `organizations`, `branches`,
  `organization_member_branch_access`. Other tables in the schema (e.g. `departments`,
  `shift_swap_requests`, `security_events`, `disposable_email_domains`) have their own RLS
  policies established in their own migrations and covered piecemeal by other features'
  ledgers (e.g. the auth-abuse-protection feature's own record for
  `security_events`/`disposable_email_domains`), but were not re-verified as part of this
  document.
- **Storage bucket gaps beyond avatars**: the design spec's Phase 11 identifies the
  `avatars`/organization-logo Storage issues as "the only concrete gaps found anywhere in this
  audit"; this document does not re-scan Storage policies beyond what Task 9 already covered.
- This document is a **spot-check re-verification**, not an exhaustive security audit of the
  full schema — consistent with the design spec's own framing of Phase 12 ("spot-check, not
  exhaustive").
