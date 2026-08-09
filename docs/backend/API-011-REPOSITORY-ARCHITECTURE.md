# ShiftOS Domain Repository & Authorization Resolution Architecture

**Document ID:** API-011

**Document Title:** Domain Repository & Authorization Resolution Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-09

---

# 1. Purpose

Milestone 3 built the domain data-access and authorization-resolution layer on top of the Milestone 1 (shared infrastructure) and Milestone 2 (authentication) foundations. This document describes what exists, not what's planned.

# 2. Architectural Flow

```
Authenticated User (packages/auth: SupabaseAuthProvider)
        |
resolveAuthorizationContext() (packages/authorization)
        |  users -> organization_memberships -> roles -> role_permissions -> permissions
        |  + organization_member_branch_access / roles.grants_org_wide_branch_access
        v
RoleBasedAuthorizationService.requirePermission() (packages/authorization, unchanged from M1)
        v
Domain Repository (packages/repositories) — organizationId/branchIds passed explicitly
        v
DatabaseClient (packages/database, pg.Pool) -> PostgreSQL / Supabase
        v
Safe Domain Result
```

# 3. Repository Layer

## 3.1 Base classes (`packages/repositories/src/base/`)

- **`TenantScopedRepository<T>`** — base for any table with an `organization_id` column. Extends `BaseRepository<T>` (M1) via composition, not by overriding `findById`/`create`/`update`/`softDelete` under the same names (a same-named override with a different required-argument count is rejected by TypeScript, and would be a footgun even if it weren't). Instead it exposes differently-named, tenant-required methods: `getById`, `getByIdOrThrow`, `list`, `countAll`, `insert`, `patch`, `archive`. Every one of them takes `organizationId` as the first argument, so tenant scoping can't be silently omitted.
- **`BranchScopedRepository<T>`** extends `TenantScopedRepository<T>` and adds `listByBranch`/`listByBranches`/`countByBranches`, using `branch_id = ANY($n::uuid[])` for a resolved branch-id set (never string interpolation).
- Both classes build `deleted_at IS NULL` correctly (as `IS NULL`, not `= NULL`) via a `protected hasSoftDelete` flag each concrete repository sets, since not every table has that column (`employee_history`, `task_history`, `schedule_versions`, `attendance_corrections`, `announcement_acknowledgements`, `notifications`, `notification_preferences` do not).

## 3.2 Domain repositories

One file per table, grouped by domain (`platform/`, `identity/`, `workforce/`, `scheduling/`, `attendance/`, `leave/`, `tasks/`, `communications/`, `notifications/`, `audit/`). 28 repositories for the 28 tables — see `packages/repositories/src/index.ts` for the full list. Notable exceptions to the two base classes above:

- **`OrganizationRepository`, `UserRepository`, `PermissionRepository`** extend `BaseRepository` directly — these tables have no `organization_id` column (an organization *is* the tenant boundary; users and permissions are platform-global).
- **`RolePermissionRepository`, `NotificationDeliveryAttemptRepository`** have no `organization_id` column of their own; tenant safety is enforced by joining to the owning table (`roles`, `notifications`) and checking its `organization_id` explicitly before any write.
- **`AuditLogRepository`, `SecurityEventRepository`** extend `BaseRepository` but override `update`/`delete`/`softDelete` to throw immediately — these tables are append-only (`supabase/migrations/024`); the repository layer enforces the same contract the database does, rather than only relying on the database trigger to reject a mistaken call.
- **`AnnouncementRepository`** does not extend `BranchScopedRepository`: `branch_id` is nullable (`NULL` = organization-wide announcement), which doesn't fit "every row has exactly one branch". `listVisibleTo(organizationId, branchIds)` handles both cases explicitly.
- **`ShiftAssignmentRepository`, `TaskAssignmentRepository`** have no `branch_id` column; branch is derived through the parent `shifts`/`tasks` row. Callers resolve the relevant shift/task ids first, then call `findByShift`/`findByTask`.

## 3.3 Transactions

`publishScheduleWithVersion()` (`packages/repositories/src/scheduling/`) is the reference example: construct repository instances against the **transaction-scoped client** the `transaction()` callback receives, not the outer client, so multiple writes commit or roll back together. Use this pattern for any multi-write operation that must be atomic (shift assignment + notification, role change + audit entry, etc.) — most single-table reads/writes don't need a transaction at all.

# 4. Authorization Resolution (`packages/authorization/src/membershipResolver.ts`)

`resolveAuthorizationContext(client, authUserId, organizationId)`:

1. `users` by `auth_user_id` (the Supabase Auth identity from `packages/auth`) — preserves the Milestone 2 decision that authentication does not populate roles/permissions itself.
2. `organization_memberships` for that user + organization, must be active.
3. `roles` for the membership's `role_id`, must be active.
4. `role_permissions` joined to `permissions` for that role → the permission code list.
5. Branch access: if `roles.grants_org_wide_branch_access` is true, every branch in the organization; otherwise the explicit grants in `organization_member_branch_access`.

Every failure path (no user, inactive membership, inactive role) throws `AuthorizationError` uniformly — the caller never learns *which* condition failed, only that access is denied.

The result feeds directly into the **unchanged** Milestone 1 `RoleBasedAuthorizationService.canPerformAction`/`requirePermission` (constructed with an empty rule list and an empty role-permission map, since the resolver already populated `context.user.permissions` from the database — no permissions are hardcoded in TypeScript anywhere in this path).

`branchAccess.branchIds` is what a caller passes into `listByBranch`/`listByBranches` — the authorization layer resolves *which* branches, the repository layer only accepts an already-resolved list.

# 5. Trust Boundary Note

`packages/database`'s `DatabaseClient` connects directly to Postgres via `DATABASE_URL` (a pooled/privileged connection), not through Supabase's PostgREST/`anon` key path. **This means Supabase RLS (`supabase/migrations/017-027`) is not evaluated for this backend's queries** — there is no `auth.uid()` session context on a direct `pg` connection. RLS remains active and correct for anything that *does* go through the Supabase client (e.g. `packages/auth`'s sign-in/session calls), but for this repository layer, tenant/branch/role enforcement is an **application-layer responsibility**: `TenantScopedRepository`/`BranchScopedRepository`'s required-argument design, `resolveAuthorizationContext`, and `RoleBasedAuthorizationService` are the actual enforcement boundary. This is consistent with how Milestone 1's `DatabaseClient` was designed (no RLS/session-scoping concept anywhere in it) and is not a defect introduced by this milestone, but it is important context for anyone extending this layer: **never expose a repository method that skips the tenant/branch argument, and never let unresolved `organizationId`/`branchIds` reach a repository call.**

# 6. Package Dependency Boundaries

```
types / errors / config
        |
     database
        |
   repositories
        |
   authorization  (depends on repositories, per this milestone's explicit design)
        |
      backend  (barrel; nothing depends on it)
```

`repositories` does not import from `authorization` — the dependency runs one direction only, so there is no cycle. `auth` (Milestone 2) remains independent of both (`errors`/`types`/`@supabase/supabase-js` only), preserving the authentication/authorization separation from GOV-003 DEC-018.

# 7. Related Specifications

- GOV-003 DEC-016 (identity/employee separation), DEC-018 (authN/authZ separation), DEC-031/DEC-032 (branch access model)
- PER-018 Branch Isolation
- DB-005 Tables
