# ShiftOS Dictionary — R

**Document ID:** GOV-DICT-R

**Title:** ShiftOS Dictionary – Terms Beginning with "R"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **R**.

These definitions are authoritative and shall be used consistently throughout all ShiftOS documentation.

---

# Realtime

## Business Definition

Realtime refers to information being updated immediately after an event occurs.

---

## Technical Definition

ShiftOS uses realtime subscriptions to synchronize changes across connected clients without requiring manual refreshes.

---

## Business Context

Examples include:

- Attendance updates
- Shift changes
- New announcements
- Task status changes
- Notifications

---

## Related Specifications

- RT-001 Event Architecture
- RT-002 Live Updates

---

## Related Terms

- Synchronization
- Event
- Notification

---

# Record

## Business Definition

A Record is a single stored piece of business information.

---

## Technical Definition

Each row within a database table represents one record.

---

## Business Context

Examples include:

- Employee
- Shift
- Attendance
- Task
- Branch

---

## Related Specifications

- DB-005 Tables

---

## Related Terms

- Table
- Database
- Row

---

# Relationship

## Business Definition

A Relationship describes how two or more pieces of data are connected.

---

## Technical Definition

Relationships are implemented using foreign keys and relational constraints.

---

## Business Context

Examples include:

Organization → Branch

Branch → Employee

Employee → Shift

Shift → Attendance

---

## Related Specifications

- DB-004 Entity Relationships

---

## Related Terms

- Foreign Key
- Database

---

# Release

## Business Definition

A Release is a version of ShiftOS made available to users.

---

## Technical Definition

Each release consists of tested code, database migrations and deployment artifacts.

---

## Business Context

Releases follow controlled deployment procedures.

---

## Related Specifications

- OPS-007 Releases

---

## Related Terms

- Deployment
- Version

---

# Release Candidate (RC)

## Business Definition

A Release Candidate is a version considered feature complete and undergoing final validation before public release.

---

## Technical Definition

Only critical defects should block promotion of a Release Candidate.

---

## Related Terms

- Release
- Testing

---

# Reminder

## Business Definition

A Reminder is a scheduled notification intended to help users complete important activities.

---

## Technical Definition

Reminders are automatically generated based on business rules and scheduled events.

---

## Business Context

Examples include:

- Upcoming shift
- Pending task
- Attendance reminder
- Announcement acknowledgement

---

## Related Specifications

- NOTIF-002 Event Triggers

---

## Related Terms

- Notification
- Schedule

---

# Repository

## Business Definition

A Repository is the central location where the ShiftOS source code and documentation are stored.

---

## Technical Definition

The repository contains:

- Source code
- Specifications
- Database migrations
- Assets
- Documentation

---

## Related Terms

- Git
- Version Control

---

# Request

## Business Definition

A Request is an action initiated by a user or system that requires processing.

---

## Technical Definition

Requests are received through APIs and processed by backend services.

---

## Business Context

Examples include:

- Login
- Create shift
- Clock in
- Assign task

---

## Related Terms

- Response
- API

---

# Resource

## Business Definition

A Resource is any entity managed by the system.

---

## Technical Definition

Resources are exposed through APIs and protected by authorization rules.

---

## Business Context

Examples include:

- Employee
- Shift
- Attendance
- Task
- Branch

---

## Related Terms

- Entity
- API

---

# Response

## Business Definition

A Response is the result returned after processing a request.

---

## Technical Definition

Responses contain status information and requested data.

---

## Related Terms

- Request
- API

---

# Response Time

## Business Definition

Response Time measures how quickly ShiftOS reacts to user actions.

---

## Technical Definition

Response time is measured from request initiation until completion.

---

## Business Context

Fast response times improve user productivity and satisfaction.

---

## Related Specifications

- OPS-003 Monitoring

---

## Related Terms

- Latency
- Performance

---

# Responsive Design

## Business Definition

Responsive Design allows ShiftOS to adapt automatically to different screen sizes.

---

## Technical Definition

The interface dynamically adjusts layouts for desktop, tablet and mobile devices.

---

## Business Context

This is especially important because ShiftOS follows a PWA-first strategy.

---

## Related Specifications

- UI-010 Responsive Design
- UI-012 PWA Behaviour

---

## Related Terms

- PWA
- Layout

---

# Retry

## Business Definition

A Retry is an automatic or manual attempt to repeat a failed operation.

---

## Technical Definition

Retries help recover from temporary failures without requiring user intervention.

---

## Business Context

Examples include:

- Email delivery
- Notification delivery
- Network synchronization
- Background jobs

---

## Related Specifications

- NOTIF-006 Retry Rules

---

## Related Terms

- Queue
- Failure

---

# Rollback

## Business Definition

A Rollback restores a previous stable system state after a failed deployment or migration.

---

## Technical Definition

Rollback procedures reverse application and database changes while preserving data integrity.

---

## Related Specifications

- OPS-008 Rollback Strategy
- DB-012 Migrations

---

## Related Terms

- Deployment
- Migration

---

# Role

## Business Definition

A Role defines the level of responsibility and system access assigned to a user.

---

## Technical Definition

Roles determine permissions but do not replace business rule validation.

---

## Business Context

Current ShiftOS roles are:

- Manager
- Supervisor
- Employee

Future roles may be introduced without changing the underlying permission architecture.

---

## Related Specifications

- PER-001 Role Definitions

---

## Related Terms

- Permission
- User

---

# Row-Level Security (RLS)

## Business Definition

Row-Level Security (RLS) is the mechanism that ensures users can only access records they are authorized to view.

---

## Technical Definition

RLS policies are enforced directly by PostgreSQL and Supabase before any data is returned.

---

## Business Context

RLS protects:

- Organizations
- Branches
- Employees
- Shifts
- Attendance
- Tasks
- Reports

---

## Related Specifications

- SEC-004 Row-Level Security

---

## Related Terms

- Authorization
- Tenant Isolation
- Multi-Tenancy

---

## Notes

RLS is one of the most critical security controls in ShiftOS and must never be bypassed.

---

# Route

## Business Definition

A Route is a navigable path within the application.

---

## Technical Definition

Routes map URLs or navigation actions to specific screens or components.

---

## Business Context

Examples include:

- Dashboard
- Employees
- Schedule
- Attendance
- Reports
- Settings

Routes are protected according to authentication and permission rules.

---

## Related Specifications

- UI-002 Navigation
- NAV-001 Navigation Flows

---

## Related Terms

- Navigation
- Screen
- Authentication

---

# Rule

## Business Definition

A Rule is a defined condition that governs system behaviour.

---

## Technical Definition

Rules are implemented through backend validation, workflows and business logic.

---

## Business Context

Examples include:

- Attendance rules
- Shift validation rules
- Permission rules
- Notification rules
- Password rules

---

## Related Specifications

- API-003 Validation Rules

---

## Related Terms

- Validation
- Policy
- Workflow

---

# Refresh

## Business Definition

Refresh is the process of updating displayed information to reflect the latest system state.

---

## Technical Definition

Data may refresh automatically through realtime updates or manually through user interaction.

---

## Business Context

Managers and supervisors should always see current operational data without unnecessary manual refreshes.

---

## Related Specifications

- RT-002 Live Updates
- UI-004 State Management

---

## Related Terms

- Realtime
- Synchronization