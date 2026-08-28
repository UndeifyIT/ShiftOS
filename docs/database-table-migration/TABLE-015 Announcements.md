# TBL-015 — Announcements Table Specification

**Document ID:** TBL-015  
**Table Name:** `announcements`  
**Domain:** Communication & Operations  
**Status:** Approved  
**Phase:** MVP Foundation

**Related Documents:**

- TBL-002 Branches
- TBL-003 Users
- COM-001 Communication System
- COM-004 Message Visibility Rules
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `announcements` table stores official communications published within ShiftOS.

Announcements allow organizations and branches to communicate important information to employees.

Examples:

- Policy updates
- Schedule changes
- Safety notices
- Operational instructions
- Company updates
- Emergency notifications

---

# 2. Ownership

| Property       | Value                 |
| -------------- | --------------------- |
| Entity Type    | Tenant                |
| Tenant Owned   | Yes                   |
| Parent Entity  | Organization / Branch |
| Creator Entity | User                  |

---

# 3. Table Structure

| Column            | Data Type                    | Nullable | Default             | Description            |
| ----------------- | ---------------------------- | -------- | ------------------- | ---------------------- |
| id                | UUID                         | No       | `gen_random_uuid()` | Primary key            |
| organization_id   | UUID                         | No       | —                   | Owning organization    |
| branch_id         | UUID                         | Yes      | NULL                | Optional branch target |
| title             | TEXT                         | No       | —                   | Announcement title     |
| content           | TEXT                         | No       | —                   | Announcement body      |
| announcement_type | announcement_type_enum       | No       | `'general'`         | Announcement category  |
| visibility_type   | announcement_visibility_enum | No       | `'organization'`    | Audience scope         |
| is_published      | BOOLEAN                      | No       | `false`             | Publication state      |
| published_at      | TIMESTAMPTZ                  | Yes      | NULL                | Publication timestamp  |
| expires_at        | TIMESTAMPTZ                  | Yes      | NULL                | Optional expiration    |
| created_by        | UUID                         | No       | —                   | Creating user          |
| created_at        | TIMESTAMPTZ                  | No       | `now()`             | Creation timestamp     |
| updated_at        | TIMESTAMPTZ                  | No       | `now()`             | Last modification      |
| deleted_at        | TIMESTAMPTZ                  | Yes      | NULL                | Soft delete            |

---

# 4. Primary Key

| Column | Type |
| ------ | ---- |
| id     | UUID |

Generated using:

```sql
gen_random_uuid()
```

---

# 5. Foreign Keys

| Column          | References       | Delete Rule |
| --------------- | ---------------- | ----------- |
| organization_id | organizations.id | RESTRICT    |
| branch_id       | branches.id      | SET NULL    |
| created_by      | users.id         | RESTRICT    |

---

# 6. Constraints

## Title Validation

Announcement titles cannot be empty.

Rule:

```
trim(title) <> ''
```

---

## Content Validation

Announcement content cannot be empty.

Rule:

```
trim(content) <> ''
```

---

## Publication Rules

If:

```
is_published = true
```

then:

```
published_at
```

must contain a value.

---

## Expiration Validation

If:

```
expires_at
```

exists:

```
expires_at > published_at
```

---

# 7. Indexes

| Index                             | Purpose                    |
| --------------------------------- | -------------------------- |
| idx_announcements_organization_id | Organization announcements |
| idx_announcements_branch_id       | Branch announcements       |
| idx_announcements_published       | Published announcements    |
| idx_announcements_created_by      | Creator lookup             |

---

# 8. Relationships

## Organization → Announcements

```
organizations.id
          │
          ▼
announcements.organization_id
```

---

## Branch → Announcements

```
branches.id
      │
      ▼
announcements.branch_id
```

---

## User → Created Announcements

```
users.id
    │
    ▼
announcements.created_by
```

---

# 9. Business Rules

## Draft Announcements

Announcements may exist before publication.

Example:

```
is_published = false
```

Drafts are only visible to authorized users.

---

## Publishing

When published:

```
is_published = true
```

and:

```
published_at = current timestamp
```

---

## Visibility

Announcements support different audiences:

Examples:

### Organization Wide

Visible to:

- All organization members

---

### Branch Specific

Visible to:

- Employees assigned to that branch

---

### Role Specific

Future support:

- Managers only
- Supervisors only
- Specific departments

---

# 10. Announcement Lifecycle

```
Draft

↓

Published

↓

Expired
```

Announcements should not normally be deleted after publishing.

Historical communication may be required.

---

# 11. Audit Fields

| Field        | Purpose              |
| ------------ | -------------------- |
| created_by   | Accountability       |
| created_at   | Creation history     |
| published_at | Publication tracking |
| updated_at   | Modification history |

Uses:

```
public.trg_set_updated_at()
```

---

# 12. Row-Level Security

RLS is enabled.

Policies ensure:

- Users only see announcements belonging to their organization.
- Branch announcements only appear to branch members.
- Draft announcements are restricted to authorized creators.
- Organizations remain isolated from each other.

---

# 13. Performance Considerations

Expected queries:

- Latest announcements dashboard
- Branch notices
- Unread announcements
- Expiring announcements
- Communication history

Indexes support organization, branch, and publication filtering.

---

# 14. Future Expansion

Potential future additions:

- Read receipts
- Employee acknowledgement
- Attachments
- Comments
- Push notifications
- Announcement templates
- Scheduled publishing

Deferred until future releases.

---

# 15. Migration Dependencies

Depends on:

- TBL-001 Organizations
- TBL-002 Branches
- TBL-003 Users

---

# 16. Implementation Notes

- Announcements are owned by organizations.
- Branch targeting is optional.
- Do not duplicate announcements per branch; use visibility rules.
- Read tracking should become a separate table in future.
- Communication history should be preserved for auditing.
