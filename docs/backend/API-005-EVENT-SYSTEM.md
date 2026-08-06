# ShiftOS Event System

**Document ID:** API-005

**Document Title:** Event System Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the event architecture used within ShiftOS.

Events allow different parts of the platform to respond to important business actions without creating unnecessary dependencies between modules.

---

# 2. Event Philosophy

An event represents something that has already happened.

Examples:

```
Schedule Published

Task Completed

Attendance Recorded

Announcement Published
```

Events describe facts, not commands.

---

# 3. Event Principles

ShiftOS events follow these principles:

- Events are immutable.
- Events represent completed actions.
- Event consumers should be independent.
- Events should contain sufficient context.
- Critical events should be auditable.

---

# 4. Event Architecture

The event flow:

```
Business Action

↓

Validation

↓

Database Transaction

↓

Event Creation

↓

Event Consumers

↓

Notifications / Jobs / Analytics
```

---

# 5. Event Types

Events are grouped by domain.

---

# Workforce Events

Examples:

```
employee_created

employee_updated

employee_deactivated
```

Used for:

- Audit.
- Notifications.
- Integrations.

---

# Scheduling Events

Examples:

```
schedule_created

schedule_published

shift_assigned

shift_cancelled
```

Used for:

- Employee notifications.
- Calendar updates.
- Reporting.

---

# Attendance Events

Examples:

```
employee_clocked_in

employee_clocked_out

attendance_corrected
```

Used for:

- Attendance monitoring.
- Compliance records.

---

# Task Events

Examples:

```
task_created

task_assigned

task_completed

task_verified
```

Used for:

- Notifications.
- Productivity reporting.

---

# Communication Events

Examples:

```
announcement_published

announcement_acknowledged
```

Used for:

- Employee communication tracking.

---

# 6. Event Structure

Events should contain:

```
event_id

event_type

organization_id

actor_id

entity_type

entity_id

timestamp

metadata
```

---

# 7. Event Ownership

The module that owns the business action creates the event.

Example:

Scheduling owns:

```
schedule_published
```

Notifications consume the event.

Notifications do not create it.

---

# 8. Event Processing

Consumers should:

- Process events safely.
- Handle retries.
- Avoid duplicate processing.
- Record failures.

---

# 9. Event Reliability

Important events should support:

- Delivery confirmation.
- Retry handling.
- Failure tracking.
- Monitoring.

---

# 10. Event vs Direct Communication

Use events when:

- Multiple systems need to react.
- Processing can happen asynchronously.
- The action represents a business fact.

Use direct calls when:

- Immediate response is required.
- Only one component is involved.

---

# 11. Event Storage

Important business events may be stored for:

- Audit.
- Debugging.
- Replay.
- Analytics.

Storage strategy depends on event importance.

---

# 12. Realtime Events

Some events may support live updates.

Examples:

```
task_completed

employee_clocked_in

announcement_published
```

These may be delivered through realtime channels.

---

# 13. MVP Event Strategy

Initial implementation should use:

- PostgreSQL event records.
- Supabase Realtime where appropriate.
- Background jobs for asynchronous processing.

Avoid premature distributed event infrastructure.

---

# 14. Future Enhancements

Future versions may introduce:

- Dedicated message brokers.
- Event streaming.
- External integration events.
- Event replay systems.

---

# 15. Related Specifications

- API-004 Workflow Engine
- API-007 Background Jobs
- API-008 Logging
- ARCH-004 Event-Driven Architecture
- RT-001 Event Architecture

---

# 16. Summary

ShiftOS uses events to create loose coupling between business modules.

By representing important business actions as immutable events, the platform can support notifications, analytics, realtime updates and future integrations without creating tightly connected services.
