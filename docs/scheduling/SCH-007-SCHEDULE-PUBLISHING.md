# ShiftOS Schedule Publishing

**Document ID:** SCH-007

**Document Title:** Schedule Publishing

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedules are published within ShiftOS.

Publishing makes a schedule operational by making it visible to employees and establishing it as the official working schedule for the selected planning period.

Until a schedule is published, it remains an internal planning document.

---

# 2. Publishing Principles

## 2.1 Publishing Makes A Schedule Operational

Publishing changes a schedule from planning mode to operational use.

After publication:

- Employees can view their assigned shifts.
- Attendance expectations are established.
- Operational notifications may be sent.

---

## 2.2 Supervisors Publish Schedules

Publishing schedules is primarily the responsibility of supervisors.

Managers may also publish schedules when operationally necessary.

Unlike approval workflows, supervisor publications do **not** require manager approval.

Managers receive a notification whenever a schedule is published and may intervene if changes are required.

---

## 2.3 Only One Published Schedule Per Branch And Period

A branch may only have one published schedule covering the same planning period.

Example:

```
Ikeja Branch

Week 29

✓ Published Schedule

✗ Second Published Schedule
```

The system must prevent duplicate published schedules.

---

## 2.4 Publication Does Not Lock The Schedule

Publishing does not permanently lock a schedule.

Operational edits may still occur when necessary.

Those edits are governed by **SCH-006 Schedule Editing**.

---

# 3. Publishing Workflow

```
Draft

↓

Validation

↓

Publish

↓

Published

↓

Employee Notification

↓

Operational Use
```

---

# 4. Pre-Publication Validation

Before publication, ShiftOS validates:

- Schedule exists.
- Branch is active.
- Planning dates are valid.
- At least one shift exists.
- Required staffing information is complete.
- No critical scheduling conflicts exist.
- User has publishing permission.

Publication is blocked if validation fails.

Warnings may still allow publication depending on organization policy.

---

# 5. Employee Visibility

Before publication:

```
Employees

↓

No Access
```

After publication:

```
Employees

↓

View Assigned Shifts
```

Employees only see shifts assigned to them.

---

# 6. Notifications

Publishing may generate notifications for:

- Assigned employees
- Supervisor
- Manager

Typical notification:

```
Your schedule for
Week 29
has been published.
```

Notification delivery is defined in the Notification Domain.

---

# 7. Republishing

Published schedules may be updated.

When changes affect employees, the supervisor or manager may republish the schedule.

Republishing should:

- Replace the previous published version.
- Notify affected employees.
- Record the change in audit history.

---

# 8. Manager Oversight

Managers receive notification whenever a supervisor publishes a schedule.

Managers may:

- Review the published schedule.
- Edit the schedule if necessary.
- Republish the updated version.
- Contact the supervisor regarding operational changes.

This oversight does not delay publication.

---

# 9. Publishing Permissions

| Permission                        | Manager | Supervisor |       Staff        | Admin _(Future)_ |
| --------------------------------- | :-----: | :--------: | :----------------: | :--------------: |
| Publish Schedule                  |  Allow  |   Allow    |        Deny        |       Deny       |
| Republish Schedule                |  Allow  |   Allow    |        Deny        |       Deny       |
| View Published Schedule           |  Allow  |   Allow    | Own Published Only |      Allow       |
| View Publication History          |  Allow  |   Allow    |        Deny        |      Allow       |
| Receive Publication Notifications |  Allow  |   Allow    |       Allow        |      Allow       |

---

# 10. Publication Rules

A schedule may be published only if:

- It is in the Draft or Ready state.
- Validation succeeds.
- No other published schedule exists for the same branch and planning period.
- The user has publication permission.

Publication changes the schedule state to:

```
Published
```

---

# 11. Database Considerations

Recommended fields:

```
published_at

published_by

publication_version
```

Recommended history table:

```
schedule_publication_history

id

schedule_id

published_by

version

published_at
```

---

# 12. Audit Requirements

The following events generate audit records:

- Schedule published
- Schedule republished
- Publication cancelled
- Publication override by manager

Audit records include:

- User
- Schedule
- Publication version
- Timestamp

---

# 13. Future Enhancements

Future versions may support:

- Scheduled publication
- Automatic publication
- Publication approval workflows
- Organization-specific publication rules
- Delayed employee notifications
- AI publication readiness checks

---

# 14. Related Specifications

- SCH-001 Schedule Definition
- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SCH-008 Schedule Versioning
- SCH-012 Schedule Validation

---

# 15. Summary

Schedule Publishing transitions a schedule from an internal planning document to the official operational schedule for a branch.

Supervisors are primarily responsible for publishing schedules, while managers provide oversight and may intervene when necessary.

Publishing validates the schedule, makes it visible to assigned employees, establishes attendance expectations and generates the appropriate notifications and audit records to support reliable workforce operations.
