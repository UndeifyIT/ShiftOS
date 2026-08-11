# ShiftOS Application Service Layer & API Boundary Architecture

**Document ID:** API-013

**Document Title:** Application Service Layer & API Boundary Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-09

---

# 1. Purpose

Milestone 4 built the application/domain service layer and the first real API boundary on top of the Milestone 1 (shared infrastructure), Milestone 2 (authentication), and Milestone 3 (domain repositories + authorization resolution) foundations. This document describes what exists, not what's planned. See API-011 for the repository/authorization-resolution layer this builds on, and API-012 for the scheduling-domain workflow this layer exposes.

# 2. Architectural Flow

```
HTTP request (packages/api/src/httpServer.ts)
        |  Authorization: Bearer <supabase-access-token>
        v
verifyAccessToken(token) -> { authUserId }   (caller-supplied; not implemented in this layer)
        v
RpcRegistry.execute(client, operationName, { authUserId, organizationId, input })
        |
        v
createApplicationContext(client, authUserId, organizationId)   (packages/services)
        |  = resolveAuthorizationContext() (API-011) + listAccessibleOrganizationIds()
        v
ApplicationContext   (userId, organizationId, membershipId, roleId, permissions,
                       branchAccess, accessibleOrganizationIds)
        v
Domain Service (packages/services) — OrganizationService / BranchService /
        |        EmployeeService / SchedulingService
        |  context.requirePermission() -> RoleBasedAuthorizationService (M1, unchanged)
        |  context.requireBranchAccess() / resolveBranchScope()
        v
Domain Repository (packages/repositories, API-011) — organizationId/branchIds explicit
        v
DatabaseClient (packages/database, pg.Pool) -> PostgreSQL / Supabase
        v
ApiResponse<T> { success, data, error }   (packages/utils, buildApiResponse / buildErrorApiResponse)
```

Every RPC operation is exactly one pass through this pipeline. No layer is skipped: routes/operations never call repositories directly, and services never construct their own `ApplicationContext` — it is resolved once per request by `RpcRegistry.execute()`.

# 3. `ApplicationContext` (`packages/services/src/applicationContext.ts`)

The single, centralized place request context is resolved. Every service method receives an `ApplicationContext` instead of re-deriving org/branch/permission state itself.

```
interface ApplicationContext {
  client, authUserId, userId, organizationId, membershipId, roleId, roleName,
  permissions: ReadonlySet<string>,
  branchAccess: { isOrgWide: boolean; branchIds: string[] },
  accessibleOrganizationIds: string[],

  hasPermission(permission): Promise<boolean>
  requirePermission(permission): Promise<void>       // throws AuthorizationError
  hasBranchAccess(branchId): boolean
  requireBranchAccess(branchId): void                 // throws AuthorizationError
  resolveBranchScope(requestedBranchId?): string[]     // verify-then-narrow, or full accessible set
}
```

- `hasPermission`/`requirePermission` delegate to the **unmodified** Milestone 1 `RoleBasedAuthorizationService` — no service reimplements permission logic or writes `if (user.role === 'admin')`-style checks.
- `resolveBranchScope(requestedBranchId?)` is how a client-supplied, untrusted `branchId` becomes a verified value: supplying one checks it against `branchAccess.branchIds` and throws if not accessible; omitting it returns the full accessible set. Services use this rather than passing a client-supplied `branchId` straight to a repository.
- `createApplicationContext(client, authUserId, organizationId)` is the only construction path. `organizationId` may come from an untrusted client — that is safe because `resolveAuthorizationContext` (API-011) verifies the authenticated user actually holds an active membership in that organization before anything else runs, throwing `AuthorizationError` (never a raw `NotFoundError` that would hint at which condition failed) otherwise.

# 4. Domain Services (`packages/services/src`)

| Service | File | Responsibility |
|---|---|---|
| `OrganizationService` | `organization/organizationService.ts` | Read/update the caller's own organization; list every organization the identity belongs to. Never accepts an `organizationId` parameter — always acts on `context.organizationId`. |
| `BranchService` | `organization/branchService.ts` | Branch CRUD + archive, all requiring `branches.*` permissions and, for single-branch operations, `context.requireBranchAccess`. |
| `EmployeeService` | `workforce/employeeService.ts` | Employee CRUD + archive, branch-access-checked on both the employee's current branch and (on update) any target branch. Automatically records `employee_history` rows for `first_name`, `last_name`, `branch_id`, `employment_status`, `employee_number` changes via a before/after diff — auditing is structural, not opt-in per call site. |
| `SchedulingService` | `scheduling/schedulingService.ts` | See API-012. |

Common shape across every service method:

1. `assertUuid`/`assertNonEmptyString`/etc. (`packages/services/src/validation.ts`) — input shape validation, before anything touches the database or the authorization system, so a malformed value never reaches `requireBranchAccess`.
2. `context.requirePermission('<domain>.<action>')` — the canonical, database-backed permission check.
3. `context.requireBranchAccess(...)` where the operation is branch-scoped.
4. Business rule checks (uniqueness, state-transition validity, relationship validity).
5. Repository call, scoped by `context.organizationId` (and `branchAccess.branchIds` where relevant).
6. Return the domain object directly — services return typed results, never raw query rows shaped differently per call site, and never a raw driver/Postgres error.

Validation always runs before permission/branch checks that depend on the value being checked (e.g. `assertUuid(branchId)` before `requireBranchAccess(branchId)`) — a malformed identifier is a `ValidationError` (400-class), not an `AuthorizationError` (403-class), matching normal REST/RPC error-precedence convention. This was confirmed by the Milestone 4/5 verification suite (§7): using non-UUID placeholder IDs in an authorization test produces `ValidationError`, not `AuthorizationError`, by design.

# 5. RPC API Layer (`packages/api/src`)

Per API-002 (RPC Standards), ShiftOS's API surface is RPC-style, not REST-resource-style: operations are named `verb_object` (`publish_schedule`, not `PATCH /schedules/:id`), business-action-focused, and permission-enforced per operation. No Express/Fastify/NestJS is used — introducing one would add a routing/middleware layer this project doesn't need, since there is no resource-CRUD-over-HTTP shape to route.

## 5.1 `rpc.ts`

- `defineRpc<TInput, TOutput>(name, handler)` — pairs an operation name with a typed handler `(context, input) => Promise<TOutput>`.
- `RpcRegistry` — `register()`, `has()`, and `execute(client, operationName, { authUserId, organizationId, input })`. `execute()` never throws: unknown operation, validation failure, authorization failure, not-found, or a completely unexpected error all become `buildErrorApiResponse(error)`. A transport adapter never needs its own try/catch around a registry call.
- Type erasure is confined to one documented boundary inside `RpcRegistry.register()` (`input as TInput`), safe by construction because `execute()` only ever invokes a handler through the wrapper `register()` created for it — every `defineRpc()` call site keeps its real, non-erased types.

## 5.2 `parse.ts`

Narrow `unknown -> typed` parsing helpers (`asRecord`, `stringField`, `requiredStringField`, `numberField`, `booleanField`, `recordField`) — the one place RPC input is narrowed from `unknown`, always via an explicit runtime check immediately before the assertion, never a bare `as`.

## 5.3 `operations/*.ts`

One file per domain (`organization.ts`, `branch.ts`, `employee.ts`, `scheduling.ts`), each defining its operations via `defineRpc()` and parsing `unknown` input with `parse.ts` helpers before calling into the corresponding service. Operations contain no business logic and never call a repository directly — they are a thin parse-and-delegate layer.

## 5.4 `registry.ts`

`createDefaultRegistry()` registers all ~27 operations by explicit individual `registry.register(operation)` calls, not a loop over combined per-domain arrays. This is deliberate, not a style choice: a first attempt looping over a unioned array of operations produced real `TS2345` errors, because TypeScript's generic inference on a union-typed loop variable resolves the registry's `TOutput` type parameter to only the first union member, not a sound union — the compiler was catching a genuine unsoundness, not being overly strict. The verbose explicit form is the type-safe one.

## 5.5 `httpServer.ts`

The thinnest possible HTTP transport: plain Node `http.createServer`, not a framework. Contract:

- `POST /rpc/<operation_name>`
- `Authorization: Bearer <supabase-access-token>`
- Body: `{ organizationId, input }` (JSON)
- Response: `ApiResponse<T>` JSON, **always HTTP 200** — success/failure is distinguished by the body's `success` field per the standardized response contract (§6), not the HTTP status code. This is an explicit, documented tradeoff for a minimal adapter; a future transport that needs real HTTP status codes can derive one from `toSafeApiError(error).statusCode` without changing the response contract itself.
- `verifyAccessToken` is supplied by the caller via `CreateHttpServerOptions`, not implemented in this module — `httpServer.ts` has no opinion on how a bearer token becomes an `authUserId`, only that authentication happens before any operation runs. This keeps Supabase-Auth-token-verification logic out of the transport-agnostic RPC core.

# 6. Standardized API Response Contract (`packages/types`, `packages/utils`)

```ts
interface ApiError {
  message: string;
  code: string;
  details?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ApiError;
}
```

`buildApiResponse(data)` / `buildErrorApiResponse(error)` (`packages/utils`) are the only constructors used anywhere in the API layer — no operation or service builds a response envelope by hand. `toSafeApiError(error)` (also `packages/utils`) is the single mapping from a thrown value to a client-safe `{ message, code, details? }`:

| Thrown | code | Notes |
|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | `details` forwarded (safe by construction — these are validation messages, not raw data) |
| `AuthorizationError` | `AUTHORIZATION_ERROR` | message forwarded, never which specific check failed |
| `NotFoundError` | `NOT_FOUND` | message forwarded |
| `HttpError` | (per subclass) | message forwarded |
| `DatabaseError` | `DATABASE_ERROR` | `.message` is a fixed, safe string by construction; the raw driver error lives on `.cause` for server-side logging only and is never serialized into the response |
| `ConfigError` | `CONFIG_ERROR` | message replaced entirely with a generic string — config errors can name internal env vars |
| any other `ShiftOSError` | its `code` | message forwarded |
| anything else (e.g. a raw `TypeError`) | `INTERNAL_ERROR` | message replaced with `"An unexpected error occurred"` |

No raw Postgres/driver error text, stack trace, or internal config value can reach a client through this path — confirmed by the Milestone 4/5 verification suite (§7).

# 7. Verification Performed

All tests below ran real, compiled `packages/services`/`packages/api` code against an in-memory fake `DatabaseClient` that interprets the actual SQL the repositories generate (not hand-stubbed responses per call), so the application code under test is unmodified. Scripts were disposable (`packages/backend/__m45_verify_*.mjs`) and deleted after the run; results are recorded here as the permanent record per the project's no-fake-completion-evidence rule.

**Authorization / `ApplicationContext` (8/8 passed):** permitted operation succeeds (org-wide role with the required permission); missing permission fails; organization mismatch (no membership in the requested org) fails; branch-scoped user cannot access a branch outside their grants (`hasBranchAccess`/`requireBranchAccess` and `BranchService.getBranch`); org-wide user can access every branch in the organization; a client-supplied `organizationId` the user does not belong to is rejected, not silently scoped; `EmployeeService.createEmployee` rejects a `branchId` outside the caller's grants even with `employees.create` permission.

**RPC registry (7/7 passed):** unknown operation name returns a safe `NOT_FOUND` envelope, not a thrown exception; a successful operation returns `success: true` with `data`; a permission-denied handler returns a safe `AUTHORIZATION_ERROR` envelope, not a thrown exception; a `DatabaseError` thrown inside a handler never leaks its wrapped raw driver message into the response; a completely unexpected error type (e.g. `TypeError`) still returns a safe `INTERNAL_ERROR` envelope, never propagates; `register()` rejects a duplicate operation name; `has()` reflects registration state.

**Scheduling-domain tests:** see API-012 §6.

**Live schema verification:** see API-012 §7 (scheduling-specific) — no schema facts specific to this layer needed separate live verification beyond the `permissions` catalog, which is covered there.

# 8. Security Assumptions

- `ApplicationContext.organizationId`/`branchAccess` are the enforcement boundary for the backend's direct-`pg.Pool` connection path, which bypasses RLS (see SEC-005 §Decision History, 2026-08-09 entry). RLS remains the boundary for any direct-from-client Supabase access.
- No service accepts a client-supplied `organizationId` as an operation parameter — every service acts on `context.organizationId`, which was already verified during context resolution.
- No route/operation/service ever constructs SQL by string-concatenating a client-supplied value; every repository call is parameterized (API-011 §5, unchanged).
- No raw database or config error ever reaches an `ApiResponse` (§6).
- `SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL` are not referenced anywhere in `packages/services` or `packages/api` (verified by source grep) — these packages only ever receive an already-constructed `DatabaseClient`, never a connection string or admin key directly.
