# TBL-001 — Organizations Table Specification

**Document ID:** TBL-001  
**Table Name:** `organizations`  
**Domain:** Platform  
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

The `organizations` table represents companies that subscribe to and use the ShiftOS platform.

Each organization is an independent tenant within the multi-tenant architecture. Every piece of tenant-owned data ultimately belongs to exactly one organization, either directly or indirectly.

Organizations are platform-owned entities and serve as the root of every tenant hierarchy.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Platform |
| Tenant Owned | No |
| Parent Entity | None |
| Child Entities | Branches, Organization Memberships, Employees (Indirect), Shifts (Indirect), Attendance (Indirect), Tasks (Indirect) |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| name | TEXT | No | — | Organization display/legal name |
| slug | TEXT | No | — | Unique URL-safe identifier |
| metadata | JSONB | No | `{}` | Reserved organization metadata |
| is_active | BOOLEAN | No | `TRUE` | Active status |
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

This table has **no foreign keys**.

It is the root entity of the tenant hierarchy.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_organizations_slug | slug |

---

# 7. Check Constraints

## Organization Name

Constraint:

```text
chk_organizations_name_not_empty
```

Rules:

- Cannot be NULL
- Cannot be empty
- Cannot contain only whitespace

---

## Organization Slug

Constraint:

```text
chk_organizations_slug_format
```

Rules:

- Cannot be NULL
- Cannot be empty
- Lowercase only
- Letters allowed
- Numbers allowed
- Hyphens allowed
- No spaces
- No special characters other than `-`

### Valid Examples

```text
shiftos
acme-group
freshmart
bakery-24
```

### Invalid Examples

```text
ShiftOS
Fresh Mart
fresh_mart
company!
```

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_organizations_slug | Fast organization lookup by slug |

---

# 9. Relationships

## One Organization → Many Branches

```
organizations.id
        │
        ▼
branches.organization_id
```

Delete Rule:

```text
ON DELETE RESTRICT
```

Organizations cannot be deleted while branches exist.

---

# 10. Business Rules

## Organization Names

Organization names are **not globally unique**.

Example:

```
Fresh Mart
Fresh Mart
```

This is permitted.

The `slug` provides uniqueness.

---

## Slug Uniqueness

Every organization must have a unique slug.

Allowed:

```
fresh-mart
```

Not Allowed:

```
fresh-mart
fresh-mart
```

---

## Tenant Ownership

Every tenant-owned record in ShiftOS must belong to exactly one organization either:

- Directly
- Indirectly through another entity

No record may exist without an owning organization.

---

## Activation

Organizations may be temporarily disabled by setting:

```text
is_active = false
```

Deactivation preserves all historical data.

---

## Deletion

Organizations are **not hard deleted** during normal application operation.

Instead:

```text
deleted_at
```

records the deletion timestamp.

---

## Administrator Requirement

Every organization must have at least one administrator after onboarding.

This rule is enforced by application logic.

It is **not** enforced by this table.

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

Tenant-aware policies require:

- Users
- Organization Memberships
- Roles

These tables do not yet exist.

Policies will be added after the Identity domain has been implemented.

---

# 13. Performance Considerations

Expected queries:

- Lookup by primary key
- Lookup by slug
- Foreign key joins from branches

Expected table size:

Small.

No additional indexes are currently required.

---

# 14. Future Expansion

Potential future additions include:

- Logo
- Brand colors
- Time zone
- Currency
- Default language
- Subscription plan
- Billing details
- Feature entitlements
- Support tier

These should become first-class columns when operationally required rather than permanently remaining inside `metadata`.

---

# 15. Migration Dependencies

This table must exist before:

- Branches
- Users
- Organization Memberships
- Employees
- Shifts
- Attendance
- Leave
- Tasks
- Payroll
- Reporting

It is one of the foundational tables of the ShiftOS database.

---

# 16. Implementation Notes

- UUIDs are generated using `gen_random_uuid()`.
- `updated_at` is maintained using the shared trigger function `public.trg_set_updated_at()`.
- Constraint names follow the ShiftOS database naming standard.
- This table is intentionally minimal to keep the tenant root stable.
- Additional operational fields should only be introduced through future documented migrations.