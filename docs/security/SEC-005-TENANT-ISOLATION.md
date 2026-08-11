# SEC-005 — Tenant Isolation

Status: Draft

Version: 0.1.0

Priority: High

Owner:

Dependencies:

Related Specifications:

---

## Purpose

Define how separate tenants are isolated from one another in a shared platform.

## Business Rationale

Tenant isolation protects customer data boundaries and prevents cross-organization leakage.

## Scope

This specification covers isolation in data storage, access control, workflows, and operational configuration.

## Definitions

- Tenant: A distinct organization or customer environment within the platform.

## Business Rules

- Tenant data must be isolated by default.
- Cross-tenant access is prohibited unless explicitly authorized and audited.

## User Workflow

- A user operates within a single tenant context.
- The system ensures all resources remain scoped to that tenant.

## Permissions

- Tenant boundaries must be enforced for all roles and services.

## UI Behaviour

- Users should only see their own tenant’s data and configuration.

## Backend Behaviour

- APIs and services must validate tenant context on every request.

## Database Impact

- Data models should include tenant identifiers and isolation-aware constraints.

## Events Emitted

- security.tenant.boundary.enforced

## Notifications

- Cross-tenant violations should trigger alerts.

## Reporting Impact

- Multi-tenant compliance and isolation metrics should be available.

## Edge Cases

- Shared support access, migrations, and debugging must be tightly controlled.

## Validation Rules

- All operations must be bound to a valid tenant context.

## Acceptance Criteria

- Data from one tenant is not visible or mutable from another tenant.

## Future Enhancements

- Stronger tenant-specific policy controls and delegated administration.

## Open Questions

- Which operational tasks require elevated cross-tenant support access?

## Decision History

**2026-08-09 — Implementation status:** organization isolation is enforced on all 28
tables via `public.get_user_organizations()` (017), which resolves strictly from the
caller's authenticated identity (`auth.uid()` -> `users` -> `organization_memberships`),
never from a client-supplied `organization_id`. `organization_memberships.role_id` is
tenant-bound via a composite `(role_id, organization_id)` foreign key (019), closing
a gap that previously allowed a membership to reference another organization's role.
Verified live via transactional cross-organization access tests (2026-08-09).

**2026-08-09 — Application-layer enforcement point (Milestone 4/5):** the backend's
domain services (`packages/services`) connect to Postgres over a direct `pg.Pool`
connection (`DATABASE_URL`), which does **not** go through PostgREST/`auth.uid()` and
therefore does not receive the RLS enforcement described above for free. For that
connection path, `ApplicationContext.organizationId` (resolved once per request by
`resolveAuthorizationContext`, see API-011) is the real tenant boundary: every domain
repository call is scoped by it explicitly, and every service method operates on
`context.organizationId`, never a client-supplied one. RLS remains the enforcement
boundary for any direct-from-client Supabase access (PostgREST, client SDKs); the
`ApplicationContext` path is the equivalent boundary for the backend's own direct-SQL
path. See API-013-APPLICATION-SERVICE-LAYER.md §4 for the full request flow and the
cross-tenant rejection test evidence.
