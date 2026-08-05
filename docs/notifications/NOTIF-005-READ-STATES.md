# ShiftOS Notification Read States

**Document ID:** NOTIF-005

**Document Title:** Read States

**Version:** 1.0.0

**Status:** Approved

**Classification:** Notification Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS tracks notification read states.

Read States represent a user's interaction with a notification after it has been successfully delivered.

Tracking read states enables better user experience, reminder logic and operational reporting without affecting the underlying business event.

---

# 2. Read State Philosophy

Receiving a notification does not mean the user has seen it.

Viewing a notification does not necessarily mean the user has acted on it.

ShiftOS therefore separates:

- Delivery status.
- Read status.
- Operational completion.

Each represents a different stage in the notification lifecycle.

---

# 3. Notification Lifecycle

The user-facing lifecycle is:

```
Notification Created

↓

Delivered

↓

Unread

↓

Read

↓

Dismissed (Optional)

↓

Archived (Optional)
```

The operational event remains unchanged throughout this lifecycle.

---

# 4. Supported Read States

Every notification has one read state.

Supported states include:

- Unread
- Read
- Dismissed
- Archived

---

# 5. Unread

A notification is **Unread** when:

- It has been successfully delivered.
- The user has not yet opened or viewed it.

Unread notifications should be visually distinguishable from read notifications.

---

# 6. Read

A notification becomes **Read** when the user opens or views it.

Reading a notification:

- Does not complete the underlying task.
- Does not acknowledge the notification unless explicitly required.
- Does not remove the notification.

Read notifications remain available in notification history.

---

# 7. Dismissed

Some notifications may be dismissed.

Dismissal means:

- The user no longer wants the notification displayed.
- The underlying operational event is unaffected.

Dismissed notifications may still appear in notification history.

Certain mandatory notifications cannot be dismissed.

---

# 8. Archived

Notifications may be archived automatically according to retention policies.

Archived notifications:

- Are removed from active notification lists.
- Remain available for historical reference where permitted.
- Continue to support reporting requirements.

---

# 9. Mandatory Notifications

Certain notifications require explicit user attention.

Examples include:

- Required acknowledgements.
- Security notifications.
- Mandatory organization communications.

These notifications may remain unread until the required action has been completed.

Reading alone does not satisfy mandatory acknowledgement requirements.

---

# 10. Read State Transitions

Valid transitions include:

```
Unread

↓

Read

↓

Dismissed

↓

Archived
```

Archived notifications should not return to active states.

---

# 11. Permissions

Users may only change the read state of notifications assigned to them.

Managers cannot mark another user's personal notifications as read.

Notification visibility remains governed by existing authorization rules.

---

# 12. Database Considerations

Recommended fields:

```
notifications

read_state

read_at

dismissed_at

archived_at
```

Supported values:

```
unread

read

dismissed

archived
```

Read state should be stored independently of delivery status.

---

# 13. Audit Requirements

General read state changes do not require operational audit logging.

Read timestamps may be retained for:

- Notification analytics.
- User experience improvements.
- Compliance reporting where applicable.

Mandatory acknowledgements continue to be audited within the Communication domain.

---

# 14. Future Enhancements

Future versions may support:

- Read receipts across multiple devices.
- Notification pinning.
- Snoozing notifications.
- Bulk read actions.
- AI-prioritized unread notifications.

---

# 15. Related Specifications

- NOTIF-001 Notification Philosophy
- NOTIF-003 Delivery Channels
- NOTIF-004 Priority Levels
- NOTIF-006 Retry Rules
- NOTIF-007 User Preferences
- COM-003 Employee Acknowledgements

---

# 16. Summary

Notification Read States define how ShiftOS tracks user interaction with delivered notifications.

By separating delivery, reading and operational completion, ShiftOS provides accurate notification tracking while maintaining a clear distinction between user awareness and business process completion.
