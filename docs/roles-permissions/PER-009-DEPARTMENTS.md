# ShiftOS Department Permission Matrix

**Document ID:** PER-002-06

**Document Title:** Department Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to department management within ShiftOS.

Departments organize employees and operational activities within a branch. They provide structure for scheduling, workforce management, reporting and operational oversight.

The department management model follows the ShiftOS operational philosophy:

- Managers administer department structures.
- Supervisors manage operations within assigned departments.
- Staff do not manage department information.
- The future Admin role has read-only visibility for business administration.

---

# 2. Permission Values

| Value | Meaning |
|-------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Department Permission Matrix

| Permission                      | Manager | Supervisor | Staff | Admin *(Future)* |
|---------------------------------|---------|------------|-------|------------------|
| View Department List            | Allow   | Allow      | Deny  | Allow            |
| View Department Details         | Allow   | Allow      | Deny  | Allow            |
| Search Departments              | Allow   | Allow      | Deny  | Allow            |
| Filter Departments              | Allow   | Allow      | Deny  | Allow            |
| Create Department               | Allow   | Deny       | Deny  | Deny             |
| Edit Department Information     | Allow   | Deny       | Deny  | Deny             |
| Archive Department              | Allow   | Deny       | Deny  | Deny             |
| Restore Department              | Allow   | Deny       | Deny  | Deny             |
| Assign Employees to Department  | Allow   | Allow      | Deny  | Deny             |
| Remove Employees from Department| Allow   | Allow      | Deny  | Deny             |
| View Department Workforce       | Allow   | Allow      | Deny  | Allow            |
| View Department Schedules       | Allow   | Allow      | Deny  | Allow            |
| View Department Attendance      | Allow   | Allow      | Deny  | Allow            |
| View Department Reports         | Allow   | Allow      | Deny  | Allow            |
| Export Department Reports       | Allow   | Allow      | Deny  | Allow            |
| View Department Audit Logs      | Allow   | Deny       | Deny  | Allow            |

---

# 4. Permission Rules

## Department Ownership

Managers are responsible for creating, configuring and maintaining departments.

Managers may create, edit, archive and restore departments.

---

## Supervisor Responsibilities

Supervisors manage the day-to-day operations within their assigned departments.

Supervisors may assign or remove employees from departments but cannot modify department structures.

---

## Staff Access

Staff members do not have access to department management functionality.

---

## Future Admin Responsibilities

The future Admin role provides administrative visibility.

Admins may:

- View departments.
- View workforce information.
- View reports.
- Export reports.
- View audit logs.

Admins cannot create, edit or archive departments.

---

# 5. Design Principles

## Organizational Structure

Departments provide organizational structure within each branch.

---

## Operational Simplicity

Supervisors manage operational activities within departments without modifying organizational structures.

---

## Least Privilege

Each role receives only the permissions necessary for its responsibilities.

---

## Auditability

All department configuration changes should generate permanent audit records.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- ORG-005 Departments
- ORG-004 Branch Structure
- WF-001 Workforce Model

---

# 7. Summary

The Department Permission Matrix defines how department management is controlled within ShiftOS.

Managers administer department structures.

Supervisors manage employees and daily operations within departments.

Staff have no department management permissions.

The future Admin role provides read-only visibility without operational control.