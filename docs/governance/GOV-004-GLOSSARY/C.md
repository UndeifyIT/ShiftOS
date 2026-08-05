# ShiftOS Dictionary — C

**Document ID:** GOV-DICT-C

**Title:** ShiftOS Dictionary – Terms Beginning with "C"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **C**.

All definitions contained within this document are considered authoritative and shall be used consistently throughout the ShiftOS Product Bible, software implementation, APIs, database schema, user interface, testing documentation and internal communication.

---

# Calendar

## Definition

A Calendar is the primary scheduling interface used to visualize shifts across a defined period of time.

The ShiftOS calendar displays scheduled work in daily, weekly or monthly layouts depending on the selected view.

---

## Business Context

The calendar is the primary operational workspace for managers and supervisors.

It is used to:

- Create shifts
- Edit shifts
- Reassign shifts
- Detect scheduling conflicts
- Monitor staffing coverage
- View employee availability

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing
- MAN-003 Shift Management
- SUP-003 Shift Operations

---

## Related Terms

- Shift
- Schedule
- Calendar View
- Coverage

---

## Notes

The calendar is the primary scheduling interface and should remain optimized for speed and clarity.

---

# Calendar View

## Definition

A Calendar View is a specific visual representation of scheduling information.

---

## Business Context

ShiftOS supports multiple calendar perspectives.

Examples include:

- Day View
- Week View
- Month View

Different views provide different levels of operational detail.

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- UI-007 Calendar Components

---

## Related Terms

- Calendar
- Shift
- Schedule

---

# Cancellation

## Definition

Cancellation is the act of invalidating an existing operational record while preserving its historical existence.

---

## Business Context

Cancellation applies to:

- Shifts
- Invitations
- Scheduled tasks
- Notifications

Cancelled records remain historically traceable.

---

## Used By

- Managers
- Supervisors
- System

---

## Related Specifications

- SHIFT-007 Shift Cancellation

---

## Related Terms

- Archive
- Delete
- History

---

## Notes

Cancellation must not permanently remove historical records.

---

# Capacity

## Definition

Capacity is the maximum operational workload that can reasonably be handled by employees, supervisors, branches or the organization within a given period.

---

## Business Context

Capacity planning assists managers in ensuring sufficient staffing levels without excessive labour costs.

---

## Used By

- Managers

---

## Related Specifications

- REP-002 Operational KPIs

---

## Related Terms

- Coverage
- Staffing
- Schedule

---

# Card

## Definition

A Card is a reusable user interface component used to present a self-contained group of related information.

---

## Business Context

Cards are used extensively throughout ShiftOS dashboards.

Examples include:

- Attendance Summary
- Today's Shifts
- Task Progress
- Staff Overview
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
- Widget
- Panel

---

# Checklist

## Definition

A Checklist is a structured collection of task items that must be completed as part of a larger task or operational process.

---

## Business Context

Examples include:

- Opening Store Checklist
- Closing Store Checklist
- Daily Cleaning Checklist
- Inventory Checklist

---

## Used By

- Supervisors
- Employees

---

## Related Specifications

- TASK-001 Task Model

---

## Related Terms

- Task
- Verification
- Completion

---

# Clock In

## Definition

Clock In is the action performed by an employee to indicate the official start of attendance for a scheduled shift.

---

## Business Context

Clock In records:

- Employee
- Branch
- Shift
- Timestamp
- Attendance status

Clock In initiates the attendance lifecycle.

---

## Used By

- Employees

---

## Related Specifications

- ATT-002 Clock In

---

## Related Terms

- Clock Out
- Attendance
- Shift

---

## Notes

Clock In is not equivalent to simply opening the application.

Attendance is only recorded after a successful clock-in action.

---

# Clock Out

## Definition

Clock Out is the action performed by an employee to indicate the completion of attendance for a scheduled shift.

---

## Business Context

Clock Out finalizes attendance and contributes to worked-hour calculations used for payroll preparation and reporting.

---

## Used By

- Employees

---

## Related Specifications

- ATT-003 Clock Out

---

## Related Terms

- Clock In
- Attendance

---

# Company

## Definition

A Company is the real-world business that subscribes to ShiftOS.

Within the platform, a company is represented as an Organization.

---

## Business Context

Examples include:

- Restaurants
- Hotels
- Retail chains
- Warehouses
- Pharmacies
- Supermarkets

---

## Used By

- All Users

---

## Related Specifications

- ORG-001 Organization Model

---

## Related Terms

- Organization
- Tenant

---

## Notes

The terms "Company" and "Organization" are closely related, however "Organization" is the official technical term used throughout ShiftOS.

---

# Configuration

## Definition

Configuration refers to adjustable settings that modify system behaviour without changing application code.

---

## Business Context

Examples include:

- Attendance grace period
- Business hours
- Branding
- Time zone
- Notification preferences

---

## Used By

- Managers

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Settings
- Organization

---

# Conflict

## Definition

A Conflict is any situation in which business rules prevent an operation from completing successfully.

---

## Business Context

Examples include:

- Overlapping shifts
- Employee assigned twice
- Attendance outside shift
- Unauthorized access
- Invalid state transition

---

## Used By

- System
- Managers
- Supervisors

---

## Related Specifications

- SHIFT-011 Shift Conflicts

---

## Related Terms

- Validation
- Error
- Workflow

---

# Conflict Resolution

## Definition

Conflict Resolution is the process of resolving operational conflicts while maintaining business rule integrity.

---

## Business Context

ShiftOS should identify conflicts before allowing users to complete an action whenever possible.

---

## Used By

- Backend
- Frontend

---

## Related Specifications

- RT-005 Conflict Resolution

---

## Related Terms

- Conflict
- Validation

---

# Coverage

## Definition

Coverage represents how adequately scheduled employees satisfy operational staffing requirements for a particular branch, department or time period.

---

## Business Context

Coverage helps managers identify:

- Understaffing
- Overstaffing
- Peak-hour shortages
- Schedule gaps

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- REP-002 Operational KPIs

---

## Related Terms

- Capacity
- Shift
- Staffing

---

# CRUD

## Definition

CRUD stands for Create, Read, Update and Delete.

These represent the four fundamental operations performed on application data.

---

## Business Context

Most permissions within ShiftOS ultimately control one or more CRUD operations.

Example:

Employee

- Create Employee
- View Employee
- Edit Employee
- Archive Employee

---

## Used By

- Backend
- Database
- Security

---

## Related Specifications

- PER-005 Permission Matrix

---

## Related Terms

- Permission
- Authorization

---

# Current User

## Definition

The Current User is the authenticated individual currently interacting with ShiftOS.

The current user's identity determines:

- Available navigation
- Accessible branches
- Permissions
- Notifications
- Dashboard content

---

## Used By

- Entire Platform

---

## Related Specifications

- USR-007 Session Management

---

## Related Terms

- Authentication
- Session
- Role

---

# Customization

## Definition

Customization refers to organization-level options that allow businesses to tailor ShiftOS without modifying core platform functionality.

---

## Business Context

Examples include:

- Company logo
- Brand colours
- Business hours
- Notification preferences
- Attendance policies

---

## Used By

- Managers

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Configuration
- Branding

---

# Compliance

## Definition

Compliance is the process of ensuring that ShiftOS operations, data handling and business practices conform to applicable legal, regulatory and organizational requirements.

---

## Business Context

Compliance includes:

- NDPR
- GDPR readiness
- Employee privacy
- Audit requirements
- Data retention policies

---

## Used By

- Platform Administrators
- Organization Managers

---

## Related Specifications

- SEC-006 Audit Logging
- SEC-012 Backup & Recovery

---

## Related Terms

- Audit Log
- Security
- Privacy