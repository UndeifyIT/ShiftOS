# ShiftOS Notice Board

**Document ID:** COM-002

**Document Title:** Notice Board

**Version:** 1.0.0

**Status:** Approved

**Classification:** Communication Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the Notice Board within ShiftOS.

The Notice Board serves as the central location where users view active announcements and operational communications relevant to them.

It provides a personalized feed of organization-approved announcements based on the user's role, branch and access permissions.

---

# 2. Notice Board Philosophy

The Notice Board is a read-focused communication hub.

It is not a messaging platform or discussion forum.

Its purpose is to ensure users can quickly access important operational information without unnecessary distractions.

Only announcements that the user is authorized to view appear on their Notice Board.

---

# 3. Notice Board Workflow

The standard workflow is:

```
Manager Publishes Announcement

↓

Visibility Rules Applied

↓

Eligible Users Receive Notification

↓

Announcement Appears on Notice Board

↓

User Opens Announcement

↓

Acknowledgement (If Required)

↓

Announcement Remains Until Expired or Archived
```

---

# 4. Display Order

Announcements are displayed using the following priority:

1. Critical priority announcements.
2. High priority announcements.
3. Most recently published announcements.
4. Older active announcements.

Pinned announcements always appear above standard announcements.

---

# 5. Announcement Information

Each Notice Board item displays:

- Title.
- Brief preview.
- Priority.
- Category.
- Published date.
- Branch (where applicable).
- Author.
- Read status.
- Acknowledgement status (if required).

Selecting an item opens the full announcement.

---

# 6. Active Announcements

The Notice Board displays only active announcements.

Announcements are removed from the active Notice Board when they are:

- Archived.
- Expired.
- No longer visible to the user due to updated visibility rules.

Historical announcements remain accessible through Communication History where permitted.

---

# 7. Read Status

ShiftOS records whether an announcement has been viewed.

Possible statuses include:

- Unread.
- Read.

Viewing an announcement does not automatically satisfy an acknowledgement requirement.

---

# 8. Search and Filtering

Users may search announcements by:

- Title.
- Keywords.

Managers and supervisors may additionally filter by:

- Branch.
- Category.
- Priority.
- Publication date.
- Author.

Employees may filter only their own visible announcements.

---

# 9. Offline Behaviour

Previously synchronized announcements remain available for viewing when the device is offline.

Users cannot receive newly published announcements until the device reconnects.

Read status and acknowledgements created while offline should synchronize automatically when connectivity is restored.

---

# 10. Permissions

| Permission                  | Manager | Supervisor |          Staff           | Admin _(Future)_ |
| --------------------------- | :-----: | :--------: | :----------------------: | :--------------: |
| View Notice Board           |  Allow  |   Allow    |          Allow           |      Allow       |
| Open Announcement           |  Allow  |   Allow    |          Allow           |      Allow       |
| Search Announcements        |  Allow  |   Allow    |          Allow           |      Allow       |
| Filter Announcements        |  Allow  |   Allow    |         Limited          |      Allow       |
| View Archived Announcements |  Allow  |   Allow    | Own Visible History Only |      Allow       |

---

# 11. Database Considerations

The Notice Board is generated dynamically.

Primary sources include:

```
announcements

announcement_visibility

announcement_reads

announcement_acknowledgements
```

No dedicated `notice_board` table is required.

Content should be assembled dynamically based on the user's permissions and visibility rules.

---

# 12. Audit Requirements

Viewing announcements does not generate audit records.

The following events are auditable:

- Announcement published.
- Announcement archived.
- Read status recorded.
- Acknowledgement submitted.
- Visibility changed.

Audit records include:

- User.
- Announcement.
- Action.
- Timestamp.

---

# 13. Future Enhancements

Future versions may support:

- Pinned announcements.
- Rich media previews.
- Announcement reactions (non-discussion).
- Department-specific Notice Boards.
- AI-prioritized announcements.
- Personalized announcement recommendations.

---

# 14. Related Specifications

- COM-001 Announcements
- COM-003 Employee Acknowledgements
- COM-004 Message Visibility Rules
- COM-005 Communication History

---

# 15. Summary

The Notice Board provides a centralized, personalized view of operational announcements within ShiftOS.

By displaying only relevant communications based on user permissions, organizational structure and visibility rules, the Notice Board ensures employees, supervisors and managers stay informed without introducing the complexity of real-time messaging or discussion platforms.
