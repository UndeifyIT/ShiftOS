# ShiftOS Open Shifts

**Document ID:** SHIFT-010

**Document Title:** Open Shifts

**Version:** 1.0.0

**Status:** Future

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the future Open Shift capability within ShiftOS.

Open Shifts represent operational shifts that require workforce coverage but do not currently have all required employee assignments.

---

# 2. Feature Status

Open Shifts are a future capability.

They are not required for the MVP.

The MVP scheduling model remains:

```
Supervisor Creates Shift

        ↓

Supervisor Assigns Employees

        ↓

Employees Work Shift
```

---

# 3. Open Shift Definition

An Open Shift is a scheduled shift without a confirmed employee assignment.

Example:

```
Branch:

Ikeja Branch


Date:

Monday


Shift:

Evening Shift


Time:

16:00 - 00:00


Status:

Open
```

---

# 4. Open Shift Use Cases

Examples:

## Staff Shortage

A branch needs additional coverage.

Example:

```
Required:

1 Cashier

Available:

No employee assigned
```

---

## Unexpected Absence

An employee cannot attend.

Example:

```
John unavailable

↓

Open replacement shift created
```

---

## Future Workforce Planning

A supervisor creates upcoming coverage requirements.

---

# 5. Open Shift Principles

## 5.1 Open Shifts Are Not Employee Controlled By Default

The initial design does not allow employees to freely claim shifts.

Reason:

ShiftOS is designed around supervisor-managed operations.

---

## 5.2 Open Shifts Still Belong To The Organization

Every open shift belongs to:

- Organization.
- Branch.
- Scheduling period.

---

## 5.3 Open Shifts Must Eventually Become Assigned

An open shift should move toward:

```
Open

↓

Assigned

↓

Scheduled

↓

Active
```

---

# 6. Open Shift Lifecycle

```
Created

    |

Open

    |

Assigned

    |

Scheduled

    |

Completed


Alternative:

Open

    |

Cancelled
```

---

# 7. Open Shift Information

| Field | Description |
|---|---|
| Branch | Location requiring coverage |
| Date | Expected working date |
| Start Time | Shift start |
| End Time | Shift end |
| Required Role | Needed position |
| Required Staff Count | Number of employees needed |
| Notes | Operational details |
| Created By | User who created shift |

---

# 8. Open Shift Management

## Supervisor

Responsible for:

- Creating open shifts.
- Reviewing coverage gaps.
- Assigning employees.

---

## Manager

Responsible for:

- Oversight.
- Intervention.
- Reviewing staffing shortages.

---

## Staff

Future possibilities:

- View available opportunities.
- Request shifts.

Not included in MVP.

---

## Admin *(Future)*

Can:

- View open shift reports.

Cannot:

- Manage operational staffing.

---

# 9. Open Shift Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Open Shifts | Allow | Allow | Future | Allow |
| Create Open Shift | Allow | Allow | Deny | Deny |
| Edit Open Shift | Allow | Allow | Deny | Deny |
| Assign Employee To Open Shift | Allow | Allow | Deny | Deny |
| Close Open Shift | Allow | Allow | Deny | Deny |
| Claim Open Shift | Deny | Deny | Future | Deny |
| View Open Shift History | Allow | Allow | Deny | Allow |

---

# 10. Open Shift Validation

Before creating an open shift:

System checks:

- Branch exists.
- Date is valid.
- Time is valid.
- Creator has permission.
- Required staffing information exists.

---

# 11. Open Shift Assignment

When assigning employees:

System validates:

- Employee status.
- Branch access.
- Role compatibility.
- Existing conflicts.

Example:

```
Open Shift:

Cashier Required


Employee:

Kitchen Staff


Result:

Not Eligible
```

---

# 12. Notifications

Future notifications may include:

- Supervisor notification.
- Manager staffing alerts.
- Employee opportunity notifications.

---

# 13. Database Considerations

Future table:

```
open_shifts

id

organization_id

branch_id

shift_id

required_role

required_count

status

created_by

created_at
```

---

Assignment:

```
open_shift_assignments

id

open_shift_id

employee_id

assigned_by

assigned_at
```

---

# 14. Reporting

Future reports may include:

- Open shift frequency.
- Staffing shortages.
- Branch coverage problems.
- Time required to fill shifts.

---

# 15. Future Enhancements

Possible future capabilities:

- Employee shift marketplace.
- Shift claiming.
- Approval workflow.
- Automatic replacement suggestions.
- AI staffing recommendations.

---

# 16. Related Specifications

- SHIFT-008 Shift Assignment
- SHIFT-009 Shift Reassignment
- SHIFT-011 Shift Conflicts
- SHIFT-012 Shift Validation Rules
- EMP-004 Positions & Roles

---

# 17. Summary

Open Shifts provide a future mechanism for handling unfilled workforce requirements.

The MVP will continue using supervisor-controlled assignment.

Future versions may introduce employee-facing shift availability features while maintaining organizational control.