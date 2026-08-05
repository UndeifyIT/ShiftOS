# ShiftOS Dictionary — K

**Document ID:** GOV-DICT-K

**Title:** ShiftOS Dictionary – Terms Beginning with "K"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **K**.

These definitions are authoritative and shall be used consistently across ShiftOS documentation, specifications, engineering, reporting and user interfaces.

---

# Key Performance Indicator (KPI)

## Business Definition

A Key Performance Indicator (KPI) is a measurable value used to evaluate operational performance against defined business objectives.

---

## Technical Definition

KPIs are calculated metrics derived from operational data such as shifts, attendance, tasks and employee activity.

They are not manually entered by users.

---

## Business Context

Examples include:

- Attendance Rate
- On-Time Arrival Rate
- Shift Completion Rate
- Task Completion Rate
- Absence Rate
- Employee Utilization
- Branch Performance Score

---

## Data Ownership

Organization
→ Branch
→ Operational Data
→ Calculated KPI

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- REP-001 Reporting Philosophy
- REP-002 Operational KPIs
- REP-007 Dashboard Metrics

---

## Related Terms

- Dashboard
- Analytics
- Report
- Metric

---

## Notes

KPIs should always be calculated from authoritative operational records rather than stored independently.

---

# Key

## Business Definition

A Key is a unique value used to identify, relate or secure information within ShiftOS.

---

## Technical Definition

Keys include database keys, cryptographic keys and API keys depending on context.

---

## Business Context

Examples include:

- Primary Key
- Foreign Key
- API Key
- Encryption Key

---

## Used By

- Backend
- Database
- Security

---

## Related Specifications

- DB-006 Constraints
- SEC-007 Encryption
- SEC-010 Secrets Management

---

## Related Terms

- Identifier
- UUID
- Token

---

## Notes

The meaning of "Key" depends on context and should always be qualified where possible.

---

# Keyboard Navigation

## Business Definition

Keyboard Navigation is the ability to use ShiftOS without relying on a mouse or touch input.

---

## Technical Definition

Interactive elements must support logical keyboard focus order and standard keyboard shortcuts where appropriate.

---

## Business Context

Keyboard accessibility improves efficiency for power users and supports accessibility requirements.

---

## Used By

- All Users

---

## Related Specifications

- UI-011 Accessibility

---

## Related Terms

- Accessibility
- Focus State
- Interface

---

## Notes

All interactive controls should be fully operable using a keyboard.

---

# Knowledge Base

## Business Definition

A Knowledge Base is a centralized collection of documentation, tutorials, guides and reference material that helps users understand and use ShiftOS.

---

## Technical Definition

The Knowledge Base may be delivered through searchable documentation, contextual help and integrated support content.

---

## Business Context

Future content may include:

- Getting Started Guides
- Manager Tutorials
- Supervisor Guides
- Employee FAQs
- Troubleshooting Articles

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

- Help Center
- Documentation
- Shifty

---

## Notes

During the MVP, contextual guidance from **Shifty** serves as the primary in-app assistance. A full Knowledge Base is planned for a future release.

---

# Keep-Alive

## Business Definition

A Keep-Alive is a mechanism used to maintain an active connection between systems without requiring repeated reconnections.

---

## Technical Definition

Keep-Alive messages reduce connection overhead and support stable realtime communication.

---

## Business Context

Keep-Alive mechanisms are used for:

- Realtime updates
- WebSocket connections
- Session continuity

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

- Heartbeat
- Session
- Realtime

---

## Notes

Keep-Alive messages are distinct from Heartbeats. A Keep-Alive maintains the connection, while a Heartbeat verifies that the connection remains healthy.

---

# Keyset Pagination

## Business Definition

Keyset Pagination is a method of loading large datasets efficiently without relying on page numbers.

---

## Technical Definition

Instead of using OFFSET queries, keyset pagination retrieves records after a known cursor value, improving performance on large tables.

---

## Business Context

Keyset pagination is suitable for high-volume lists such as:

- Employees
- Shifts
- Attendance Records
- Notifications
- Audit Logs

---

## Used By

- Backend
- Frontend

---

## Related Specifications

- DB-007 Indexes
- API-001 Backend Architecture

---

## Related Terms

- Index
- Cursor
- Query
- Performance

---

## Notes

Keyset pagination provides better scalability than offset-based pagination as data volumes grow.

---

# Knowledge Transfer

## Business Definition

Knowledge Transfer is the structured sharing of information between people or teams to ensure continuity and reduce dependency on individuals.

---

## Technical Definition

Knowledge Transfer is supported through documentation, specifications, onboarding guides and architectural records.

---

## Business Context

Examples include:

- Developer onboarding
- Product handovers
- Operational training
- Support documentation

---

## Used By

- Product Team
- Engineering Team
- Customer Success

---

## Related Specifications

- GOV-001 Document Control
- GOV-003 Decision Log

---

## Related Terms

- Documentation
- Governance
- Product Bible

---

## Notes

The ShiftOS Product Bible is the primary mechanism for long-term knowledge transfer across the project.

---

# Known Issue

## Business Definition

A Known Issue is a documented problem that has been identified but not yet resolved.

---

## Technical Definition

Known Issues are tracked, prioritized and linked to planned fixes or workarounds.

---

## Business Context

Examples include:

- Minor UI defects
- Performance bottlenecks
- Third-party limitations
- Temporary integration constraints

---

## Used By

- Product Team
- Engineering Team
- QA Team

---

## Related Specifications

- TEST-007 User Acceptance Testing
- OPS-005 Error Tracking

---

## Related Terms

- Bug
- Incident
- Release

---

## Notes

Known Issues should be documented transparently and reviewed before every production release.