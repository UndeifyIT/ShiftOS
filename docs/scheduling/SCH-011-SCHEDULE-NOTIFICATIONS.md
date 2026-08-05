# ShiftOS Schedule Notifications

**Document ID:** SCH-011

**Document Title:** Schedule Notifications

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedule-related notifications are generated and delivered within ShiftOS.

Schedule notifications keep managers, supervisors and employees informed of important scheduling events while minimizing unnecessary interruptions.

Notifications are intended to improve operational awareness rather than replace supervisor communication.

---

# 2. Notification Principles

## 2.1 Notifications Support Operations

Notifications inform users about important schedule events.

They do not replace normal operational communication between managers, supervisors and employees.

---

## 2.2 Only Relevant Users Are Notified

Notifications are sent only to users directly affected by a scheduling event.

Example:

```
Shift Reassigned

↓

Affected Employee

↓

Assigned Supervisor

↓

Manager
```

Other employees receive no notification.

---

## 2.3 Notifications Never Change Data

Receiving or dismissing a notification does not modify schedules or shifts.

Notifications are informational only.

---

## 2.4 Organization Policies Take Priority

Organizations may configure which schedule notifications are enabled.

Mandatory operational notifications cannot be disabled by individual users.

---

# 3. Notification Events

ShiftOS may generate notifications for:

- Schedule published
- Schedule republished
- Schedule updated
- Shift assigned
- Shift reassigned
- Shift removed
- Shift cancelled
- Upcoming shift reminder
- Schedule conflict resolved
- Emergency schedule update

---

# 4. Notification Recipients

## Managers

May receive notifications for:

- Schedule published
- Schedule republished
- Schedule conflicts
- Supervisor schedule changes
- Emergency schedule updates

---

## Supervisors

May receive notifications for:

- Schedule validation failures
- Schedule publication status
- Schedule conflicts
- Manager overrides
- Schedule update confirmations

---

## Employees

May receive notifications for:

- Schedule published
- Shift assigned
- Shift updated
- Shift reassigned
- Shift cancelled
- Upcoming shift reminder

Employees do **not** receive notifications about:

- Other employees' schedules
- Draft schedules
- Internal planning changes
- Staffing shortages

---

# 5. Notification Timing

Notifications may be sent:

- Immediately
- At scheduled reminder times
- After publication
- Following significant schedule changes

Examples:

```
Schedule Published

↓

Immediate Notification
```

```
Upcoming Shift

↓

Reminder

↓

2 Hours Before Shift
```

Organization settings may define reminder timing.

---

# 6. Notification Delivery Channels

Supported delivery methods include:

- In-app notifications _(MVP)_
- Push notifications _(MVP)_
- Email _(Future)_

Future versions may also support:

- SMS
- WhatsApp
- Microsoft Teams
- Slack

---

# 7. Notification Content

Every notification should include:

- Notification title
- Short description
- Related schedule or shift
- Branch
- Date and time
- Timestamp

Example:

```
Schedule Published

Your schedule for
14 Jul – 20 Jul
has been published.
```

Notifications should remain concise and actionable.

---

# 8. Notification Preferences

Users may customize optional notifications where permitted.

Examples:

- Upcoming shift reminders
- General informational updates

Users may **not** disable:

- Mandatory operational alerts
- Security notifications
- Organization-required notifications

Organization policies override personal preferences.

---

# 9. Notification Permissions

| Permission                                   | Manager | Supervisor | Staff | Admin _(Future)_ |
| -------------------------------------------- | :-----: | :--------: | :---: | :--------------: |
| Receive Schedule Notifications               |  Allow  |   Allow    | Allow |      Allow       |
| Receive Schedule Published Notifications     |  Allow  |   Allow    | Allow |      Allow       |
| Receive Schedule Update Notifications        |  Allow  |   Allow    | Allow |      Allow       |
| Receive Shift Assignment Notifications       |  Allow  |   Allow    | Allow |      Allow       |
| Receive Shift Reminder Notifications         |  Allow  |   Allow    | Allow |      Allow       |
| Configure Personal Notification Preferences  |  Allow  |   Allow    | Allow |      Allow       |
| Configure Organization Notification Policies |  Allow  |    Deny    | Deny  |       Deny       |
| View Notification History                    |  Allow  |   Allow    | Allow |      Allow       |

---

# 10. Notification History

ShiftOS maintains a notification history for each user.

History includes:

- Notification type
- Delivery time
- Read status
- Related schedule or shift

Users may review previous notifications within the application.

---

# 11. Database Considerations

Recommended tables:

```
notifications

id

user_id

type

title

message

reference_type

reference_id

is_read

created_at
```

Optional delivery tracking:

```
notification_deliveries

id

notification_id

channel

status

sent_at

delivered_at
```

---

# 12. Audit Requirements

Generating notifications does not create audit records.

Audit records are generated by the underlying operational action, such as:

- Schedule published
- Schedule edited
- Shift reassigned
- Shift cancelled

Notification delivery logs may be retained for troubleshooting purposes.

---

# 13. Future Enhancements

Future versions may support:

- Smart notification batching
- AI-prioritized notifications
- Escalation reminders
- Multi-channel delivery preferences
- Quiet hours
- Rich notification actions
- Organization-specific notification templates

---

# 14. Related Specifications

- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SCH-008 Schedule Versioning
- SHIFT-008 Shift Assignment
- SEC-001 Authentication
- USR-004 User Preferences

---

# 15. Summary

Schedule Notifications keep managers, supervisors and employees informed about important scheduling events throughout the schedule lifecycle.

Notifications improve operational awareness without replacing supervisor communication, ensuring users receive timely, relevant information while respecting organization policies and maintaining a focused user experience.
