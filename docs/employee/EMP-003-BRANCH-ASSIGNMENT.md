# ShiftOS Branch Assignment

**Document ID:** EMP-003

**Document Title:** Branch Assignment

**Version:** 1.0.0

**Status:** Approved

**Classification:** Employee Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employees are assigned to branches within ShiftOS.

Branch Assignment determines the operational location where an employee works.

Branch Assignment supports:

- Workforce management.
- Scheduling.
- Attendance.
- Task operations.
- Reporting.
- Branch-level access control.

---

# 2. Objectives

Branch Assignment exists to:

- Identify employee operating location.
- Support branch-based workflows.
- Maintain workforce ownership.
- Enable accurate reporting.
- Preserve employee movement history.

---

# 3. Branch Assignment Model

Every active employee must belong to:

- One organization.
- One primary branch.

Example:

```
Organization

    |
    |
    ├── Lagos Branch
    │       |
    │       └── Employees
    |
    |
    ├── Ikeja Branch
    │       |
    │       └── Employees
    |
    |
    └── Abuja Branch
            |
            └── Employees
```

---

# 4. Primary Branch Assignment

Each employee has one primary branch.

The primary branch represents:

- Main working location.
- Default scheduling location.
- Attendance location.
- Operational ownership.

---

# 5. Branch Assignment Rules

## Rule 1 — Employee Must Have A Branch

An operational employee cannot exist without a branch assignment.

Employees without branches cannot:

- Receive schedules.
- Be assigned tasks.
- Have attendance recorded.

---

## Rule 2 — Branch Must Belong To Same Organization

An employee can only be assigned to branches belonging to the employee's organization.

Invalid:

```
Employee:
Organization A

Assigned Branch:
Organization B
```

---

## Rule 3 — Branch Changes Must Be Historical

When an employee changes branches:

The system must record:

- Previous branch.
- New branch.
- Effective date.
- Reason.
- Person who made the change.

---

## Rule 4 — Branch Assignment Does Not Change Role

Changing an employee's branch does not automatically change:

- Position.
- Permissions.
- Employment status.

---

# 6. Branch Assignment Scenarios

## New Employee

Example:

```
Employee Created

        ↓

Assigned:
Ikeja Branch

        ↓

Can be scheduled
```

---

## Employee Transfer

Example:

```
Current:

Lagos Branch

        ↓

Transfer

        ↓

New:

Ikeja Branch
```

The old assignment remains in history.

---

## Temporary Work At Another Branch

Temporary branch work should not immediately change the employee's primary branch.

Example:

A Lagos employee helps another branch for one week.

The system should record:

- Temporary assignment.
- Date range.
- Reason.

---

# 7. Branch Assignment Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Employee Branch | Allow | Allow | Deny | Allow |
| Assign Employee Branch | Allow | Request | Deny | Deny |
| Change Employee Branch | Allow | Request | Deny | Deny |
| Request Branch Transfer | Deny | Allow | Deny | Deny |
| Approve Branch Transfer | Allow | Deny | Deny | Deny |
| View Branch Assignment History | Allow | Allow | Deny | Allow |

---

# 8. Supervisor Branch Rules

Supervisors:

- Belong to one assigned branch.
- Manage employees within their branch.
- Cannot move employees between branches directly.

A Supervisor requesting a transfer requires Manager approval.

---

# 9. Manager Branch Rules

Managers may:

- View employees across organization branches.
- Assign employees to branches.
- Approve branch transfers.
- Manage branch workforce distribution.

Managers cannot access branches outside their organization.

---

# 10. Branch Assignment And Scheduling

Scheduling uses branch assignment as the default source.

Example:

Employee:

```
Primary Branch:
Ikeja Branch
```

Default scheduling:

```
Ikeja Branch Schedule
```

Exceptions must be explicitly recorded.

---

# 11. Branch Assignment And Attendance

Attendance records should reference the branch where attendance occurred.

Example:

Employee:

```
Primary Branch:
Lagos Branch
```

Attendance:

```
Worked At:
Ikeja Branch
```

The attendance record should preserve the actual working location.

---

# 12. Database Considerations

Current employee assignment:

```
employees

id
organization_id
branch_id
```

Historical assignment:

```
employee_branch_history

id
employee_id
previous_branch_id
new_branch_id
changed_by
effective_date
reason
```

---

# 13. Audit Requirements

The following actions require audit records:

- Employee branch assignment.
- Branch transfer.
- Transfer approval.
- Temporary branch assignment.

Audit records should include:

- User performing action.
- Employee affected.
- Previous branch.
- New branch.
- Timestamp.

---

# 14. Future Enhancements

Future versions may support:

- Multiple branch assignments.
- Employee mobility.
- Cross-branch scheduling.
- Regional management.
- Branch transfer workflows.

---

# 15. Related Specifications

- EMP-001 Employee Profile
- EMP-005 Employment History
- ORG-004 Branch Structure
- PER-007 Branch Isolation
- SCH-001 Scheduling Model
- ATT-001 Attendance Model

---

# 16. Summary

Branch Assignment defines where employees operate within a ShiftOS organization.

Employees have one primary branch assignment during normal operations.

All branch changes are tracked historically to maintain accurate workforce records and reporting.