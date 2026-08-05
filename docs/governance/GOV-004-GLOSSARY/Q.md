# ShiftOS Dictionary — Q

**Document ID:** GOV-DICT-Q

**Title:** ShiftOS Dictionary – Terms Beginning with "Q"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **Q**.

These definitions are authoritative and shall be used consistently across ShiftOS specifications, engineering documentation, architecture documents, APIs, database documentation and user interfaces.

---

# Query

## Business Definition

A Query is a request for information from the database.

---

## Technical Definition

Queries retrieve, insert, update or delete data stored within PostgreSQL.

ShiftOS optimizes queries to ensure fast response times, scalability and efficient resource utilization.

---

## Business Context

Queries power nearly every feature including:

- Dashboard loading
- Employee lists
- Shift schedules
- Attendance records
- Reports
- Analytics
- Notifications

---

## Related Specifications

- DB-005 Tables
- DB-007 Indexes
- API-001 Backend Architecture

---

## Related Terms

- Database
- Index
- Table
- View

---

## Notes

Poorly designed queries can become one of the largest performance bottlenecks in enterprise applications.

---

# Queue

## Business Definition

A Queue is a temporary holding area for background work that should not block the user interface.

---

## Technical Definition

Tasks are added to a queue and processed asynchronously by background workers.

---

## Business Context

Examples include:

- Sending emails
- Delivering notifications
- Export generation
- Report creation
- Audit processing
- Scheduled jobs

---

## Related Specifications

- API-007 Background Jobs

---

## Related Terms

- Worker
- Background Job
- Event

---

## Notes

Queues improve application responsiveness and reliability.

---

# Queue Worker

## Business Definition

A Queue Worker is a background process responsible for executing queued jobs.

---

## Technical Definition

Workers continuously monitor job queues and process pending tasks independently of user requests.

---

## Business Context

Queue workers may process:

- Email invitations
- Password reset emails
- Notification delivery
- Scheduled reminders
- Report exports

---

## Related Specifications

- API-007 Background Jobs

---

## Related Terms

- Queue
- Background Job
- Worker

---

# Quick Action

## Business Definition

A Quick Action is a shortcut that allows users to perform common tasks with minimal interaction.

---

## Technical Definition

Quick Actions reduce navigation steps by exposing frequently used operations directly within dashboards or lists.

---

## Business Context

Examples include:

- Create Shift
- Add Employee
- Assign Task
- Publish Announcement
- Approve Attendance Correction

---

## Related Specifications

- MAN-001 Manager Dashboard
- SUP-001 Supervisor Dashboard

---

## Related Terms

- Dashboard
- Workflow
- Navigation

---

## Notes

Quick Actions should only expose high-frequency operations and must not clutter the interface.

---

# Quick Filter

## Business Definition

A Quick Filter allows users to rapidly narrow displayed information without opening advanced search tools.

---

## Technical Definition

Quick Filters apply predefined filtering criteria to datasets.

---

## Business Context

Examples include:

- Today's Shifts
- Late Employees
- Pending Tasks
- Unread Notifications
- This Week

---

## Related Specifications

- UI-006 Data Tables

---

## Related Terms

- Filter
- Search
- Dashboard

---

# Quick Search

## Business Definition

Quick Search enables users to rapidly locate records from anywhere within the application.

---

## Technical Definition

Quick Search performs indexed lookups across supported datasets.

---

## Business Context

Users may search for:

- Employees
- Branches
- Shifts
- Tasks
- Announcements

Search results always respect permissions and organization boundaries.

---

## Related Specifications

- UI-006 Data Tables

---

## Related Terms

- Search
- Query
- Index

---

## Notes

Quick Search should return relevant results with minimal latency.

---

# Quota (Future)

## Business Definition

A Quota is a configurable usage limit applied to an organization, subscription or feature.

---

## Technical Definition

Quotas may restrict the consumption of system resources or premium functionality.

---

## Business Context

Future examples include:

- Maximum employees
- Maximum branches
- Monthly report exports
- API request limits
- Storage limits

---

## Related Specifications

- ORG-003 Subscription Ownership
- INT-007 Public API

---

## Related Terms

- Subscription
- Limit
- Billing

---

## Notes

Quota management is planned for future subscription tiers and is not part of the MVP.