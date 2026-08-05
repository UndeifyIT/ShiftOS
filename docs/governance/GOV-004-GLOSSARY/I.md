# ShiftOS Dictionary — I

**Document ID:** GOV-DICT-I

**Title:** ShiftOS Dictionary – Terms Beginning with "I"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **I**.

These definitions are authoritative and shall be used consistently across specifications, engineering documentation, APIs, database design, testing and user interfaces.

---

# Identity

## Business Definition

Identity represents the verified digital identity of a person using ShiftOS.

---

## Technical Definition

An identity is established through authentication credentials and uniquely maps to a user account.

---

## Business Context

Every authenticated person has one identity regardless of their role.

Identity remains constant even if permissions or profile information change.

---

## Data Ownership

Authentication Service
→ User Account
→ Identity

---

## Used By

- Entire Platform

---

## Related Specifications

- USR-002 Authentication

---

## Related Terms

- User
- Authentication
- Session

---

# Identifier (ID)

## Business Definition

An Identifier (ID) is a unique value used to distinguish one record from another.

---

## Technical Definition

Identifiers may be UUIDs, database primary keys or organization-specific reference numbers.

---

## Business Context

Examples include:

- Organization ID
- Branch ID
- User ID
- Employee ID
- Shift ID
- Attendance ID
- Task ID

---

## Related Specifications

- DB-005 Tables

---

## Related Terms

- UUID
- Primary Key
- Record

---

# Import

## Business Definition

Import is the process of bringing external data into ShiftOS.

---

## Technical Definition

Imports validate incoming data before creating or updating records.

---

## Business Context

Future imports may include:

- Employee lists
- Shift templates
- Branch information

---

## Used By

- Managers

---

## Related Specifications

- MVP Post-Roadmap

---

## Related Terms

- Export
- Validation
- CSV

---

## Notes

Bulk import is planned for a future release.

---

# Incident

## Business Definition

An Incident is an unexpected event that negatively affects the availability, security or performance of ShiftOS.

---

## Technical Definition

Incidents are logged, classified and tracked until resolved.

---

## Business Context

Examples include:

- Service outage
- Database failure
- Authentication failure
- Security breach
- Notification delivery failure

---

## Used By

- Engineering Team

---

## Related Specifications

- OPS-003 Monitoring
- SEC-013 Incident Response

---

## Related Terms

- Downtime
- Recovery
- Monitoring

---

# Index

## Business Definition

An Index improves the speed at which information can be located.

---

## Technical Definition

Database indexes optimize query performance without changing stored data.

---

## Business Context

Indexes are essential for high-volume tables such as:

- Employees
- Shifts
- Attendance
- Notifications
- Audit Logs

---

## Related Specifications

- DB-007 Indexes

---

## Related Terms

- Database
- Query
- Performance

---

# Infrastructure

## Business Definition

Infrastructure refers to the underlying technology that hosts and operates ShiftOS.

---

## Technical Definition

Infrastructure includes hosting, databases, networking, storage, monitoring and deployment services.

---

## Business Context

The MVP infrastructure consists primarily of:

- Supabase
- PostgreSQL
- Next.js Hosting
- Object Storage
- Email Services

---

## Related Specifications

- OPS-001 Environments

---

## Related Terms

- Deployment
- Backend
- Environment

---

# Inactive Account

## Business Definition

An Inactive Account is a user account that cannot access ShiftOS until reactivated.

---

## Technical Definition

Inactive accounts remain stored but authentication and operational access are disabled.

---

## Business Context

Inactive accounts:

- Cannot log in
- Receive no notifications
- Cannot access operational data

Historical records remain preserved.

---

## Data Ownership

Organization
→ User
→ Account Status

---

## Related Specifications

- USR-009 Account Status

---

## Related Terms

- Active Account
- Suspension
- Archive

---

# Integration

## Business Definition

An Integration connects ShiftOS with an external system or service.

---

## Technical Definition

Integrations exchange information using APIs, webhooks or standardized file formats.

---

## Business Context

Examples include:

- Email Provider
- Payroll Export
- Calendar Sync
- WhatsApp
- SMS

---

## Used By

- System

---

## Related Specifications

- Volume 21 — Integrations

---

## Related Terms

- API
- Webhook
- Export

---

# Interface

## Business Definition

An Interface is the visual environment through which users interact with ShiftOS.

---

## Technical Definition

Interfaces include pages, components, forms, dialogs and navigation elements.

---

## Business Context

ShiftOS provides role-specific interfaces for:

- Managers
- Supervisors
- Employees

---

## Related Specifications

- Volume 17 — Screen Specifications

---

## Related Terms

- Dashboard
- Screen
- Navigation

---

# Invitation

## Business Definition

An Invitation is the controlled process through which a new user is granted access to an organization.

---

## Technical Definition

Invitations are secure, time-limited records containing verification information that allows a recipient to create an account and join the correct organization.

---

## Business Context

Current MVP invitation flow:

Manager invites Supervisor or Employee.

Recipient receives an email.

Recipient clicks the secure invitation link.

The recipient verifies their email, creates a password and completes account setup.

The account becomes active only after successful verification.

---

## Data Ownership

Organization
→ Invitation
→ Recipient

---

## Used By

- Managers

---

## Related Specifications

- USR-004 Invitations
- SM-003 Invitation Lifecycle

---

## Related Terms

- Email
- Verification
- User
- Authentication

---

## Notes

Email is the only supported invitation channel in the MVP.

---

# Invitation Token

## Business Definition

An Invitation Token is the secure value embedded within an invitation link.

---

## Technical Definition

Invitation tokens are cryptographically secure, single-use and expire automatically after a configured period.

---

## Business Context

Invitation tokens prevent unauthorized account creation.

---

## Related Specifications

- USR-004 Invitations

---

## Related Terms

- Token
- Authentication
- Expiry

---

# Isolation

## Business Definition

Isolation is the principle that ensures organizations and branches can access only their own authorized data.

---

## Technical Definition

Isolation is enforced using Row-Level Security (RLS), authorization rules and backend validation.

---

## Business Context

Types of isolation include:

- Organization Isolation
- Branch Isolation
- User Isolation

---

## Related Specifications

- PER-007 Branch Isolation
- PER-008 Organization Isolation
- SEC-004 Row-Level Security

---

## Related Terms

- Tenant
- Permission
- Authorization

---

## Notes

Isolation is one of the most critical security principles within ShiftOS.

---

# Information Architecture

## Business Definition

Information Architecture is the way information is organized so users can easily locate, understand and use it.

---

## Technical Definition

Information architecture defines navigation, screen hierarchy, grouping and content organization.

---

## Business Context

Good information architecture reduces cognitive load and improves productivity.

---

## Related Specifications

- UI-002 Navigation
- UI-003 Layout System

---

## Related Terms

- Navigation
- Dashboard
- UX

---

# Immutable Record

## Business Definition

An Immutable Record is a record that cannot be altered after creation.

---

## Technical Definition

Immutable records preserve historical accuracy for auditing, reporting and compliance.

---

## Business Context

Examples include:

- Audit Logs
- Historical Attendance
- Historical Notifications
- Employment History

---

## Data Ownership

Parent Entity
→ Immutable Record

---

## Related Specifications

- SEC-006 Audit Logging
- ATT-008 Attendance History

---

## Related Terms

- Audit Log
- History
- Archive

---

## Notes

When corrections are required, ShiftOS creates a new record or correction entry rather than modifying the original historical record.