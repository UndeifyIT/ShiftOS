# TBL-006 — Permissions Table Specification

**Document ID:** TBL-006  
**Table Name:** `permissions`  
**Domain:** Authorization  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- USR-003 Authorization
- PERM-001 Permission Model
- PERM-002 Permission Matrix
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-003 Authorization
- SEC-004 Row-Level Security

---

# 1. Purpose

The `permissions` table defines every action that can be performed within ShiftOS.

Permissions are the lowest level of authorization.

Users never receive permissions directly.

Permissions are granted through Roles.

Example permissions include:

- employees.view
- employees.create
- employees.update
- employees.delete
- shifts.view
- shifts.create
- attendance.approve
- leave.approve

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Platform |
| Tenant Owned | No |
| Parent Entity | None |
| Child Entity | Role Permissions |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| code | TEXT | No | — | Unique permission identifier |
| module | TEXT | No | — | Functional module |
| name | TEXT | No | — | Human-readable permission |
| description | TEXT | Yes | NULL | Description |
| is_active | BOOLEAN | No | TRUE | Active status |
| created_at | TIMESTAMPTZ | No | `now()` | Record creation |
| updated_at | TIMESTAMPTZ | No | `now()` | Last update |

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

None.

Permissions are global platform records.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_permissions_code | code |

Every permission code must be globally unique.

Examples

```
employees.view
employees.create
employees.update
employees.delete
```

---

# 7. Check Constraints

## Permission Code

Rules

- Cannot be NULL
- Cannot be empty
- Lowercase only
- Dot notation required

Examples

Valid

```
employees.view
attendance.approve
tasks.assign
```

Invalid

```
Employees.View
Employee Create
VIEW_EMPLOYEE
```

---

## Module

Cannot be empty.

Typical values

- employees
- shifts
- attendance
- tasks
- leave
- announcements
- reports
- settings

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_permissions_code | Permission lookup |
| idx_permissions_module | Module filtering |
| idx_permissions_active | Active permission lookup |

---

# 9. Relationships

## One Permission → Many Role Permissions

```
permissions.id
      │
      ▼
role_permissions.permission_id
```

---

# 10. Business Rules

## Global Table

Permissions belong to the ShiftOS platform.

Organizations cannot create or modify permissions.

---

## Stable Codes

The `code` column is permanent.

Changing permission codes after release is prohibited because authorization logic depends on them.

---

## Human-Friendly Names

Example

| Code | Name |
|------|------|
| employees.view | View Employees |
| attendance.approve | Approve Attendance |

Applications should display the Name field rather than the Code field.

---

## Module Organization

Permissions are grouped by module.

Example

```
employees.*

shifts.*

attendance.*

leave.*

tasks.*

announcements.*
```

---

## Deactivation

Permissions should almost never be deleted.

If a permission becomes obsolete

```
is_active = false
```

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Creation timestamp |
| updated_at | Last modification |

`updated_at` is maintained using the shared `trg_set_updated_at()` trigger.

---

# 12. Row-Level Security

RLS is **not required**.

Permissions are global reference data.

Authenticated users may read permissions through controlled application services.

Only platform administrators may create or modify permissions.

---

# 13. Performance Considerations

Expected queries

- Permission lookup by code
- Load all permissions
- Group permissions by module
- Authorization cache loading

Expected table size

Very small.

Typically fewer than 300 records.

---

# 14. Future Expansion

Potential future additions

- Display order
- Category
- Permission group
- Risk level
- Internal documentation
- Deprecated flag

---

# 15. Migration Dependencies

Required before

- Role Permissions
- Authorization Engine
- Row-Level Security Policies
- API Authorization
- Feature Authorization

---

# 16. Implementation Notes

- Permissions represent atomic actions.
- Users never receive permissions directly.
- Roles aggregate permissions.
- Authorization is evaluated by resolving:
  1. User
  2. Organization Membership
  3. Assigned Role
  4. Granted Permissions
- Permission codes must remain immutable after production release.
- This table should be seeded with platform-defined permissions during initial deployment.