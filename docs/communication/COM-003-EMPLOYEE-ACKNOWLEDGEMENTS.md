# ShiftOS Employee Acknowledgements

**Document ID:** COM-003

**Document Title:** Employee Acknowledgements

**Version:** 1.0.0

**Status:** Approved

**Classification:** Communication Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employees acknowledge important announcements within ShiftOS.

Employee Acknowledgements provide organizations with confirmation that operational communications have been seen and acknowledged by the intended recipients.

Acknowledgements improve accountability without replacing training or policy compliance processes.

---

# 2. Acknowledgement Philosophy

Not every announcement requires acknowledgement.

Organizations may choose whether an announcement simply needs to be visible or requires recipients to actively acknowledge that they have read it.

Acknowledgement confirms receipt of the communication.

It does not necessarily indicate agreement with its contents.

---

# 3. Acknowledgement Workflow

The standard workflow is:

```
Announcement Published

↓

Employee Receives Notification

↓

Employee Opens Announcement

↓

Acknowledgement Required?

↓

No

↓

Communication Complete

OR

Yes

↓

Employee Selects "Acknowledge"

↓

Acknowledgement Recorded
```

---

# 4. Requiring Acknowledgements

Managers may configure whether an announcement requires acknowledgement.

Examples include:

- New workplace policies.
- Safety procedures.
- Emergency instructions.
- Compliance notices.
- Operational process changes.

General announcements may not require acknowledgement.

---

# 5. Recording an Acknowledgement

When a user acknowledges an announcement, ShiftOS records:

- Announcement.
- User.
- Organization.
- Branch.
- Date and time.
- Device timestamp.

Each user may acknowledge an announcement only once.

---

# 6. Outstanding Acknowledgements

Announcements awaiting acknowledgement remain visible until:

- The user acknowledges them.
- The announcement expires.
- The announcement is archived.

Managers may monitor outstanding acknowledgements.

---

# 7. Reminder Notifications

Organizations may send reminder notifications for outstanding acknowledgements.

Reminder frequency is controlled by organization settings.

Reminders stop once acknowledgement has been recorded.

---

# 8. Permissions

| Permission                         | Manager |          Supervisor           | Staff | Admin _(Future)_ |
| ---------------------------------- | :-----: | :---------------------------: | :---: | :--------------: |
| Require Acknowledgement            |  Allow  | Allow _(Organization Policy)_ | Deny  |      Allow       |
| Submit Acknowledgement             |  Allow  |             Allow             | Allow |      Allow       |
| View Own Acknowledgements          |  Allow  |             Allow             | Allow |      Allow       |
| View Team Acknowledgements         |  Allow  |             Allow             | Deny  |      Allow       |
| View Organization Acknowledgements |  Allow  |             Deny              | Deny  |      Allow       |
| Export Acknowledgement Report      |  Allow  |             Deny              | Deny  |      Allow       |

---

# 9. Acknowledgement Status

Each recipient has one acknowledgement status per announcement.

Supported statuses:

- Not Required.
- Pending.
- Acknowledged.

Status is updated automatically based on the announcement configuration and user actions.

---

# 10. Database Considerations

Recommended table:

```
announcement_acknowledgements

id

announcement_id

user_id

organization_id

branch_id

acknowledged_at

created_at
```

Each user may have only one acknowledgement record for a specific announcement.

A unique constraint should exist on:

```
announcement_id

user_id
```

---

# 11. Audit Requirements

The following events generate audit records:

- Announcement published.
- Acknowledgement requirement enabled.
- Employee acknowledged announcement.
- Reminder notification sent.
- Acknowledgement report exported.

Audit records include:

- User.
- Announcement.
- Action.
- Timestamp.

---

# 12. Future Enhancements

Future versions may support:

- Digital signatures.
- Policy acceptance tracking.
- Training completion integration.
- Bulk reminder scheduling.
- Escalation for overdue acknowledgements.
- AI communication effectiveness insights.

---

# 13. Related Specifications

- COM-001 Announcements
- COM-002 Notice Board
- COM-004 Message Visibility Rules
- COM-005 Communication History

---

# 14. Summary

Employee Acknowledgements provide organizations with a reliable method of confirming that important operational communications have been received.

By recording acknowledgements separately from read status, ShiftOS enables managers to monitor communication compliance while maintaining a simple and efficient experience for supervisors and employees.
