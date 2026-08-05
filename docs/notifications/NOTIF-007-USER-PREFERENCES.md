# ShiftOS Notification User Preferences

**Document ID:** NOTIF-007

**Document Title:** User Preferences

**Version:** 1.0.0

**Status:** Approved

**Classification:** Notification Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how users manage their personal notification preferences within ShiftOS.

User Preferences allow individuals to customize how they receive eligible notifications while ensuring that organization-required notifications continue to be delivered.

---

# 2. Preference Philosophy

Users should control their notification experience wherever appropriate.

However, personal preferences must never prevent the delivery of notifications that are required for:

- Security.
- Compliance.
- Organization policy.
- Critical operational events.

Organization policies always take precedence over personal preferences.

---

# 3. Preference Categories

Users may configure preferences for:

### Delivery Channels

- In-app notifications.
- Push notifications.
- Email notifications.

Availability depends on supported platforms and organization policy.

---

### Notification Categories

Examples include:

- Schedule updates.
- Shift changes.
- Attendance reminders.
- Task notifications.
- Announcement notifications.
- Shifty recommendations.
- Productivity suggestions.

Each category may support independent preference settings.

---

# 4. Preference Levels

For eligible notification categories, users may choose:

- Enabled.
- Disabled.

Some categories may additionally support:

- Immediate delivery.
- Daily summary (Future).
- Weekly summary (Future).

Available options depend on organization configuration.

---

# 5. Mandatory Notifications

The following types of notifications may not be disabled:

- Security notifications.
- Account access notifications.
- Password reset notifications.
- Emergency organization announcements.
- Mandatory acknowledgements.
- Organization-required operational notifications.

These notifications are always delivered through the appropriate channels.

---

# 6. Organization Policies

Organizations may define notification policies that:

- Require specific delivery channels.
- Disable unsupported channels.
- Prevent users from changing selected preferences.
- Define default notification settings.

User preferences are always evaluated together with organization policies before notification delivery.

---

# 7. Preference Changes

Users may update their notification preferences at any time.

Changes should:

- Take effect immediately where practical.
- Apply only to future notifications.
- Never modify previously generated notifications.

Preference updates should be validated before being saved.

---

# 8. Multi-Device Behavior

Notification preferences belong to the user account, not a specific device.

When a user signs in on multiple devices:

- Preferences remain consistent.
- Eligible notifications follow the configured preferences.
- Device-specific delivery depends on channel availability.

---

# 9. Permissions

Users may modify only their own notification preferences.

Administrators may manage organization-wide notification policies but cannot modify individual user preferences unless explicitly authorized by organizational policy.

---

# 10. Database Considerations

Recommended table:

```
notification_preferences

id

user_id

notification_category

delivery_channel

enabled

created_at

updated_at
```

Organization-wide notification policies should be stored separately from user preferences.

---

# 11. Audit Requirements

The following events should generate audit records:

- Notification preference created.
- Notification preference updated.
- Notification preference reset.
- Organization notification policy changed.

Preference changes may affect future notification delivery and should therefore be auditable.

---

# 12. Future Enhancements

Future versions may support:

- Quiet hours.
- Do Not Disturb schedules.
- Time-zone aware delivery.
- Intelligent notification summaries.
- AI-assisted notification personalization.
- Temporary notification muting.

---

# 13. Related Specifications

- NOTIF-001 Notification Philosophy
- NOTIF-002 Event Triggers
- NOTIF-003 Delivery Channels
- NOTIF-004 Priority Levels
- NOTIF-005 Read States
- NOTIF-006 Retry Rules

---

# 14. Summary

Notification User Preferences allow users to personalize how eligible notifications are delivered while ensuring that mandatory operational, security and compliance notifications remain unaffected.

By separating personal preferences from organization-enforced policies, ShiftOS provides flexibility without compromising operational reliability or organizational governance.
