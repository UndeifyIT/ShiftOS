# ShiftOS Dictionary — L

**Document ID:** GOV-DICT-L

**Title:** ShiftOS Dictionary – Terms Beginning with "L"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **L**.

These definitions are authoritative and shall be used consistently across the ShiftOS Product Bible, engineering documentation, APIs, database schemas, user interfaces and operational procedures.

---

# Landing Page

## Business Definition

The Landing Page is the public-facing entry point to ShiftOS for prospective and existing users.

---

## Technical Definition

The Landing Page is served without authentication and provides navigation to marketing content, pricing, sign in and organization registration.

---

## Business Context

The Landing Page includes:

- Product overview
- Features
- Pricing
- Sign In
- Get Started
- Contact information

---

## Used By

- Visitors
- Managers

---

## Related Specifications

- AUTH-001 Authentication Screens

---

## Related Terms

- Sign In
- Organization Registration
- Authentication

---

## Notes

Shifty does not appear on the public landing page. The first interaction with Shifty occurs after the initial authenticated onboarding flow.

---

# Late Arrival

## Business Definition

A Late Arrival occurs when an employee clocks in after the scheduled shift start time plus any configured grace period.

---

## Technical Definition

Late Arrival is a calculated attendance state determined during attendance validation.

---

## Business Context

Example:

Shift Start: 8:00 AM

Grace Period: 10 minutes

Clock In: 8:12 AM

Result:

Late Arrival

---

## Data Ownership

Organization
→ Branch
→ Employee
→ Attendance Record

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- ATT-005 Late Rules

---

## Related Terms

- Grace Period
- Clock In
- Attendance

---

## Notes

Late Arrival is derived automatically and cannot be manually selected.

---

# Latency

## Business Definition

Latency is the delay between a user action and the corresponding system response.

---

## Technical Definition

Latency is measured across client devices, networks and backend services.

---

## Business Context

Low latency improves:

- Clock-in experience
- Dashboard responsiveness
- Realtime updates
- Search performance

---

## Used By

- Engineering Team

---

## Related Specifications

- ARCH-009 Scalability Strategy
- OPS-003 Monitoring

---

## Related Terms

- Performance
- Response Time
- Availability

---

# Leave (Future)

## Business Definition

Leave is an approved period during which an employee is not expected to work scheduled shifts.

---

## Technical Definition

Leave management is planned as a future module and is not included in the MVP.

---

## Business Context

Future leave types may include:

- Annual Leave
- Sick Leave
- Maternity Leave
- Compassionate Leave
- Study Leave

---

## Data Ownership

Organization
→ Employee
→ Leave Record

---

## Used By

- Managers
- Employees

---

## Related Specifications

- Future HR Module

---

## Related Terms

- Absence
- Schedule
- Employee

---

## Notes

The MVP supports attendance tracking but not formal leave management.

---

# Lifecycle

## Business Definition

A Lifecycle describes the complete sequence of states through which an entity progresses from creation to completion or archival.

---

## Technical Definition

Lifecycles are formally defined using state machines and business rules.

---

## Business Context

Examples include:

- User Lifecycle
- Employee Lifecycle
- Shift Lifecycle
- Attendance Lifecycle
- Task Lifecycle
- Notification Lifecycle

---

## Used By

- Entire Platform

---

## Related Specifications

- Volume 19 — State Machines

---

## Related Terms

- State
- Workflow
- Transition

---

# Log

## Business Definition

A Log is a chronological record of system activity.

---

## Technical Definition

Logs capture operational events, diagnostics and system behaviour for monitoring and troubleshooting.

---

## Business Context

Examples include:

- API Logs
- Authentication Logs
- Error Logs
- Background Job Logs
- Notification Logs

---

## Used By

- Engineering Team

---

## Related Specifications

- OPS-004 Logging

---

## Related Terms

- Audit Log
- Monitoring
- Incident

---

# Login

## Business Definition

Login is the process by which a registered user authenticates and gains access to ShiftOS.

---

## Technical Definition

Login validates user credentials, creates an authenticated session and loads the appropriate role-based dashboard.

---

## Business Context

MVP Login Flow:

- Enter email
- Enter password
- Authenticate
- Redirect to dashboard

If this is the user's first login from an invitation, they complete onboarding before reaching their dashboard.

---

## Data Ownership

Authentication Service
→ User
→ Session

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- USR-002 Authentication
- SM-002 Authentication

---

## Related Terms

- Logout
- Session
- Authentication

---

# Logout

## Business Definition

Logout is the process by which a user securely ends an authenticated session.

---

## Technical Definition

Logout invalidates the current session and removes local authentication credentials.

---

## Business Context

After logout:

- Protected pages become inaccessible.
- The user must authenticate again to regain access.

---

## Used By

- All Users

---

## Related Specifications

- USR-007 Session Management

---

## Related Terms

- Login
- Session
- Authentication

---

# Lockout

## Business Definition

A Lockout is a temporary security measure that prevents repeated unauthorized login attempts.

---

## Technical Definition

Lockouts are triggered after a configurable number of failed authentication attempts.

---

## Business Context

Lockouts reduce the risk of brute-force attacks while protecting user accounts.

---

## Used By

- Authentication System

---

## Related Specifications

- SEC-002 Authentication
- USR-003 Password Policy

---

## Related Terms

- Authentication
- Password
- Security

---

## Notes

Users should receive clear guidance on how to regain access after a lockout.

---

# Location

## Business Definition

Location refers to the physical place where operational activities occur.

---

## Technical Definition

In the MVP, Location is represented by the Branch entity.

Future versions may support multiple work locations within a single branch.

---

## Data Ownership

Organization
→ Branch

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- ORG-004 Branch Structure

---

## Related Terms

- Branch
- Organization
- Workplace

---

# Lookup

## Business Definition

A Lookup is the process of retrieving information based on known search criteria.

---

## Technical Definition

Lookups are optimized queries that return matching records without modifying data.

---

## Business Context

Examples include:

- Employee lookup
- Shift lookup
- Branch lookup
- Attendance lookup

---

## Used By

- Managers
- Supervisors
- Backend

---

## Related Specifications

- UI-006 Data Tables

---

## Related Terms

- Search
- Filter
- Query

---

# Load Balancing

## Business Definition

Load Balancing is the distribution of application traffic across multiple resources to maintain reliability and performance.

---

## Technical Definition

Load balancing prevents individual servers or services from becoming bottlenecks.

---

## Business Context

Although largely handled by cloud infrastructure, ShiftOS is designed to support horizontal scaling as customer demand grows.

---

## Used By

- Infrastructure
- Engineering Team

---

## Related Specifications

- ARCH-009 Scalability Strategy

---

## Related Terms

- Scalability
- Availability
- Infrastructure

---

## Notes

Load balancing becomes increasingly important as ShiftOS expands to support thousands of organizations and millions of operational records.