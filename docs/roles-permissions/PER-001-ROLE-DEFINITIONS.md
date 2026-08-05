# ShiftOS Permission Matrix Index

**Document ID:** PER-002

**Document Title:** Permission Matrix Index

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document serves as the entry point for the ShiftOS Permission Matrix.

The Permission Matrix defines every action that can be performed within ShiftOS and specifies which system roles are authorized to perform those actions.

Rather than embedding permissions throughout feature specifications, ShiftOS maintains a centralized permission model that acts as the single source of truth for authorization.

Every permission enforced by the application must be defined within this Permission Matrix.

---

# 2. Objectives

The Permission Matrix exists to:

- Define every system permission.
- Establish role-based access control (RBAC).
- Ensure consistent authorization across the platform.
- Reduce duplicated permission definitions.
- Support security reviews and audits.
- Simplify future role expansion.
- Provide a reference for backend authorization logic.
- Support future custom roles without redesigning the permission model.

---

# 3. Permission Philosophy

ShiftOS follows the principle of **least privilege**.

Users should receive only the permissions required to perform their operational responsibilities.

Permissions are never granted based on:

- Job title.
- Department.
- Branch.
- Employment type.

Instead, permissions are granted through **system roles**.

---

# 4. Role Overview

The MVP includes three operational roles.

| Role | Description |
|------|-------------|
| **Manager** | Oversees organization operations and has the highest operational authority. |
| **Supervisor** | Manages day-to-day branch operations and workforce activities. |
| **Staff** | Performs operational work with limited access. |

Future versions will introduce:

| Future Role | Purpose |
|-------------|----------|
| **Admin** | Subscription management, billing, organization administration and security management. |

---

# 5. Permission Categories

Permissions are grouped into logical domains.

## Workforce

Employee management and workforce administration.

---

## Scheduling

Shift creation, publishing, editing and scheduling workflows.

---

## Attendance

Clock-ins, attendance adjustments, lateness, overtime and attendance monitoring.

---

## Tasks

Task creation, assignment, completion and monitoring.

---

## Announcements

Organization and branch communication.

---

## Organization

Organization-wide configuration and operational settings.

---

## Branches

Branch creation, configuration and management.

---

## Departments

Department management and employee assignments.

---

## Reports

Operational dashboards, analytics and exports.

---

## Security

Authentication, invitations, account status and audit logs.

---

## Billing

Subscription management and organization billing.

---

## Personal

Profile management and user preferences.

---

# 6. Permission Naming Convention

Every permission should represent a single action.

Examples:

```
invite_supervisor

publish_schedule

approve_attendance_adjustment

create_task

view_reports

edit_branch

change_employee_role
```

Permissions should describe capabilities rather than user interface elements.

Correct:

```
publish_schedule
```

Incorrect:

```
open_schedule_page
```

---

# 7. Permission Rules

Every permission should satisfy the following rules.

## Rule 1

Each permission represents one action.

---

## Rule 2

Permissions should not combine multiple actions.

Incorrect:

```
manage_employees
```

Correct:

```
create_employee

edit_employee

archive_employee

view_employee
```

---

## Rule 3

Permissions must remain stable even if the user interface changes.

---

## Rule 4

Permissions should describe business capabilities.

---

## Rule 5

Permissions should support future expansion.

---

# 8. Permission Inheritance

Higher operational roles generally inherit permissions from lower operational roles unless explicitly restricted.

Example:

```
Manager

↓

Supervisor

↓

Staff
```

Inheritance exceptions are documented within individual permission categories.

---

# 9. Approval Workflows

Some actions require approval rather than direct execution.

Examples include:

- Employee deactivation.
- Attendance adjustments.
- Future workforce operations.

Approval workflows are separate from permission assignment.

Having permission to request an action does not necessarily mean the user can execute it immediately.

---

# 10. Temporary Permission Elevation

ShiftOS supports controlled temporary permission elevation.

Example:

A Manager may temporarily assume Supervisor operational responsibilities when:

- The assigned Supervisor is unavailable.
- The Supervisor fails to begin an operational shift.
- Operational continuity requires immediate intervention.

Temporary permission elevation must:

- Be time-limited.
- Be fully audited.
- Be reversible.
- Never permanently change the user's assigned role.

---

# 11. Future Role Expansion

The permission model is designed to support future roles without requiring architectural redesign.

Examples include:

- Admin
- Regional Manager
- Area Manager
- HR Manager
- Payroll Officer
- Auditor
- External Consultant

These roles will be created by assigning existing permissions rather than redesigning the authorization system.

---

# 12. Permission Matrix Documents

The complete Permission Matrix is divided into the following specifications.

| Document | Scope |
|----------|-------|
| PER-002-01 | Workforce Permissions |
| PER-002-02 | Scheduling Permissions |
| PER-002-03 | Attendance Permissions |
| PER-002-04 | Task Permissions |
| PER-002-05 | Announcement Permissions |
| PER-002-06 | Organization Permissions |
| PER-002-07 | Branch Permissions |
| PER-002-08 | Department Permissions |
| PER-002-09 | Report Permissions |
| PER-002-10 | Security Permissions |
| PER-002-11 | Billing Permissions |
| PER-002-12 | Personal Permissions |

---

# 13. Relationship to Other Specifications

## Permission Domain

- PER-001 Role Definitions
- PER-003 Permission Inheritance
- PER-004 Approval Workflow Model *(Future)*

---

## Security Domain

- SEC-001 Authentication Model
- SEC-006 Session Management Model

---

## Organization Domain

- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model

---

# 14. Design Principles

## Least Privilege

Users receive only the permissions necessary to perform their responsibilities.

---

## Single Source of Truth

Every permission is defined exactly once.

---

## Auditability

Permission-sensitive actions must support audit logging.

---

## Scalability

The permission model should support future roles and platform modules without redesign.

---

## Operational Simplicity

Permissions should reflect real supermarket operations rather than organizational complexity.

---

# 15. Summary

The ShiftOS Permission Matrix is the authoritative specification for platform authorization.

It establishes a centralized, scalable and auditable permission model that supports:

- Secure Role-Based Access Control (RBAC).
- Operational clarity.
- Enterprise scalability.
- Future product expansion.

Every authorization decision within ShiftOS must ultimately trace back to the permissions defined within this Permission Matrix.