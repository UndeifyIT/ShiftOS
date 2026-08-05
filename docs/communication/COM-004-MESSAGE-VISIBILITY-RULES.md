# ShiftOS Message Visibility Rules

**Document ID:** COM-004

**Document Title:** Message Visibility Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Communication Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS determines which users can view announcements and operational communications.

Message Visibility Rules ensure that communications are delivered only to their intended audience while maintaining organization, branch and role isolation.

Visibility is determined automatically by the system.

---

# 2. Visibility Philosophy

Announcements should only be visible to users who are intended recipients.

Visibility is determined using organizational rules rather than manual distribution.

Users cannot access announcements outside their permitted scope.

---

# 3. Visibility Workflow

The standard workflow is:

```
Announcement Created

↓

Target Audience Selected

↓

Visibility Rules Evaluated

↓

Eligible Users Identified

↓

Announcement Published

↓

Visible Only To Eligible Users
```

Visibility is evaluated automatically whenever a user accesses the Notice Board.

---

# 4. Organization Isolation

Announcements never cross organization boundaries.

Users can only view announcements belonging to organizations where they have an active membership.

Organization isolation is enforced for every announcement request.

---

# 5. Branch Visibility

Announcements may target:

- Entire organization.
- One branch.
- Multiple branches.

Users only receive branch-specific announcements for branches they are authorized to access.

---

# 6. Role Visibility

Announcements may target one or more user roles.

Supported audiences include:

- Managers.
- Supervisors.
- Employees.

Examples:

- Manager-only operational updates.
- Supervisor instructions.
- Employee notices.
- Organization-wide announcements.

---

# 7. Combined Visibility Rules

Visibility is determined using all applicable rules.

A user must satisfy every required condition.

Example:

```
Organization

AND

Branch

AND

Role

↓

Announcement Visible
```

If any required condition fails, the announcement is not displayed.

---

# 8. Membership Changes

Visibility is evaluated dynamically.

Examples:

- Employee transfers to another branch.
- Supervisor changes role.
- User leaves the organization.
- User account is suspended.

Updated permissions immediately affect announcement visibility.

Previously viewed announcements remain accessible only if permitted by current visibility rules.

---

# 9. Expired and Archived Announcements

Expired or archived announcements are removed from the active Notice Board.

Historical visibility remains subject to user permissions and communication history policies.

---

# 10. Permissions

| Permission                    | Manager |          Supervisor           | Staff | Admin _(Future)_ |
| ----------------------------- | :-----: | :---------------------------: | :---: | :--------------: |
| View Eligible Announcements   |  Allow  |             Allow             | Allow |      Allow       |
| Configure Visibility Rules    |  Allow  | Allow _(Organization Policy)_ | Deny  |      Allow       |
| View Visibility Configuration |  Allow  |             Allow             | Deny  |      Allow       |
| Override Visibility Rules     |  Deny   |             Deny              | Deny  |       Deny       |

Visibility enforcement is performed by the system.

---

# 11. Database Considerations

Recommended mapping tables:

```
announcement_roles

announcement_branches

announcement_departments (future)
```

Visibility evaluation should also use:

```
organization_memberships

branch_assignments

user_roles
```

Visibility should never rely on client-side filtering.

All visibility checks must be enforced server-side.

---

# 12. Audit Requirements

The following events generate audit records:

- Announcement published.
- Visibility configuration updated.
- Target audience modified.
- Announcement archived.
- Announcement restored.

Audit records include:

- User.
- Announcement.
- Visibility changes.
- Timestamp.

---

# 13. Future Enhancements

Future versions may support:

- Department-level visibility.
- Position-based visibility.
- Dynamic audience groups.
- Smart audience recommendations.
- AI-assisted audience selection.
- Temporary communication groups.

---

# 14. Related Specifications

- COM-001 Announcements
- COM-002 Notice Board
- COM-003 Employee Acknowledgements
- COM-005 Communication History
- PER-006 Access Rules
- PER-007 Branch Isolation
- PER-008 Organization Isolation

---

# 15. Summary

Message Visibility Rules ensure operational communications are delivered only to authorized users.

By combining organization, branch and role-based visibility with server-side enforcement, ShiftOS provides secure, scalable and reliable communication while preserving tenant isolation and preventing unauthorized access to organizational announcements.
