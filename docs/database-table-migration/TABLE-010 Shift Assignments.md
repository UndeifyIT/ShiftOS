# TBL-010 — Shift Assignments Table Specification

**Document ID:** TBL-010  
**Table Name:** `shift_assignments`  
**Domain:** Scheduling  
**Status:** Approved  
**Phase:** MVP Foundation  
**Related Documents:**
- TBL-008 Employees
- TBL-009 Shifts
- SCH-001 Shift Scheduling
- SCH-002 Shift Lifecycle
- ATT-001 Attendance
- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-005 Table Standards
- DB-006 Constraints
- SEC-004 Row-Level Security

---

# 1. Purpose

The `shift_assignments` table links employees to scheduled shifts.

A shift may have many employees.

An employee may be assigned to many shifts.

This table implements the many-to-many relationship between **Employees** and **Shifts**.

---

# 2. Ownership

| Property | Value |
|----------|-------|
| Entity Type | Tenant |
| Tenant Owned | Yes |
| Parent Entities | Shifts, Employees |
| Child Entity | Attendance Records |

---

# 3. Table Structure

| Column | Data Type | Nullable | Default | Description |
|---------|-----------|----------|---------|-------------|
| id | UUID | No | `gen_random_uuid()` | Primary key |
| shift_id | UUID | No | — | Assigned shift |
| employee_id | UUID | No | — | Assigned employee |
| assignment_status | assignment_status_enum | No | `'assigned'` | Assignment status |
| assigned_at | TIMESTAMPTZ | No | `now()` | Assignment timestamp |
| assigned_by | UUID | Yes | NULL | User who created the assignment |
| notes | TEXT | Yes | NULL | Assignment notes |
| created_at | TIMESTAMPTZ | No | `now()` | Creation timestamp |
| updated_at | TIMESTAMPTZ | No | `now()` | Last modification |

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
| shift_id | shifts.id | CASCADE |
| employee_id | employees.id | RESTRICT |
| assigned_by | users.id | SET NULL |

### Delete Rules

- Deleting a shift removes all related assignments.
- Employees cannot be deleted while assignment history exists.
- If the assigning user is removed, the assignment remains and `assigned_by` becomes `NULL`.

---

# 6. Unique Constraints

| Constraint | Columns |
|------------|---------|
| uq_shift_employee | shift_id, employee_id |

An employee cannot be assigned to the same shift more than once.

---

# 7. Check Constraints

## Notes

No validation beyond standard text limits.

---

## Assignment Status

Must be one of the values defined in `assignment_status_enum`.

Example values

- assigned
- confirmed
- declined
- cancelled

---

# 8. Indexes

| Index | Purpose |
|--------|---------|
| idx_shift_assignments_shift | Load employees for a shift |
| idx_shift_assignments_employee | Load employee schedule |
| idx_shift_assignments_status | Status filtering |

---

# 9. Relationships

## Shift → Shift Assignments

```
shifts.id
     │
     ▼
shift_assignments.shift_id
```

---

## Employee → Shift Assignments

```
employees.id
      │
      ▼
shift_assignments.employee_id
```

---

## Shift Assignment → Attendance Record

```
shift_assignments.id
          │
          ▼
attendance_records.shift_assignment_id
```

---

# 10. Business Rules

## One Assignment Per Shift

An employee can only appear once on a specific shift.

Duplicate assignments are prohibited.

---

## Shift Ownership

Employees may only be assigned to shifts within their own organization.

Cross-organization assignments are not permitted.

---

## Assignment Status

Assignments progress through a lifecycle.

Typical flow

```
Assigned

↓

Confirmed

↓

Completed
```

Cancelled assignments remain in history for audit purposes.

---

## Assignment History

Assignments should never be hard deleted after publication.

Historical assignments are required for:

- Attendance
- Reporting
- Audit logs
- Payroll

---

# 11. Audit Fields

| Field | Purpose |
|--------|----------|
| assigned_at | Assignment timestamp |
| assigned_by | Assigning user |
| created_at | Record creation |
| updated_at | Last modification |

`updated_at` is maintained using the shared `trg_set_updated_at()` trigger.

---

# 12. Row-Level Security

RLS is enabled.

Policies ensure

- Organizations only access their own assignments.
- Supervisors manage assignments for their branches.
- Managers can create, update, and cancel assignments.
- Employees may view only their own assignments (where employee self-service is enabled).
- Cross-tenant access is prohibited.
- Service Role bypasses RLS where appropriate.

---

# 13. Performance Considerations

Expected queries

- Load all employees for a shift.
- Load upcoming shifts for an employee.
- Generate daily schedules.
- Attendance lookup.
- Payroll reporting.

Indexes on `shift_id` and `employee_id` support all expected workloads.

---

# 14. Future Expansion

Potential future additions

- Assignment priority
- Shift swap requests
- Replacement employee
- Assignment source (manual/AI)
- Acceptance timestamp
- Decline reason
- Notification status

Deferred until future releases.

---

# 15. Migration Dependencies

Depends on

- TBL-008 Employees
- TBL-009 Shifts
- TBL-003 Users

Required before

- Attendance Records
- Payroll
- Notifications
- Reporting
- Analytics

---

# 16. Implementation Notes

- This is the bridge table connecting employees and shifts.
- Attendance records should reference `shift_assignments.id` rather than directly referencing both `employees` and `shifts`. This guarantees attendance is always tied to a specific assignment and simplifies reporting.
- The `(shift_id, employee_id)` unique constraint prevents duplicate scheduling.
- Assignment history should be retained for auditing, payroll, and workforce analytics.