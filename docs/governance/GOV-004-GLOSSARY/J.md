# ShiftOS Dictionary — J

**Document ID:** GOV-DICT-J

**Title:** ShiftOS Dictionary – Terms Beginning with "J"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **J**.

These definitions are part of the official ShiftOS vocabulary and must be used consistently across specifications, architecture, APIs, source code, database documentation and user interfaces.

---

# Job

## Business Definition

A Job refers to the overall employment relationship between an employee and an organization, including the responsibilities, duties and expectations associated with a specific position.

---

## Technical Definition

Within ShiftOS, a Job is represented through a combination of:

- Employee Profile
- Position
- Employment Status
- Branch Assignment

There is no standalone "Job" entity in the MVP database.

---

## Business Context

Examples include:

- Cashier
- Sales Assistant
- Inventory Clerk
- Baker
- Store Supervisor
- Branch Manager

---

## Data Ownership

Organization
→ Employee
→ Position

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- EMP-001 Employee Profile
- EMP-004 Positions & Roles

---

## Related Terms

- Position
- Employee
- Employment

---

## Notes

ShiftOS models operational positions rather than maintaining a separate job catalogue during the MVP.

---

# Job Title

## Business Definition

A Job Title is the human-readable name assigned to an employee's position within an organization.

---

## Technical Definition

Job Titles are configurable organization-specific values stored as part of the employee profile.

---

## Business Context

Examples include:

- Cashier
- Security Officer
- Stock Controller
- Pharmacy Assistant
- Cleaner

---

## Data Ownership

Organization
→ Employee

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- EMP-004 Positions & Roles

---

## Related Terms

- Position
- Employee
- Employment

---

## Notes

Job Titles are informational and do not determine permissions. Permissions are controlled exclusively through user roles.

---

# Join Date

## Business Definition

Join Date is the official date an employee became part of an organization.

---

## Technical Definition

Join Date is recorded within the employee profile and contributes to employment history and reporting.

---

## Business Context

Join Date may be used for:

- Employment history
- Reporting
- Workforce analytics
- Future HR integrations

---

## Data Ownership

Organization
→ Employee

---

## Used By

- Managers

---

## Related Specifications

- EMP-005 Employment History

---

## Related Terms

- Employment
- Employee
- Hire Date

---

## Notes

Join Date represents employment commencement and is distinct from the account creation date.

---

# JSON

## Business Definition

JSON (JavaScript Object Notation) is the standard format used to exchange structured information between different parts of ShiftOS and external systems.

---

## Technical Definition

JSON is the primary payload format used by APIs, Supabase RPC functions, configuration objects and realtime events.

---

## Business Context

JSON enables communication between:

- Frontend
- Backend
- Database services
- External integrations

---

## Used By

- Engineering Team

---

## Related Specifications

- API-001 Backend Architecture
- API-002 RPC Standards

---

## Related Terms

- API
- Request
- Response

---

## Notes

All public and internal API payloads should follow documented JSON schemas.

---

# Journey

## Business Definition

A Journey describes the complete sequence of interactions a user performs to accomplish a goal within ShiftOS.

---

## Technical Definition

Journeys span multiple screens, workflows and backend operations while maintaining a consistent user experience.

---

## Business Context

Examples include:

- Organization onboarding
- Employee invitation
- Shift creation
- Clock-in process
- Task completion

---

## Used By

- Product Team
- UX Team
- Engineering Team

---

## Related Specifications

- NAV-001 Navigation Flows
- ONB-001 Onboarding Screens

---

## Related Terms

- Workflow
- Navigation
- State Machine

---

## Notes

Every major user journey should be fully documented before implementation begins.

---

# Job Queue

## Business Definition

A Job Queue is a system that manages background work without interrupting the user's experience.

---

## Technical Definition

Queued jobs are processed asynchronously outside the main request-response cycle.

---

## Business Context

Examples include:

- Sending emails
- Generating reports
- Processing exports
- Dispatching notifications
- Future scheduled reminders

---

## Used By

- Backend

---

## Related Specifications

- API-007 Background Jobs

---

## Related Terms

- Background Job
- Queue
- Worker
- Event

---

## Notes

Long-running operations should be executed through background job queues rather than synchronously.

---

# Job Status

## Business Definition

Job Status represents the current execution state of a background process.

---

## Technical Definition

Each background job transitions through predefined lifecycle states.

---

## Business Context

Typical states include:

- Pending
- Queued
- Running
- Completed
- Failed
- Cancelled

---

## Used By

- Backend
- Engineering Team

---

## Related Specifications

- API-007 Background Jobs

---

## Related Terms

- Background Job
- Queue
- Retry

---

## Notes

Job Status refers to system background jobs, not employee employment status.

---

# Jitter

## Business Definition

Jitter is the intentional introduction of small timing variations to prevent multiple automated processes from executing simultaneously.

---

## Technical Definition

Jitter is commonly applied to retry mechanisms, scheduled background jobs and realtime reconnection attempts.

---

## Business Context

Jitter reduces:

- Server load spikes
- Retry storms
- Network congestion

---

## Used By

- Backend
- Infrastructure

---

## Related Specifications

- API-007 Background Jobs
- RT-004 Synchronization Rules

---

## Related Terms

- Retry
- Queue
- Reconnection

---

## Notes

Although invisible to end users, jitter improves platform stability and scalability under heavy load.