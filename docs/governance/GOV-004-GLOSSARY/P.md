# ShiftOS Dictionary — P

**Document ID:** GOV-DICT-P

**Title:** ShiftOS Dictionary – Terms Beginning with "P"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **P**.

These definitions are authoritative and shall be used consistently across ShiftOS specifications, engineering documentation, APIs, database design, reporting, testing and user interfaces.

---

# Pagination

## Business Definition

Pagination is the process of dividing large collections of information into manageable sections.

---

## Technical Definition

ShiftOS primarily uses cursor (keyset) pagination for high-volume datasets to improve scalability and query performance.

---

## Business Context

Pagination is used for:

- Employees
- Shifts
- Attendance
- Tasks
- Notifications
- Audit Logs

---

## Related Specifications

- UI-006 Data Tables
- DB-007 Indexes

---

## Related Terms

- Cursor
- Query
- Performance

---

# Password

## Business Definition

A Password is the confidential credential a user provides to authenticate their identity.

---

## Technical Definition

Passwords are never stored in plain text and are managed through the authentication provider.

---

## Business Context

Passwords are created during:

- Organization registration
- Invitation acceptance
- Password reset

---

## Related Specifications

- USR-003 Password Policy
- USR-006 Password Reset

---

## Related Terms

- Authentication
- Login
- Session

---

# Password Policy

## Business Definition

Password Policy defines the rules governing password creation, storage and usage.

---

## Technical Definition

The policy specifies minimum complexity, reset procedures and security requirements.

---

## Business Context

The policy helps protect user accounts from unauthorized access.

---

## Related Specifications

- USR-003 Password Policy
- SEC-002 Authentication

---

## Related Terms

- Password
- Authentication
- Lockout

---

# Payroll Preparation

## Business Definition

Payroll Preparation is the process of generating attendance and working-hour information for export to an external payroll system.

---

## Technical Definition

ShiftOS prepares payroll-related data but does not calculate salaries or process payroll in the MVP.

---

## Business Context

Prepared information may include:

- Hours worked
- Overtime
- Attendance summary
- Absences
- Late arrivals

---

## Related Specifications

- REP-006 Payroll Preparation

---

## Related Terms

- Attendance
- Export
- Report

---

## Notes

Payroll processing itself is outside the MVP scope.

---

# Performance

## Business Definition

Performance refers to how efficiently ShiftOS responds to user actions and processes operational workloads.

---

## Technical Definition

Performance is measured through metrics such as response time, query execution time and resource utilization.

---

## Business Context

High performance is especially important for:

- Dashboard loading
- Scheduling
- Attendance
- Search
- Reporting

---

## Related Specifications

- OPS-003 Monitoring
- ARCH-009 Scalability Strategy

---

## Related Terms

- Latency
- Monitoring
- KPI

---

# Permission

## Business Definition

A Permission defines an action a user is authorized to perform.

---

## Technical Definition

Permissions are enforced through backend authorization, Row-Level Security and business rules.

---

## Business Context

Examples include:

- Create Shift
- Edit Shift
- Approve Attendance Correction
- View Reports
- Manage Employees

---

## Related Specifications

- PER-005 Permission Matrix
- PER-006 Access Rules

---

## Related Terms

- Role
- Authorization
- Policy

---

# Permission Matrix

## Business Definition

The Permission Matrix is the authoritative definition of which actions each role may perform.

---

## Technical Definition

The matrix maps roles to permissions and is enforced server-side.

---

## Business Context

The matrix distinguishes:

- Managers
- Supervisors
- Employees

---

## Related Specifications

- PER-005 Permission Matrix

---

## Related Terms

- Permission
- Role

---

# Platform

## Business Definition

The Platform refers to the complete ShiftOS system, including frontend, backend, database and infrastructure.

---

## Technical Definition

The platform consists of interconnected services operating as a single SaaS application.

---

## Related Terms

- System
- Architecture

---

# Policy

## Business Definition

A Policy is a documented rule governing system behavior or user actions.

---

## Technical Definition

Policies may be implemented in business logic, security rules or operational procedures.

---

## Business Context

Examples include:

- Password Policy
- Attendance Policy
- Security Policy
- Retention Policy

---

## Related Terms

- Rule
- Validation
- Governance

---

# Position

## Business Definition

A Position describes the operational role an employee performs within the business.

---

## Technical Definition

Positions are organizational data and do not determine application permissions.

---

## Business Context

Examples include:

- Cashier
- Baker
- Stock Clerk
- Cleaner

---

## Related Specifications

- EMP-004 Positions & Roles

---

## Related Terms

- Employee
- Job Title
- Role

---

## Notes

Permissions are determined by user roles, not employment positions.

---

# PostgreSQL

## Business Definition

PostgreSQL is the relational database system used by ShiftOS.

---

## Technical Definition

All persistent operational data is stored within PostgreSQL through Supabase.

---

## Related Specifications

- DB-001 Database Philosophy

---

## Related Terms

- Database
- Table
- Migration

---

# Presence

## Business Definition

Presence indicates whether a user is currently active within the application.

---

## Technical Definition

Presence information is maintained through realtime connections.

---

## Business Context

Presence may support future collaboration features.

---

## Related Specifications

- RT-003 Presence

---

## Related Terms

- Realtime
- Session

---

# Primary Key

## Business Definition

A Primary Key uniquely identifies each record within a database table.

---

## Technical Definition

Every ShiftOS table contains exactly one primary key.

---

## Related Specifications

- DB-006 Constraints

---

## Related Terms

- Foreign Key
- UUID
- Identifier

---

# Product Bible

## Business Definition

The Product Bible is the single source of truth for every product, technical and business decision within ShiftOS.

---

## Technical Definition

It consists of the complete specification library maintained under version control.

---

## Business Context

The Product Bible is referenced before design, development, testing and deployment.

---

## Related Terms

- Specification
- Governance
- Documentation

---

## Notes

All implementation should follow the Product Bible. If implementation and documentation conflict, the documentation must be updated or the implementation corrected.

---

# Product Principle

## Business Definition

A Product Principle is a fundamental rule that guides product decisions.

---

## Technical Definition

Product Principles influence prioritization, UX, architecture and engineering choices.

---

## Business Context

Examples include:

- Simplicity first
- Security by default
- Mobile-friendly
- Auditability
- Multi-tenant by design

---

## Related Specifications

- 0.6 Product Principles

---

## Related Terms

- Philosophy
- Governance

---

# Profile

## Business Definition

A Profile contains the personal and operational information associated with a user or employee.

---

## Technical Definition

Profiles store user attributes while authentication information remains separate.

---

## Business Context

Profiles include:

- Name
- Contact details
- Photo
- Position
- Branch assignment

---

## Related Specifications

- USR-008 Profile Management
- EMP-001 Employee Profile

---

## Related Terms

- User
- Employee

---

# Progressive Web App (PWA)

## Business Definition

A Progressive Web App (PWA) is the primary delivery model for ShiftOS, providing an app-like experience through the web.

---

## Technical Definition

The ShiftOS PWA supports installation, responsive layouts, offline capabilities where appropriate and modern browser features from a single codebase.

---

## Business Context

Managers and supervisors primarily use the desktop experience but can install the PWA.

Employees primarily access ShiftOS through the installed PWA on mobile devices.

---

## Related Specifications

- ARCH-007 PWA Architecture
- UI-012 PWA Behaviour

---

## Related Terms

- Mobile Experience
- Offline Mode
- Responsive Design

---

## Notes

The PWA-first strategy replaces separate native mobile applications during the MVP.

---

# Project

## Business Definition

The Project refers to the complete development effort behind ShiftOS.

---

## Technical Definition

The project encompasses planning, design, engineering, testing, deployment and ongoing maintenance.

---

## Related Terms

- Product
- Roadmap
- Release

---

# Public API (Future)

## Business Definition

A Public API allows approved external systems to interact with ShiftOS programmatically.

---

## Technical Definition

Public APIs expose controlled endpoints secured through authentication and authorization mechanisms.

---

## Business Context

Potential integrations include:

- Payroll systems
- ERP platforms
- HR software

---

## Related Specifications

- INT-007 Public API

---

## Related Terms

- API
- Integration
- Webhook

---

## Notes

Public APIs are planned for future enterprise releases.

---

# Push Notification (Future)

## Business Definition

A Push Notification is a message delivered directly to a user's device, even when the application is not actively open.

---

## Technical Definition

Push notifications require platform notification services and user permission.

---

## Business Context

Future examples include:

- Shift reminders
- Task reminders
- Announcement alerts

---

## Related Specifications

- NOTIF-003 Delivery Channels

---

## Related Terms

- Notification
- Reminder
- PWA

---

## Notes

The MVP supports in-app and email notifications. Push notifications are planned for a future release.