# TBL-007 — Role Permissions Table Specification

**Document ID:** TBL-007  
**Table Name:** `role_permissions`  
**Domain:** Authorization  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- TBL-005 Roles
- TBL-006 Permissions
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

The `role_permissions` table links **Roles** to **Permissions**.

It defines which permissions are granted to each role.

This is a junction table that implements the many-to-many relationship between roles and permissions.

Example

```
Role

Supervisor

↓

Permissions

employees.view
employees.update
shifts.view
attendance.approve
```

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entities | Roles, Permissions |
| Child Entities | None |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| role_id | UUID | No | — | Assigned role |
| permission_id | UUID | No | — | Granted permission |
| created_at | TIMESTAMPTZ | No | `now()` | Assignment timestamp |

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
| role_id | roles.id | CASCADE |
| permission_id | permissions.id | RESTRICT |

### Delete Rules

#### Role

If a role is removed, all permission assignments for that role are automatically removed.

#### Permission

Permissions cannot be deleted while they are assigned to roles.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_role_permission | role_id, permission_id |

The same permission cannot be assigned to the same role more than once.

---

# 7. Check Constraints

No additional check constraints are required.

Data integrity is enforced through:

- Foreign keys
- Unique constraint

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_role_permissions_role | Load permissions for a role |
| idx_role_permissions_permission | Find roles containing a permission |

---

# 9. Relationships

## One Role → Many Role Permissions

```
roles.id
    │
    ▼
role_permissions.role_id
```

---

## One Permission → Many Role Permissions

```
permissions.id
        │
        ▼
role_permissions.permission_id
```

---

# 10. Business Rules

## Many-to-Many Relationship

A role can have many permissions.

A permission can belong to many roles.

Example

```
Supervisor

↓

employees.view
employees.update
tasks.view

Administrator

↓

employees.view
employees.update
employees.delete
tasks.view
tasks.create
tasks.delete
```

---

## Duplicate Assignments

Duplicate role-permission combinations are prohibited.

Example

```
Supervisor

employees.view
employees.view
```

This is invalid.

---

## Permission Evaluation

Authorization is evaluated by:

1. Finding the user's organization membership.
2. Resolving the assigned role.
3. Loading all permissions assigned to that role.
4. Checking whether the requested permission exists.

Users never receive permissions directly.

---

## System Roles

Built-in roles are assigned permissions during database seeding.

Organizations may modify permissions for custom roles, subject to business rules.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Permission assignment timestamp |

Since assignments are immutable in practice, an `updated_at` column is not required.

Changing permissions is represented by deleting and recreating assignments.

---

# 12. Row-Level Security

RLS is enabled.

Policies will ensure:

- Users can only view role-permission assignments within organizations they belong to.
- Organization Administrators can manage assignments for custom roles.
- Only Owners may modify built-in system roles.
- Cross-tenant access is prohibited.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Load permissions for a role.
- Determine whether a role has a specific permission.
- Load authorization cache during login.
- Evaluate API authorization.

Expected table size

Small to medium.

Typically:

- 20–100 roles per organization.
- 30–200 permissions per role.

Indexes on `role_id` and `permission_id` are sufficient for expected workloads.

---

# 14. Future Expansion

Potential future additions

- Granted by user
- Granted at timestamp
- Expiration date
- Permission conditions
- Scope restrictions
- Branch-specific permission overrides

These features are outside the MVP scope.

---

# 15. Migration Dependencies

Depends on

- Roles
- Permissions

Required before

- Authorization Services
- API Authorization
- Row-Level Security Policies
- Permission Cache
- Feature Authorization

---

# 16. Implementation Notes

- This is a pure junction table implementing a many-to-many relationship.
- Permission assignments should be seeded for built-in system roles during initial deployment.
- Custom role permissions are managed through the administration interface.
- Authorization services should cache resolved role permissions to minimize database queries.
- Deleting a role automatically removes its assignments through `ON DELETE CASCADE`.
- Permission records themselves should remain immutable to preserve authorization consistency.