# ShiftOS Branch Isolation

**Document ID:** PER-007

**Document Title:** Branch Isolation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Authorization / Data Security

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines how branch-level data isolation is enforced within ShiftOS.

Branch isolation ensures users can only access branch information they are authorized to view or manage.

This protects operational data and prevents unauthorized access between different business locations.

---

# 2. Objectives

Branch isolation exists to:

- Protect branch-specific data.
- Support multi-branch organizations.
- Prevent unauthorized cross-branch access.
- Maintain accurate operational ownership.
- Support secure reporting.
- Enable scalable branch management.

---

# 3. Branch Access Model

Every branch belongs to exactly one organization.

```
Organization

    ├── Branch A
    │
    ├── Branch B
    │
    └── Branch C
```

Users access branch data based on:

- Organization membership.
- Assigned branch.
- Role permissions.
- Feature permissions.

---

# 4. Branch Access Rules

## Rule 1 — Organization Boundary

A user may only access branches belonging to their organization.

Users cannot access branches from another organization.

---

## Rule 2 — Manager Branch Access

Managers may access all branches within their organization.

Managers may:

- View branch information.
- View branch reports.
- View branch workforce data.
- Manage branch settings.
- Manage branch assignments.

Managers cannot access branches outside their organization.

---

## Rule 3 — Supervisor Branch Access

Supervisors may only access their assigned branch.

Supervisors may access operational data including:

- Employees.
- Schedules.
- Attendance.
- Tasks.
- Announcements.
- Reports.

Supervisors cannot view or manage other branches.

---

## Rule 4 — Staff Branch Access

Staff members are restricted to their assigned branch.

Staff may only access information related to:

- Their employment.
- Their schedules.
- Their attendance records.
- Their assigned operational information.

Staff cannot access branch management information.

---

## Rule 5 — Future Admin Branch Access

The future Admin role may view all branches within the organization.

Admins may:

- View branch information.
- View branch reports.
- View branch activity.

Admins cannot perform operational actions unless explicitly granted.

---

# 5. Branch Ownership Rules

Every branch-owned record must reference a branch.

Examples:

| Resource | Branch Ownership |
|----------|------------------|
| Employees | Required |
| Schedules | Required |
| Attendance Records | Required |
| Tasks | Required |
| Announcements | Required |
| Reports | Required |
| Departments | Required |

---

# 6. Branch Data Access Evaluation

Before allowing access to branch data, the system must verify:

1. User is authenticated.
2. User belongs to the same organization.
3. User has access to the requested branch.
4. User role permits the requested action.
5. Feature permissions allow the operation.

---

# 7. Cross-Branch Restrictions

Users must not be able to:

- View another branch's employees.
- View another branch's attendance.
- View another branch's schedules.
- Modify another branch's tasks.
- Access another branch's reports.
- Export another branch's data without permission.

---

# 8. Multi-Branch Operations

Managers may perform organization-wide actions where permitted.

Examples:

- Comparing branch performance.
- Viewing workforce summaries.
- Viewing organization reports.

These actions must respect organization isolation.

---

# 9. Temporary Operational Takeover

Temporary Operational Takeover follows branch restrictions.

When a Manager temporarily takes over Supervisor responsibilities:

- The takeover applies only to the affected branch.
- Actions performed are recorded against that branch.
- The Manager does not gain access to unrelated branch operations.

---

# 10. Audit Requirements

Branch-sensitive actions should record:

- User performing the action.
- Organization.
- Branch.
- Action performed.
- Timestamp.
- Previous value.
- New value.

---

# 11. Security Principles

## Branch-Level Least Privilege

Users should only access branches required for their responsibilities.

---

## Data Separation

Branch data must remain logically separated even within the same organization.

---

## Backend Enforcement

Branch isolation must be enforced server-side.

Frontend restrictions are not considered security controls.

---

# 12. Related Specifications

- PER-001 Role Definitions
- PER-003 Permission Evaluation
- PER-006 Access Rules
- PER-008 Organization Isolation
- ORG-004 Branch Structure
- SEC-005 Security Architecture

---

# 13. Summary

Branch Isolation ensures ShiftOS can securely support organizations with multiple supermarket locations.

Managers can oversee all branches within their organization.

Supervisors and Staff operate within their assigned branch.

The future Admin role provides administrative visibility without unnecessary operational control.

Branch isolation is enforced independently from feature permissions to maintain secure multi-tenant architecture.