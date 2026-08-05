# ShiftOS Schedule Lifecycle

**Document ID:** SCH-002

**Document Title:** Schedule Lifecycle

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the lifecycle of a schedule within ShiftOS.

The Schedule Lifecycle describes how a schedule progresses from initial creation through publication, operational use and eventual archival.

A consistent lifecycle ensures that schedules remain predictable, auditable and easy to manage.

---

# 2. Schedule Lifecycle Overview

Every schedule progresses through a defined sequence of operational states.

```
Draft

↓

Ready

↓

Published

↓

Active

↓

Completed

↓

Archived
```

Not every schedule reaches every state.

Some schedules may be cancelled before publication.

---

# 3. Lifecycle Principles

## 3.1 A Schedule Always Has One Current State

A schedule may only exist in one lifecycle state at any given time.

Example:

```
✓ Draft

✗ Draft + Published
```

---

## 3.2 State Changes Are Controlled

Users cannot freely move schedules between states.

Each transition must satisfy business rules.

Example:

```
Draft

↓

Ready

↓

Published
```

The system should prevent invalid transitions.

---

## 3.3 Lifecycle Events Are Audited

Every state transition generates an audit record.

Example:

```
Published

↓

Active
```

Audit includes:

- User
- Previous state
- New state
- Timestamp

---

# 4. Lifecycle States

## Draft

Initial planning stage.

Characteristics:

- Fully editable
- Shifts may be added or removed
- Employees may be assigned
- Not visible to staff

Typical actions:

- Create shifts
- Assign employees
- Resolve conflicts

---

## Ready

Planning is complete.

Characteristics:

- Internal review stage
- Validation completed
- Awaiting publication

Typical actions:

- Final review
- Manager oversight
- Publish schedule

---

## Published

Schedule has been released.

Characteristics:

- Visible to relevant users
- Employees can view their assigned shifts
- Attendance expectations established

Typical actions:

- Minor corrections
- Operational monitoring

---

## Active

The schedule is currently being used.

Characteristics:

- Current operational schedule
- Attendance records generated
- Tasks executed against scheduled shifts

Typical actions:

- Attendance tracking
- Shift monitoring
- Operational management

---

## Completed

All scheduled shifts have ended.

Characteristics:

- Operational activities finished
- Historical reporting available

No new operational activity should occur.

---

## Archived

Final historical state.

Characteristics:

- Read-only
- Retained for reporting
- Retained for audits
- Cannot return to operational use

---

# 5. Lifecycle Transitions

Allowed transitions:

```
Draft

↓

Ready

↓

Published

↓

Active

↓

Completed

↓

Archived
```

Alternative transitions:

```
Draft

↓

Cancelled
```

```
Ready

↓

Draft
```

For further editing.

---

# 6. State Transition Rules

| Current State | Allowed Next State(s) |
| ------------- | --------------------- |
| Draft         | Ready, Cancelled      |
| Ready         | Draft, Published      |
| Published     | Active                |
| Active        | Completed             |
| Completed     | Archived              |
| Archived      | None                  |
| Cancelled     | None                  |

---

# 7. Editing Rules By State

| State     |      Editing Allowed      |
| --------- | :-----------------------: |
| Draft     |            Yes            |
| Ready     |          Limited          |
| Published | Manager & Supervisor Only |
| Active    |        Restricted         |
| Completed |            No             |
| Archived  |            No             |
| Cancelled |            No             |

---

# 8. Visibility Rules

## Draft

Visible to:

- Supervisor
- Manager

---

## Ready

Visible to:

- Supervisor
- Manager

---

## Published

Visible to:

- Manager
- Supervisor
- Assigned Employees

---

## Active

Visible to:

- Manager
- Supervisor
- Assigned Employees

---

## Completed

Visible to:

- Manager
- Supervisor

Employees may still view completed schedules for historical reference if organization settings allow.

---

## Archived

Read-only historical access.

---

# 9. Validation During Lifecycle

Before moving between states the system validates:

Before Ready:

- Required information completed
- At least one shift exists

Before Published:

- Validation successful
- No unresolved critical conflicts

Before Active:

- Schedule publication completed

Before Completed:

- All shifts finished

---

# 10. Cancellation

Schedules may be cancelled only before becoming Active.

Cancellation records:

- Reason
- User
- Timestamp

Cancelled schedules remain available for audit purposes.

---

# 11. Notifications

Notifications may be generated when:

- Schedule published
- Schedule updated after publication
- Schedule cancelled

Recipients may include:

- Assigned employees
- Supervisor
- Manager

---

# 12. Database Considerations

Lifecycle fields:

```
status

published_at

activated_at

completed_at

archived_at

cancelled_at
```

State history:

```
schedule_state_history

id

schedule_id

previous_state

new_state

changed_by

created_at
```

---

# 13. Audit Requirements

The following events generate audit records:

- State changes
- Publication
- Cancellation
- Archive
- Manager overrides

Audit records include:

- Schedule
- Previous state
- New state
- User
- Timestamp

---

# 14. Future Enhancements

Future versions may support:

- Scheduled publication
- Automatic activation
- Automatic completion
- Automatic archival
- Approval workflows before publication

---

# 15. Related Specifications

- SCH-001 Schedule Definition
- SCH-003 Schedule States
- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SCH-009 Schedule Locking

---

# 16. Summary

The Schedule Lifecycle defines the controlled progression of schedules from planning through operational execution and historical storage.

A structured lifecycle ensures consistency, operational reliability, reporting accuracy and complete auditability across the ShiftOS platform.
