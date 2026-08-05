# ShiftOS Employee Lifecycle

**Document ID:** EMP-007

**Document Title:** Employee Lifecycle

**Version:** 1.0.0

**Status:** Approved

**Classification:** Employee Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the complete employee lifecycle within ShiftOS.

The Employee Lifecycle describes the journey of an employee from creation through employment completion.

The lifecycle ensures employee records remain accurate, auditable and operationally useful throughout the employee relationship.

---

# 2. Objectives

Employee Lifecycle exists to:

- Standardize employee management.
- Maintain accurate workforce records.
- Support operational workflows.
- Preserve employee history.
- Separate workforce data from account access.

---

# 3. Employee Lifecycle Principles

## 3.1 Employee Records Are Persistent

Employee records should not be deleted when employment ends.

Historical information must remain available for:

- Reporting.
- Attendance history.
- Scheduling history.
- Task history.
- Compliance needs.

---

## 3.2 Employee Lifecycle Is Separate From User Lifecycle

An employee may exist without a ShiftOS account.

Example:

```
Employee:

John Doe

Employment Status:

Active

User Account:

No Account
```

The employee can still be managed operationally.

---

## 3.3 Lifecycle Changes Must Be Audited

Every major lifecycle event must record:

- Previous state.
- New state.
- User responsible.
- Date and time.
- Reason.

---

# 4. Employee Lifecycle Stages

The employee lifecycle consists of:

```
Created

   |

Pending

   |

Active

   |

Operational Changes

   |

Leave / Suspension

   |

Terminated

   |

Archived
```

---

# 5. Stage Definitions

---

# 5.1 Employee Created

The employee record has been created.

At this stage:

- Basic profile exists.
- Organization relationship exists.
- Employment details may be incomplete.

Example:

```
Employee:

John Doe

Status:

Pending
```

---

# 5.2 Pending

The employee has been added but is not yet active.

Possible reasons:

- Waiting for start date.
- Onboarding incomplete.
- Information incomplete.

Restrictions:

- Cannot be scheduled.
- Cannot receive tasks.
- Cannot participate in attendance.

---

# 5.3 Active

The employee is currently working for the organization.

Active employees may:

- Be scheduled.
- Receive operational tasks.
- Have attendance recorded.
- Appear in workforce reports.

---

# 5.4 Operational Changes

During employment, employees may experience changes.

Examples:

```
Branch:

Lagos Branch

↓

Ikeja Branch
```

```
Position:

Cashier

↓

Supervisor
```

```
Role:

Staff

↓

Supervisor
```

All changes create employment history records.

---

# 5.5 On Leave

The employee remains employed but temporarily unavailable.

Examples:

- Approved leave.
- Extended absence.

Restrictions:

- Cannot receive new schedules.
- Cannot receive new tasks.

---

# 5.6 Suspended

The employee remains part of the organization but is temporarily restricted.

Examples:

- Investigation.
- Temporary removal from duties.

Restrictions:

- Cannot participate in normal operations.
- Cannot be scheduled.

---

# 5.7 Terminated

The employment relationship has ended.

Examples:

- Resignation.
- Contract completion.
- Organization termination.

Effects:

- Removed from active workforce.
- Cannot receive schedules.
- Cannot receive tasks.

Historical data remains available.

---

# 5.8 Archived

The employee record is retained for historical purposes.

Archived employees:

- Cannot participate in operations.
- Cannot be assigned.
- Remain available for historical reporting.

---

# 6. Lifecycle Transition Rules

| Current Status | Allowed Next Status |
|---|---|
| Created | Pending |
| Pending | Active |
| Active | On Leave |
| Active | Suspended |
| Active | Terminated |
| On Leave | Active |
| Suspended | Active |
| Suspended | Terminated |
| Terminated | Archived |

---

# 7. Lifecycle Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Employee Lifecycle | Allow | Allow | Deny | Allow |
| Create Employee Record | Allow | Allow | Deny | Deny |
| Activate Employee | Allow | Request | Deny | Deny |
| Place Employee On Leave | Allow | Request | Deny | Deny |
| Suspend Employee | Allow | Request | Deny | Deny |
| Terminate Employee | Allow | Request | Deny | Deny |
| Archive Employee | Allow | Deny | Deny | Deny |
| View Lifecycle History | Allow | Allow | Deny | Allow |

---

# 8. Lifecycle Approval Rules

The following actions require Manager approval:

| Action | Approval |
|---|---|
| Activate Employee | Manager |
| Suspend Employee | Manager |
| Terminate Employee | Manager |
| Restore Suspended Employee | Manager |
| Archive Employee | Manager |

Supervisors may initiate requests but cannot complete restricted lifecycle changes without approval.

---

# 9. Lifecycle And Operations

## Scheduling

Only eligible employees may receive schedules.

Eligible:

```
Active
```

Not eligible:

```
Pending

On Leave

Suspended

Terminated

Archived
```

---

## Attendance

Attendance may only be recorded for operational employees.

Historical attendance remains available after termination.

---

## Tasks

Only active employees may participate in operational tasks.

Completed task history remains preserved.

---

# 10. Database Considerations

Employee current state:

```
employees

id

organization_id

branch_id

position_id

employment_status

employment_type

created_at
```

---

Lifecycle events:

```
employee_lifecycle_history

id

employee_id

event_type

previous_state

new_state

reason

changed_by

created_at
```

---

# 11. Audit Requirements

The following actions require audit records:

- Employee creation.
- Activation.
- Suspension.
- Leave changes.
- Termination.
- Archive actions.

Audit records include:

- Actor.
- Employee.
- Action.
- Timestamp.
- Reason.

---

# 12. Future Enhancements

Future versions may support:

- Automated onboarding workflows.
- Probation periods.
- Contract expiration.
- Employee self-service.
- HR integrations.
- Exit workflows.

---

# 13. Related Specifications

- EMP-001 Employee Profile
- EMP-002 Employment Status
- EMP-003 Branch Assignment
- EMP-004 Positions & Roles
- EMP-005 Employment History
- USR-001 User Lifecycle
- PER-004 Approval Workflow

---

# 14. Summary

Employee Lifecycle defines the complete journey of an employee inside ShiftOS.

The employee record represents the person's relationship with the organization.

Lifecycle management ensures workforce data remains accurate, secure and historically complete.

Employee records are preserved beyond employment to support reporting, auditability and future workforce intelligence.