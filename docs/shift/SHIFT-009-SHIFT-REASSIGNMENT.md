# ShiftOS Shift Reassignment

**Document ID:** SHIFT-009

**Document Title:** Shift Reassignment

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employee assignments are changed after a shift has already been assigned.

Shift Reassignment allows businesses to handle operational changes such as:

- Employee absence.
- Staffing adjustments.
- Emergency replacements.
- Workforce balancing.

---

# 2. Shift Reassignment Definition

Shift Reassignment is the process of replacing or modifying an employee assignment on an existing shift.

Example:

Before:

```
Morning Shift

08:00 - 16:00

Assigned:

John
Sarah
```

Change:

```
John unavailable
```

After:

```
Morning Shift

08:00 - 16:00

Assigned:

Michael
Sarah
```

---

# 3. Reassignment Principles

## 3.1 Reassignment Does Not Change The Shift

A reassignment changes:

```
Who works
```

Not:

```
When the shift happens
```

Example:

Before:

```
Shift:

Morning Shift

08:00 - 16:00
```

After:

```
Same Shift

Employee Changed
```

---

## 3.2 Previous Assignments Must Remain Recorded

The system must preserve:

- Previous employee.
- Replacement employee.
- Reason.
- Person who changed it.
- Timestamp.

Example:

```
Removed:

John


Added:

Michael


Reason:

Employee absence
```

---

## 3.3 Reassignment Is An Operational Exception

Normal scheduling should happen during initial assignment.

Reassignment exists for changing circumstances.

---

# 4. Common Reassignment Scenarios

| Scenario | Example |
|---|---|
| Employee Absence | Staff member cannot attend |
| Emergency Replacement | Another employee covers shift |
| Skill Requirement | Different employee needed |
| Availability Change | Employee becomes unavailable |
| Operational Adjustment | Workforce balancing |

---

# 5. Reassignment Ownership

## Supervisor

Primary reassignment owner.

Responsible for:

- Finding replacements.
- Updating shift coverage.
- Handling daily changes.

---

## Manager

Can:

- Override reassignment decisions.
- Approve sensitive changes.
- Handle supervisor absence.

---

## Staff

Cannot:

- Replace themselves.
- Assign other employees.
- Modify shift schedules.

---

## Admin *(Future)*

Can:

- View reassignment records.
- Access reports.

Cannot:

- Modify assignments.

---

# 6. Reassignment Workflow

```
Supervisor Opens Shift

        |

Select Assigned Employee

        |

Choose Replace / Remove

        |

Select Replacement Employee

        |

System Validates Replacement

        |

Confirm Change

        |

Update Assignment

        |

Create Audit Record

        |

Notify Relevant Users
```

---

# 7. Reassignment Validation Rules

Before reassignment, ShiftOS checks:

## Employee Eligibility

Replacement employee must:

- Be active.
- Belong to organization.
- Have branch access.
- Be eligible for the role.

---

## Conflict Validation

The system checks:

- Existing shift conflicts.
- Overlapping assignments.
- Availability restrictions.

Example:

```
Cannot Assign:

Sarah


Because:

Already scheduled

10:00 - 18:00
```

---

## Assignment History

The system preserves:

```
Original Assignment

+

Replacement Assignment
```

---

# 8. Reassignment Types

## Replace Employee

Example:

```
Remove:

John


Add:

Michael
```

---

## Remove Employee

Example:

```
Remove:

John

No replacement assigned yet
```

---

## Add Additional Employee

Example:

```
Current:

5 employees


New:

6 employees
```

---

# 9. Reassignment Rules By Shift State

| Shift State | Reassignment Allowed |
|---|:---:|
| Draft | Yes |
| Published | Yes |
| Scheduled | Yes |
| Active | Restricted |
| Completed | No |
| Cancelled | No |
| Archived | No |

---

# 10. Active Shift Reassignment

Active shift reassignment is an exception workflow.

Examples:

- Employee leaves unexpectedly.
- Emergency coverage required.

Requirements:

- Reason required.
- Full audit trail.
- Supervisor action recorded.

Manager intervention may be required depending on organization settings.

---

# 11. Reassignment Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Assignments | Allow | Allow | Own Only | Allow |
| Replace Employee Assignment | Allow | Allow | Deny | Deny |
| Remove Assignment | Allow | Allow | Deny | Deny |
| Add Replacement Employee | Allow | Allow | Deny | Deny |
| Override Conflict Warning | Allow | Request | Deny | Deny |
| View Reassignment History | Allow | Allow | Deny | Allow |

---

# 12. Notifications

Notifications may be sent when:

- Employee is removed.
- Employee is added.
- Shift coverage changes.

Affected users:

- Supervisor.
- Replacement employee.
- Manager where required.

---

# 13. Reassignment And Attendance

Attendance must follow the final assignment state.

Example:

Original:

```
John assigned
```

Changed:

```
Michael assigned
```

Attendance expectation:

```
Michael
```

Historical record:

```
John was originally assigned
```

---

# 14. Database Considerations

Current assignment:

```
shift_assignments

id

shift_id

employee_id

status

assigned_at
```

---

Assignment history:

```
shift_assignment_history

id

shift_id

old_employee_id

new_employee_id

action

reason

changed_by

created_at
```

---

# 15. Audit Requirements

The following require audit records:

- Employee replacement.
- Employee removal.
- Conflict override.
- Manager intervention.

Audit records include:

- Shift.
- Previous employee.
- New employee.
- Reason.
- User.
- Timestamp.

---

# 16. Future Enhancements

Future versions may support:

- Employee shift swap requests.
- Automatic replacement suggestions.
- Availability matching.
- AI staffing recommendations.

---

# 17. Related Specifications

- SHIFT-008 Shift Assignment
- SHIFT-010 Open Shifts
- SHIFT-011 Shift Conflicts
- SHIFT-012 Shift Validation Rules
- ATT-001 Attendance Model
- EMP-003 Branch Assignment

---

# 18. Summary

Shift Reassignment provides controlled changes to workforce coverage after scheduling decisions have been made.

Supervisors handle operational adjustments.

Managers maintain oversight.

Every reassignment remains traceable to protect scheduling accuracy and attendance integrity.