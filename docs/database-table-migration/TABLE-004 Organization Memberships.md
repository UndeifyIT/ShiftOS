# TBL-004 — Organization Memberships Table Specification

**Document ID:** TBL-004  
**Table Name:** `organization_memberships`  
**Domain:** Identity / Authorization  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- USR-001 User Lifecycle
- USR-003 Authorization
- USR-004 Invitations
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-003 Authorization
- SEC-004 Row-Level Security

---

# 1. Purpose

The `organization_memberships` table connects users to organizations.

It defines **which organizations a user belongs to** and **which role they hold within each organization**.

This table forms the foundation of ShiftOS authorization and multi-tenancy.

A single user may belong to multiple organizations, and each organization may contain many users.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Organization |
| Related Entity | Users |
| Child Entities | None |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| organization_id | UUID | No | — | Organization reference |
| user_id | UUID | No | — | User reference |
| role_id | UUID | No | — | Assigned role |
| joined_at | TIMESTAMPTZ | No | `now()` | Date joined organization |
| is_active | BOOLEAN | No | TRUE | Membership status |
| created_at | TIMESTAMPTZ | No | `now()` | Record creation |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification |
| deleted_at | TIMESTAMPTZ | Yes | NULL | Soft deletion timestamp |

---

# 4. Primary Key

| Column | Type |
|---------|------|
| id | UUID |

Generated using

```sql
gen_random_uuid()
```

---

# 5. Foreign Keys

| Column | References | Delete Rule |
|---------|------------|-------------|
| organization_id | organizations.id | RESTRICT |
| user_id | users.id | RESTRICT |
| role_id | roles.id | RESTRICT |

Memberships cannot reference deleted organizations, users, or roles.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_membership_user_organization | organization_id, user_id |

A user may only have **one active membership** within a single organization.

---

# 7. Check Constraints

## Membership Status

Rules

- `is_active` must always contain TRUE or FALSE.

---

## Joined Date

Rules

- Cannot be NULL.
- Automatically defaults to the current timestamp.

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_memberships_user | Fast lookup of a user's organizations |
| idx_memberships_organization | Fast lookup of organization members |
| idx_memberships_role | Fast lookup by assigned role |
| idx_memberships_active | Filter active memberships |

---

# 9. Relationships

## One User → Many Memberships

```
users.id
    │
    ▼
organization_memberships.user_id
```

---

## One Organization → Many Memberships

```
organizations.id
        │
        ▼
organization_memberships.organization_id
```

---

## One Role → Many Memberships

```
roles.id
    │
    ▼
organization_memberships.role_id
```

---

# 10. Business Rules

## Multi-Organization Support

A user may belong to any number of organizations.

Example

```
John Smith

Organization A
Supervisor

Organization B
Administrator

Organization C
Viewer
```

This is fully supported.

---

## Single Membership

A user cannot have multiple memberships in the same organization.

This is enforced by

```
uq_membership_user_organization
```

---

## Role Assignment

Every membership must reference exactly one role.

Permissions are inherited entirely from the assigned role.

Memberships themselves never contain permissions.

---

## Deactivation

Memberships may be temporarily disabled by setting

```text
is_active = false
```

This immediately removes access to the organization while preserving history.

---

## Soft Delete

Memberships are never permanently removed during normal operation.

Instead,

```text
deleted_at
```

records when access was removed.

---

## Invitations

Membership records are only created after an invitation has been accepted.

Pending invitations are stored separately.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| joined_at | Date joined organization |
| created_at | Record creation |
| updated_at | Last modification |
| deleted_at | Soft deletion |

Future migrations may introduce:

- created_by
- updated_by

---

# 12. Row-Level Security

RLS is enabled.

Policies will ensure that:

- Users can view only memberships belonging to organizations they belong to.
- Organization Administrators can manage memberships within their own organization.
- Cross-tenant access is prohibited.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Retrieve all users in an organization.
- Retrieve all organizations for a user.
- Determine a user's role within an organization.
- Validate organization access during authentication.

Expected table size

Medium to large.

This is expected to be one of the most frequently queried authorization tables.

---

# 14. Future Expansion

Potential future additions

- Invitation ID
- Invited by
- Accepted at
- Last accessed
- Membership expiration
- Suspension reason
- Custom organization title

---

# 15. Migration Dependencies

Depends on

- Organizations
- Users
- Roles

Required before

- Employees
- Authentication Policies
- RLS Policies
- Audit Logs
- Notifications
- Permissions

---

# 16. Implementation Notes

- This table is the central link between identities and tenants.
- Authorization is determined through the assigned role.
- Memberships define which organizations a user can access.
- RLS policies will use this table to enforce tenant isolation.
- `updated_at` is maintained using the shared `trg_set_updated_at()` trigger.
- Every authenticated request should resolve the user's active organization memberships before authorization decisions are made.