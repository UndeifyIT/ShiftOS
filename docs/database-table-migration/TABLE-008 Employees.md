# TBL-008 — Employees Table Specification

**Document ID:** TBL-008  
**Table Name:** `employees`  
**Domain:** Workforce Management  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- EMP-001 Employee Management
- SCH-001 Scheduling
- ATT-001 Attendance
- LEV-001 Leave Management
- TASK-001 Task Management
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `employees` table stores the employment record for every worker managed by an organization.

An Employee represents a real person working for a business.

Unlike the `users` table, an employee does **not** require a ShiftOS account.

Examples include:

- Cashiers
- Supervisors
- Bakers
- Waiters
- Pharmacists
- Warehouse Staff
- Receptionists

Employees may later receive a ShiftOS login through the User and Organization Membership system, but the employee record exists independently.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entity | Organization |
| Child Entities | Shifts, Attendance, Leave Requests, Tasks |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| organization_id | UUID | No | — | Owning organization |
| employee_number | TEXT | No | — | Organization-specific employee identifier |
| first_name | TEXT | No | — | First name |
| last_name | TEXT | No | — | Last name |
| email | TEXT | Yes | NULL | Employee email |
| phone | TEXT | Yes | NULL | Phone number |
| date_of_birth | DATE | Yes | NULL | Date of birth |
| hire_date | DATE | No | — | Employment start date |
| employment_status | employment_status_enum | No | `'active'` | Current employment status |
| notes | TEXT | Yes | NULL | Internal notes |
| is_active | BOOLEAN | No | TRUE | Active record |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last update timestamp |
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

Employees always belong to exactly one organization.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_employee_number | organization_id, employee_number |

Employee numbers only need to be unique inside an organization.

---

# 7. Check Constraints

## First Name

- Required
- Cannot be empty

---

## Last Name

- Required
- Cannot be empty

---

## Hire Date

Cannot be in the future.

---

## Employee Number

- Cannot be empty
- Must be unique within the organization

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_employees_organization | Organization lookup |
| idx_employees_status | Status filtering |
| idx_employees_name | Employee search |
| idx_employees_employee_number | Fast employee lookup |

---

# 9. Relationships

## Organization → Employees

```
organizations.id
        │
        ▼
employees.organization_id
```

---

## Employee → Shifts

```
employees.id
      │
      ▼
shift_assignments.employee_id
```

---

## Employee → Attendance

```
employees.id
      │
      ▼
attendance_records.employee_id
```

---

## Employee → Leave Requests

```
employees.id
      │
      ▼
leave_requests.employee_id
```

---

## Employee → Tasks

```
employees.id
      │
      ▼
task_assignments.employee_id
```

---

# 10. Business Rules

## Independent of Users

Employees do **not** require login accounts.

A business may manage employees who never access ShiftOS directly.

---

## Employment Status

Supported statuses

- Active
- Inactive
- Suspended
- Terminated

The status is defined using `employment_status_enum`.

---

## Employee Number

Assigned by the organization.

Example

```
EMP-0001

EMP-0045

STAFF-120
```

ShiftOS does not enforce a numbering format.

---

## Email

Optional.

Multiple employees may initially have no email address.

---

## Phone Number

Optional.

Stored for communication purposes.

---

## Soft Delete

Employees are never physically removed.

Historical data such as:

- Attendance
- Shifts
- Leave
- Audit logs

must remain valid.

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| created_at | Creation timestamp |
| updated_at | Last modification |
| deleted_at | Soft deletion |

`updated_at` is maintained using the shared `trg_set_updated_at()` trigger.

---

# 12. Row-Level Security

RLS is enabled.

Policies will ensure:

- Employees are visible only within their organization.
- Supervisors can view assigned employees.
- Managers can create and update employees.
- HR and Administrators can manage employment records.
- Cross-tenant access is prohibited.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Search employees by name.
- Search by employee number.
- List active employees.
- Load employees for scheduling.
- Load employees for attendance.
- Load employees for reporting.

Indexes should support all common filtering operations.

---

# 14. Future Expansion

Potential future additions

- Profile photo
- Emergency contacts
- National ID
- Tax information
- Salary reference
- Department
- Job title
- Primary branch
- Skills
- Certifications
- Manager
- Payroll identifier

These are intentionally deferred until required by future product phases.

---

# 15. Migration Dependencies

Depends on

- Organizations

Required before

- Shifts
- Shift Assignments
- Attendance Records
- Leave Requests
- Tasks
- Payroll
- Reporting
- Notifications

---

# 16. Implementation Notes

- Employees are the operational workforce entity used throughout ShiftOS.
- Login access is managed separately through `users` and `organization_memberships`.
- Historical employment data must always be preserved.
- Employee records should never be hard deleted.
- All workforce-related modules reference `employees.id`, making this one of the core tables in the platform.