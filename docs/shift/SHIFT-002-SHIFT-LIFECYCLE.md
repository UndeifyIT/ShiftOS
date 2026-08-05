# ShiftOS Shift Lifecycle

**Document ID:** SHIFT-002

**Document Title:** Shift Lifecycle

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the lifecycle of a Shift within ShiftOS.

The Shift Lifecycle describes the complete journey of a shift from initial creation through completion, cancellation, or archival.

The lifecycle ensures shifts remain:

- Operationally accurate.
- Traceable.
- Auditable.
- Available for reporting.

---

# 2. Shift Lifecycle Principles

## 2.1 Shifts Are Historical Records

Completed and cancelled shifts must not be deleted.

They remain available for:

- Attendance comparison.
- Workforce reporting.
- Operational analysis.
- Audit history.

---

## 2.2 Shift Changes Must Be Traceable

Changes to shifts must record:

- What changed.
- Who changed it.
- When it changed.
- Previous value.
- New value.

---

## 2.3 Shift Ownership

Supervisors own the operational lifecycle.

Managers provide:

- Oversight.
- Approval where required.
- Intervention when necessary.

---

# 3. Shift Lifecycle Overview

A shift moves through the following lifecycle:

```
Draft

   |

Published

   |

Scheduled

   |

Active

   |

Completed


Alternative Paths:


Draft

   |

Cancelled


Published

   |

Cancelled


Scheduled

   |

Cancelled
```

---

# 4. Lifecycle Stages

---

# 4.1 Draft

The shift has been created but is not yet visible as an active operational commitment.

Characteristics:

- Details can be edited.
- Employees may be assigned.
- Validation is performed.

Example:

```
Morning Shift

Date:
Monday

Time:
08:00 - 16:00

Status:
Draft
```

---

# 4.2 Published

The shift has been finalized and made available operationally.

Characteristics:

- Employees are assigned.
- Shift details are visible.
- Notifications may be sent.

After publishing:

- Changes require proper tracking.
- Employees should not receive silent changes.

---

# 4.3 Scheduled

The shift is confirmed as part of the workforce plan.

Characteristics:

- Appears in schedules.
- Used for attendance preparation.
- Included in operational planning.

---

# 4.4 Active

The shift is currently taking place.

Characteristics:

- Attendance monitoring occurs.
- Supervisor manages operations.
- Tasks may be executed.

Example:

```
08:00

Shift Starts

↓

Attendance Tracking

↓

Operations Running
```

---

# 4.5 Completed

The shift has ended.

Characteristics:

- Attendance records are finalized.
- Task records remain available.
- Shift becomes historical.

Completed shifts cannot be normally edited.

---

# 4.6 Cancelled

The shift will no longer occur.

Possible reasons:

- Business closure.
- Staffing changes.
- Operational changes.

Cancelled shifts remain stored.

---

# 4.7 Archived

Historical shifts may eventually be archived.

Archived shifts:

- Cannot be edited.
- Remain available for reporting.
- Reduce active operational data.

---

# 5. Lifecycle Transition Rules

| Current State | Allowed Next State |
|---|---|
| Draft | Published |
| Draft | Cancelled |
| Published | Scheduled |
| Published | Cancelled |
| Scheduled | Active |
| Scheduled | Cancelled |
| Active | Completed |
| Completed | Archived |
| Cancelled | Archived |

---

# 6. Invalid Transitions

The following transitions are not allowed:

```
Completed

↓

Active
```

```
Cancelled

↓

Published
```

```
Archived

↓

Any State
```

---

# 7. Lifecycle Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Shift Lifecycle | Allow | Allow | Own Only | Allow |
| Create Draft Shift | Request | Allow | Deny | Deny |
| Publish Shift | Allow | Allow | Deny | Deny |
| Start Shift | Request | Allow | Deny | Deny |
| Complete Shift | Request | Allow | Deny | Deny |
| Cancel Shift | Allow | Allow | Deny | Deny |
| Archive Shift | Allow | Deny | Deny | Allow |
| View Lifecycle History | Allow | Allow | Deny | Allow |

---

# 8. Shift Lifecycle And Attendance

The lifecycle controls attendance availability.

Example:

```
Draft

Attendance:
Unavailable


Active

Attendance:
Available


Completed

Attendance:
Finalized
```

---

# 9. Shift Lifecycle And Tasks

Tasks follow the shift lifecycle.

Example:

```
Active Shift

↓

Tasks Available


Completed Shift

↓

Tasks Closed
```

Task history remains preserved.

---

# 10. Shift Editing Rules

## Before Publishing

Supervisors may:

- Edit time.
- Edit employees.
- Edit notes.
- Edit assignments.

---

## After Publishing

Changes must:

- Generate audit records.
- Notify affected users where required.
- Preserve previous values.

---

## After Completion

Normal editing is disabled.

Corrections require controlled workflows.

---

# 11. Emergency Takeover

If a supervisor fails to manage an active shift:

The manager may temporarily take operational responsibility.

Example:

```
Supervisor Not Started Shift

        ↓

Manager Takes Over

        ↓

Manager Gains Temporary Shift Control
```

This action must:

- Be recorded.
- Include reason.
- Generate an audit event.

---

# 12. Database Considerations

Shift table:

```
shifts

id

organization_id

branch_id

status

date

start_time

end_time

created_by

created_at
```

---

Shift lifecycle history:

```
shift_lifecycle_history

id

shift_id

previous_state

new_state

changed_by

reason

created_at
```

---

# 13. Audit Requirements

The following require audit records:

- Shift creation.
- Publishing.
- Cancellation.
- Starting.
- Completing.
- Manager takeover.
- Status changes.

---

# 14. Future Enhancements

Future versions may support:

- Automated shift activation.
- Automatic reminders.
- Shift recovery workflows.
- AI scheduling adjustments.
- Employee acknowledgement.

---

# 15. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-003 Shift States
- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing
- SHIFT-007 Shift Cancellation
- ATT-001 Attendance Model
- TASK-001 Task Model

---

# 16. Summary

The Shift Lifecycle defines how shifts move from planning to execution and historical completion.

A shift is never simply deleted.

Every transition is controlled, traceable and connected to operational workflows.