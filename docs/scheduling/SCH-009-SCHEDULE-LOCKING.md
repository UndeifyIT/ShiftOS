# ShiftOS Schedule Locking

**Document ID:** SCH-009

**Document Title:** Schedule Locking

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedule locking works within ShiftOS.

Schedule Locking prevents unauthorized or accidental modifications to schedules after they have reached critical operational stages.

The objective is to maintain schedule integrity while still allowing controlled operational intervention when necessary.

---

# 2. Schedule Locking Definition

A locked schedule is a schedule whose editing capabilities have been restricted by the system or an authorized user.

Locking does **not** remove visibility.

It only restricts modification.

---

# 3. Locking Principles

## 3.1 Locking Protects Operational Stability

Once employees begin working from a schedule, unnecessary changes should be prevented.

Locking helps ensure that employees, supervisors and managers are working from a stable schedule.

---

## 3.2 Locking Is Independent Of Publishing

Publishing and locking are different concepts.

Publishing makes a schedule operational.

Locking controls whether it can still be modified.

Example:

```
Published

↓

Locked
```

or

```
Published

↓

Unlocked
```

Both are valid.

---

## 3.3 Managers Retain Override Authority

Managers may unlock schedules when operationally necessary.

Examples:

- Emergency staffing changes.
- Supervisor unavailable.
- Business disruption.
- Critical scheduling error.

All overrides are audited.

---

# 4. Lock States

A schedule may exist in one of two lock states.

## Unlocked

Characteristics:

- Editing permitted.
- Shifts may be modified.
- Employee assignments may change.
- Operational updates allowed.

---

## Locked

Characteristics:

- Editing restricted.
- Shift structure protected.
- Employee assignments protected.
- Operational stability maintained.

---

# 5. Automatic Locking

Organizations may configure automatic schedule locking.

Examples:

Lock immediately after publication.

or

Lock:

```
24 hours

before

schedule starts.
```

or

Lock when the schedule becomes Active.

The locking policy is defined by organization settings.

---

# 6. Manual Locking

Managers and supervisors may manually lock schedules.

Typical uses:

- Schedule finalized.
- Workforce confirmed.
- Operational planning complete.

---

# 7. Unlocking

Locked schedules may be unlocked only by authorized users.

Unlocking should be exceptional rather than routine.

Every unlock action requires a reason.

Example:

```
Reason

↓

Employee illness

↓

Unlock
```

---

# 8. Editing Locked Schedules

When a schedule is locked:

Allowed:

- View schedule.
- Export schedule.
- View history.

Restricted:

- Add shifts.
- Remove shifts.
- Edit shifts.
- Change assignments.
- Change planning period.

Unless the schedule is first unlocked.

---

# 9. Emergency Override

Managers may perform emergency overrides.

Workflow:

```
Locked

↓

Manager Override

↓

Reason Required

↓

Temporary Unlock

↓

Edit

↓

Lock Again
```

Every override generates audit records.

---

# 10. Employee Impact

Locking itself does not notify employees.

Employees are only notified if:

- Schedule changes.
- Shift assignments change.
- Published schedule is republished.

---

# 11. Locking Permissions

| Permission         | Manager | Supervisor |         Staff          | Admin _(Future)_ |
| ------------------ | :-----: | :--------: | :--------------------: | :--------------: |
| View Lock Status   |  Allow  |   Allow    | Own Published Schedule |      Allow       |
| Lock Schedule      |  Allow  |   Allow    |          Deny          |       Deny       |
| Unlock Schedule    |  Allow  |    Deny    |          Deny          |       Deny       |
| Emergency Override |  Allow  |    Deny    |          Deny          |       Deny       |
| View Lock History  |  Allow  |   Allow    |          Deny          |      Allow       |

---

# 12. Database Considerations

Recommended fields:

```
is_locked

locked_at

locked_by

unlock_reason

unlocked_at

unlocked_by
```

Recommended history table:

```
schedule_lock_history

id

schedule_id

action

performed_by

reason

created_at
```

---

# 13. Audit Requirements

The following events generate audit records:

- Schedule locked.
- Schedule unlocked.
- Emergency override.
- Lock status changed.
- Lock policy applied.

Audit records include:

- User.
- Schedule.
- Action.
- Reason.
- Timestamp.

---

# 14. Future Enhancements

Future versions may support:

- Automatic relocking after edits.
- Temporary unlock windows.
- Organization-specific locking policies.
- AI recommendations for locking.
- Multi-level lock permissions.
- Approval before unlocking.

---

# 15. Related Specifications

- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SCH-008 Schedule Versioning
- SCH-012 Schedule Validation

---

# 16. Summary

Schedule Locking protects operational schedules from unintended modification once they become critical to daily operations.

Supervisors may lock schedules once planning is complete, while managers retain exclusive authority to unlock schedules and perform emergency overrides when required.

Every locking action, unlock and override is fully audited to preserve accountability and maintain confidence in the organization's workforce planning records.
