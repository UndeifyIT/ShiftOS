# ShiftOS Dictionary — O

**Document ID:** GOV-DICT-O

**Title:** ShiftOS Dictionary – Terms Beginning with "O"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **O**.

These definitions are authoritative and must be used consistently across ShiftOS specifications, engineering documentation, APIs, database schemas, testing documentation and user interfaces.

---

# Object Storage

## Business Definition

Object Storage is the service used to securely store files uploaded to ShiftOS.

---

## Technical Definition

Files are stored separately from the relational database and referenced using metadata.

---

## Business Context

Examples include:

- Employee profile photos
- Organization logos
- Future employee documents
- Exported reports

---

## Related Specifications

- DB-005 Tables

---

## Related Terms

- File
- Storage
- Metadata

---

## Notes

The MVP stores only essential files. Large document management is planned for future releases.

---

# Offline Mode

## Business Definition

Offline Mode refers to the application's behavior when internet connectivity is unavailable or unstable.

---

## Technical Definition

The ShiftOS PWA should remain usable where practical by caching application assets and safely handling temporary connection loss.

Operational actions requiring server validation must synchronize once connectivity is restored.

---

## Business Context

Examples include:

- Viewing previously loaded schedules
- Viewing announcements
- Viewing assigned tasks

Actions such as attendance or shift updates must be validated against the server before becoming permanent.

---

## Related Specifications

- ARCH-008 Offline Strategy
- UI-012 PWA Behaviour

---

## Related Terms

- Synchronization
- Cache
- Realtime

---

## Notes

Offline support improves usability but does not override security or business rules.

---

# Onboarding

## Business Definition

Onboarding is the guided process through which a new user sets up their account and learns the basics of ShiftOS.

---

## Technical Definition

Onboarding occurs after successful authentication or invitation acceptance and before normal application usage.

---

## Business Context

Manager onboarding includes:

- Creating the organization
- Creating the first branch
- Configuring business settings
- Inviting supervisors
- Guided introduction by Shifty

Supervisor onboarding includes:

- Accepting invitation
- Creating password
- Completing profile
- Guided introduction by Shifty

Employee onboarding includes:

- Accepting invitation
- Creating password
- Completing profile
- Viewing first schedule

---

## Related Specifications

- ONB-001 Onboarding Screens
- SFT-004 Onboarding

---

## Related Terms

- Invitation
- Authentication
- Shifty

---

# On-Time Arrival

## Business Definition

An On-Time Arrival occurs when an employee clocks in before the scheduled shift start time or within the configured grace period.

---

## Technical Definition

On-Time Arrival is a calculated attendance state determined during attendance validation.

---

## Business Context

Example:

Shift Start: 9:00 AM

Grace Period: 10 Minutes

Clock In: 9:08 AM

Result:

On-Time

---

## Related Specifications

- ATT-005 Late Rules

---

## Related Terms

- Clock In
- Attendance
- Grace Period
- Late Arrival

---

# Open Shift (Future)

## Business Definition

An Open Shift is a scheduled shift that has not yet been assigned to a specific employee.

---

## Technical Definition

Open Shifts are intentionally excluded from the MVP but are supported by the long-term architecture.

---

## Business Context

Future functionality may allow employees to request available shifts subject to approval.

---

## Related Specifications

- SHIFT-010 Open Shifts

---

## Related Terms

- Shift
- Assignment
- Schedule

---

## Notes

Open Shift functionality is deferred until after MVP launch.

---

# Operational KPI

## Business Definition

An Operational KPI is a measurable indicator used to evaluate the day-to-day performance of business operations.

---

## Technical Definition

Operational KPIs are calculated automatically using authoritative business data.

---

## Business Context

Examples include:

- Attendance Rate
- Shift Completion Rate
- Employee Utilization
- Task Completion Rate
- Late Arrival Rate

---

## Related Specifications

- REP-002 Operational KPIs

---

## Related Terms

- KPI
- Metric
- Dashboard

---

# Organization

## Business Definition

An Organization represents a single business customer using ShiftOS.

---

## Technical Definition

The Organization is the highest-level tenant within the platform.

Every branch, employee, shift, attendance record, task and report belongs to exactly one organization.

---

## Business Context

Examples include:

- The Hub Supermarket
- BrightCare Pharmacy
- Sunrise Hotel

Each organization operates independently from every other organization.

---

## Data Ownership

Organization

→ Branches

→ Employees

→ Shifts

→ Attendance

→ Tasks

→ Reports

→ Notifications

---

## Related Specifications

- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model

---

## Related Terms

- Tenant
- Branch
- Manager

---

## Notes

Organization ownership is the foundation of tenant isolation throughout ShiftOS.

---

# Organization Isolation

## Business Definition

Organization Isolation is the guarantee that one organization's data cannot be accessed by another organization.

---

## Technical Definition

Organization Isolation is enforced through Row-Level Security, backend authorization and tenant-aware database queries.

---

## Business Context

This applies to all operational data including:

- Employees
- Shifts
- Attendance
- Tasks
- Reports
- Notifications

---

## Related Specifications

- PER-008 Organization Isolation
- SEC-005 Tenant Isolation

---

## Related Terms

- Multi-Tenancy
- Tenant
- RLS

---

## Notes

Organization Isolation is a mandatory architectural requirement.

---

# Organization Owner

## Business Definition

The Organization Owner is the manager who created the organization and holds ultimate administrative responsibility.

---

## Technical Definition

The owner has all manager permissions plus subscription ownership responsibilities.

---

## Business Context

Responsibilities include:

- Managing subscription
- Billing
- Organization settings
- Inviting additional managers (future)
- Deactivating the organization

---

## Related Specifications

- ORG-003 Subscription Ownership

---

## Related Terms

- Manager
- Subscription

---

## Notes

The initial organization creator becomes the default owner.

---

# Override

## Business Definition

An Override is an authorized action that replaces or modifies the result of an automated business rule.

---

## Technical Definition

Overrides require permission checks and generate audit log entries.

---

## Business Context

Examples include:

- Attendance correction
- Shift reassignment
- Shift cancellation
- Task verification override

---

## Related Specifications

- ATT-007 Attendance Corrections
- SEC-006 Audit Logging

---

## Related Terms

- Manual Override
- Audit Log
- Permission

---

# OTP (One-Time Password) (Future)

## Business Definition

An OTP is a temporary verification code used during authentication or account recovery.

---

## Technical Definition

OTPs are time-limited, single-use credentials.

---

## Business Context

Potential future uses include:

- Password reset verification
- Multi-Factor Authentication
- Sensitive account actions

---

## Related Specifications

- USR-006 Password Reset
- SEC-002 Authentication

---

## Related Terms

- MFA
- Authentication
- Verification

---

## Notes

OTP support is planned for future enterprise security enhancements.

---

# Outage

## Business Definition

An Outage is a period during which part or all of ShiftOS is unavailable.

---

## Technical Definition

Outages may result from infrastructure failures, software defects or planned maintenance.

---

## Business Context

Outages are classified by severity and monitored through the platform's operational tooling.

---

## Related Specifications

- OPS-003 Monitoring
- OPS-005 Error Tracking
- SEC-012 Backup & Recovery

---

## Related Terms

- Incident
- Downtime
- Recovery

---

# Owner

## Business Definition

Owner refers to the individual or entity responsible for a resource, record or organization.

---

## Technical Definition

Ownership determines administrative responsibility but does not replace permission checks.

---

## Business Context

Examples include:

- Organization Owner
- Record Owner
- Task Owner (future)

---

## Related Specifications

- ORG-003 Subscription Ownership

---

## Related Terms

- Organization
- Manager
- Permission