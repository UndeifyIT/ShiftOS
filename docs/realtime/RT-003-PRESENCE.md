# ShiftOS Presence

**Document ID:** RT-003

**Document Title:** Presence

**Version:** 1.0.0

**Status:** Approved

**Classification:** Realtime Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS manages user presence within the platform.

Presence indicates whether a user is currently connected to ShiftOS and may be actively using the application.

Presence supports collaborative workflows while respecting user privacy and organizational permissions.

---

# 2. Presence Philosophy

Presence exists to improve collaboration, not to monitor employees.

It should answer simple operational questions such as:

- Is this user currently connected?
- Who is actively using this workspace?
- Is someone already editing this resource?

Presence should never be used for attendance tracking or employee performance evaluation.

Attendance is recorded only through the Attendance domain.

---

# 3. Presence States

Supported presence states include:

- Online
- Offline

Future versions may introduce additional states if operationally justified.

---

# 4. Presence Lifecycle

The standard lifecycle is:

```
User Signs In

↓

Connection Established

↓

Online

↓

Connection Lost
or
User Signs Out

↓

Offline
```

Presence should automatically update as connectivity changes.

---

# 5. Presence Visibility

Presence may be displayed for users involved in shared operational workflows.

Examples include:

- Schedule editing.
- Employee management.
- Task management.
- Branch administration.

Presence should not be displayed where it provides no operational value.

---

# 6. Collaborative Indicators

Where appropriate, ShiftOS may display indicators such as:

- "Manager is viewing this schedule."
- "Supervisor is editing this employee."
- "Another user is updating this task."

These indicators improve coordination and reduce conflicting edits.

Indicators should identify the activity without exposing unnecessary information.

---

# 7. Privacy

Presence information must respect:

- Organization boundaries.
- Branch visibility rules.
- User permissions.

Users must never see the presence of users outside their authorized scope.

Presence information should not expose device information, location or activity history.

---

# 8. Session Management

A user's presence should remain **Online** while an active authenticated session exists.

Presence should automatically change to **Offline** when:

- The user signs out.
- The session expires.
- The realtime connection is lost beyond the configured timeout.

Temporary network interruptions should not immediately change presence.

---

# 9. Permissions

Only authorized users may view another user's presence.

Presence visibility follows the same authorization model used throughout ShiftOS.

Presence never bypasses organization, branch or role-based access controls.

---

# 10. Database Considerations

Presence should be managed as transient realtime state.

Persistent storage is generally unnecessary.

If temporary persistence is required, it may include:

```
user_presence

user_id

status

last_seen_at
```

Presence records should not become part of permanent operational history.

---

# 11. Audit Requirements

Presence changes do not require operational audit logging.

Authentication events, session creation and sign-outs continue to be audited by the Security domain where applicable.

---

# 12. Future Enhancements

Future versions may support:

- Resource-level editing indicators.
- Shared editing sessions.
- Team activity indicators.
- Presence across multiple devices.
- Temporary "Do Not Disturb" status.
- Workspace collaboration insights.

---

# 13. Related Specifications

- RT-001 Event Architecture
- RT-002 Live Updates
- RT-004 Synchronization Rules
- RT-005 Conflict Resolution
- SEC Authentication and Session Management (Future)

---

# 14. Summary

ShiftOS Presence provides lightweight realtime awareness of connected users to support collaborative operational workflows.

By limiting presence to simple online status, enforcing permission boundaries and avoiding its use for attendance or employee monitoring, ShiftOS delivers collaboration benefits while protecting user privacy and maintaining a clear separation from workforce tracking.
