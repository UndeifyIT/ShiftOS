# ShiftOS Employment History

**Document ID:** EMP-005

**Document Title:** Employment History

**Version:** 1.0.0

**Status:** Approved

**Classification:** Employee Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS stores and manages employee employment history.

Employment History maintains a permanent timeline of important changes throughout an employee's relationship with an organization.

Employment history allows ShiftOS to understand:

- Where an employee worked.
- What position they held.
- What operational role they had.
- Their employment status changes.
- Their workforce journey over time.

---

# 2. Objectives

Employment History exists to:

- Preserve employee career timelines.
- Support workforce reporting.
- Maintain historical accuracy.
- Support operational decision-making.
- Support compliance requirements.
- Enable future workforce analytics.

---

# 3. Employment History Principles

## 3.1 History Must Not Be Overwritten

Current employee information represents the employee's current state.

Historical records preserve previous states.

Example:

Current Employee Profile:

```
Position:
Supervisor

Branch:
Ikeja Branch

Status:
Active
```

Historical Records:

```
Position:

Cashier
    ↓
Supervisor


Branch:

Lagos Branch
    ↓
Ikeja Branch


Status:

Pending
    ↓
Active
```

---

## 3.2 Historical Records Are Immutable

Employment history records should not be edited after creation.

If a correction is required:

- Create a new history event.
- Preserve the previous record.
- Maintain a complete timeline.

---

## 3.3 Employment History Survives Employee Departure

When an employee leaves the organization:

The system must preserve:

- Employee profile.
- Attendance history.
- Scheduling history.
- Task history.
- Employment history.

Employee records must not be deleted because employment ends.

---

# 4. Employment History Model

Employment History records important events in an employee's lifecycle.

Relationship:

```
Organization

    |

Employee

    |

Employment History Events
```

---

# 5. Employment History Events

ShiftOS tracks the following employee events:

| Event Type | Description |
|---|---|
| Employee Created | Employee joined the organization |
| Position Changed | Employee job position changed |
| Branch Changed | Employee moved to another branch |
| Role Changed | Employee operational responsibility changed |
| Status Changed | Employee employment status changed |
| Employment Type Changed | Employee employment arrangement changed |

---

# 6. Employee Creation History

A history record is created when an employee is added.

Example:

```
Employee:

John Doe


Event:

Employee Created


Initial Position:

Cashier


Initial Branch:

Ikeja Branch


Employment Type:

Full-Time


Date:

2026-01-10
```

---

# 7. Position History

Tracks changes to an employee's job position.

Example:

```
Cashier

↓

Senior Cashier

↓

Supervisor
```

Records:

| Field | Description |
|---|---|
| Previous Position | Employee's previous position |
| New Position | Employee's new position |
| Effective Date | Date the change started |
| Changed By | User responsible for change |

---

# 8. Branch Assignment History

Tracks employee movement between branches.

Example:

```
Lagos Branch

↓

Ikeja Branch
```

Records:

| Field | Description |
|---|---|
| Previous Branch | Previous employee branch |
| New Branch | New employee branch |
| Effective Date | Date transfer became active |
| Reason | Reason for transfer |
| Changed By | User who initiated change |

---

# 9. Operational Role History

Tracks changes to employee operational roles.

Examples:

```
Staff

↓

Supervisor
```

Records:

| Field | Description |
|---|---|
| Previous Role | Previous operational role |
| New Role | New operational role |
| Effective Date | Date role changed |
| Approved By | User who approved change |

---

# 10. Employment Status History

Tracks employment lifecycle changes.

Example:

```
Pending

↓

Active

↓

Suspended

↓

Active

↓

Terminated
```

Records:

| Field | Description |
|---|---|
| Previous Status | Previous employment status |
| New Status | New employment status |
| Reason | Reason for status change |
| Changed By | User making change |
| Date | Timestamp of change |

---

# 11. Employment Type History

Tracks changes to employment arrangements.

Examples:

```
Part-Time

↓

Full-Time
```

Records:

| Field | Description |
|---|---|
| Previous Employment Type | Previous employment type |
| New Employment Type | New employment type |
| Effective Date | Date of change |
| Changed By | User responsible |

---

# 12. Employment History Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Employee History | Allow | Allow | Deny | Allow |
| View Own Employment History | Deny | Deny | Future | Allow |
| Create History Record | System | System | Deny | Deny |
| Edit History Record | Deny | Deny | Deny | Deny |
| Delete History Record | Deny | Deny | Deny | Deny |
| Export Employment History | Allow | Allow | Deny | Allow |

---

# 13. Employment History Rules

## Rule 1 — History Is Automatically Generated

Users should not manually create employment history records.

The system creates history entries when approved changes occur.

---

## Rule 2 — History Requires Authorization

Only approved actions should create employment history events.

Examples:

- Branch transfer approval.
- Role change approval.
- Employment status approval.

---

## Rule 3 — History Must Maintain Organization Ownership

Employment history belongs to the employee's organization.

Historical records cannot be transferred between organizations.

---

# 14. Database Considerations

## Employee Table

Stores current employee state:

```
employees

id

organization_id

branch_id

position_id

employment_status

employment_type
```

---

## Employee History Table

Stores historical changes:

```
employee_history

id

employee_id

event_type

previous_value

new_value

effective_date

changed_by

created_at
```

---

Example:

```
employee_history

Employee:
EMP-001


Event:
BRANCH_CHANGED


Previous Value:
Lagos Branch


New Value:
Ikeja Branch


Changed By:
Manager


Date:
2026-07-14
```

---

# 15. Audit Requirements

Employment history changes must also generate audit records.

Audit records must capture:

- User performing action.
- Employee affected.
- Action performed.
- Date and time.
- Previous value.
- New value.

---

# 16. Future Enhancements

Future versions may support:

- Promotion history.
- Training history.
- Certification history.
- Salary history.
- Performance history.
- HR integrations.

---

# 17. Related Specifications

- EMP-001 Employee Profile
- EMP-002 Employment Status
- EMP-003 Branch Assignment
- EMP-004 Positions & Roles
- PER-004 Approval Workflow
- SEC-005 Audit Logging

---

# 18. Summary

Employment History provides a permanent timeline of an employee's relationship with an organization.

The employee profile represents the current state.

Employment History preserves the journey that created that state.

This enables accurate reporting, operational visibility, auditing and future workforce intelligence.