# ShiftOS Dictionary — T

**Document ID:** GOV-DICT-T

**Title:** ShiftOS Dictionary – Terms Beginning with "T"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **T**.

These definitions are authoritative and shall be used consistently throughout ShiftOS documentation, engineering, database design, APIs and user interfaces.

---

# Table

## Business Definition

A Table is a structured collection of related records stored within the database.

---

## Technical Definition

Each table represents a single business entity and contains:

- Columns
- Rows
- Constraints
- Relationships
- Indexes

Examples include:

- Organizations
- Branches
- Employees
- Shifts
- Attendance
- Tasks

---

## Related Specifications

- DB-005 Tables

---

## Related Terms

- Database
- Record
- Schema

---

# Task

## Business Definition

A Task is a unit of work assigned to one or more employees that must be completed within a defined timeframe.

Tasks help managers and supervisors coordinate operational work beyond scheduled shifts.

---

## Technical Definition

Every task belongs to:

- One Organization
- One Branch
- One Creator
- One Lifecycle
- One Priority Level

A task may be assigned to:

- One Employee
- Multiple Employees (Future)

---

## Business Context

Examples include:

- Restock dairy shelves
- Clean checkout area
- Count inventory
- Prepare bakery display
- Lock the store

---

## Related Specifications

- TASK-001 Task Model

---

## Related Terms

- Assignment
- Employee
- Shift

---

# Task Assignment

## Business Definition

Task Assignment is the process of allocating responsibility for completing a task.

---

## Technical Definition

Assignments record:

- Assigned employee
- Assigned by
- Assignment time
- Due date

Notifications are generated automatically.

---

## Related Specifications

- TASK-002 Task Assignment

---

## Related Terms

- Employee
- Notification

---

# Task Assignee

## Business Definition

The Task Assignee is the employee responsible for completing the assigned task.

---

## Technical Definition

Each task has exactly one assignee in the MVP.

Support for multiple assignees may be introduced in a future release.

---

## Related Terms

- Employee
- Assignment

---

# Task Category

## Business Definition

A Task Category groups similar operational tasks.

---

## Business Context

Examples include:

- Cleaning
- Inventory
- Customer Service
- Stocking
- Security
- Maintenance

---

## Technical Definition

Categories improve reporting and filtering.

---

## Related Terms

- Task

---

# Task Completion

## Business Definition

Task Completion marks a task as finished by the assigned employee.

---

## Technical Definition

Completing a task records:

- Completion timestamp
- Employee
- Completion status

Completion may require supervisor verification depending on organization settings.

---

## Related Specifications

- TASK-003 Task Completion

---

## Related Terms

- Verification
- Status

---

# Task Due Date

## Business Definition

The Due Date is the latest acceptable completion time for a task.

---

## Technical Definition

Tasks become overdue once the due date has passed without completion.

---

## Related Terms

- Deadline
- Reminder

---

# Task History

## Business Definition

Task History records every significant event throughout the life of a task.

---

## Technical Definition

Examples include:

- Created
- Assigned
- Updated
- Reassigned
- Completed
- Verified
- Reopened
- Archived

Task history is immutable.

---

## Related Specifications

- TASK-006 Task History

---

## Related Terms

- Audit Log
- Timeline

---

# Task Lifecycle

## Business Definition

The Task Lifecycle defines every valid state a task may pass through.

---

## Technical Definition

The lifecycle is controlled by the Task State Machine.

Typical states include:

- Draft
- Assigned
- In Progress
- Completed
- Verified
- Archived

---

## Related Specifications

- SM-006 Task Lifecycle

---

## Related Terms

- State Machine
- Workflow

---

# Task List

## Business Definition

A Task List is the collection of tasks visible to a user.

---

## Technical Definition

Displayed tasks depend on:

- User role
- Branch
- Organization
- Permissions
- Filters

---

## Related Terms

- Dashboard
- Task

---

# Task Priority

## Business Definition

Task Priority indicates the relative importance of a task.

---

## Technical Definition

ShiftOS supports four priority levels:

- Low
- Medium
- High
- Critical

Priority influences sorting, notifications and reporting.

---

## Related Specifications

- TASK-001 Task Model

---

## Related Terms

- Notification
- Status

---

# Task Reminder

## Business Definition

A Task Reminder is an automated notification reminding an employee about a pending task.

---

## Technical Definition

Reminder timing is configurable through organization settings.

---

## Related Specifications

- NOTIF-002 Event Triggers

---

## Related Terms

- Notification
- Due Date

---

# Task Reassignment

## Business Definition

Task Reassignment transfers responsibility for a task to another employee.

---

## Technical Definition

The reassignment event is permanently recorded in task history.

Both employees receive notifications.

---

## Related Specifications

- TASK-002 Task Assignment

---

## Related Terms

- Assignment
- Audit Log

---

# Task State

## Business Definition

A Task State represents the current condition of a task.

---

## Technical Definition

State transitions are managed through the Task State Machine.

Only valid transitions are permitted.

---

## Related Specifications

- SM-006 Task Lifecycle

---

## Related Terms

- Status
- Lifecycle

---

# Task Template

## Business Definition

A Task Template is a reusable predefined task.

---

## Technical Definition

Templates reduce repetitive manual task creation.

---

## Business Context

Examples include:

- Opening Checklist
- Closing Checklist
- Daily Cleaning
- Stock Count

---

## Related Terms

- Recurring Task
- Task

---

# Task Verification

## Business Definition

Task Verification confirms that a completed task meets expected standards.

---

## Technical Definition

Verification is performed by a supervisor or manager where required.

---

## Related Specifications

- TASK-004 Task Verification

---

## Related Terms

- Completion
- Supervisor

---

# Tenant

## Business Definition

A Tenant is an independent organization using ShiftOS.

---

## Technical Definition

Each tenant has isolated:

- Users
- Branches
- Employees
- Schedules
- Attendance
- Tasks
- Reports

No tenant can access another tenant's information.

---

## Related Specifications

- ORG-002 Multi-Tenant Model

---

## Related Terms

- Organization
- Multi-Tenancy

---

# Tenant Isolation

## Business Definition

Tenant Isolation ensures every organization's data remains completely separate.

---

## Technical Definition

Isolation is enforced through:

- Row-Level Security
- Authorization
- Server-side validation
- Organization ownership checks

---

## Related Specifications

- SEC-005 Tenant Isolation

---

## Related Terms

- RLS
- Authorization

---

# Timeline

## Business Definition

A Timeline is the chronological history of events for a business object.

---

## Technical Definition

Timelines are generated automatically from system events and cannot be manually edited.

---

## Business Context

Objects with timelines include:

- Employees
- Shifts
- Tasks
- Attendance
- Invitations

---

## Related Terms

- Audit Log
- History

---

# Timestamp

## Business Definition

A Timestamp records the exact date and time an event occurred.

---

## Technical Definition

Timestamps are stored in UTC and converted to the user's local timezone for display.

---

## Related Terms

- Date
- Time

---

# Trigger

## Business Definition

A Trigger is an automatic action executed when a defined event occurs.

---

## Technical Definition

Examples include:

- Database triggers
- Notification triggers
- Workflow triggers
- Event triggers

Triggers help automate business processes while maintaining consistency.

---

## Related Specifications

- DB-009 Triggers
- API-005 Event System

---

## Related Terms

- Event
- Workflow

---

# Two-Factor Authentication (2FA)

## Business Definition

Two-Factor Authentication is an additional layer of account security requiring a second verification method.

---

## Technical Definition

2FA is planned as a future enhancement for organizations requiring stronger security.

---

## Business Context

This feature is outside the MVP but should be considered during authentication architecture design.

---

## Related Specifications

- SEC-002 Authentication

---

## Related Terms

- Authentication
- Security

---

# Type

## Business Definition

A Type is a predefined classification used to distinguish variations of the same business entity.

---

## Technical Definition

Examples include:

- Employment Type
- Notification Type
- Task Type
- Shift Type

Types are generally represented using enums or controlled reference tables.

---

## Related Terms

- Category
- Enum

---

# Summary

The letter **T** defines the terminology surrounding one of ShiftOS's most important operational capabilities: **Task Management**. It also introduces key architectural concepts such as **Tenant**, **Tenant Isolation**, **Timeline**, **Timestamp**, and **Triggers**, ensuring consistent language across the Product Bible.