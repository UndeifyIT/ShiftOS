# ShiftOS Dictionary — U

**Document ID:** GOV-DICT-U

**Title:** ShiftOS Dictionary – Terms Beginning with "U"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **U**.

These definitions are authoritative and shall be used consistently throughout the ShiftOS Product Bible, technical documentation and implementation.

---

# UI (User Interface)

## Business Definition

The User Interface (UI) is the visual layer through which users interact with ShiftOS.

---

## Technical Definition

The UI consists of:

- Pages
- Components
- Navigation
- Forms
- Tables
- Calendars
- Dialogs
- Notifications

The UI must remain consistent with the official ShiftOS Design System.

---

## Related Specifications

- UI-001 Design System

---

## Related Terms

- UX
- Component
- Dashboard

---

# Unit Test

## Business Definition

A Unit Test verifies that an individual piece of software behaves as expected.

---

## Technical Definition

Unit tests validate isolated functions, classes or components without relying on external services.

---

## Business Context

Unit testing helps prevent regressions during development.

---

## Related Specifications

- TEST-002 Unit Testing

---

## Related Terms

- Integration Test
- End-to-End Test

---

# Unauthorized

## Business Definition

Unauthorized describes an action that a user is not permitted to perform.

---

## Technical Definition

Unauthorized requests are rejected through authentication and authorization checks before any protected operation is executed.

---

## Business Context

Examples include:

- Employee attempting to edit another employee
- Supervisor accessing billing
- User viewing another organization's data

---

## Related Specifications

- SEC-003 Authorization

---

## Related Terms

- Authentication
- Permission
- Role

---

# Unassigned

## Business Definition

Unassigned indicates that a business object has not yet been allocated to a responsible user.

---

## Business Context

Examples include:

- Unassigned shift
- Unassigned task

---

## Technical Definition

The MVP minimizes unassigned records, but future features such as Open Shifts may intentionally create unassigned shifts.

---

## Related Terms

- Assignment
- Employee

---

# Update

## Business Definition

An Update is a modification made to an existing record.

---

## Technical Definition

Updates must:

- Pass server-side validation
- Respect permissions
- Be recorded in audit logs where required
- Trigger realtime synchronization when applicable

---

## Related Terms

- Edit
- Audit Log

---

# Upload

## Business Definition

Upload is the process of transferring a file from a user's device into ShiftOS.

---

## Technical Definition

Examples include:

- Employee profile photos
- Organization logos
- Supporting documents (future)

Uploaded files are stored using secure object storage rather than the relational database.

---

## Related Specifications

- ARCH-003 Service Architecture

---

## Related Terms

- Storage
- File

---

# URL (Uniform Resource Locator)

## Business Definition

A URL is the address used to access a page or resource on the web.

---

## Technical Definition

Within ShiftOS, URLs identify routes within the web application and PWA.

Sensitive information must never be exposed in URLs.

---

## Related Terms

- Route
- Navigation

---

# User

## Business Definition

A User is an individual who has access to ShiftOS through an authenticated account.

---

## Technical Definition

Every user belongs to exactly one organization in the MVP.

Each user has:

- Authentication credentials
- A role
- Permissions
- A profile
- One or more branch assignments

---

## Business Context

Current user roles include:

- Manager
- Supervisor
- Employee

---

## Related Specifications

- USR-001 User Lifecycle

---

## Related Terms

- Account
- Authentication
- Role

---

# User Acceptance Testing (UAT)

## Business Definition

User Acceptance Testing is the final stage of testing before a feature is released to production.

---

## Technical Definition

UAT verifies that implemented functionality satisfies documented business requirements.

---

## Business Context

Testing should be performed using realistic operational scenarios rather than isolated technical checks.

---

## Related Specifications

- TEST-007 User Acceptance Testing

---

## Related Terms

- Testing
- QA

---

# User Account

## Business Definition

A User Account represents an authenticated identity within ShiftOS.

---

## Technical Definition

An account includes:

- User ID
- Authentication credentials
- Profile
- Role
- Permissions
- Status

Each account is linked to exactly one user.

---

## Related Specifications

- USR-002 Authentication

---

## Related Terms

- User
- Session

---

# User Lifecycle

## Business Definition

The User Lifecycle describes every stage of a user's existence within ShiftOS.

---

## Technical Definition

Typical lifecycle stages include:

- Invited
- Registered
- Active
- Suspended
- Archived

Lifecycle transitions are governed by business rules and permissions.

---

## Related Specifications

- USR-001 User Lifecycle

---

## Related Terms

- State Machine
- Invitation

---

# User Preference

## Business Definition

User Preferences are personal settings that customize the user experience without affecting organizational rules.

---

## Technical Definition

Examples include:

- Theme
- Notification preferences
- Language (future)
- Time display format

Preferences are stored separately from organization settings.

---

## Related Specifications

- USR-010 User Preferences

---

## Related Terms

- Settings
- Profile

---

# User Role

## Business Definition

A User Role defines the level of responsibility and system access granted to a user.

---

## Technical Definition

Roles determine the baseline permission set applied during authorization.

Current roles include:

- Manager
- Supervisor
- Employee

---

## Related Specifications

- PER-001 Role Definitions

---

## Related Terms

- Permission
- Authorization

---

# UTC (Coordinated Universal Time)

## Business Definition

UTC is the standard global time reference used internally by ShiftOS.

---

## Technical Definition

All timestamps are stored in UTC within the database and converted to the user's local timezone when displayed.

This ensures consistency across regions and daylight saving changes.

---

## Related Terms

- Timestamp
- Timezone

---

# UUID (Universally Unique Identifier)

## Business Definition

A UUID is a globally unique identifier assigned to records.

---

## Technical Definition

ShiftOS uses UUIDs as primary identifiers for core entities such as:

- Organizations
- Branches
- Users
- Employees
- Shifts
- Tasks
- Attendance

UUIDs prevent collisions and improve security compared to sequential numeric IDs.

---

## Related Specifications

- DB-005 Tables

---

## Related Terms

- Primary Key
- Database

---

# Uptime

## Business Definition

Uptime measures the amount of time ShiftOS remains operational and available to users.

---

## Technical Definition

Availability monitoring includes:

- API availability
- Database availability
- Authentication service
- Realtime infrastructure
- Storage services

---

## Business Context

High uptime is essential because ShiftOS supports day-to-day business operations.

---

## Related Specifications

- OPS-003 Monitoring

---

## Related Terms

- Availability
- Monitoring

---

# Summary

The letter **U** defines terminology related to users, user interfaces, authentication, testing, system availability and unique identifiers. These concepts underpin identity management, frontend design, security and operational reliability throughout ShiftOS.