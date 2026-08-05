# ShiftOS Shift Definition

**Document ID:** SHIFT-001

**Document Title:** Shift Definition

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the core concept of a Shift within ShiftOS.

A Shift represents a planned period where one or more employees are expected to perform work within an organization.

Shifts are the foundation of:

- Scheduling.
- Attendance tracking.
- Workforce planning.
- Operational reporting.

---

# 2. Shift Definition

A Shift is a planned work assignment containing:

- A start time.
- An end time.
- A branch location.
- Assigned employees.
- Operational expectations.

Example:

```
Branch:

Ikeja Branch


Shift:

Morning Shift


Date:

Monday 14 July 2026


Time:

08:00 - 16:00


Employees:

5 Staff Members
```

---

# 3. Shift Purpose

Shifts allow businesses to:

- Plan workforce coverage.
- Organize daily operations.
- Track attendance against expectations.
- Understand staffing levels.
- Maintain operational visibility.

---

# 4. Shift Components

A shift consists of:

| Component          | Description                        |
| ------------------ | ---------------------------------- |
| Shift ID           | Unique identifier                  |
| Organization       | Business owning the shift          |
| Branch             | Location where shift occurs        |
| Date               | Day shift takes place              |
| Start Time         | Expected beginning time            |
| End Time           | Expected ending time               |
| Assigned Employees | Employees working the shift        |
| Supervisor         | Person responsible for execution   |
| Status             | Current shift lifecycle state      |
| Notes              | Additional operational information |

---

# 5. Shift Relationship Model

```
Organization

      |

Branch

      |

Shift

      |

Employees
```

Example:

```
ABC Supermarket

        |

Ikeja Branch

        |

Morning Shift

        |

Cashiers + Stock Staff
```

---

# 6. Shift Ownership

## Manager

Managers provide:

- Workforce oversight.
- Schedule approval.
- Operational visibility.

Managers do not normally create daily shifts unless configured or taking over supervisor responsibilities.

---

## Supervisor

Supervisors are the primary owners of shift execution.

Supervisors manage:

- Daily shift preparation.
- Employee assignments.
- Shift changes.
- Attendance operations.

---

## Staff

Staff:

- Are assigned to shifts.
- View their expected schedule where access is available.
- Do not create or manage shifts.

---

# 7. Shift Types

ShiftOS supports different operational shift types.

Examples:

| Type      | Example              |
| --------- | -------------------- |
| Morning   | 08:00 - 16:00        |
| Afternoon | 16:00 - 00:00        |
| Night     | 00:00 - 08:00        |
| Custom    | Organization-defined |

---

# 8. Shift Assignment

A shift may contain:

- One employee.
- Multiple employees.

Example:

```
Morning Shift

Supervisor:
John

Employees:

- James
- Sarah
- David
```

---

# 9. Shift Location

Every shift must belong to:

- One organization.
- One branch.

A shift cannot exist without an operational location.

---

# 10. Shift Time Rules

Every shift must contain:

Required:

- Start time.
- End time.

The system must validate:

- End time occurs after start time.
- Duration is within allowed limits.
- Shift belongs to the correct date.

---

# 11. Shift Visibility

| User Role        | Visibility                        |
| ---------------- | --------------------------------- |
| Manager          | Organization-level visibility     |
| Supervisor       | Assigned branch visibility        |
| Staff            | Own assigned shifts only          |
| Admin _(Future)_ | Read-only organization visibility |

---

# 12. Shift Permissions

| Permission                  | Manager | Supervisor |       Staff        | Admin _(Future)_ |
| --------------------------- | :-----: | :--------: | :----------------: | :--------------: |
| View Shift                  |  Allow  |   Allow    | Allow _(Own Only)_ |      Allow       |
| Create Shift                | Request |   Allow    |        Deny        |       Deny       |
| Edit Shift                  |  Allow  |   Allow    |        Deny        |       Deny       |
| Delete Shift                |  Allow  |   Allow    |        Deny        |       Deny       |
| Assign Employees To Shift   | Request |   Allow    |        Deny        |       Deny       |
| Remove Employees From Shift | Request |   Allow    |        Deny        |       Deny       |
| Cancel Shift                |  Allow  |   Allow    |        Deny        |       Deny       |
| View Shift History          |  Allow  |   Allow    |        Deny        |      Allow       |
| Export Shift Reports        |  Allow  |   Allow    |        Deny        |      Allow       |

---

# 13. Shift Data Requirements

A valid shift requires:

```
Organization

+

Branch

+

Date

+

Start Time

+

End Time

+

Supervisor

+

Assigned Employees
```

---

# 14. Shift And Attendance Relationship

A shift represents expected work.

Attendance represents actual employee activity.

Example:

Shift:

```
Employee:

Sarah

Expected:

08:00
```

Attendance:

```
Actual Arrival:

08:15
```

The difference creates attendance information.

---

# 15. Shift And Task Relationship

Tasks may be connected to shifts.

Example:

```
Morning Shift

Tasks:

- Open store
- Stock shelves
- Prepare counter
```

Tasks do not replace shifts.

---

# 16. Database Considerations

Future database model:

```
shifts

id

organization_id

branch_id

supervisor_id

date

start_time

end_time

status

notes

created_by

created_at
```

---

Shift assignments:

```
shift_assignments

id

shift_id

employee_id

assigned_by

created_at
```

---

# 17. Audit Requirements

The following actions require audit records:

- Shift creation.
- Shift editing.
- Employee assignment.
- Shift cancellation.
- Shift reassignment.

Audit records include:

- User.
- Action.
- Shift affected.
- Timestamp.

---

# 18. Future Enhancements

Future versions may support:

- Open shifts.
- Shift bidding.
- Employee availability.
- Automatic scheduling.
- AI-assisted scheduling.
- Shift optimization.

---

# 19. Related Specifications

- SHIFT-002 Shift Lifecycle
- SHIFT-003 Shift States
- SHIFT-004 Shift Templates
- SHIFT-005 Shift Creation
- SHIFT-008 Shift Assignment
- ATT-001 Attendance Model
- TASK-001 Task Model

---

# 20. Summary

A Shift is the fundamental operational unit for workforce scheduling in ShiftOS.

It defines when, where and who is expected to work.

Shifts provide the foundation for attendance, tasks, reporting and workforce visibility.
