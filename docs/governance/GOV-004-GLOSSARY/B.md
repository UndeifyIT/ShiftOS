# ShiftOS Dictionary — B

**Document ID:** GOV-DICT-B

**Title:** ShiftOS Dictionary – Terms Beginning with "B"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document contains the official definitions of all ShiftOS terminology beginning with the letter **B**.

The definitions in this document are authoritative and SHALL be used consistently across all specifications, source code, database schemas, APIs, user interfaces and internal documentation.

---

# Background Job

## Definition

A Background Job is a server-side process that executes asynchronously without requiring a user to wait for completion.

Background jobs allow computational or time-consuming tasks to be processed independently of the user's immediate interaction with the application.

---

## Business Context

ShiftOS uses background jobs to improve responsiveness and reliability.

Typical examples include:

- Sending invitation emails.
- Delivering notifications.
- Generating reports.
- Processing recurring tasks.
- Creating scheduled reminders.
- Refreshing materialized views.
- Cleaning expired sessions.

---

## Used By

- Backend
- Notification System
- Reporting Engine

---

## Related Specifications

- API-007 Background Jobs
- NOTIF-002 Event Triggers

---

## Related Terms

- Event
- Queue
- Workflow
- Notification

---

## Notes

Background jobs should never contain business rules that bypass validation.

All business rules must be validated before a background job is created.

---

## Examples

- Employee invitation email sent after account creation.
- Weekly attendance report generated overnight.

---

# Branch

## Definition

A Branch is a physical operating location owned by an Organization.

Every branch operates independently while remaining part of its parent organization.

---

## Business Context

Branches represent real business locations such as:

- Supermarkets
- Restaurants
- Hotels
- Warehouses
- Retail stores
- Pharmacies

Employees, shifts, attendance, announcements and tasks are all associated with one or more branches.

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- ORG-004 Branch Structure
- EMP-003 Branch Assignment

---

## Related Terms

- Organization
- Employee
- Supervisor
- Branch Manager

---

## Notes

Branches are operational units, not separate organizations.

All branches belong to exactly one organization.

---

## Examples

- The Hub Supermarket – Lekki Branch
- The Hub Supermarket – Ikeja Branch

---

# Branch Assignment

## Definition

Branch Assignment is the relationship that associates an employee or supervisor with one or more branches.

---

## Business Context

Branch assignments determine:

- Where employees can work.
- Which schedules they appear in.
- Which supervisors can manage them.
- Which announcements they receive.

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- EMP-003 Branch Assignment
- PER-007 Branch Isolation

---

## Related Terms

- Branch
- Employee
- Supervisor

---

## Notes

Changing a branch assignment must never delete historical records.

Previous assignments remain part of the employee's employment history.

---

# Branch Isolation

## Definition

Branch Isolation is the enforcement of operational boundaries between branches within the same organization.

---

## Business Context

A supervisor should only manage the branches assigned to them.

Branch isolation ensures that supervisors cannot:

- View unauthorized employees.
- Modify schedules for other branches.
- Publish announcements outside their assigned branches.
- Edit attendance outside their operational responsibility.

Managers are not restricted by branch isolation unless explicitly configured.

---

## Used By

- Security
- Backend
- Database

---

## Related Specifications

- PER-007 Branch Isolation
- SEC-003 Authorization
- SEC-004 Row-Level Security

---

## Related Terms

- Organization Isolation
- Tenant Isolation
- Permission

---

## Notes

Branch isolation is enforced both by application logic and database security policies.

---

# Branch Performance

## Definition

Branch Performance is the measurement of operational effectiveness for a specific branch.

---

## Business Context

Performance metrics may include:

- Attendance rate.
- Shift completion.
- Employee punctuality.
- Task completion.
- Labour utilization.
- Overtime.
- Staffing coverage.

---

## Used By

- Managers

---

## Related Specifications

- REP-005 Branch Performance

---

## Related Terms

- KPI
- Dashboard
- Reporting

---

## Notes

Branch performance is measured independently for each branch.

---

# Break

## Definition

A Break is a scheduled period during a shift during which an employee is temporarily relieved from work responsibilities.

---

## Business Context

Breaks may be:

- Paid.
- Unpaid.

Break policies are determined by the organization and applicable employment regulations.

---

## Used By

- Employees
- Managers
- Supervisors

---

## Related Specifications

- SHIFT-001 Shift Definition

---

## Related Terms

- Shift
- Rest Period
- Overtime

---

## Notes

Break tracking is planned but not part of the initial MVP.

---

# Broadcast

## Definition

A Broadcast is a communication distributed simultaneously to multiple recipients.

---

## Business Context

Broadcasts are typically used for:

- Emergency notices.
- Schedule changes.
- Company announcements.
- Policy updates.

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- COM-001 Announcements

---

## Related Terms

- Announcement
- Notification
- Notice

---

## Notes

Broadcasts may require acknowledgement depending on organizational policy.

---

# Business Hours

## Definition

Business Hours define the normal operating hours of a branch.

---

## Business Context

Business hours influence:

- Schedule planning.
- Shift validation.
- Staffing analysis.
- Reporting.

---

## Used By

- Managers

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Operating Hours
- Branch
- Shift

---

## Notes

Business hours do not automatically create employee shifts.

They simply define the branch's standard operating window.

---

# Business Rule

## Definition

A Business Rule is a mandatory constraint that governs how ShiftOS behaves.

Business rules define expected behaviour independently of implementation.

---

## Business Context

Examples include:

- Employees cannot have overlapping shifts.
- Clock-in before shift start may be restricted.
- Supervisors cannot edit other branches.
- Inactive employees cannot receive shifts.

---

## Used By

- Product
- Backend
- Database
- QA

---

## Related Specifications

- GOV-001 Document Control
- SHIFT-012 Shift Validation Rules

---

## Related Terms

- Validation Rule
- Workflow
- State Machine

---

## Notes

Business rules are implementation-independent.

Whether enforced by database constraints, backend logic or frontend validation, the rule itself remains the same.

---

# Business Settings

## Definition

Business Settings are configurable operational preferences that apply across an organization.

---

## Business Context

Examples include:

- Time zone.
- Default language.
- Business hours.
- Attendance grace period.
- Notification preferences.
- Branding.

---

## Used By

- Managers

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Organization
- Configuration
- Settings

---

## Notes

Business settings affect organizational behaviour but do not override platform security rules.

---

# Business Intelligence (BI)

## Definition

Business Intelligence (BI) is the process of transforming operational data into meaningful insights that support better decision-making.

Within ShiftOS, BI includes dashboards, reports, trend analysis, KPIs, workforce metrics and payroll preparation data.

---

## Business Context

Business Intelligence enables managers to understand how their workforce is performing over time rather than simply viewing raw operational records.

---

## Used By

- Managers
- Organization Owners

---

## Related Specifications

- REP-001 Reporting Philosophy
- REP-007 Dashboard Metrics

---

## Related Terms

- KPI
- Dashboard
- Analytics
- Report

---

## Notes

Business Intelligence is descriptive and analytical.

It does not automatically make operational decisions on behalf of users during the MVP.

---

# Backup

## Definition

A Backup is a protected copy of application data that can be used to restore information after accidental loss, corruption or system failure.

---

## Business Context

Backups are part of the platform's disaster recovery strategy and are managed at the infrastructure level.

---

## Used By

- Platform Administrators

---

## Related Specifications

- SEC-012 Backup & Recovery
- OPS-001 Environments

---

## Related Terms

- Disaster Recovery
- Restore
- Recovery Point Objective

---

## Notes

Backups are platform-managed and are not directly accessible to customer organizations.