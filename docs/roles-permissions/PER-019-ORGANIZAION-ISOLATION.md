# ShiftOS Organization Isolation

**Document ID:** PER-008

**Document Title:** Organization Isolation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Authorization / Multi-Tenant Security

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines how organization-level data isolation is enforced within ShiftOS.

Organization isolation ensures that each business using ShiftOS operates within a completely separate data environment.

No user, role or process may access data belonging to another organization unless explicitly authorized through a future platform-level administrative system.

---

# 2. Objectives

Organization isolation exists to:

- Protect customer data.
- Maintain secure multi-tenancy.
- Prevent cross-tenant data exposure.
- Support SaaS scalability.
- Enforce customer ownership boundaries.
- Protect sensitive business information.

---

# 3. Multi-Tenant Model

ShiftOS operates as a multi-tenant SaaS platform.

Each customer business represents one organization.

Example:

```
ShiftOS Platform

    |
    |
    ├── Organization A
    │       |
    │       ├── Branch 1
    │       ├── Branch 2
    │       └── Employees
    |
    |
    └── Organization B
            |
            ├── Branch 1
            ├── Branch 2
            └── Employees
```

Organizations are completely isolated from each other.

---

# 4. Organization Ownership Rules

Every organization-owned resource must belong to exactly one organization.

Examples:

| Resource | Organization Ownership |
|----------|------------------------|
| Users | Required |
| Branches | Required |
| Employees | Required |
| Departments | Required |
| Schedules | Required |
| Attendance Records | Required |
| Tasks | Required |
| Announcements | Required |
| Reports | Required |
| Subscription | Required |
| Business Settings | Required |
| Audit Logs | Required |

---

# 5. Organization Access Rules

## Rule 1 — Organization Membership Required

A user must belong to an organization before accessing protected resources.

Users without organization membership cannot access organization data.

---

## Rule 2 — Single Organization Context

During the MVP, users belong to one organization only.

A user's requests are always evaluated within their assigned organization.

---

## Rule 3 — No Cross-Organization Access

Users cannot:

- View another organization's employees.
- View another organization's branches.
- View another organization's schedules.
- View another organization's attendance.
- View another organization's reports.
- Modify another organization's settings.
- Access another organization's subscription information.

---

## Rule 4 — Organization Ownership Cannot Change Freely

Organization ownership relationships must not be modified through normal operational workflows.

Changes affecting organization ownership require privileged administrative processes.

---

# 6. Role Access Within Organization

Organization isolation applies before role permissions.

Example:

A Manager may have permission to view employees.

However:

- They may only view employees inside their organization.
- They cannot view employees from another organization.

Permissions never override organization boundaries.

---

# 7. Authentication Requirements

Authentication identifies the user.

Authorization confirms the user's organization access.

A valid login does not grant access to all ShiftOS data.

The system must verify:

1. User identity.
2. Organization membership.
3. Account status.
4. Resource ownership.
5. Permission level.

---

# 8. Database Requirements

All organization-owned tables must include an organization reference.

Example:

```
organizations

    |
    |
organization_id

    |
    |
employees
branches
attendance
tasks
schedules
```

Organization relationships must be enforced through:

- Foreign keys.
- Database constraints.
- Row-Level Security policies.
- Server-side validation.

---

# 9. Row-Level Security Requirements

Organization isolation must be enforced at the database level.

RLS policies should ensure:

- Users can only query their organization data.
- Users cannot insert records into another organization.
- Users cannot update another organization's records.
- Users cannot delete another organization's records.

---

# 10. Subscription Isolation

Subscriptions belong to organizations, not individual users.

A Manager or future Admin may manage the organization's subscription based on billing permissions.

Users leaving the organization do not affect subscription ownership.

---

# 11. Audit Requirements

Organization-sensitive actions should record:

- Organization ID.
- User performing the action.
- Resource affected.
- Action performed.
- Timestamp.

Audit records must remain isolated to their organization.

---

# 12. Future Platform Administration

Future ShiftOS platform administrators may require controlled access across organizations.

This access:

- Must be explicitly designed.
- Must be audited.
- Must not apply to normal customer users.

Customer organization boundaries remain protected.

---

# 13. Security Principles

## Tenant Isolation

Each organization is treated as a separate customer environment.

---

## Defense in Depth

Organization isolation should exist across:

- Database.
- Backend services.
- APIs.
- Application logic.

---

## Least Privilege

Users receive access only within their organization scope.

---

## No Trust in Client Applications

The frontend must never be considered a security boundary.

---

# 14. Related Specifications

- PER-003 Permission Evaluation
- PER-006 Access Rules
- PER-007 Branch Isolation
- SEC-005 Security Architecture
- ORG-002 Organization Model
- ORG-003 Subscription Ownership

---

# 15. Summary

Organization Isolation defines the highest security boundary in ShiftOS.

Every customer operates within an independent organization environment.

Users can only access resources belonging to their organization.

Organization isolation is enforced independently from roles and permissions to protect ShiftOS as a secure multi-tenant SaaS platform.