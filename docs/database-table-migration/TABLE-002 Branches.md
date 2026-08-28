# TBL-002 — Branches Table Specification

**Document ID:** TBL-002  
**Table Name:** `branches`  
**Domain:** Platform / Tenant  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- DB-001 Database Philosophy
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `branches` table represents the physical operating locations of an organization.

Every branch belongs to exactly one organization.

A branch is the primary operational unit within ShiftOS. Employees, shifts, attendance, tasks, announcements, reports, and most day-to-day operations are performed at the branch level.

Organizations may own one or many branches.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Organization |
| Child Entities | Employees, Shifts, Attendance, Tasks, Announcements, Leave Requests |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| organization_id | UUID | No | — | Owning organization |
| name | TEXT | No | — | Branch name |
| address | TEXT | Yes | `NULL` | Physical address |
| settings | JSONB | No | `{}` | Reserved branch settings |
| is_active | BOOLEAN | No | `TRUE` | Branch status |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | Yes | `NULL` | Soft deletion timestamp |

---

# 4. Primary Key

| Column | Type |
|---------|------|
| id | UUID |

Generation:

```sql
gen_random_uuid()
```

---

# 5. Foreign Keys

| Column | References | Delete Rule |
|---------|------------|-------------|
| organization_id | organizations.id | RESTRICT |

A branch cannot exist without an owning organization.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_branches_org_name | organization_id, name |

Branch names only need to be unique **within the same organization**.

Example:

Organization A

```
Head Office
Warehouse
```

Organization B

```
Head Office
```

This is allowed.

---

# 7. Check Constraints

## Branch Name

Constraint:

```text
chk_branches_name_not_empty
```

Rules:

- Cannot be NULL
- Cannot be empty
- Cannot contain only whitespace

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_branches_organization_id | Fast filtering by organization |

---

# 9. Relationships

## One Organization → Many Branches

```
organizations.id
        │
        ▼
branches.organization_id
```

---

## One Branch → Many Employees

```
branches.id
      │
      ▼
employees.branch_id
```

---

## One Branch → Many Shifts

```
branches.id
      │
      ▼
shifts.branch_id
```

---

## One Branch → Many Attendance Records

```
branches.id
      │
      ▼
attendance.branch_id
```

---

## One Branch → Many Tasks

```
branches.id
      │
      ▼
tasks.branch_id
```

---

# 10. Business Rules

## Every Branch Belongs to One Organization

A branch cannot exist independently.

Every branch must reference exactly one organization.

---

## Branch Names

Branch names only need to be unique within the same organization.

Different organizations may reuse branch names.

---

## Branch Activation

A branch may be temporarily disabled by setting

```text
is_active = false
```

This prevents normal operations while preserving historical records.

---

## Deletion

Branches are never hard deleted during normal operation.

Instead,

```text
deleted_at
```

records when the branch was removed.

Historical records remain intact.

---

## Branch Settings

The `settings` JSONB field is reserved for branch-specific configuration that has not yet been formalized into dedicated columns.

Examples of future settings:

- Time zone
- Business hours
- Attendance grace period
- Default shift length
- Scheduling preferences

Frequently queried settings should eventually become first-class columns.

---

## Address

The address is stored as free-form text during the MVP.

If structured geographic reporting or mapping becomes necessary, a dedicated address model may be introduced in a future migration.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Record creation |
| updated_at | Last modification |
| deleted_at | Soft deletion |

Future migrations will introduce:

- created_by
- updated_by

after the Identity domain has been implemented.

---

# 12. Row-Level Security

RLS is enabled.

No policies are created in this migration.

## Reason

Tenant-aware policies depend on:

- Users
- Organization Memberships
- Roles

These entities do not yet exist.

Policies will be introduced after the Identity domain has been completed.

---

# 13. Performance Considerations

Expected queries:

- Filter branches by organization
- Lookup branch by primary key
- Join employees by branch
- Join shifts by branch
- Join attendance by branch
- Join tasks by branch

Expected table size:

Small to medium.

Organizations typically own a relatively small number of branches.

The `organization_id` index supports the most common lookup pattern.

---

# 14. Future Expansion

Potential future additions include:

- Branch code
- Phone number
- Email
- GPS coordinates
- Time zone
- Manager reference
- Operating hours
- Capacity
- Region
- Country
- State
- City

These should be added through future documented migrations rather than stored permanently inside `settings`.

---

# 15. Migration Dependencies

This table depends on:

- Organizations

The following tables depend on Branches:

- Employees
- Shifts
- Attendance
- Leave Requests
- Tasks
- Announcements
- Reports
- Payroll
- Analytics

---

# 16. Implementation Notes

- UUIDs are generated using `gen_random_uuid()`.
- `updated_at` is maintained using the shared trigger function `public.trg_set_updated_at()`.
- Constraint names follow the ShiftOS database naming standards.
- Branch names are unique only within an organization.
- RLS is enabled, but tenant-aware policies are intentionally deferred until the Identity domain has been implemented.
```