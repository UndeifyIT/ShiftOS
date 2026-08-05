# ShiftOS Dictionary — M

**Document ID:** GOV-DICT-M

**Title:** ShiftOS Dictionary – Terms Beginning with "M"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **M**.

These definitions are authoritative and shall be used consistently across ShiftOS specifications, engineering documentation, APIs, database schemas, reporting, testing and user interfaces.

---

# Manager

## Business Definition

A Manager is the highest operational role within a ShiftOS organization.

Managers are responsible for configuring the organization, managing branches, inviting users, creating schedules, monitoring operations and viewing reports.

---

## Technical Definition

Managers possess the broadest permission set within an organization.

All manager actions remain restricted to their own organization through tenant isolation.

---

## Business Context

Managers can:

- Create the organization
- Configure business settings
- Invite supervisors
- Invite employees
- Manage branches
- Create schedules
- View reports
- Monitor attendance
- Assign tasks
- View analytics

---

## Related Specifications

- PER-002 Manager Permissions

---

## Related Terms

- Supervisor
- Employee
- Organization

---

## Notes

There is at least one manager per organization.

---

# Manager Dashboard

## Business Definition

The Manager Dashboard is the primary workspace managers see after logging in.

---

## Technical Definition

The dashboard aggregates operational data from multiple backend services into a single interface.

---

## Business Context

Typical dashboard content includes:

- Today's shifts
- Attendance overview
- Active tasks
- Branch health
- Notifications
- KPIs
- Reports
- Shifty recommendations

---

## Related Specifications

- MAN-001 Manager Dashboard

---

## Related Terms

- Dashboard
- KPI
- Analytics

---

# Materialized View

## Business Definition

A Materialized View is a precomputed database view that improves reporting performance.

---

## Technical Definition

Unlike a normal SQL view, a materialized view stores query results physically and is refreshed periodically.

---

## Business Context

Materialized Views are ideal for:

- KPI dashboards
- Attendance summaries
- Payroll preparation
- Branch performance
- Operational analytics

---

## Related Specifications

- DB-011 Materialized Views

---

## Related Terms

- View
- Report
- Analytics

---

# Maintenance Window

## Business Definition

A Maintenance Window is a planned period during which system updates may temporarily affect availability.

---

## Technical Definition

Maintenance Windows are scheduled to minimize operational disruption.

---

## Business Context

Whenever possible, maintenance should occur during off-peak business hours.

---

## Related Specifications

- OPS-007 Releases

---

## Related Terms

- Deployment
- Downtime
- Release

---

# Manual Override

## Business Definition

A Manual Override is an authorized action that bypasses an automated system decision.

---

## Technical Definition

Manual overrides require appropriate permissions and must always generate an audit log.

---

## Business Context

Examples include:

- Correcting attendance
- Cancelling shifts
- Reassigning employees
- Updating historical records

---

## Related Specifications

- ATT-007 Attendance Corrections
- SEC-006 Audit Logging

---

## Related Terms

- Override
- Audit Log
- Permission

---

# Member

## Business Definition

A Member is any authenticated user belonging to an organization.

---

## Technical Definition

Members include Managers, Supervisors and Employees.

---

## Related Terms

- User
- Organization

---

# Metadata

## Business Definition

Metadata is information that describes other information.

---

## Technical Definition

Metadata commonly includes:

- Creation timestamp
- Last update timestamp
- Created By
- Updated By
- Version
- Status

---

## Business Context

Almost every ShiftOS record contains metadata.

---

## Related Specifications

- DB-005 Tables

---

## Related Terms

- Audit
- Record

---

# Metric

## Business Definition

A Metric is any measurable operational value.

---

## Technical Definition

Metrics may be raw values or calculated values.

KPIs are a specialized subset of metrics.

---

## Business Context

Examples include:

- Hours Worked
- Employees Present
- Tasks Completed
- Active Shifts

---

## Related Specifications

- REP-007 Dashboard Metrics

---

## Related Terms

- KPI
- Report
- Dashboard

---

# Migration

## Business Definition

A Migration is a controlled change to the database structure.

---

## Technical Definition

Database migrations are version-controlled scripts that create or modify schema objects.

---

## Business Context

Every schema change must be implemented through migrations.

Direct database editing is prohibited.

---

## Related Specifications

- DB-012 Migrations

---

## Related Terms

- Schema
- Database
- Version

---

# Middleware

## Business Definition

Middleware is software that processes requests before they reach application logic.

---

## Technical Definition

Middleware may perform:

- Authentication
- Authorization
- Logging
- Validation
- Rate limiting

---

## Related Specifications

- API-001 Backend Architecture

---

## Related Terms

- API
- Authentication

---

# Mobile Experience

## Business Definition

The Mobile Experience is the optimized ShiftOS interface for smartphones and tablets.

---

## Technical Definition

ShiftOS is designed as a Progressive Web App (PWA), providing a responsive experience across desktop and mobile devices from a single codebase.

---

## Business Context

Employees primarily access ShiftOS on mobile devices, while managers and supervisors mainly use desktop but can install the PWA for convenience.

---

## Related Specifications

- UI-012 PWA Behaviour
- ARCH-007 PWA Architecture

---

## Related Terms

- PWA
- Responsive Design

---

# Module

## Business Definition

A Module is a self-contained functional area within ShiftOS.

---

## Technical Definition

Each module owns its own business rules, workflows and data model while integrating with the rest of the platform.

---

## Business Context

Examples include:

- Employee Management
- Scheduling
- Attendance
- Tasks
- Reports
- Notifications

---

## Related Specifications

- System Architecture

---

## Related Terms

- Domain
- Feature

---

# Monitoring

## Business Definition

Monitoring is the continuous observation of application health and operational performance.

---

## Technical Definition

Monitoring collects metrics, logs and alerts to detect issues before they impact users.

---

## Business Context

Monitoring includes:

- API performance
- Database health
- Error rates
- Background jobs
- Notification delivery
- Realtime connections

---

## Related Specifications

- OPS-003 Monitoring

---

## Related Terms

- Logging
- Alert
- Incident

---

# Multi-Tenancy

## Business Definition

Multi-Tenancy is the architectural principle that allows multiple organizations to share the same application while keeping all business data completely isolated.

---

## Technical Definition

Every record belongs to a tenant (organization) and access is enforced through Row-Level Security (RLS), backend validation and authorization policies.

---

## Business Context

Employees from one organization must never be able to access another organization's data.

This is one of the most critical architectural principles of ShiftOS.

---

## Related Specifications

- ORG-002 Multi-Tenant Model
- SEC-004 Row-Level Security
- ARCH-002 Multi-Tenant Architecture

---

## Related Terms

- Tenant
- Organization
- Isolation

---

## Notes

Multi-tenancy is mandatory throughout the platform and cannot be bypassed under any circumstance.

---

# Multi-Factor Authentication (Future)

## Business Definition

Multi-Factor Authentication (MFA) is an authentication method requiring more than one verification factor before granting access.

---

## Technical Definition

MFA combines a password with an additional verification method such as a one-time code or authenticator app.

---

## Business Context

MFA is planned for future enterprise plans but is not part of the MVP.

---

## Related Specifications

- SEC-002 Authentication

---

## Related Terms

- Authentication
- Password
- Security

---

## Notes

The authentication architecture should be designed to accommodate MFA in the future without requiring major redesign.