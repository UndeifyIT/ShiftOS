# ShiftOS Schedule States

**Document ID:** SCH-003

**Document Title:** Schedule States

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines every operational state a schedule may exist in throughout its lifecycle.

Schedule states communicate the current operational status of a schedule and determine which actions are permitted.

These states provide consistency across scheduling, attendance, reporting and audit systems.

---

# 2. Schedule State Overview

Every schedule exists in exactly one state.

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

Alternative state:

```
Cancelled
```

---

# 3. State Principles

## 3.1 Single Active State

A schedule may only have one current state.

Example:

```
✓ Published

✗ Published + Active
```

---

## 3.2 States Determine System Behaviour

The current state controls:

- Edit permissions
- Employee visibility
- Attendance availability
- Operational actions
- Reporting behaviour

---

## 3.3 State Changes Are Controlled

Schedules move between states according to the Schedule Lifecycle.

Invalid transitions are not permitted.

---

# 4. Draft

## Purpose

Planning stage.

The schedule is still being built.

---

## Characteristics

- Fully editable
- Employee assignments may change
- Shifts may be added or removed
- Invisible to employees

---

## Allowed Actions

- Create shifts
- Edit shifts
- Delete shifts
- Assign employees
- Resolve conflicts
- Save changes

---

# 5. Ready

## Purpose

Planning has finished.

The schedule is ready for publication.

---

## Characteristics

- Internal review stage
- Validation completed
- Awaiting publication

---

## Allowed Actions

- Review schedule
- Return to Draft
- Publish schedule

---

# 6. Published

## Purpose

The schedule has been officially released.

Employees now know when they are expected to work.

---

## Characteristics

- Employee visible
- Operational planning complete
- Attendance expectations established

---

## Allowed Actions

- View schedule
- Minor edits
- Re-publish updates
- Begin operational use

---

# 7. Active

## Purpose

The schedule is currently in use.

At least one scheduled shift is currently active or the schedule period has begun.

---

## Characteristics

- Attendance tracking active
- Daily operations underway
- Shift monitoring available

---

## Allowed Actions

- Record attendance
- Manage operational changes
- Perform approved reassignments

---

# 8. Completed

## Purpose

All scheduled shifts have finished.

Operational work has ended.

---

## Characteristics

- Read-only for normal users
- Historical reporting available
- Attendance finalized

---

## Allowed Actions

- View
- Export reports

No operational editing should occur.

---

# 9. Archived

## Purpose

Long-term historical storage.

---

## Characteristics

- Fully read-only
- Used for audits
- Used for reporting
- Cannot return to operational use

---

## Allowed Actions

- View
- Export
- Audit

---

# 10. Cancelled

## Purpose

The schedule will not be used.

---

## Characteristics

- Operationally inactive
- Historical record retained
- Excluded from normal scheduling

---

## Allowed Actions

- View
- Audit

Cannot be published or activated.

---

# 11. State Comparison

| State     | Employee Visible |  Editable  | Attendance Active | Operational |
| --------- | :--------------: | :--------: | :---------------: | :---------: |
| Draft     |        No        |    Yes     |        No         |     No      |
| Ready     |        No        |  Limited   |        No         |     No      |
| Published |       Yes        |  Limited   |        No         |     Yes     |
| Active    |       Yes        | Restricted |        Yes        |     Yes     |
| Completed | Historical Only  |     No     |      Closed       |     No      |
| Archived  | Historical Only  |     No     |      Closed       |     No      |
| Cancelled |        No        |     No     |        No         |     No      |

---

# 12. State Transition Summary

| Current State | Next Allowed State(s) |
| ------------- | --------------------- |
| Draft         | Ready, Cancelled      |
| Ready         | Draft, Published      |
| Published     | Active                |
| Active        | Completed             |
| Completed     | Archived              |
| Archived      | None                  |
| Cancelled     | None                  |

---

# 13. State Permissions

| State     |    Manager     |       Supervisor       |          Staff          |
| --------- | :------------: | :--------------------: | :---------------------: |
| Draft     |  View & Edit   |      View & Edit       |        No Access        |
| Ready     | View & Publish |     View & Publish     |        No Access        |
| Published |  View & Edit   |      View & Edit       |    View Own Schedule    |
| Active    | Full Oversight | Operational Management |    View Own Schedule    |
| Completed |      View      |          View          | Historical _(Optional)_ |
| Archived  |      View      |          View          |        No Access        |
| Cancelled |      View      |          View          |        No Access        |

---

# 14. Database Considerations

Current state stored on schedule:

```
status
```

Recommended values:

```
Draft

Ready

Published

Active

Completed

Archived

Cancelled
```

Historical state changes:

```
schedule_state_history

id

schedule_id

previous_state

new_state

changed_by

reason

created_at
```

---

# 15. Audit Requirements

Every state transition generates an audit record.

Audit information includes:

- Previous state
- New state
- User
- Timestamp
- Optional reason

---

# 16. Future Enhancements

Future versions may support:

- Scheduled publication
- Automatic activation
- Automatic completion
- Automatic archival
- Organization-specific lifecycle rules

---

# 17. Related Specifications

- SCH-001 Schedule Definition
- SCH-002 Schedule Lifecycle
- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SCH-009 Schedule Locking
- SHIFT-003 Shift States

---

# 18. Summary

Schedule States define the operational condition of a schedule throughout its lifecycle.

Each state controls system behaviour, user permissions and operational capabilities, ensuring schedules move through a consistent, auditable workflow from planning to historical storage.
