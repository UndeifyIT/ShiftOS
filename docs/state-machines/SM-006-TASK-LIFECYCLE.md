# ShiftOS Task Lifecycle State Machine

**Document ID:** SM-006

**Document Title:** Task Lifecycle State Machine

**Version:** 1.0.0

**Status:** Approved

**Classification:** State Machine Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the lifecycle of operational tasks within ShiftOS.

The lifecycle governs how tasks progress from assignment through completion, verification and archival.

It supports both employee self-completion and supervisor verification workflows.

---

# 2. Objectives

The task lifecycle ensures:

- Clear operational ownership.
- Accurate task tracking.
- Supervisor accountability.
- Reliable reporting.
- Complete audit history.

---

# 3. Scope

Applies to:

- Individual employee tasks.
- Team tasks.
- Shift-linked tasks.
- Branch operational tasks.

---

# 4. Task Lifecycle States

```
ASSIGNED

↓

IN_PROGRESS

↓

COMPLETED

↓

VERIFIED

↓

ARCHIVED
```

Exceptional states:

```
CANCELLED

REOPENED
```

---

# 5. State Definitions

## ASSIGNED

Purpose:

Task has been assigned but work has not started.

Activities:

- Notify assignee.
- Display due time.
- Await execution.

Allowed transitions:

→ IN_PROGRESS

→ CANCELLED

---

## IN_PROGRESS

Purpose:

Work has begun.

Activities:

- Employee performs task.
- Progress may be recorded.

Allowed transitions:

→ COMPLETED

→ CANCELLED

---

## COMPLETED

Purpose:

Employee has completed the task.

Activities:

- Record completion timestamp.
- Store completion notes.
- Await verification if required.

Allowed transitions:

→ VERIFIED

→ REOPENED

---

## VERIFIED

Purpose:

Task completion has been confirmed by an authorized user or automatically according to organization settings.

Activities:

- Lock operational completion.
- Include in reports.

Allowed transitions:

→ ARCHIVED

→ REOPENED

---

## REOPENED

Purpose:

Previously completed task requires additional work.

Examples:

- Quality issue found.
- Verification failed.
- Task incomplete.

Activities:

- Return task to active work.

Allowed transitions:

→ IN_PROGRESS

---

## CANCELLED

Purpose:

Task is no longer required.

Examples:

- Operational changes.
- Shift cancelled.
- Duplicate task.

Terminal state.

---

## ARCHIVED

Purpose:

Historical task record.

Activities:

- Reporting.
- Compliance.
- Analytics.

Terminal state.

---

# 6. State Transition Diagram

```
ASSIGNED
    │
    ▼
IN_PROGRESS
    │
    ▼
COMPLETED
    │
    ▼
VERIFIED
    │
    ▼
ARCHIVED

ASSIGNED ─────► CANCELLED
IN_PROGRESS ──► CANCELLED

COMPLETED ────► REOPENED
VERIFIED ─────► REOPENED
                 │
                 ▼
           IN_PROGRESS
```

---

# 7. Transition Events

| Event | From | To |
|--------|------|----|
| Employee Starts Task | ASSIGNED | IN_PROGRESS |
| Employee Completes Task | IN_PROGRESS | COMPLETED |
| Supervisor Verifies Task | COMPLETED | VERIFIED |
| Auto Verification | COMPLETED | VERIFIED |
| Archive Process | VERIFIED | ARCHIVED |
| Task Cancelled | ASSIGNED/IN_PROGRESS | CANCELLED |
| Verification Failed | COMPLETED | REOPENED |
| Task Reopened | VERIFIED | REOPENED |
| Work Resumed | REOPENED | IN_PROGRESS |

---

# 8. Task Rules

Each task shall:

- Belong to one organization.
- Belong to one branch.
- Have one creator.
- Have one current assignee or assigned team.
- Maintain a complete history.

Completed, verified and archived tasks shall never lose historical completion information.

---

# 9. Verification Rules

Organizations may configure:

### Supervisor Verification

Employee marks task complete.

↓

Supervisor verifies.

↓

Task becomes VERIFIED.

---

### Automatic Verification

Employee marks task complete.

↓

Task immediately becomes VERIFIED.

This configuration is defined at the organization or task-template level.

---

# 10. Reopening Rules

A task may be reopened only by an authorized user.

When reopened:

- Original completion remains in audit history.
- Reopen reason is required.
- New completion cycle begins.

---

# 11. Failure Handling

Examples:

- Duplicate completion.
- Invalid assignee.
- Completion after shift closure.
- Verification without permission.

Invalid transitions shall be rejected.

---

# 12. Audit Requirements

The following events shall be audited:

- Task assigned.
- Work started.
- Task completed.
- Task verified.
- Task reopened.
- Task cancelled.
- Task archived.

Audit records shall include:

- Timestamp.
- Actor.
- Previous state.
- New state.
- Reason where applicable.

---

# 13. Related Specifications

- SUP-005 Tasks
- EMPUI-004 Tasks
- SM-004 Shift Lifecycle
- API-004 Workflow Engine
- DB-005 Tables

---

# 14. Summary

The Task Lifecycle State Machine governs how operational tasks move from assignment through execution, verification and archival.

By separating completion from verification, ShiftOS supports both simple and compliance-driven operational workflows while preserving a complete audit trail.