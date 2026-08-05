# ShiftOS Shift States

**Document ID:** SHIFT-003

**Document Title:** Shift States

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the states available for shifts within ShiftOS.

Shift states represent the current condition of a shift and determine what actions are allowed.

---

# 2. Shift State Principles

## 2.1 One Active State At A Time

A shift can only have one current state.

Example:

```
Shift:

Morning Shift

Current State:

Active
```

---

## 2.2 State Changes Must Be Controlled

Shift state changes must:

- Follow lifecycle rules.
- Respect permissions.
- Generate audit records.

---

## 2.3 State History Must Be Preserved

Previous states must remain available.

Example:

```
Draft

↓

Published

↓

Active

↓

Completed
```

The system stores this transition history.

---

# 3. Shift State Overview

ShiftOS supports the following shift states:

| State | Purpose |
|---|---|
| Draft | Shift is being prepared |
| Published | Shift has been released operationally |
| Scheduled | Shift is confirmed in workforce planning |
| Active | Shift is currently running |
| Completed | Shift has finished |
| Cancelled | Shift will not occur |
| Archived | Historical storage state |

---

# 4. State Definitions

---

# 4.1 Draft

## Description

A shift that has been created but is not yet finalized.

Draft shifts are still being prepared.

---

## Allowed Actions

Users may:

- Edit shift details.
- Assign employees.
- Change times.
- Validate conflicts.
- Publish shift.

---

## Restrictions

Draft shifts:

- Do not appear as active schedules.
- Do not trigger attendance.
- Do not count toward operational reporting.

---

Example:

```
Morning Shift

Date:
Monday

Time:
08:00 - 16:00

State:
Draft
```

---

# 4.2 Published

## Description

A shift that has been finalized and made available to users.

---

## Allowed Actions

Users may:

- View shift details.
- Review assignments.
- Prepare operations.

---

## Restrictions

Published shifts:

- Require tracked changes.
- Should not silently change.
- May trigger notifications.

---

Example:

```
Morning Shift

State:
Published

Employees:
Assigned
```

---

# 4.3 Scheduled

## Description

A confirmed shift that is part of the official workforce schedule.

---

## Allowed Actions

Users may:

- View schedule placement.
- Prepare attendance.

---

## Restrictions

Scheduled shifts:

- Cannot be removed without proper workflow.
- Must maintain assignment history.

---

# 4.4 Active

## Description

The shift is currently taking place.

This is the operational execution state.

---

## Allowed Actions

Supervisors may:

- Manage attendance.
- Monitor staff presence.
- Manage operational tasks.
- Add operational notes.

Managers may:

- View activity.
- Intervene when required.

---

## Attendance Behaviour

Active shifts allow:

- Employee attendance recording.
- Late arrival tracking.
- Absence recording.

---

Example:

```
08:00

Shift Begins

↓

Active
```

---

# 4.5 Completed

## Description

The shift has ended successfully.

---

## Allowed Actions

Users may:

- View records.
- Review attendance.
- Review tasks.
- Generate reports.

---

## Restrictions

Completed shifts:

- Cannot normally be edited.
- Cannot become active again.
- Remain available historically.

---

# 4.6 Cancelled

## Description

The shift has been removed from operational execution.

---

## Possible Reasons

Examples:

- Branch closure.
- Employee shortage.
- Business decision.
- Scheduling mistake.

---

## Restrictions

Cancelled shifts:

- Cannot become active.
- Cannot receive attendance.
- Cannot receive new assignments.

---

# 4.7 Archived

## Description

A historical shift stored for long-term access.

---

## Restrictions

Archived shifts:

- Cannot be edited.
- Cannot change state.
- Are available only for viewing and reporting.

---

# 5. State Behaviour Matrix

| Feature | Draft | Published | Scheduled | Active | Completed | Cancelled | Archived |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Edit Details | Yes | Limited | Limited | Restricted | No | No | No |
| Assign Employees | Yes | Yes | Limited | No | No | No | No |
| Attendance Available | No | No | No | Yes | Historical | No | Historical |
| Task Execution | No | No | No | Yes | Historical | No | Historical |
| Notifications | No | Yes | Yes | Yes | No | Optional | No |
| Reporting | No | Limited | Yes | Yes | Yes | Yes | Yes |

---

# 6. State Transition Rules

Allowed transitions:

| Current State | Next State |
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

# 7. Invalid State Changes

The following are prohibited:

```
Completed

↓

Active
```

```
Archived

↓

Active
```

```
Cancelled

↓

Scheduled
```

---

# 8. State Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Shift State | Allow | Allow | Own Only | Allow |
| Change Draft State | Request | Allow | Deny | Deny |
| Publish Shift | Allow | Allow | Deny | Deny |
| Activate Shift | Request | Allow | Deny | Deny |
| Complete Shift | Request | Allow | Deny | Deny |
| Cancel Shift | Allow | Allow | Deny | Deny |
| Archive Shift | Allow | Deny | Deny | Allow |

---

# 9. Database Considerations

Shift current state:

```
shifts

id

status

updated_at
```

---

State history:

```
shift_state_history

id

shift_id

previous_state

new_state

changed_by

reason

created_at
```

---

# 10. Audit Requirements

The following state changes require audit records:

- Draft creation.
- Publishing.
- Activation.
- Completion.
- Cancellation.
- Archiving.

Audit records include:

- User.
- Shift.
- Previous state.
- New state.
- Timestamp.

---

# 11. Future Enhancements

Future states may include:

- Awaiting approval.
- Employee acknowledgement.
- Emergency replacement.
- Auto-generated.
- AI optimized.

---

# 12. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-002 Shift Lifecycle
- SHIFT-004 Shift Templates
- SHIFT-005 Shift Creation
- SHIFT-008 Shift Assignment
- ATT-001 Attendance Model

---

# 13. Summary

Shift States define the operational condition of a shift.

Lifecycle controls how shifts move between states.

Together they provide a controlled, auditable scheduling foundation for ShiftOS.