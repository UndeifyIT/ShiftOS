# ShiftOS Shift Cancellation

**Document ID:** SHIFT-007

**Document Title:** Shift Cancellation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the process for cancelling shifts within ShiftOS.

Shift Cancellation allows authorized users to remove a planned shift from operational execution while preserving historical records.

---

# 2. Shift Cancellation Principles

## 2.1 Cancellation Is Not Deletion

Cancelled shifts must remain stored.

Example:

```
Original:

Morning Shift

Monday

08:00 - 16:00


Result:

Cancelled
```

The system preserves:

- Shift details.
- Previous assignments.
- Cancellation reason.
- User responsible.
- Timestamp.

---

## 2.2 Cancellation Must Be Intentional

A cancellation requires:

- User confirmation.
- Cancellation reason.
- Audit record.

---

## 2.3 Cancelled Shifts Cannot Resume

Once cancelled:

```
Cancelled

X

Active
```

A new shift must be created if operational needs change.

---

# 3. Reasons For Cancellation

Common reasons include:

| Reason | Example |
|---|---|
| Branch Closure | Location unavailable |
| Staffing Issue | Insufficient workers |
| Schedule Correction | Wrong shift created |
| Operational Change | Business requirement changed |
| Emergency | Unexpected event |

---

# 4. Who Can Cancel Shifts

## Supervisor

Primary operational user.

Can cancel shifts when:

- Plans change.
- Branch operations require adjustment.
- Errors are identified.

---

## Manager

Can:

- Cancel any shift.
- Override supervisor decisions.
- Cancel for business reasons.

---

## Staff

Cannot:

- Cancel shifts.
- Modify schedules.

---

## Admin *(Future)*

Can:

- View cancelled shifts.
- Access reports.

Cannot:

- Cancel operational shifts.

---

# 5. Cancellation Workflow

```
User Opens Shift

        |

Select Cancel Shift

        |

System Checks Permission

        |

User Provides Reason

        |

System Validates Shift State

        |

Shift Status Changes To Cancelled

        |

Notifications Sent

        |

Audit Record Created
```

---

# 6. Cancellation Rules By Shift State

| Shift State | Can Cancel |
|---|:---:|
| Draft | Yes |
| Published | Yes |
| Scheduled | Yes |
| Active | Restricted |
| Completed | No |
| Archived | No |

---

# 7. Cancelling Active Shifts

Active shift cancellation is an exceptional workflow.

Examples:

- Emergency branch closure.
- Safety issue.
- Major operational disruption.

Requirements:

- Manager approval or override.
- Cancellation reason required.
- Full audit record.

---

# 8. Effects Of Cancellation

When a shift is cancelled:

## Scheduling

The shift is removed from active schedules.

---

## Attendance

Attendance cannot be created after cancellation.

Existing attendance records remain.

---

## Tasks

Tasks linked to the shift become unavailable for execution.

Task history remains preserved.

---

## Notifications

Affected users may receive:

- Cancellation notice.
- Reason where appropriate.
- Updated schedule information.

---

# 9. Cancellation Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Cancelled Shifts | Allow | Allow | Own History Only | Allow |
| Cancel Draft Shift | Allow | Allow | Deny | Deny |
| Cancel Published Shift | Allow | Allow | Deny | Deny |
| Cancel Scheduled Shift | Allow | Allow | Deny | Deny |
| Cancel Active Shift | Allow | Request | Deny | Deny |
| Restore Cancelled Shift | Deny | Deny | Deny | Deny |
| Create Replacement Shift | Allow | Allow | Deny | Deny |
| View Cancellation History | Allow | Allow | Deny | Allow |

---

# 10. Replacement Shifts

Cancelled shifts are not restored.

If a replacement is needed:

```
Cancelled Shift

        |

Create New Shift

        |

New Operational Record
```

This preserves accurate history.

---

# 11. Cancellation Validation Rules

Before cancellation, ShiftOS checks:

- User has permission.
- Shift belongs to user's organization.
- Shift is not completed.
- Reason is provided.
- Required approval exists.

---

# 12. Database Considerations

Shift table:

```
shifts

id

status

cancelled_at

cancelled_by

cancellation_reason
```

---

Cancellation history:

```
shift_cancellation_history

id

shift_id

reason

cancelled_by

created_at
```

---

# 13. Audit Requirements

Cancellation events must record:

- Shift affected.
- Previous state.
- New state.
- User responsible.
- Reason.
- Timestamp.

---

# 14. Reporting Impact

Cancelled shifts should support reporting such as:

- Number of cancelled shifts.
- Cancellation reasons.
- Branch cancellation patterns.
- Supervisor cancellation activity.

---

# 15. Future Enhancements

Future versions may support:

- Cancellation approval workflows.
- Automatic employee replacement suggestions.
- Cancellation impact analysis.
- Emergency broadcast notifications.

---

# 16. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-002 Shift Lifecycle
- SHIFT-003 Shift States
- SHIFT-006 Shift Editing
- SHIFT-008 Shift Assignment
- SHIFT-011 Shift Conflicts
- ATT-001 Attendance Model
- TASK-001 Task Model

---

# 17. Summary

Shift Cancellation removes a planned shift from operational execution without destroying history.

Cancelled shifts remain available for reporting, auditing and operational analysis.

The process protects scheduling accuracy while allowing businesses to adapt to changing conditions.