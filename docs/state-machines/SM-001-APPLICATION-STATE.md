# ShiftOS Application State Machine

**Document ID:** SM-001

**Document Title:** Application State Machine

**Version:** 1.0.0

**Status:** Approved

**Classification:** State Machine Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the high-level application state machine for ShiftOS.

The application state machine governs how the client application transitions between startup, authentication, synchronization, normal operation and failure conditions.

It is independent of individual business entities such as shifts, attendance or tasks.

---

# 2. Objectives

The application state machine ensures:

- Predictable application behavior.
- Consistent startup flow.
- Reliable authentication.
- Controlled synchronization.
- Safe offline operation.
- Graceful error recovery.

---

# 3. Scope

This state machine applies to:

- Web application.
- Progressive Web App (PWA).
- Mobile application.

---

# 4. Design Principles

The application shall:

- Exist in one primary state at a time.
- Transition only through defined events.
- Never bypass required validation.
- Recover safely from failures.
- Preserve user data where possible.

---

# 5. Application States

The application supports the following primary states:

```
INITIALIZING

↓

AUTHENTICATING

↓

LOADING

↓

READY

↓

SYNCING

↓

OFFLINE

↓

ERROR

↓

SIGNED_OUT
```

---

# 6. State Definitions

## INITIALIZING

Purpose:

Application startup.

Activities:

- Load configuration.
- Initialize local storage.
- Initialize services.
- Prepare environment.

Allowed transitions:

→ AUTHENTICATING

→ ERROR

---

## AUTHENTICATING

Purpose:

Determine user identity.

Activities:

- Validate stored session.
- Refresh authentication token.
- Load user identity.

Allowed transitions:

→ LOADING

→ SIGNED_OUT

→ ERROR

---

## LOADING

Purpose:

Load required application data.

Activities:

- Resolve organization.
- Resolve branch access.
- Resolve permissions.
- Load user profile.
- Initialize navigation.

Allowed transitions:

→ READY

→ OFFLINE

→ ERROR

---

## READY

Purpose:

Normal application operation.

Activities:

- User interaction.
- Read/write data.
- Execute workflows.
- Receive real-time updates.

Allowed transitions:

→ SYNCING

→ OFFLINE

→ SIGNED_OUT

→ ERROR

---

## SYNCING

Purpose:

Synchronize local and server data.

Activities:

- Upload pending operations.
- Download updates.
- Resolve conflicts.
- Refresh cached data.

Allowed transitions:

→ READY

→ OFFLINE

→ ERROR

---

## OFFLINE

Purpose:

Operate without network connectivity.

Activities:

- Read cached information.
- Queue supported operations.
- Monitor connectivity.

Allowed transitions:

→ SYNCING

→ ERROR

---

## ERROR

Purpose:

Application cannot safely continue.

Examples:

- Startup failure.
- Corrupted cache.
- Authentication failure.
- Critical synchronization failure.

Allowed transitions:

→ INITIALIZING

→ SIGNED_OUT

---

## SIGNED_OUT

Purpose:

No authenticated user session.

Activities:

- Display authentication screen.
- Await login.

Allowed transitions:

→ AUTHENTICATING

---

# 7. State Transition Diagram

```
INITIALIZING
      │
      ▼
AUTHENTICATING
      │
      ▼
LOADING
      │
      ▼
READY
 ┌────┴────┐
 ▼         ▼
SYNCING  OFFLINE
 │         │
 └────┬────┘
      ▼
    READY

READY
 │
 ▼
SIGNED_OUT

Any state
 │
 ▼
ERROR
```

---

# 8. Transition Events

| Event | From | To |
|--------|------|----|
| App Started | INITIALIZING | AUTHENTICATING |
| Authentication Successful | AUTHENTICATING | LOADING |
| Authentication Failed | AUTHENTICATING | SIGNED_OUT |
| Initial Data Loaded | LOADING | READY |
| Connection Lost | READY | OFFLINE |
| Connection Restored | OFFLINE | SYNCING |
| Synchronization Complete | SYNCING | READY |
| Logout | READY | SIGNED_OUT |
| Critical Failure | Any | ERROR |
| Restart Application | ERROR | INITIALIZING |

---

# 9. Offline Rules

When offline:

Allowed:

- View cached schedules.
- View cached tasks.
- View cached announcements.
- Queue supported write operations.

Not allowed:

- Operations requiring immediate server validation.
- Authentication changes.
- Permission changes.

---

# 10. Synchronization Rules

Synchronization must:

- Preserve operation order.
- Be idempotent.
- Retry transient failures.
- Detect conflicts.
- Prevent duplicate submissions.

---

# 11. Error Recovery

Recoverable errors:

- Retry operation.
- Resume synchronization.
- Continue application.

Non-recoverable errors:

- Clear invalid state.
- Restart initialization.
- Re-authenticate if necessary.

---

# 12. Security Rules

Authentication state determines access.

No protected data shall be accessible while:

- SIGNED_OUT
- AUTHENTICATING
- Authentication has expired.

Permission validation remains server-side.

---

# 13. Audit Requirements

The application shall log significant state transitions, including:

- Login.
- Logout.
- Synchronization start/end.
- Offline entry/exit.
- Critical application failures.

---

# 14. Implementation Notes

The application state machine should be implemented as a centralized state manager rather than distributed conditional logic.

Business entity state machines (shifts, attendance, tasks, etc.) operate independently within the READY state.

---

# 15. Related Specifications

- ARCH-008 Offline Strategy
- ARCH-009 Scalability Strategy
- API-007 Background Jobs
- UI-012 PWA Behaviour
- SM-002 Authentication

---

# 16. Summary

The ShiftOS Application State Machine defines the lifecycle of the client application from startup through authentication, normal operation, offline mode, synchronization and shutdown.

By enforcing explicit application states and transitions, ShiftOS ensures predictable behavior, resilience and a consistent user experience across web, mobile and PWA platforms.