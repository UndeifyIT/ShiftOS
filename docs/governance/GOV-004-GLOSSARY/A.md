# ShiftOS Dictionary — A

**Document ID:** GOV-DICT-A

**Title:** ShiftOS Dictionary – Terms Beginning with "A"

**Version:** 1.0.0

**Status:** Approved

**Last Updated:** 2026-07-10

---

# Introduction

This document contains the official definitions of all ShiftOS terminology beginning with the letter **A**.

Definitions contained in this document are authoritative and SHALL be used consistently throughout all ShiftOS specifications, documentation, database design, APIs, UI design, reports and source code.

---

# Acknowledgement

## Definition

An acknowledgement is a recorded confirmation that a user has seen and accepted an announcement, notice or communication that requires confirmation.

Unlike simply viewing a message, an acknowledgement creates a permanent record that the recipient intentionally confirmed receipt.

---

## Business Context

Managers may publish announcements that require employees or supervisors to acknowledge them.

Examples include:

- New company policies
- Safety procedures
- Schedule changes
- Operational instructions
- Emergency notices

Acknowledgements improve accountability and provide evidence that important communications have been received.

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- COM-001 Announcements
- COM-003 Employee Acknowledgements

---

## Related Terms

- Announcement
- Notice
- Read Receipt
- Notification

---

## Notes

Reading an announcement does not automatically constitute an acknowledgement.

The system records acknowledgements separately.

---

## Examples

- Employee acknowledges updated safety policy.
- Supervisor confirms receipt of emergency operating procedure.

---

# Active Employee

## Definition

An Active Employee is an employee whose employment status permits participation in normal ShiftOS operations.

Active employees may receive shifts, tasks, announcements and attendance records.

---

## Business Context

Only active employees appear in scheduling and workforce planning.

Inactive employees are excluded from operational workflows.

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- EMP-002 Employment Status
- EMP-007 Employee Lifecycle

---

## Related Terms

- Employee
- Suspended Employee
- Archived Employee

---

## Notes

Changing an employee's status to inactive does not delete historical records.

---

## Examples

- Assigning a shift to an active employee.
- Publishing announcements to active employees only.

---

# Activity Feed

## Definition

The Activity Feed is a chronological record of significant events visible within the application.

It provides users with awareness of recent operational activity.

---

## Business Context

Managers and supervisors use the Activity Feed to monitor branch operations without reviewing individual modules.

Events displayed may include:

- New employees added
- Shift creation
- Shift updates
- Attendance events
- Task completion
- Announcements published

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- MAN-001 Manager Dashboard
- SUP-001 Supervisor Dashboard

---

## Related Terms

- Audit Log
- Event
- Notification

---

## Notes

The Activity Feed is informational.

It is not a security audit log.

---

## Examples

- "John clocked in at 8:03 AM."
- "Shift updated for Friday."
- "Inventory task completed."

---

# Administrator

## Definition

An Administrator is a user responsible for managing the ShiftOS platform itself rather than managing an individual customer organization.

Administrators belong to the ShiftOS service provider, not to customer organizations.

---

## Business Context

Administrators perform platform-level functions such as:

- Customer support
- Platform maintenance
- Subscription management
- Operational monitoring

Administrators do not participate in customer scheduling or attendance workflows.

---

## Used By

- ShiftOS Internal Team

---

## Related Specifications

- ORG-003 Subscription Ownership
- SEC-005 Tenant Isolation

---

## Related Terms

- Manager
- Organization
- Tenant

---

## Notes

Platform administrators are completely separate from organization managers.

Customer managers have no administrative privileges over the ShiftOS platform.

---

# Announcement

## Definition

An Announcement is an official communication published within ShiftOS for one or more recipients.

Announcements may target:

- Entire organizations
- Specific branches
- Supervisors
- Employees
- Selected individuals

---

## Business Context

Announcements are used to communicate operational information.

Examples include:

- Schedule updates
- Holiday notices
- Policy changes
- Maintenance information
- Company events

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- COM-001 Announcements
- COM-004 Message Visibility Rules

---

## Related Terms

- Notice
- Notification
- Broadcast
- Acknowledgement

---

## Notes

Announcements remain accessible until archived or deleted according to organizational policy.

---

## Examples

- Store opening delayed by one hour.
- Monthly staff meeting announcement.

---

# API

## Definition

An Application Programming Interface (API) is the controlled mechanism through which the ShiftOS frontend communicates with backend services.

For the MVP, backend functionality is primarily exposed through Supabase Remote Procedure Calls (RPCs), authentication services and secure endpoints.

---

## Business Context

All business operations—such as creating shifts, recording attendance or publishing announcements—must be executed through approved backend interfaces rather than direct database access.

---

## Used By

- Frontend
- Backend
- Integrations

---

## Related Specifications

- API-001 Backend Architecture
- API-002 RPC Standards
- API-003 Validation Rules

---

## Related Terms

- RPC
- Endpoint
- Validation
- Workflow Engine

---

## Notes

Clients must never bypass backend validation by writing directly to protected business tables.

---

# Approval

## Definition

Approval is the formal confirmation that an action, document or workflow has met the required conditions to proceed.

---

## Business Context

Approvals may apply to:

- Documentation
- Feature specifications
- Future leave requests
- Workflow changes
- Administrative actions

---

## Used By

- Product Team
- Managers
- Supervisors

---

## Related Specifications

- GOV-001 Document Control
- GOV-002 Version History

---

## Related Terms

- Decision
- Validation
- Review

---

## Notes

The MVP does not include employee leave approval workflows. Those may be introduced in future releases.

---

# Archive

## Definition

To archive is to remove an item from active operational use while preserving it for historical reference.

Archived records remain accessible according to user permissions.

---

## Business Context

Archiving may apply to:

- Employees
- Announcements
- Specifications
- Reports
- Historical records

---

## Used By

- Managers
- System

---

## Related Specifications

- EMP-007 Employee Lifecycle
- GOV-001 Document Control

---

## Related Terms

- Delete
- History
- Record

---

## Notes

Archiving is not the same as deletion.

Archived records continue to support reporting, auditing and historical analysis.

---

# Audit Log

## Definition

An Audit Log is an immutable chronological record of security-sensitive and operational actions performed within ShiftOS.

Audit logs support accountability, compliance, troubleshooting and forensic investigations.

---

## Business Context

Examples of auditable events include:

- User login
- Password changes
- Employee creation
- Permission changes
- Shift deletion
- Attendance corrections
- Branch configuration updates

---

## Used By

- Security
- Platform Administrators
- Managers (where permitted)

---

## Related Specifications

- SEC-006 Audit Logging
- SEC-009 Server-side Validation

---

## Related Terms

- Activity Feed
- Event
- Log Entry

---

## Notes

Unlike the Activity Feed, audit logs are permanent, tamper-resistant and intended for compliance and security purposes.

They must never be editable by end users.

---

# Authentication

## Definition

Authentication is the process of verifying the identity of a user before access to ShiftOS is granted.

---

## Business Context

Authentication ensures that only registered users can access protected resources.

The MVP supports secure email and password authentication.

Future versions may introduce additional authentication methods.

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- USR-002 Authentication
- SEC-002 Authentication

---

## Related Terms

- Authorization
- Session
- Password
- Login

---

## Notes

Successful authentication establishes a user session but does not determine what actions the user may perform.

Authorization is evaluated separately.

---

# Authorization

## Definition

Authorization is the process of determining what an authenticated user is permitted to access or modify within ShiftOS.

---

## Business Context

Authorization is enforced through roles, permissions and Row-Level Security (RLS).

A successfully authenticated user may still be denied access to specific resources if they lack the required permissions.

---

## Used By

- Backend
- Database
- Frontend

---

## Related Specifications

- PER-001 Role Definitions
- PER-005 Permission Matrix
- SEC-003 Authorization
- SEC-004 Row-Level Security

---

## Related Terms

- Authentication
- Permission
- Role
- Tenant Isolation

---

## Notes

Authentication answers the question, **"Who are you?"**

Authorization answers the question, **"What are you allowed to do?"**

Both are mandatory components of ShiftOS security.