# ShiftOS Shift Conflicts

**Document ID:** SHIFT-011

**Document Title:** Shift Conflicts

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS detects and manages scheduling conflicts.

Shift conflicts identify situations where a shift, assignment, or scheduling decision may create operational problems.

---

# 2. Conflict Principles

## 2.1 Conflicts Are Guidance

A conflict does not always mean an action is impossible.

Example:

```
Warning:

Employee has another scheduled shift nearby
```

The supervisor may review and decide.

---

## 2.2 Critical Conflicts Must Prevent Errors

Some conflicts create unacceptable operational issues.

Example:

```
Employee assigned to two active shifts
```

The system should prevent this unless overridden by authorized users.

---

## 2.3 Conflicts Must Be Visible

Conflicts should appear during:

- Shift creation.
- Shift editing.
- Employee assignment.
- Employee reassignment.

---

# 3. Conflict Categories

ShiftOS supports the following conflict types:

| Conflict Type | Description |
|---|---|
| Employee Overlap | Employee assigned to overlapping shifts |
| Supervisor Overlap | Supervisor responsible for conflicting shifts |
| Branch Coverage | Insufficient staffing coverage |
| Role Conflict | Employee role does not match requirement |
| Availability Conflict | Employee unavailable |
| Time Conflict | Invalid shift timing |
| Assignment Conflict | Duplicate or invalid assignment |

---

# 4. Employee Shift Overlap

## Description

Occurs when an employee is assigned to multiple shifts that overlap.

Example:

```
Employee:

John


Shift A:

08:00 - 16:00


Shift B:

12:00 - 20:00


Conflict:

Overlap detected
```

---

## System Behaviour

The system should:

- Warn user.
- Display conflicting shifts.
- Prevent confirmation when impossible.

---

# 5. Supervisor Conflict

## Description

Occurs when a supervisor is assigned responsibility for overlapping shifts.

Example:

```
Supervisor:

Sarah


Branch A:

08:00 - 16:00


Branch B:

09:00 - 17:00
```

---

## Resolution

Options:

- Assign another supervisor.
- Adjust shift.
- Manager override.

---

# 6. Branch Coverage Conflict

## Description

Occurs when staffing requirements are not met.

Example:

```
Required:

5 Employees


Assigned:

3 Employees
```

---

## Behaviour

The system should:

- Highlight coverage shortage.
- Allow supervisor decision.
- Include in workforce reports.

---

# 7. Role Compatibility Conflict

## Description

Occurs when an employee does not match shift requirements.

Example:

```
Required:

Cashier


Assigned:

Kitchen Employee
```

---

## Resolution

Supervisor may:

- Select appropriate employee.
- Override if organization rules allow.

---

# 8. Availability Conflict

## Description

Occurs when an employee should not be assigned due to availability restrictions.

Examples:

- Employee unavailable.
- Employee inactive.
- Employee on leave.

---

# 9. Time Conflicts

The system validates:

- End time after start time.
- Valid duration.
- Overnight shift handling.

Example:

Valid:

```
22:00 - 06:00
```

if overnight shifts are supported.

---

# 10. Conflict Severity Levels

| Level | Meaning |
|---|---|
| Information | Awareness only |
| Warning | Review recommended |
| Critical | Action required |

---

# 11. Conflict Resolution Workflow

```
Conflict Detected

        |

System Displays Issue

        |

Supervisor Reviews

        |

Choose Action

        |

Resolve / Override

        |

Record Decision

        |

Continue Workflow
```

---

# 12. Conflict Resolution Options

Users may:

## Modify Shift

Example:

```
Change:

08:00

To:

09:00
```

---

## Change Assignment

Example:

```
Replace:

John

With:

Michael
```

---

## Accept Warning

Used when the conflict is intentional.

---

## Request Approval

Used when manager involvement is required.

---

# 13. Conflict Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Conflicts | Allow | Allow | Deny | Allow |
| Resolve Conflicts | Allow | Allow | Deny | Deny |
| Override Conflict Warning | Allow | Request | Deny | Deny |
| Override Critical Conflict | Allow | Request | Deny | Deny |
| View Conflict History | Allow | Allow | Deny | Allow |
| Export Conflict Reports | Allow | Allow | Deny | Allow |

---

# 14. Conflict Audit Requirements

The system must record:

- Conflict type.
- Related shift.
- Related employee.
- User who resolved it.
- Resolution chosen.
- Timestamp.

---

# 15. Database Considerations

Conflict records:

```
shift_conflicts

id

organization_id

shift_id

employee_id

conflict_type

severity

status

resolved_by

resolved_at

created_at
```

---

Conflict history:

```
shift_conflict_history

id

conflict_id

action

performed_by

created_at
```

---

# 16. Reporting

Future reports may include:

- Most common conflicts.
- Branch scheduling problems.
- Supervisor resolution activity.
- Workforce planning issues.

---

# 17. Future Enhancements

Future capabilities:

- Automatic conflict resolution suggestions.
- AI scheduling recommendations.
- Employee availability prediction.
- Staffing optimization.

---

# 18. Related Specifications

- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing
- SHIFT-008 Shift Assignment
- SHIFT-009 Shift Reassignment
- SHIFT-012 Shift Validation Rules
- EMP-003 Branch Assignment
- EMP-004 Positions & Roles

---

# 19. Summary

Shift Conflicts help ShiftOS prevent scheduling problems before they affect operations.

The system identifies risks, provides guidance, and allows authorized users to resolve exceptions.

Supervisors handle daily conflict management while managers maintain oversight for critical decisions.