# TBL-005 — Roles Table Specification

**Document ID:** TBL-005  
**Table Name:** `roles`  
**Domain:** Authorization  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- USR-003 Authorization
- PERM-001 Permission Model
- PERM-002 Role Matrix
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-003 Authorization
- SEC-004 Row-Level Security

---

# 1. Purpose

The `roles` table defines reusable permission groups within an organization.

Roles determine **what a user is allowed to do** inside a specific organization. A user's permissions are never assigned directly; they are inherited through the role linked to their organization membership.

Examples include:

- Owner
- Administrator
- Branch Manager
- Supervisor
- HR Manager
- Viewer

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Organization |
| Child Entities | Organization Memberships |
| Related Entity | Permissions (Future) |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| organization_id | UUID | No | — | Owning organization |
| name | TEXT | No | — | Role name |
| description | TEXT | Yes | NULL | Human-readable description |
| is_system | BOOLEAN | No | FALSE | Indicates a built-in system role |
| is_active | BOOLEAN | No | TRUE | Active status |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification timestamp |
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

Every role belongs to exactly one organization.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_roles_org_name | organization_id, name |

Role names only need to be unique within the same organization.

---

# 7. Check Constraints

## Role Name

Rules

- Cannot be NULL
- Cannot be empty
- Cannot contain only whitespace

Constraint

```text
chk_roles_name_not_empty
```

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_roles_organization | Fast lookup by organization |
| idx_roles_active | Active role filtering |
| idx_roles_system | Built-in role lookup |

---

# 9. Relationships

## One Organization → Many Roles

```
organizations.id
        │
        ▼
roles.organization_id
```

---

## One Role → Many Organization Memberships

```
roles.id
    │
    ▼
organization_memberships.role_id
```

---

## One Role → Many Permissions (Future)

```
roles.id
    │
    ▼
role_permissions.role_id
```

---

# 10. Business Rules

## Organization Scope

Roles are organization-specific.

Different organizations may create roles with identical names.

Example

```
Organization A

Supervisor

Organization B

Supervisor
```

This is valid because each role belongs to a different organization.

---

## Built-in Roles

System roles are identified using

```text
is_system = true
```

Examples

- Owner
- Administrator

Built-in roles may have restrictions on editing or deletion.

---

## Custom Roles

Organizations may create their own custom roles.

Examples

- Bakery Manager
- Inventory Lead
- Kitchen Supervisor

Custom roles are editable.

---

## Role Assignment

Permissions are never assigned directly to users.

Every permission is inherited through the user's assigned role.

---

## Deactivation

Roles may be disabled by setting

```text
is_active = false
```

Disabled roles cannot be assigned to new memberships.

Existing memberships should be reassigned before disabling a critical role.

---

## Deletion

Roles are soft deleted using

```text
deleted_at
```

Hard deletion is discouraged because historical memberships may reference the role.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Record creation |
| updated_at | Last modification |
| deleted_at | Soft deletion |

Future migrations may introduce

- created_by
- updated_by

---

# 12. Row-Level Security

RLS is enabled.

Policies will ensure that:

- Users can only view roles within organizations they belong to.
- Organization Administrators can create, edit, and deactivate roles.
- Only Owners may modify built-in system roles.
- Cross-tenant access is prohibited.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Retrieve all roles for an organization.
- Resolve a user's assigned role.
- Populate role selection lists.
- Validate permissions during authorization.

Expected table size

Small.

Most organizations will maintain only a limited number of roles.

---

# 14. Future Expansion

Potential future additions

- Display order
- Role color
- Role icon
- Default role flag
- Clone source role
- Immutable flag
- Permission count (computed)
- Last modified by

A future `permissions` and `role_permissions` model will define the actual capabilities associated with each role.

---

# 15. Migration Dependencies

Depends on

- Organizations

Required before

- Organization Memberships
- Permissions
- Role Permissions
- Row-Level Security Policies
- Authorization Services

---

# 16. Implementation Notes

- Roles define permission groups; they do not store permissions directly.
- Permissions will be implemented through a future `permissions` table and a many-to-many `role_permissions` table.
- System roles should be seeded during initial platform setup.
- Custom roles are created and managed per organization.
- `updated_at` is maintained using the shared `trg_set_updated_at()` trigger.
- Authorization decisions should always resolve a user's active organization membership and assigned role before evaluating permissions.