# ShiftOS Shift Assignment

**Document ID:** SHIFT-008

**Document Title:** Shift Assignment

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employees are assigned to shifts within ShiftOS.

Shift Assignment connects employees with operational shifts and determines who is expected to work during a specific period.

---

# 2. Shift Assignment Definition

Shift Assignment is the relationship between:

```
Employee

+

Shift

=

Expected Work Assignment
```

Example:

```
Shift:

Morning Shift

Date:

Monday 14 July

Time:

08:00 - 16:00


Assigned Employees:

- John
- Sarah
- Michael
```

---

# 3. Shift Assignment Principles

## 3.1 Assignment Creates Expected Attendance

An assigned employee is expected to attend the shift.

Example:

```
Assigned:

John

Expected:

08:00 Arrival
```

Attendance records are later compared against this expectation.

---

## 3.2 Assignment Does Not Mean Actual Attendance

Assignment only represents planned work.

Example:

```
Assignment:

John scheduled


Actual:

John arrived 08:15
```

Attendance captures what actually happened.

---

## 3.3 Assignment History Must Be Preserved

Assignments should not be silently replaced.

Example:

```
Before:

John assigned


After:

Peter assigned
```

The system records:

```
John removed

Peter added

Changed by Supervisor

Time recorded
```

---

# 4. Assignment Ownership

## Supervisor

Primary assignment owner.

Responsible for:

- Selecting employees.
- Balancing workforce coverage.
- Preparing branch operations.

---

## Manager

Provides oversight.

Can:

- Review assignments.
- Override assignments.
- Correct operational issues.

---

## Staff

Cannot:

- Assign themselves.
- Assign others.
- Modify shift assignments.

---

## Admin *(Future)*

Can:

- View assignment information.
- Access reports.

Cannot:

- Assign employees.

---

# 5. Assignment Requirements

Before assigning an employee:

The system validates:

| Requirement | Description |
|---|---|
| Active Employee | Employee must be active |
| Correct Organization | Employee belongs to organization |
| Valid Branch | Employee can work at branch |
| Compatible Role | Employee role supports shift requirements |
| No Conflict | Employee is not already assigned elsewhere |

---

# 6. Assignment Workflow

```
Supervisor Opens Shift

        |

Select Employees

        |

System Validates Employees

        |

Confirm Assignment

        |

Assignment Saved

        |

Notifications Generated

        |

Audit Record Created
```

---

# 7. Assignment Methods

## Individual Assignment

Assign employees one by one.

Example:

```
Morning Shift

Add:

John

Sarah

Michael
```

---

## Multiple Assignment

Assign several employees at once.

Example:

```
Select:

5 Cashiers

Assign To:

Morning Shift
```

---

# 8. Assignment Rules

## Employee Status

Only eligible employees may be assigned.

Allowed:

```
Active
```

Not allowed:

```
Pending

Suspended

Terminated

Archived
```

---

## Branch Rules

Employees should normally belong to the same branch.

Cross-branch assignment requires:

- Permission.
- Organization support.
- Audit record.

---

## Overlapping Shift Rules

The system should prevent:

```
Employee:

John


Shift 1:

08:00 - 16:00


AND


Shift 2:

10:00 - 18:00
```

unless explicitly allowed.

---

# 9. Assignment Changes

Assignment changes include:

- Adding employees.
- Removing employees.
- Replacing employees.

All changes require:

- Validation.
- Audit logging.
- Notification where required.

---

# 10. Assignment Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Shift Assignments | Allow | Allow | Own Only | Allow |
| Assign Employee To Shift | Allow | Allow | Deny | Deny |
| Remove Employee From Shift | Allow | Allow | Deny | Deny |
| View Assignment History | Allow | Allow | Deny | Allow |
| Bulk Assign Employees | Allow | Allow | Deny | Deny |
| Override Assignment Conflict | Allow | Request | Deny | Deny |

---

# 11. Assignment Notifications

Employees may be notified when:

- Assigned to a shift.
- Removed from a shift.
- Shift details change.

Notification methods may include:

- Push notifications.
- Email.
- SMS.

---

# 12. Assignment And Attendance

Assignments create the attendance expectation.

Example:

```
Shift Assignment:

Sarah

Expected:

08:00


Attendance:

Actual:

08:20
```

---

# 13. Assignment And Tasks

Tasks may be connected to shifts.

However:

- Task assignment does not replace shift assignment.
- Employees are assigned to shifts first.
- Operational work is managed by supervisors.

---

# 14. Database Considerations

Shift assignment table:

```
shift_assignments

id

shift_id

employee_id

assigned_by

assigned_at

status
```

---

Assignment history:

```
shift_assignment_history

id

shift_id

employee_id

action

changed_by

reason

created_at
```

---

# 15. Audit Requirements

The following require audit records:

- Employee added to shift.
- Employee removed from shift.
- Assignment conflict override.
- Manager intervention.

Audit records include:

- User.
- Employee.
- Shift.
- Action.
- Timestamp.

---

# 16. Future Enhancements

Future versions may support:

- Employee availability matching.
- Automatic staffing recommendations.
- Shift bidding.
- Employee preferences.
- AI-assisted workforce allocation.

---

# 17. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing
- SHIFT-009 Shift Reassignment
- SHIFT-011 Shift Conflicts
- ATT-001 Attendance Model
- EMP-003 Branch Assignment

---

# 18. Summary

Shift Assignment defines who is expected to work a specific shift.

Supervisors manage workforce allocation.

Managers provide oversight.

Employees execute assigned work but do not control scheduling decisions.

Assignments provide the foundation for attendance accuracy and workforce reporting.