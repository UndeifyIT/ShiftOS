# TBL-003 — Users Table Specification

**Document ID:** TBL-003  
**Table Name:** `users`  
**Domain:** Identity  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- USR-001 User Lifecycle
- USR-002 Authentication
- USR-003 Authorization
- USR-008 Profile Management
- DB-003 Schema Overview
- DB-005 Table Standards
- DB-006 Constraints
- SEC-001 Authentication
- SEC-004 Row-Level Security

---

# 1. Purpose

The `users` table represents every authenticated person who can access the ShiftOS platform.

A user is a platform identity and is **not tied to a single organization**. Users may belong to multiple organizations through the `organization_memberships` table.

Authentication is managed by Supabase Auth. This table stores only application-specific profile information.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Platform |
| Tenant Owned | No |
| Parent Entity | None |
| Child Entities | Organization Memberships |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| auth_user_id | UUID | No | — | References Supabase Auth user ID |
| first_name | TEXT | No | — | User first name |
| last_name | TEXT | No | — | User last name |
| email | TEXT | No | — | Login email address |
| phone | TEXT | Yes | NULL | Contact phone number |
| avatar_url | TEXT | Yes | NULL | Profile image URL |
| is_active | BOOLEAN | No | TRUE | Account status |
| last_login_at | TIMESTAMPTZ | Yes | NULL | Last successful login |
| created_at | TIMESTAMPTZ | No | `now()` | Record creation timestamp |
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

None.

Authentication is handled externally by Supabase Auth.

`auth_user_id` references the authenticated user but is **not** a database foreign key because Supabase Auth lives in a separate schema managed by Supabase.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_users_auth_user_id | auth_user_id |
| uq_users_email | email |

---

# 7. Check Constraints

## First Name

Rules

- Cannot be NULL
- Cannot be empty
- Cannot contain only whitespace

Constraint

```text
chk_users_first_name_not_empty
```

---

## Last Name

Rules

- Cannot be NULL
- Cannot be empty
- Cannot contain only whitespace

Constraint

```text
chk_users_last_name_not_empty
```

---

## Email

Rules

- Cannot be NULL
- Must be unique
- Must be stored lowercase
- Validation performed by Supabase Auth

Constraint

```text
chk_users_email_lowercase
```

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_users_email | Login lookup |
| idx_users_auth_user_id | Auth synchronization |
| idx_users_is_active | Active user filtering |

---

# 9. Relationships

## One User → Many Organization Memberships

```
users.id
    │
    ▼
organization_memberships.user_id
```

---

# 10. Business Rules

## Authentication

Passwords are **never stored** in this table.

Authentication is fully managed by Supabase Auth.

---

## One Identity

A user has exactly one identity across the entire platform.

They may belong to multiple organizations.

---

## Multiple Organizations

Example

```
John Smith

Organization A
Supervisor

Organization B
Manager
```

This is supported.

---

## Email Address

Email addresses must be globally unique.

They are synchronized with Supabase Auth.

---

## Deactivation

Setting

```text
is_active = false
```

prevents access to ShiftOS without deleting historical records.

---

## Soft Delete

Users are never hard deleted.

Instead,

```text
deleted_at
```

stores the deletion timestamp.

---

## Profile Data

This table stores only application profile data.

Sensitive authentication information remains inside Supabase Auth.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Record creation |
| updated_at | Last modification |
| deleted_at | Soft deletion |

Future migrations will introduce

- created_by
- updated_by

where appropriate.

---

# 12. Row-Level Security

RLS will be enabled.

Policies will allow users to:

- Read their own profile
- Update their own profile
- Prevent access to other user profiles unless authorized

Additional administrative policies will be added after Roles and Organization Memberships are implemented.

---

# 13. Performance Considerations

Expected queries

- Lookup by auth_user_id
- Lookup by email
- Lookup by primary key

Expected table size

Medium.

One record exists for every authenticated ShiftOS user.

---

# 14. Future Expansion

Potential future additions

- Preferred language
- Time zone
- Theme preference
- Notification preferences
- Two-factor authentication status
- Profile completion percentage
- Last password reset
- Last activity timestamp

---

# 15. Migration Dependencies

Depends on

- None

Required before

- Organization Memberships
- Invitations
- Notifications
- Audit Logs
- User Preferences

---

# 16. Implementation Notes

- Authentication is delegated entirely to Supabase Auth.
- Password hashes are never stored.
- Emails should always be normalized to lowercase before insertion.
- `auth_user_id` must remain synchronized with the Supabase Auth user ID.
- `updated_at` is maintained by the shared `trg_set_updated_at()` trigger.
- User authorization is **not** stored here; it is handled through Organization Memberships and Roles.
```