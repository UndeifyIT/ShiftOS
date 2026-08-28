# TBL-016 — Audit Logs Table Specification

**Document ID:** TBL-016  
**Table Name:** `audit_logs`  
**Domain:** Security & Compliance  
**Status:** Approved  
**Phase:** MVP Foundation  

**Related Documents:**
- TBL-001 Organizations
- TBL-003 Users
- SEC-001 Security Architecture
- SEC-003 Audit Requirements
- SEC-004 Row-Level Security
- COM-004 Message Visibility Rules
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- DB-012 Migration Standards

---

# 1. Purpose

The `audit_logs` table records important system activities performed inside ShiftOS.

Audit logs provide:

- Security visibility
- Accountability
- Troubleshooting capability
- Compliance evidence
- Operational history

Examples:

- User login events
- Permission changes
- Employee updates
- Schedule modifications
- Attendance adjustments
- Leave approvals
- Role changes

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Organization |
| Immutable | Yes |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| organization_id | UUID | No | — | Organization owning event |
| user_id | UUID | Yes | NULL | User performing action |
| action | TEXT | No | — | Action performed |
| entity_type | TEXT | No | — | Resource affected |
| entity_id | UUID | Yes | NULL | Affected record |
| old_values | JSONB | Yes | NULL | Previous data state |
| new_values | JSONB | Yes | NULL | Updated data state |
| ip_address | INET | Yes | NULL | Request IP address |
| user_agent | TEXT | Yes | NULL | Client information |
| created_at | TIMESTAMPTZ | No | `now()` | Event timestamp |

---

# 4. Primary Key

| Column | Type |
|---------|------|
| id | UUID |

Generated using:

```sql
gen_random_uuid()
```

---

# 5. Foreign Keys

| Column | References | Delete Rule |
|---------|------------|-------------|
| organization_id | organizations.id | RESTRICT |
| user_id | users.id | SET NULL |

---

# 6. Constraints

## Action Validation

The action field must contain a meaningful event name.

Examples:

```
USER_CREATED
EMPLOYEE_UPDATED
SHIFT_ASSIGNED
ROLE_CHANGED
```

---

## Entity Tracking

`entity_type` identifies the affected resource.

Examples:

```
users
employees
shifts
attendance_records
leave_requests
```

---

## Immutable Records

Audit records should not be edited after creation.

Updates should be restricted.

Deletes should be restricted or limited to retention processes.

---

# 7. Indexes

| Index | Purpose |
|--------|---------|
| idx_audit_logs_organization_id | Tenant audit history |
| idx_audit_logs_user_id | User activity lookup |
| idx_audit_logs_entity_type | Entity filtering |
| idx_audit_logs_entity_id | Record history lookup |
| idx_audit_logs_created_at | Timeline queries |

---

# 8. Relationships

## Organization → Audit Logs

```
organizations.id
          │
          ▼
audit_logs.organization_id
```

---

## User → Audit Logs

```
users.id
    │
    ▼
audit_logs.user_id
```

A user may generate many audit events.

---

# 9. Business Rules

## Audit Creation

Audit records are generated automatically by:

- Database triggers
- Backend services
- Edge functions

Users should not manually create audit records.

---

## Data Tracking

For sensitive changes:

Store:

```
old_values
```

and:

```
new_values
```

Example:

Before:

```json
{
 "role": "staff"
}
```

After:

```json
{
 "role": "manager"
}
```

---

## Sensitive Data Handling

Do not store:

- Passwords
- Authentication tokens
- Secrets
- Personal security information

inside audit payloads.

---

# 10. Audit Lifecycle

Audit logs are append-only.

Lifecycle:

```
Created

↓

Stored

↓

Reviewed

↓

Archived according to retention policy
```

---

# 11. Row-Level Security

RLS is enabled.

Policies ensure:

- Organization users only access their organization's audit history.
- Sensitive audit information requires elevated permissions.
- Employees cannot view administrative audit records.

---

# 12. Performance Considerations

Audit logs can grow significantly.

Expected queries:

- Recent activity feed
- Security investigations
- User history
- Entity change history

Indexes prioritize:

- Organization filtering
- Time filtering
- Entity lookup

---

# 13. Future Expansion

Potential future additions:

- Audit categories
- Severity levels
- Automated compliance reports
- Export functionality
- Retention automation
- Security alerts

Deferred until later releases.

---

# 14. Migration Dependencies

Depends on:

- TBL-001 Organizations
- TBL-003 Users

---

# 15. Implementation Notes

- Audit logs should never replace normal application data.
- They exist as a historical record of actions.
- Avoid storing excessive JSON payloads.
- Retention rules should be configurable by compliance requirements.
- Audit events should be generated consistently across backend services.
- This table should remain append-only.