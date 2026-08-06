# ShiftOS Workflow Engine

**Document ID:** API-004

**Document Title:** Workflow Engine Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines how ShiftOS manages business workflows.

The workflow system controls state transitions, approvals, validations and side effects across operational processes.

---

# 2. Workflow Philosophy

A workflow represents the lifecycle of a business entity.

Workflows define:

- Available states.
- Allowed transitions.
- Authorized actors.
- Validation requirements.
- Side effects.
- Historical tracking.

---

# 3. Workflow Principles

ShiftOS workflows follow these principles:

- Explicit states.
- Controlled transitions.
- No invalid state changes.
- Auditable actions.
- Domain ownership.
- Clear responsibility boundaries.

---

# 4. Workflow Architecture

Workflow execution follows:

```
User Action

↓

API Request

↓

Permission Check

↓

Business Validation

↓

State Transition

↓

Database Update

↓

Event Creation

↓

Notifications / Background Jobs
```

---

# 5. State Management

Every workflow entity should define:

- Current state.
- Allowed next states.
- Transition rules.

Example:

Task:

```
pending

↓

assigned

↓

in_progress

↓

completed

↓

verified
```

---

# 6. Transition Rules

Transitions must define:

- Starting state.
- Ending state.
- Required permissions.
- Required conditions.

Example:

Publishing a schedule:

Allowed:

```
draft → published
```

Not allowed:

```
completed → draft
```

unless a specific revision workflow exists.

---

# 7. Scheduling Workflow

Example lifecycle:

```
Draft

↓

Reviewed

↓

Published

↓

Active

↓

Completed

↓

Archived
```

Rules:

- Only authorized users can publish.
- Published schedules require revision handling.
- Historical versions must be preserved.

---

# 8. Attendance Workflow

Example lifecycle:

```
Scheduled

↓

Checked In

↓

Checked Out

↓

Reviewed

↓

Finalized
```

Rules:

- Attendance changes require permission.
- Corrections must preserve original records.
- Finalized records require controlled changes.

---

# 9. Task Workflow

Example lifecycle:

```
Created

↓

Assigned

↓

In Progress

↓

Completed

↓

Verified

↓

Closed
```

Rules:

- Only assigned users can complete tasks.
- Verification requires authorized reviewers.

---

# 10. Communication Workflow

Example lifecycle:

```
Draft

↓

Published

↓

Acknowledged

↓

Expired
```

Rules:

- Published messages cannot silently change.
- Acknowledgement history must be preserved.

---

# 11. Workflow History

Important transitions should create history records.

History should include:

- Previous state.
- New state.
- Actor.
- Timestamp.
- Reason where applicable.

---

# 12. Side Effects

Workflow transitions may trigger:

- Notifications.
- Events.
- Audit records.
- Background jobs.

Example:

Publishing a schedule:

```
Schedule Published

↓

Create Event

↓

Notify Employees
```

---

# 13. Failed Transitions

Invalid transitions should:

- Be rejected.
- Return clear errors.
- Not partially update data.
- Be logged when security-related.

---

# 14. Workflow Storage

Workflow states may be stored using:

- Database enums.
- Status columns.
- History tables.

The choice depends on domain requirements.

---

# 15. Generic Workflow Engine Decision

ShiftOS should initially use domain-specific workflows.

A fully configurable workflow engine should only be introduced when:

- Multiple customers require customization.
- Similar workflow patterns repeat.
- Configuration provides clear business value.

---

# 16. Testing Requirements

Workflows require testing for:

- Valid transitions.
- Invalid transitions.
- Permission failures.
- Concurrent updates.
- Recovery scenarios.

---

# 17. Future Enhancements

Future versions may introduce:

- Configurable workflows.
- Workflow automation rules.
- Approval chains.
- Visual workflow builders.

---

# 18. Related Specifications

- API-003 Validation Rules
- API-005 Event System
- API-006 Error Handling
- DB-006 Constraints
- SFT-005 Guidance Rules

---

# 19. Summary

ShiftOS workflows provide controlled lifecycle management for workforce operations.

By defining explicit states, controlled transitions and auditable actions, the platform prevents invalid operations while creating predictable workflows for supervisors and employees.
