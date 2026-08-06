# ShiftOS Shift Lifecycle State Machine

**Document ID:** SM-004

**Document Title:** Shift Lifecycle State Machine

**Version:** 1.0.0

**Status:** Approved

**Classification:** State Machine Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the lifecycle of an individual shift within ShiftOS.

The state machine governs how shifts progress from assignment through execution, completion and archival while ensuring valid operational transitions.

---

# 2. Objectives

The shift lifecycle ensures:

- Predictable scheduling behavior.
- Reliable attendance tracking.
- Safe operational changes.
- Accurate historical reporting.
- Support for future payroll integrations.

---

# 3. Scope

Applies to:

- Individual employee shifts.
- Open shifts.
- Supervisor-managed shifts.

Does not apply to schedule publication.

---

# 4. Shift States

```
SCHEDULED

↓

IN_PROGRESS

↓

COMPLETED

↓

ARCHIVED
```

Exceptional states:

```
CANCELLED

MISSED
```

---

# 5. State Definitions

## SCHEDULED

Purpose:

The shift has been assigned and is expected to occur.

Activities:

- Employee assignment.
- Supervisor review.
- Attendance preparation.

Allowed transitions:

→ IN_PROGRESS

→ CANCELLED

→ MISSED

---

## IN_PROGRESS

Purpose:

The shift has started.

Activities:

- Attendance recording.
- Task execution.
- Operational management.

Allowed transitions:

→ COMPLETED

---

## COMPLETED

Purpose:

The shift has ended successfully.

Activities:

- Final attendance confirmation.
- Task completion review.
- Reporting.

Allowed transitions:

→ ARCHIVED

---

## ARCHIVED

Purpose:

Historical record.

Activities:

- Read-only access.
- Reporting.
- Analytics.

Terminal state.

---

## CANCELLED

Purpose:

Shift was cancelled before starting.

Examples:

- Operational closure.
- Staffing changes.
- Scheduling correction.

Terminal state.

---

## MISSED

Purpose:

The scheduled shift did not begin as expected.

Examples:

- Employee no-show.
- Supervisor unable to commence shift.

Activities:

- Trigger attendance exception workflows.
- Notify appropriate users.

Allowed transitions:

→ COMPLETED (only if the shift eventually proceeds)

→ ARCHIVED

---

# 6. State Transition Diagram

```
SCHEDULED
   │
   ▼
IN_PROGRESS
   │
   ▼
COMPLETED
   │
   ▼
ARCHIVED

SCHEDULED ─────► CANCELLED

SCHEDULED ─────► MISSED
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   COMPLETED           ARCHIVED
```

---

# 7. Transition Events

| Event | From | To |
|--------|------|----|
| Shift Start | SCHEDULED | IN_PROGRESS |
| Shift End | IN_PROGRESS | COMPLETED |
| Archive Process | COMPLETED | ARCHIVED |
| Shift Cancelled | SCHEDULED | CANCELLED |
| Employee No-Show / Shift Not Started | SCHEDULED | MISSED |
| Shift Eventually Starts | MISSED | COMPLETED |
| Archive Missed Shift | MISSED | ARCHIVED |

---

# 8. Shift Rules

A shift shall:

- Belong to one organization.
- Belong to one branch.
- Have one scheduled time period.
- Support one or more assigned employees (depending on shift type).
- Maintain complete historical records.

Completed, cancelled and archived shifts cannot return to scheduled or in-progress states.

---

# 9. Operational Rules

While IN_PROGRESS:

Allowed:

- Record attendance.
- Complete tasks.
- Record operational notes.

Not allowed:

- Cancel the shift.
- Change historical start times without authorized correction workflow.

---

# 10. Attendance Integration

Shift state influences attendance.

Examples:

SCHEDULED

- Attendance expected.

IN_PROGRESS

- Attendance may be recorded.

COMPLETED

- Attendance finalized.

---

# 11. Task Integration

Tasks linked to the shift should respond to lifecycle events.

Examples:

Shift starts:

- Activate shift tasks.

Shift completes:

- Close outstanding tasks or flag incomplete work.

---

# 12. Failure Handling

Examples:

- Employee absent.
- Branch closure.
- Emergency cancellation.

The shift state should accurately reflect operational reality without deleting historical records.

---

# 13. Audit Requirements

The following events shall be audited:

- Shift created.
- Assignment changes.
- Shift started.
- Shift completed.
- Shift cancelled.
- Shift marked as missed.
- Shift archived.

Each audit record shall include:

- Timestamp.
- Actor.
- Branch.
- Shift identifier.
- Reason where applicable.

---

# 14. Related Specifications

- MAN-003 Shift Management
- SUP-003 Shift Operations
- SM-005 Attendance Lifecycle
- API-004 Workflow Engine
- DB-005 Tables

---

# 15. Summary

The Shift Lifecycle State Machine governs the operational life of an individual shift from scheduling through execution, completion and archival.

It provides a consistent foundation for attendance, task execution, reporting and future payroll integrations while preserving complete historical records.