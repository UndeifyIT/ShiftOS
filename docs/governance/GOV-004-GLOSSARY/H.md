# ShiftOS Dictionary — H

**Document ID:** GOV-DICT-H

**Title:** ShiftOS Dictionary – Terms Beginning with "H"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **H**.

These definitions form part of the official ShiftOS Product Bible and shall be used consistently throughout product specifications, engineering documentation, APIs, database design, testing and user interfaces.

---

# Header

## Business Definition

A Header is the upper section of a screen that provides context, navigation and primary actions for the current page.

---

## Technical Definition

Headers are reusable UI components that maintain consistent navigation and branding across the application.

---

## Business Context

Headers commonly contain:

- Page title
- Breadcrumbs
- Search
- Notifications
- User profile
- Primary action button

---

## Used By

- All Users

---

## Related Specifications

- UI-003 Layout System
- UI-002 Navigation

---

## Related Terms

- Navigation
- Footer
- Dashboard

---

## Notes

Headers should remain consistent across all manager, supervisor and employee experiences.

---

# Health Check

## Business Definition

A Health Check is an automated verification that confirms whether ShiftOS or one of its services is operating correctly.

---

## Technical Definition

Health checks are lightweight endpoints or monitoring routines used to determine service availability and readiness.

---

## Business Context

Examples include:

- Database connectivity
- Authentication service
- Notification service
- Realtime service
- API availability

---

## Used By

- Engineering Team
- Monitoring Systems

---

## Related Specifications

- OPS-003 Monitoring

---

## Related Terms

- Monitoring
- Downtime
- Availability

---

# Heartbeat

## Business Definition

A Heartbeat is a periodic signal exchanged between services or clients to indicate that a connection remains active.

---

## Technical Definition

Heartbeat events help detect lost connections and maintain realtime synchronization.

---

## Business Context

Heartbeats support:

- Live dashboards
- Presence detection
- WebSocket connections
- Realtime updates

---

## Used By

- Backend
- Frontend

---

## Related Specifications

- RT-002 Live Updates
- RT-003 Presence

---

## Related Terms

- Realtime
- Presence
- Synchronization

---

# Hierarchy

## Business Definition

Hierarchy defines the organizational structure that determines reporting relationships and operational responsibilities.

---

## Technical Definition

Hierarchy influences permissions, visibility and workflow routing but does not override role-based access control.

---

## Business Context

For the MVP, the organizational hierarchy is:

Organization
→ Branch
→ Manager
→ Supervisor
→ Employee

---

## Used By

- Entire Platform

---

## Related Specifications

- PER-001 Role Definitions
- ORG-001 Organization Model

---

## Related Terms

- Role
- Permission
- Organization

---

## Notes

Hierarchy defines operational responsibility, while permissions determine what actions a user may perform.

---

# History

## Business Definition

History is the permanent record of significant events that have occurred within ShiftOS.

---

## Technical Definition

Historical records are immutable operational data used for reporting, auditing and troubleshooting.

---

## Business Context

Examples include:

- Shift history
- Attendance history
- Employment history
- Task history
- Announcement history
- Notification history

---

## Used By

- Managers
- Supervisors
- System

---

## Related Specifications

- EMP-005 Employment History
- ATT-008 Attendance History
- TASK-006 Task History

---

## Related Terms

- Audit Log
- Timeline
- Event

---

## Notes

Historical records should never be silently modified or deleted.

---

# Holiday

## Business Definition

A Holiday is a designated non-working day recognized by an organization or jurisdiction.

---

## Technical Definition

Holiday calendars are configurable organizational settings that may influence scheduling and reporting.

---

## Business Context

Examples include:

- National holidays
- Public holidays
- Organization-wide holidays

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Shift
- Schedule
- Calendar

---

## Notes

Holiday-aware scheduling is planned for a future release.

---

# Hours Worked

## Business Definition

Hours Worked represent the total amount of time an employee has actively worked during completed shifts.

---

## Technical Definition

Hours Worked are calculated using validated attendance records and completed shift data.

---

## Business Context

Hours Worked support:

- Operational reporting
- Productivity analysis
- Payroll preparation
- Performance metrics

---

## Data Ownership

Organization
→ Branch
→ Employee
→ Attendance Records

Hours Worked are derived from attendance data and are not stored as independent records.

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- ATT-002 Clock In
- ATT-003 Clock Out
- REP-006 Payroll Preparation

---

## Related Terms

- Attendance
- Shift Duration
- Payroll Preparation

---

## Notes

Hours Worked should always be calculated from source data to avoid inconsistencies.

---

# Home Screen

## Business Definition

The Home Screen is the first authenticated screen presented to a user after logging in.

---

## Technical Definition

The Home Screen routes users to the appropriate dashboard based on their assigned role.

---

## Business Context

Examples include:

- Manager Dashboard
- Supervisor Dashboard
- Employee Dashboard

---

## Used By

- All Users

---

## Related Specifications

- MAN-001 Manager Dashboard
- SUP-001 Supervisor Dashboard
- EMPUI-001 Employee Dashboard

---

## Related Terms

- Dashboard
- Navigation
- Authentication

---

# Hover State

## Business Definition

A Hover State is the visual feedback displayed when a pointing device is positioned over an interactive element.

---

## Technical Definition

Hover states improve discoverability and usability for desktop users.

---

## Business Context

Hover interactions may apply to:

- Buttons
- Tables
- Cards
- Navigation items
- Calendar entries

---

## Used By

- Desktop Users

---

## Related Specifications

- UI-001 Design System

---

## Related Terms

- Focus State
- Active State
- Button

---

## Notes

Hover interactions should never be the only method of revealing important functionality, ensuring accessibility for touch devices.

---

# Human Resources (HR)

## Business Definition

Human Resources (HR) refers to the organizational function responsible for managing employees and employment policies.

---

## Technical Definition

ShiftOS does not currently include a dedicated HR module, but future integrations may support HR workflows.

---

## Business Context

Potential future integrations include:

- Employee records
- Leave management
- Benefits administration
- Performance reviews

---

## Used By

- Future Expansion

---

## Related Specifications

- EMP-001 Employee Profile

---

## Related Terms

- Employee
- Employment
- Organization

---

## Notes

HR functionality is outside the MVP scope but has been considered in the long-term architecture.

---

# Help Center

## Business Definition

The Help Center is the centralized location where users access documentation, tutorials, FAQs and support resources.

---

## Technical Definition

The Help Center may include searchable documentation, guided walkthroughs and links to customer support.

---

## Business Context

It assists users in learning the platform and resolving common issues without contacting support.

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- UI-002 Navigation

---

## Related Terms

- Documentation
- Shifty
- Support

---

## Notes

In the MVP, contextual guidance from **Shifty** serves as the primary in-app help experience. A full Help Center is planned for a later release.