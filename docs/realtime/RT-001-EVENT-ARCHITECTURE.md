# ShiftOS Realtime Event Architecture

**Document ID:** RT-001

**Document Title:** Event Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** Realtime Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the realtime event architecture used throughout ShiftOS.

The Realtime Service enables connected clients to receive live operational updates whenever business events occur.

Operational domains publish events, while the Realtime Service distributes those events to authorized connected users.

---

# 2. Architecture Philosophy

Operational domains own business logic.

The Realtime Service owns event distribution.

This separation prevents business domains from becoming responsible for client synchronization and allows realtime functionality to evolve independently.

---

# 3. Architecture Overview

The standard event flow is:

```
Business Event

↓

Domain Service

↓

Realtime Event Published

↓

Realtime Service

↓

Authorization Check

↓

Connected Clients

↓

User Interface Updated
```

Business domains never communicate directly with client devices.

---

# 4. Event Sources

Realtime events may originate from any operational domain.

Examples include:

- Organization updates.
- Employee updates.
- Schedule changes.
- Shift changes.
- Attendance events.
- Task updates.
- Announcement publications.
- Notification creation.
- Shifty recommendations.

Future domains may publish realtime events without modifying the Realtime Service architecture.

---

# 5. Event Structure

Every realtime event should include:

- Event identifier.
- Event type.
- Organization identifier.
- Branch identifier (where applicable).
- Resource type.
- Resource identifier.
- Event timestamp.
- Event version.
- Minimal event payload.

Clients should retrieve full resource data when necessary rather than relying on large event payloads.

---

# 6. Event Publishing

Business domains publish events after a successful transaction.

Events should never be published for:

- Failed transactions.
- Rolled-back operations.
- Unauthorized operations.

Only committed business changes generate realtime events.

---

# 7. Event Distribution

The Realtime Service determines which connected users should receive an event based on:

- Organization.
- Branch.
- User role.
- Permissions.
- Resource visibility.

Unauthorized users must never receive realtime events.

---

# 8. Event Ordering

Events should be delivered in the order they are committed for a given resource whenever practical.

Clients should use timestamps and version numbers to resolve delayed or out-of-order deliveries.

Realtime delivery should favor consistency over speed when conflicts arise.

---

# 9. Event Reliability

Realtime events improve responsiveness but are not the system of record.

If a client:

- Disconnects,
- Misses events,
- Experiences network interruptions,

it must synchronize with the server upon reconnection.

The database remains the authoritative source of truth.

---

# 10. Security

Every event must pass authorization checks before delivery.

The Realtime Service must enforce:

- Organization isolation.
- Branch isolation.
- Role-based permissions.
- Resource-level visibility.

Realtime communication must never expose unauthorized operational data.

---

# 11. Database Considerations

Realtime events are generated from committed operational changes.

No business data should be duplicated solely for realtime delivery.

If event persistence is required for diagnostics or replay, a dedicated event log may be maintained separately from operational tables.

---

# 12. Audit Requirements

Realtime event delivery does not replace operational audit logging.

Operational actions continue to generate audit records within their originating domains.

Optional diagnostics may record:

- Event published.
- Event delivered.
- Event delivery failed.
- Event processing errors.

---

# 13. Future Enhancements

Future versions may support:

- Event replay.
- Event subscriptions.
- Selective channel subscriptions.
- Distributed event streaming.
- Cross-region event delivery.
- Advanced event analytics.

---

# 14. Related Specifications

- RT-002 Live Updates
- RT-003 Presence
- RT-004 Synchronization Rules
- RT-005 Conflict Resolution
- NOTIF-002 Event Triggers
- SCH-007 Schedule Publishing
- ATT-002 Clock In
- TASK-002 Task Assignment

---

# 15. Summary

The ShiftOS Realtime Event Architecture provides a centralized mechanism for distributing operational changes across connected clients.

By separating business logic from realtime communication, enforcing authorization before event delivery and treating the database as the authoritative source of truth, ShiftOS achieves a scalable, secure and maintainable realtime infrastructure suitable for enterprise workforce operations.
