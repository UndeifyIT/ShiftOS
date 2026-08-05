# ShiftOS Dictionary — D

**Document ID:** GOV-DICT-D

**Title:** ShiftOS Dictionary – Terms Beginning with "D"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document contains the official definitions of all ShiftOS terminology beginning with the letter **D**.

These definitions are authoritative and shall be used consistently across all specifications, database models, APIs, user interfaces, reports, test plans and internal documentation.

---

# Dashboard

## Definition

A Dashboard is the primary landing workspace presented to a user after successful authentication. It provides a role-specific overview of operational information, pending actions and key metrics.

---

## Business Context

Dashboards are customized for each role.

Examples include:

- Manager Dashboard
- Supervisor Dashboard
- Employee Dashboard

Each dashboard surfaces only the information relevant to that user's responsibilities.

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- MAN-001 Manager Dashboard
- SUP-001 Supervisor Dashboard
- EMPUI-001 Employee Dashboard

---

## Related Terms

- Widget
- Card
- KPI
- Activity Feed

---

## Notes

Dashboards should prioritize actionable information over historical information.

---

# Dashboard Widget

## Definition

A Dashboard Widget is a reusable user interface component displayed on a dashboard that presents a focused set of operational information.

---

## Business Context

Examples include:

- Today's Shifts
- Attendance Summary
- Open Tasks
- Branch Overview
- Notifications
- Shifty Insights

---

## Used By

- All Users

---

## Related Specifications

- UI-001 Design System

---

## Related Terms

- Dashboard
- Card
- KPI

---

# Data

## Definition

Data refers to all information stored, processed or transmitted within ShiftOS.

Data may represent users, employees, shifts, attendance records, tasks, reports or configuration settings.

---

## Business Context

All operational workflows rely on accurate, validated and secure data.

Data is considered one of the organization's most valuable assets.

---

## Used By

- Entire Platform

---

## Related Specifications

- DB-001 Database Philosophy

---

## Related Terms

- Record
- Entity
- Database

---

# Database

## Definition

The Database is the authoritative source of truth for all persistent information stored within ShiftOS.

The MVP uses PostgreSQL through Supabase.

---

## Business Context

The database stores:

- Organizations
- Branches
- Users
- Employees
- Shifts
- Attendance
- Tasks
- Announcements
- Notifications
- Audit Logs

---

## Used By

- Backend
- Reporting
- Security

---

## Related Specifications

- DB-003 Schema Overview

---

## Related Terms

- Record
- Table
- Entity
- Schema

---

## Notes

Business rules should never rely solely on frontend validation.

---

# Data Export

## Definition

A Data Export is the process of generating downloadable operational information in a structured format.

---

## Business Context

Managers may export:

- Attendance Reports
- Shift Schedules
- Employee Lists
- Payroll Preparation Reports
- KPI Reports

---

## Used By

- Managers

---

## Related Specifications

- REP-008 Data Exports

---

## Related Terms

- Report
- CSV
- Excel

---

# Data Validation

## Definition

Data Validation is the process of ensuring information satisfies all business and technical rules before being accepted by the system.

---

## Business Context

Validation occurs before information is stored.

Examples include:

- Required fields
- Duplicate prevention
- Time validation
- Permission validation
- Business rule validation

---

## Used By

- Frontend
- Backend
- Database

---

## Related Specifications

- API-003 Validation Rules
- SEC-010 Server-side Validation

---

## Related Terms

- Business Rule
- Constraint
- Validation Rule

---

# Decision

## Definition

A Decision is a formally approved product, business or technical choice recorded as part of the ShiftOS governance process.

---

## Business Context

Important decisions are permanently documented to preserve project history and prevent repeated discussions.

Examples include:

- PWA-first strategy
- Orange design system
- Supabase as backend
- PostgreSQL database

---

## Used By

- Product Team
- Engineering Team

---

## Related Specifications

- GOV-003 Decision Log

---

## Related Terms

- ADR
- Governance
- Version History

---

# Department

## Definition

A Department is an optional organizational subdivision within a branch used to group employees by operational function.

Examples include Sales, Bakery, Inventory or Customer Service.

---

## Business Context

Departments are not included in the MVP but have been reserved for future expansion.

---

## Used By

- Managers

---

## Related Specifications

- ORG-005 Departments (Future)

---

## Related Terms

- Branch
- Position
- Employee

---

## Notes

Departments should not affect tenant isolation or permissions unless explicitly configured in a future release.

---

# Deployment

## Definition

Deployment is the process of releasing a new version of ShiftOS to a target environment.

---

## Business Context

Supported environments include:

- Development
- Staging
- Production

---

## Used By

- Engineering Team

---

## Related Specifications

- OPS-001 Environments
- OPS-007 Releases

---

## Related Terms

- CI/CD
- Rollback
- Version

---

# Delete

## Definition

Delete is the permanent removal of information from the system.

---

## Business Context

ShiftOS minimizes permanent deletion of operational records to preserve auditability and reporting integrity.

Whenever possible, records should be archived instead.

---

## Used By

- System
- Platform Administrators

---

## Related Specifications

- DB-001 Database Philosophy

---

## Related Terms

- Archive
- Soft Delete
- Record

---

## Notes

Permanent deletion should be restricted to exceptional circumstances and protected by strict authorization rules.

---

# Document

## Definition

A Document is any structured piece of information maintained as part of the ShiftOS Product Bible or operational records.

Examples include specifications, reports, policies and exported files.

---

## Business Context

Documentation serves as the authoritative reference for product development and organizational governance.

---

## Used By

- Product Team
- Engineering Team
- QA

---

## Related Specifications

- GOV-001 Document Control

---

## Related Terms

- Specification
- Version
- Decision

---

# Domain

## Definition

A Domain is a major business area within ShiftOS that groups related functionality and specifications.

Examples include:

- Shift Domain
- Attendance Domain
- Employee Domain
- Notification Domain
- Reporting Domain

---

## Business Context

Each domain has its own business rules, workflows, state machines and specifications while remaining integrated with the wider platform.

---

## Used By

- Product Team
- Engineering Team

---

## Related Specifications

- Entire Product Bible

---

## Related Terms

- Module
- Specification
- Workflow

---

# Draft

## Definition

A Draft is a temporary, editable version of an item that has not yet been finalized or published.

---

## Business Context

Future examples may include:

- Draft announcements
- Draft reports
- Draft schedules

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- COM-001 Announcements

---

## Related Terms

- Publish
- Version
- Approval

---

## Notes

Draft functionality for schedules is a planned enhancement and is not part of the MVP.

---

# Duplicate

## Definition

A Duplicate is an unintended second instance of data representing the same real-world entity or event.

---

## Business Context

Examples include:

- Duplicate employee records
- Duplicate clock-ins
- Duplicate shifts
- Duplicate notifications

---

## Used By

- Backend
- Database

---

## Related Specifications

- API-003 Validation Rules
- DB-006 Constraints

---

## Related Terms

- Validation
- Constraint
- Record

---

## Notes

Duplicate prevention should occur through a combination of frontend validation, backend business logic and database constraints.

---

# Downtime

## Definition

Downtime is a period during which ShiftOS or one of its services is unavailable or operating below acceptable performance levels.

---

## Business Context

Downtime may result from:

- Infrastructure failures
- Scheduled maintenance
- Network outages
- Third-party service interruptions

---

## Used By

- Platform Administrators
- Engineering Team

---

## Related Specifications

- OPS-003 Monitoring
- OPS-004 Logging

---

## Related Terms

- Availability
- Incident
- Monitoring
- Recovery

---

## Notes

The system should be designed to minimize downtime through redundancy, monitoring and well-defined recovery procedures.