# ShiftOS Notification Priority Levels

**Document ID:** NOTIF-004

**Document Title:** Priority Levels

**Version:** 1.0.0

**Status:** Approved

**Classification:** Notification Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the notification priority system used throughout ShiftOS.

Priority Levels determine how notifications are presented, ordered and delivered based on their operational importance.

Priority affects visibility and delivery behavior but does not change the underlying business event.

---

# 2. Priority Philosophy

Not every notification deserves the same level of attention.

Priority Levels help users focus on the most important operational events while reducing notification fatigue.

The Notification Service is responsible for assigning notification priority according to business rules.

---

# 3. Supported Priority Levels

ShiftOS supports four notification priorities:

- Informational
- Reminder
- Warning
- Critical

Each level represents increasing operational urgency.

---

# 4. Informational

Informational notifications communicate routine operational events.

Examples:

- Schedule published.
- Task completed.
- Announcement available.
- Employee profile updated.

Characteristics:

- Low urgency.
- No immediate action required.
- Displayed using standard notification styling.

---

# 5. Reminder

Reminder notifications encourage users to complete expected activities.

Examples:

- Upcoming shift.
- Task due soon.
- Pending acknowledgement.
- Draft schedule awaiting publication.

Characteristics:

- Medium urgency.
- Time-sensitive.
- May be repeated according to retry rules.

---

# 6. Warning

Warning notifications indicate operational issues that should receive attention.

Examples:

- Late clock-in detected.
- Task overdue.
- Schedule conflict identified.
- Repeated attendance issues.

Characteristics:

- High operational importance.
- Recommended user action.
- Displayed prominently within the application.

---

# 7. Critical

Critical notifications indicate events with significant operational or security impact.

Examples:

- Account suspended.
- Organization security alert.
- Emergency announcement.
- Critical system outage affecting operations.

Characteristics:

- Highest priority.
- Immediate visibility.
- May use multiple delivery channels.
- May override certain user notification preferences where permitted by organization policy.

Critical notifications should remain rare.

---

# 8. Priority Ordering

Notifications should be displayed in the following order:

```
Critical

↓

Warning

↓

Reminder

↓

Informational
```

Within the same priority level, newer notifications appear before older ones unless otherwise specified.

---

# 9. Priority Assignment

Priority is determined using:

- Event type.
- Business rules.
- Organization policies.
- Operational context.

The originating operational domain should not assign notification priority directly.

---

# 10. Permissions

Priority does not affect authorization.

Users only receive notifications they are authorized to view, regardless of priority.

Permission checks always occur before notification delivery.

---

# 11. Database Considerations

Recommended field:

```
notifications

priority
```

Supported values:

```
informational

reminder

warning

critical
```

Priority values should be standardized across the platform.

---

# 12. Audit Requirements

Priority assignment itself does not require audit logging.

Changes to notification priority caused by updated business rules or administrative actions may be recorded for operational diagnostics where appropriate.

---

# 13. Future Enhancements

Future versions may support:

- Organization-defined priority mappings.
- AI-assisted priority classification.
- Dynamic priority adjustment.
- Escalation based on user inactivity.
- Industry-specific priority policies.

---

# 14. Related Specifications

- NOTIF-001 Notification Philosophy
- NOTIF-002 Event Triggers
- NOTIF-003 Delivery Channels
- NOTIF-005 Read States
- NOTIF-006 Retry Rules
- NOTIF-007 User Preferences

---

# 15. Summary

Notification Priority Levels provide a consistent framework for presenting operational events according to their importance.

By centralizing priority assignment within the Notification Service, ShiftOS ensures a predictable user experience, reduces notification fatigue and delivers urgent information through appropriate channels while maintaining consistent business behavior across all domains.
