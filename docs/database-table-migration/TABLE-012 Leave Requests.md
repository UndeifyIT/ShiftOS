# TBL-012 — Leave Requests Table Specification

**Document ID:** TBL-012  
**Table Name:** `leave_requests`  
**Domain:** Employee Management  
**Status:** Approved  
**Phase:** MVP Foundation  

**Related Documents:**
- TBL-008 Employees
- TBL-003 Users
- LEAVE-001 Leave Management
- LEAVE-002 Leave Approval Workflow
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `leave_requests` table stores employee leave applications and their approval lifecycle.

It manages:

- Employee leave submissions
- Leave periods
- Leave types
- Approval decisions
- Rejection reasons
- Manager review history

This table represents the official record of employee leave activity.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Employee |
| Approval Entity | User / Manager |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| employee_id | UUID | No | — | Employee requesting leave |
| leave_type | leave_type_enum | No | — | Type of leave requested |
| start_date | DATE | No | — | Leave start date |
| end_date | DATE | No | — | Leave end date |
| reason | TEXT | No | — | Employee explanation |
| request_status | leave_request_status_enum | No | `'pending'` | Approval state |
| reviewed_by | UUID | Yes | NULL | Approving manager |
| reviewed_at | TIMESTAMPTZ | Yes | NULL | Review timestamp |
| rejection_reason | TEXT | Yes | NULL | Reason for rejection |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification |
| deleted_at | TIMESTAMPTZ | Yes | NULL | Soft delete |

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
| employee_id | employees.id | RESTRICT |
| reviewed_by | users.id | SET NULL |

---

# 6. Constraints

## Date Validation

The end date cannot be before the start date.

Rule:

```
end_date >= start_date
```

---

## Reason Validation

Reason is required for all leave requests.

---

## Rejection Reason

If status is:

```
rejected
```

then:

```
rejection_reason
```

must contain a value.

---

## Request Status

Must use:

```
leave_request_status_enum
```

Expected values:

- pending
- approved
- rejected
- cancelled

---

# 7. Indexes

| Index | Purpose |
|--------|---------|
| idx_leave_requests_employee_id | Employee leave history |
| idx_leave_requests_status | Approval queues |
| idx_leave_requests_dates | Leave calendar queries |

---

# 8. Relationships

## Employee → Leave Requests

```
employees.id
      │
      ▼
leave_requests.employee_id
```

---

## User → Leave Approval

```
users.id
    │
    ▼
leave_requests.reviewed_by
```

---

# 9. Business Rules

## Employee Submission

Employees may submit leave requests.

Initial state:

```
pending
```

---

## Approval Workflow

Typical lifecycle:

```
Pending

↓

Approved

OR

Rejected

OR

Cancelled
```

---

## Approval Permissions

Only authorized users may approve leave.

Examples:

- Supervisor
- Manager
- Organization Administrator

Permission depends on RBAC configuration.

---

## Historical Records

Leave requests should not be permanently deleted after approval.

Historical leave information is required for:

- Employee records
- Compliance
- Reporting
- Workforce planning

---

# 10. Leave Types

Leave types are controlled by:

```
leave_type_enum
```

Examples:

- annual_leave
- sick_leave
- emergency_leave
- unpaid_leave

Additional types may be added later.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Request creation |
| updated_at | Last modification |
| reviewed_by | Approving user |
| reviewed_at | Approval timestamp |

`updated_at` uses:

```
public.trg_set_updated_at()
```

---

# 12. Row-Level Security

RLS is enabled.

Policies ensure:

- Employees can view their own leave requests.
- Employees can create their own requests.
- Supervisors can review requests for their branches.
- Managers can approve or reject according to permissions.
- Organizations cannot access another organization's leave data.

---

# 13. Performance Considerations

Expected queries:

- Pending approval queue
- Employee leave history
- Upcoming employee absences
- Monthly leave reports
- Workforce availability planning

Indexes support employee, status, and date-based queries.

---

# 14. Future Expansion

Potential future additions:

- Leave balances
- Accrual tracking
- Public holiday calculations
- Attachment support
- Medical documentation
- Automatic approval rules
- Leave conflicts detection

Deferred until future releases.

---

# 15. Migration Dependencies

Depends on:

- TBL-003 Users
- TBL-008 Employees

Required before:

- Workforce availability reports
- Payroll integrations
- Advanced scheduling automation

---

# 16. Implementation Notes

- Leave requests belong to employees, not users.
- Approval is performed by users with appropriate permissions.
- Leave balances should not be stored here; they should be calculated or managed through a future leave balance system.
- Approved leave should influence scheduling availability.
- The table should preserve historical records for reporting and compliance.