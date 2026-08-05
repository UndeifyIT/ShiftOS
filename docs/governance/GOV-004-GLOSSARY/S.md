# ShiftOS Dictionary — S (Part 1)

**Document ID:** GOV-DICT-S

**Title:** ShiftOS Dictionary – Terms Beginning with "S"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **S**.

These definitions are authoritative and shall be used consistently across ShiftOS specifications, engineering documentation, APIs, database schemas, testing documentation and user interfaces.

---

# SaaS (Software as a Service)

## Business Definition

Software delivered over the internet through a subscription model rather than installed directly on customer-owned servers.

---

## Technical Definition

ShiftOS is a cloud-native multi-tenant SaaS platform where every organization shares the same application infrastructure while maintaining complete logical data isolation.

---

## Business Context

Organizations simply create an account and begin using ShiftOS without managing infrastructure, updates or deployments.

---

## Related Specifications

- ORG-002 Multi-Tenant Model
- ARCH-001 System Overview

---

## Related Terms

- Multi-Tenancy
- Subscription
- Cloud

---

# Scalability

## Business Definition

Scalability is the ability of ShiftOS to continue performing efficiently as customers, employees and operational data grow.

---

## Technical Definition

The architecture must support growth without requiring major redesign.

Scalability considerations include:

- Database performance
- API throughput
- Background jobs
- Notification delivery
- Realtime connections

---

## Business Context

The MVP should already support future expansion from one business to thousands of organizations.

---

## Related Specifications

- ARCH-009 Scalability Strategy

---

## Related Terms

- Performance
- Infrastructure
- Database

---

# Schedule

## Business Definition

A Schedule is the complete plan of employee shifts across a defined period.

---

## Technical Definition

A schedule consists of multiple Shift records assigned to employees and branches.

---

## Business Context

Managers and supervisors create schedules to ensure adequate staffing.

Schedules are one of the primary operational tools within ShiftOS.

---

## Related Specifications

- SHIFT-001 Shift Definition

---

## Related Terms

- Shift
- Assignment
- Calendar

---

# Scheduled Shift

## Business Definition

A Scheduled Shift is an individual work assignment allocated to an employee for a defined period.

---

## Technical Definition

Each scheduled shift contains:

- Employee
- Branch
- Start Time
- End Time
- Position
- Status

---

## Related Specifications

- SHIFT-008 Shift Assignment

---

## Related Terms

- Schedule
- Employee

---

# Scheduling

## Business Definition

Scheduling is the process of creating, editing and maintaining employee work schedules.

---

## Technical Definition

Scheduling includes validation rules preventing conflicts and invalid assignments.

---

## Business Context

Scheduling is one of the core capabilities of ShiftOS.

---

## Related Specifications

- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing

---

## Related Terms

- Shift
- Calendar

---

# Schema

## Business Definition

A Schema defines how data is organized within the database.

---

## Technical Definition

The schema specifies:

- Tables
- Columns
- Relationships
- Constraints
- Indexes

---

## Related Specifications

- DB-003 Schema Overview

---

## Related Terms

- Database
- Table

---

# Search

## Business Definition

Search enables users to locate information quickly throughout ShiftOS.

---

## Technical Definition

Search uses indexed database queries to return relevant results while respecting permissions.

---

## Business Context

Search supports:

- Employees
- Shifts
- Tasks
- Branches
- Announcements

---

## Related Specifications

- UI-006 Data Tables

---

## Related Terms

- Query
- Index

---

# Search Index

## Business Definition

A Search Index is a database structure that improves search performance.

---

## Technical Definition

Indexes reduce lookup time by allowing efficient record retrieval.

---

## Related Specifications

- DB-007 Indexes

---

## Related Terms

- Search
- Query

---

# Security

## Business Definition

Security protects ShiftOS data, users and infrastructure against unauthorized access and misuse.

---

## Technical Definition

Security includes:

- Authentication
- Authorization
- Encryption
- RLS
- Audit Logging
- Validation

---

## Related Specifications

- Volume 13 — Security

---

## Related Terms

- Authentication
- Authorization

---

# Service

## Business Definition

A Service is a logical component responsible for a specific business capability.

---

## Technical Definition

Examples include:

- Authentication Service
- Notification Service
- Attendance Service
- Scheduling Service

---

## Related Specifications

- ARCH-003 Service Architecture

---

## Related Terms

- Module
- Backend

---

# Service Layer

## Business Definition

The Service Layer contains the application's business logic.

---

## Technical Definition

It sits between APIs and the database and enforces validation, workflows and business rules.

---

## Related Specifications

- API-001 Backend Architecture

---

## Related Terms

- Workflow Engine
- Validation

---

# Session

## Business Definition

A Session represents the authenticated period during which a user interacts with ShiftOS.

---

## Technical Definition

Sessions begin after successful authentication and end through logout, timeout or revocation.

---

## Related Specifications

- USR-007 Session Management

---

## Related Terms

- Authentication
- Login

---

# Session Timeout

## Business Definition

Session Timeout automatically ends inactive user sessions after a defined period.

---

## Technical Definition

Timeouts reduce the risk of unauthorized access from unattended devices.

---

## Related Specifications

- SEC-008 Session Security

---

## Related Terms

- Session
- Authentication

---

# Settings

## Business Definition

Settings are configurable options controlling organization, branch or personal preferences.

---

## Business Context

Examples include:

- Business Hours
- Notification Preferences
- Attendance Rules
- Appearance

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Preferences
- Configuration

---

# Sidebar

## Business Definition

The Sidebar is the primary navigation component used within desktop layouts.

---

## Technical Definition

Sidebar contents change according to the authenticated user's role.

---

## Related Specifications

- UI-002 Navigation

---

## Related Terms

- Navigation
- Dashboard

---

# Sign In

## Business Definition

Sign In is the process of authenticating an existing user.

---

## Technical Definition

Authentication is performed using verified credentials managed through Supabase Authentication.

---

## Related Specifications

- USR-002 Authentication

---

## Related Terms

- Login
- Session

---

# Sign Out

## Business Definition

Sign Out terminates the current authenticated session.

---

## Technical Definition

Signing out invalidates session tokens and returns the user to the authentication flow.

---

## Related Specifications

- USR-007 Session Management

---

## Related Terms

- Session

---

# Sign Up

## Business Definition

Sign Up is the process by which a new organization creates its first ShiftOS account.

---

## Technical Definition

Only organization creation uses Sign Up.

Supervisors and employees join through invitations rather than direct registration.

---

## Related Specifications

- USR-001 User Lifecycle

---

## Related Terms

- Invitation
- Organization

---

# Single Source of Truth

## Business Definition

The Single Source of Truth is the authoritative documentation from which all product decisions, development and testing originate.

---

## Technical Definition

For ShiftOS, this Product Bible is the Single Source of Truth.

No implementation should contradict these specifications.

---

## Related Terms

- Product Bible
- Specification

---

# Soft Delete

## Business Definition

Soft Delete marks records as inactive without permanently removing them.

---

## Technical Definition

Soft-deleted records remain available for auditing and historical reporting.

---

## Business Context

ShiftOS uses soft deletes only where historical data must be preserved.

---

## Related Specifications

- DB-006 Constraints

---

## Related Terms

- Audit Log
- Archive

---

# Specification

## Business Definition

A Specification is a formally approved document describing how part of ShiftOS must behave.

---

## Technical Definition

Specifications define requirements before implementation begins.

---

## Related Terms

- Documentation
- Product Bible

---

# SQL

## Business Definition

Structured Query Language (SQL) is the language used to interact with the PostgreSQL database.

---

## Technical Definition

SQL is used for queries, migrations, views, triggers and reporting.

---

## Related Specifications

- DB-001 Database Philosophy

---

## Related Terms

- PostgreSQL
- Query

---

# Storage

## Business Definition

Storage is the persistent location where ShiftOS saves files and data.

---

## Technical Definition

ShiftOS uses PostgreSQL for structured data and object storage for files.

---

## Related Terms

- Database
- Object Storage

---

# Status

## Business Definition

Status represents the current state of a business object.

---

## Technical Definition

Statuses are controlled through defined state machines and business rules.

---

## Business Context

Examples include:

- Pending
- Active
- Completed
- Cancelled
- Archived

---

## Related Specifications

- Volume 19 — State Machines

---

## Related Terms

- State
- Lifecycle

---

# Subscription

## Business Definition

A Subscription represents an organization's commercial agreement to use ShiftOS.

---

## Technical Definition

Subscriptions determine plan, billing cycle and future feature availability.

---

## Related Specifications

- ORG-003 Subscription Ownership

---

## Related Terms

- Organization
- Billing

---

# Supervisor

## Business Definition

A Supervisor is an operational user responsible for overseeing day-to-day branch activities.

---

## Technical Definition

Supervisors have elevated permissions limited to assigned branches.

---

## Business Context

Supervisors can:

- Manage employees
- Create schedules
- Monitor attendance
- Assign tasks
- Publish announcements

They cannot manage organization-wide billing or subscription settings.

---

## Related Specifications

- PER-003 Supervisor Permissions

---

## Related Terms

- Manager
- Employee

---

# Synchronization

## Business Definition

Synchronization ensures all users view consistent and up-to-date information.

---

## Technical Definition

Synchronization occurs through realtime events, server validation and periodic refresh mechanisms.

---

## Related Specifications

- RT-004 Synchronization Rules

---

## Related Terms

- Realtime
- Event

---

# System

## Business Definition

The System refers to the complete ShiftOS platform, including frontend, backend, infrastructure and supporting services.

---

## Technical Definition

The system is composed of interconnected modules operating together as a secure multi-tenant SaaS platform.

---

## Related Terms

- Platform
- Architecture
- Product

# ShiftOS Dictionary — S (Part 2)

---

# Shift

## Business Definition

A Shift is a scheduled period of work assigned to an employee at a specific branch for a defined start and end time.

---

## Technical Definition

A Shift is one of the core business entities within ShiftOS.

Every shift belongs to exactly:

- One Organization
- One Branch
- One Employee
- One Shift Template (optional)
- One Lifecycle State

A shift may have related:

- Attendance
- Tasks
- Notes
- Notifications
- Audit Logs

---

## Business Context

Examples include:

Morning Shift

08:00 → 16:00

Evening Shift

16:00 → 22:00

Night Shift

22:00 → 06:00

---

## Related Specifications

- SHIFT-001 Shift Definition

---

## Related Terms

- Schedule
- Employee
- Attendance

---

## Notes

A Shift is the primary operational object around which most ShiftOS workflows are built.

---

# Shift Assignment

## Business Definition

Shift Assignment is the process of allocating a shift to an employee.

---

## Technical Definition

Assignments must pass all validation rules before becoming active.

Validation includes:

- Employee belongs to branch
- No overlapping shifts
- Valid working hours
- Employee status is Active

---

## Related Specifications

- SHIFT-008 Shift Assignment

---

## Related Terms

- Shift
- Employee

---

# Shift Calendar

## Business Definition

The Shift Calendar is the visual interface used to display scheduled shifts.

---

## Technical Definition

The calendar supports:

- Daily View
- Weekly View
- Monthly View

Future:

- Timeline View

---

## Business Context

Managers and supervisors primarily manage schedules through the Shift Calendar.

---

## Related Specifications

- UI-007 Calendar Components

---

## Related Terms

- Schedule

---

# Shift Cancellation

## Business Definition

Shift Cancellation permanently cancels a scheduled shift before or during its lifecycle.

---

## Technical Definition

Cancelled shifts remain in the database for auditing and reporting.

---

## Business Context

Cancellation generates:

- Audit Log
- Notifications
- Timeline History

---

## Related Specifications

- SHIFT-007 Shift Cancellation

---

## Related Terms

- Audit Log

---

# Shift Conflict

## Business Definition

A Shift Conflict occurs whenever a new or edited shift violates scheduling rules.

---

## Technical Definition

Conflict detection includes:

- Overlapping shifts
- Duplicate assignments
- Invalid availability
- Branch mismatch

---

## Related Specifications

- SHIFT-011 Shift Conflicts

---

## Related Terms

- Validation
- Assignment

---

# Shift Duration

## Business Definition

Shift Duration is the total planned working time of a shift.

---

## Technical Definition

Duration equals:

End Time − Start Time

Breaks may be excluded depending on future attendance policy.

---

## Related Terms

- Working Hours

---

# Shift Edit

## Business Definition

A Shift Edit modifies an existing scheduled shift.

---

## Technical Definition

Editable properties include:

- Start Time
- End Time
- Employee
- Position
- Notes

Every edit creates an Audit Log.

---

## Related Specifications

- SHIFT-006 Shift Editing

---

## Related Terms

- Audit Log

---

# Shift History

## Business Definition

Shift History records every significant event that occurs throughout a shift's lifecycle.

---

## Technical Definition

History is immutable.

Entries include:

- Created
- Assigned
- Edited
- Started
- Completed
- Cancelled

---

## Related Specifications

- SHIFT-002 Shift Lifecycle

---

## Related Terms

- Audit Log
- Timeline

---

# Shift Lifecycle

## Business Definition

The Shift Lifecycle defines every state a shift may enter from creation until completion.

---

## Technical Definition

State transitions are controlled by the Shift State Machine.

---

## Related Specifications

- SHIFT-002 Shift Lifecycle
- SM-004 Shift Lifecycle

---

## Related Terms

- State Machine

---

# Shift Note

## Business Definition

A Shift Note is information attached to a shift to provide operational context.

---

## Technical Definition

Notes become part of the permanent shift history.

---

## Business Context

Examples:

- Employee arrived with replacement.
- Equipment issue reported.
- Customer incident occurred.

---

## Related Terms

- Timeline

---

# Shift Reassignment

## Business Definition

Shift Reassignment transfers responsibility for a scheduled shift from one employee to another.

---

## Technical Definition

Reassignment requires full validation before completion.

Both original and new employees receive notifications.

---

## Related Specifications

- SHIFT-009 Shift Reassignment

---

## Related Terms

- Assignment

---

# Shift State

## Business Definition

A Shift State describes the current operational condition of a shift.

---

## Technical Definition

States include:

- Draft
- Scheduled
- Active
- Completed
- Cancelled

Future states may be added without redesigning the state machine.

---

## Related Specifications

- SHIFT-003 Shift States

---

## Related Terms

- Lifecycle

---

# Shift State Machine

## Business Definition

The Shift State Machine governs all valid transitions between shift states.

---

## Technical Definition

Invalid transitions are rejected by backend validation.

---

## Related Specifications

- SM-004 Shift Lifecycle

---

## Related Terms

- Workflow
- Validation

---

# Shift Template

## Business Definition

A Shift Template is a reusable predefined shift configuration.

---

## Technical Definition

Templates reduce repetitive schedule creation.

---

## Business Context

Examples:

Morning Shift

Closing Shift

Weekend Shift

Holiday Shift

---

## Related Specifications

- SHIFT-004 Shift Templates

---

## Related Terms

- Schedule

---

# Shift Validation

## Business Definition

Shift Validation ensures every shift satisfies all business rules before being saved.

---

## Technical Definition

Validation checks:

- Time overlap
- Employee status
- Branch ownership
- Organization ownership
- Required fields
- Lifecycle rules

---

## Related Specifications

- SHIFT-012 Shift Validation Rules

---

## Related Terms

- Validation
- Workflow

---

## Notes

Shift validation is always performed server-side and cannot be bypassed by the client.

# ShiftOS Dictionary — S (Part 3)

---

# Shift Approval

## Business Definition

Shift Approval is the process of confirming that a newly created or modified shift is valid for operational use.

---

## Technical Definition

For the MVP, shifts created by managers and supervisors become active immediately after passing validation.

No additional approval workflow exists.

Future enterprise editions may introduce configurable approval chains.

---

## Related Specifications

- SHIFT-005 Shift Creation
- SHIFT-012 Shift Validation Rules

---

## Related Terms

- Shift
- Validation

---

# Shift Availability

## Business Definition

Shift Availability describes whether an employee is eligible to be assigned to a shift.

---

## Technical Definition

Availability is determined by business rules rather than employee preference in the MVP.

Validation considers:

- Employment status
- Existing shift assignments
- Branch assignment
- Organization ownership

---

## Related Specifications

- SHIFT-012 Shift Validation Rules

---

## Related Terms

- Employee
- Shift Assignment

---

# Shift Coverage

## Business Definition

Shift Coverage measures whether enough employees are scheduled to operate the business effectively.

---

## Technical Definition

Coverage is calculated by comparing scheduled employees against operational staffing requirements.

---

## Business Context

Managers use coverage information to identify understaffed or overstaffed periods.

---

## Related Specifications

- REP-002 Operational KPIs

---

## Related Terms

- Schedule
- KPI

---

# Shift Creation

## Business Definition

Shift Creation is the process of adding a new shift to the schedule.

---

## Technical Definition

Creating a shift requires successful validation before the record is committed to the database.

---

## Required Information

- Branch
- Employee
- Date
- Start Time
- End Time

Optional:

- Position
- Notes
- Template

---

## Related Specifications

- SHIFT-005 Shift Creation

---

## Related Terms

- Schedule
- Validation

---

# Shift Deletion

## Business Definition

Shift Deletion removes a shift from future operational use.

---

## Technical Definition

ShiftOS prefers cancellation over permanent deletion.

Deletion is extremely restricted and generally reserved for administrative correction of invalid draft records.

---

## Related Specifications

- SHIFT-007 Shift Cancellation

---

## Related Terms

- Cancellation
- Audit Log

---

## Notes

Historical operational records should never be permanently deleted.

---

# Shift Intelligence (Future)

## Business Definition

Shift Intelligence refers to AI-powered scheduling recommendations.

---

## Technical Definition

Future capabilities may include:

- Staffing predictions
- Schedule optimization
- Conflict prediction
- Overtime reduction

---

## Business Context

Shift Intelligence is outside the MVP and should not influence current scheduling workflows.

---

## Related Specifications

- SFT-010 Future AI Features

---

## Related Terms

- Shifty
- AI

---

# Shift Owner

## Business Definition

The Shift Owner is the employee assigned responsibility for working a scheduled shift.

---

## Technical Definition

Ownership transfers automatically if the shift is reassigned.

---

## Related Terms

- Employee
- Assignment

---

# Shift Publication

## Business Definition

Shift Publication is the point at which newly created or modified schedules become visible to employees.

---

## Technical Definition

Once published, employees receive notifications according to their notification preferences.

---

## Business Context

Publishing a schedule ensures staff are informed of upcoming work assignments.

---

## Related Specifications

- NOTIF-002 Event Triggers

---

## Related Terms

- Notification
- Schedule

---

# Shift Reminder

## Business Definition

A Shift Reminder is an automated notification sent before an employee's scheduled shift begins.

---

## Technical Definition

Reminder timing is configurable by organization settings.

---

## Business Context

Examples:

- 24 hours before
- 2 hours before
- 30 minutes before

---

## Related Specifications

- NOTIF-002 Event Triggers

---

## Related Terms

- Notification
- Schedule

---

# Shift Swap (Future)

## Business Definition

A Shift Swap allows two employees to exchange assigned shifts.

---

## Technical Definition

Shift swapping is planned as a future capability requiring supervisor approval.

---

## Business Context

This feature is intentionally excluded from the MVP.

---

## Related Specifications

- SHIFT-010 Open Shifts

---

## Related Terms

- Reassignment
- Schedule

---

# Shift Timeline

## Business Definition

The Shift Timeline is the chronological history of all significant events affecting a shift.

---

## Technical Definition

Timeline entries are immutable and generated automatically by system events.

---

## Timeline Examples

- Shift Created
- Employee Assigned
- Shift Edited
- Shift Published
- Attendance Recorded
- Shift Completed
- Shift Cancelled

---

## Related Specifications

- SHIFT-002 Shift Lifecycle
- SEC-006 Audit Logging

---

## Related Terms

- Audit Log
- Shift History

---

# Shift Utilization

## Business Definition

Shift Utilization measures how effectively scheduled shifts are used.

---

## Technical Definition

Utilization metrics compare planned shifts with completed attendance records.

---

## Business Context

Managers use utilization metrics to improve workforce planning.

---

## Related Specifications

- REP-002 Operational KPIs

---

## Related Terms

- Attendance
- KPI

---

# Staffing Level

## Business Definition

Staffing Level describes the number of employees assigned during a particular operational period.

---

## Technical Definition

Staffing levels are calculated from active scheduled shifts.

---

## Business Context

Maintaining appropriate staffing levels is critical to business operations.

---

## Related Terms

- Coverage
- Schedule

---

# Start Time

## Business Definition

Start Time is the planned beginning of a scheduled shift.

---

## Technical Definition

Start Time forms part of the unique scheduling period used during conflict validation.

---

## Related Terms

- End Time
- Shift Duration

---

# Stop Time

## Business Definition

Stop Time is an alternative term for End Time.

---

## Technical Definition

Within ShiftOS documentation and user interfaces, the preferred term is **End Time**.

"Stop Time" should not be used in new specifications.

---

## Related Terms

- End Time
- Shift

---

## Notes

Included only to avoid ambiguity with external documentation and integrations.

---

# Schedule Conflict

## Business Definition

A Schedule Conflict occurs when one or more shifts violate scheduling rules.

---

## Technical Definition

Examples include:

- Overlapping employee shifts
- Invalid branch assignments
- Duplicate scheduling
- Invalid shift durations

---

## Related Specifications

- SHIFT-011 Shift Conflicts

---

## Related Terms

- Shift Conflict
- Validation

---

# Schedule Publication

## Business Definition

Schedule Publication is the process of making a completed schedule visible to employees.

---

## Technical Definition

Publishing a schedule generates the necessary realtime updates and notifications.

---

## Related Specifications

- RT-002 Live Updates
- NOTIF-002 Event Triggers

---

## Related Terms

- Shift Publication
- Notification

# ShiftOS Dictionary — S (Part 4)

---

# Shifty

## Business Definition

Shifty is the official intelligent workplace assistant of ShiftOS.

Unlike a general-purpose AI chatbot, Shifty exists solely to help managers, supervisors and employees operate their workplace more efficiently.

Shifty is a product feature, not a replacement for human decision-making.

---

## Technical Definition

Shifty is an application service that delivers contextual guidance, operational assistance and productivity recommendations based on user role, permissions and current application state.

Every recommendation generated by Shifty must respect:

- Organization boundaries
- Branch permissions
- User permissions
- Security rules
- Business workflows

Shifty never bypasses business rules.

---

## Product Philosophy

Shifty should feel like an experienced workplace assistant.

Its purpose is to:

- reduce confusion
- improve productivity
- teach users
- explain features
- surface important information
- reduce operational mistakes

Shifty should never overwhelm users.

---

## Related Specifications

- SFT-001 Purpose
- SFT-002 Personality

---

## Related Terms

- AI
- Assistant
- Guidance

---

# Shifty Greeting

## Business Definition

The Shifty Greeting is the first interaction users receive after entering ShiftOS for the first time.

---

## Business Context

Managers see Shifty immediately after organization onboarding.

Supervisors see Shifty immediately after accepting an invitation and completing account setup.

Employees see Shifty after their first successful login.

The greeting introduces the platform and helps users understand what they can accomplish.

---

## Related Specifications

- SFT-003 First Appearance
- SFT-004 Onboarding

---

## Related Terms

- Onboarding
- Welcome Experience

---

# Shifty Workspace

## Business Definition

The Shifty Workspace is the dedicated interface where users interact with Shifty.

---

## Technical Definition

The workspace contains:

- Conversation history
- Suggested actions
- Quick commands
- Context-aware recommendations
- Help resources

---

## Business Context

The workspace supplements normal navigation rather than replacing it.

Users should always be able to complete tasks manually.

---

## Related Terms

- Dashboard
- Navigation

---

# Shifty Suggestions

## Business Definition

Suggestions are proactive recommendations generated by Shifty to improve workplace operations.

---

## Business Context

Examples include:

- Employees missing tomorrow's shift
- Attendance anomalies
- Unpublished schedules
- Overlapping shifts
- Unassigned tasks

---

## Technical Definition

Suggestions are generated from validated system data.

They are advisory only.

---

## Related Specifications

- SFT-007 Recommendations

---

## Related Terms

- Recommendation
- Notification

---

# Shifty Guidance

## Business Definition

Guidance is contextual assistance displayed while users perform tasks inside ShiftOS.

---

## Business Context

Examples include:

- Explaining a screen
- Describing a feature
- Recommending the next step
- Warning about common mistakes

---

## Technical Definition

Guidance adapts to:

- Current page
- User role
- Current workflow
- Organization configuration

---

## Related Specifications

- SFT-005 Guidance Rules

---

## Related Terms

- Help
- Tutorial

---

# Shifty Quick Actions

## Business Definition

Quick Actions are suggested shortcuts presented by Shifty for commonly performed operations.

---

## Examples

Manager

- Create Shift
- Add Employee
- Publish Schedule
- View Attendance

Supervisor

- Assign Task
- Record Attendance
- View Team Schedule

Employee

- View Today's Shift
- Clock In
- View Tasks
- Read Announcement

---

## Technical Definition

Quick Actions navigate users directly to existing system functionality.

They do not introduce hidden workflows.

---

## Related Terms

- Dashboard
- Navigation

---

# Shifty Notifications

## Business Definition

Shifty may explain or summarize important notifications.

---

## Business Context

Rather than simply displaying alerts, Shifty provides useful context.

Example:

"Three employees are scheduled to start within the next hour."

instead of

"You have 3 notifications."

---

## Related Specifications

- SFT-006 Notifications

---

## Related Terms

- Notification

---

# Shifty Personality

## Business Definition

Shifty's personality defines how it communicates with users.

---

## Personality Principles

Shifty should always be:

- Professional
- Friendly
- Encouraging
- Calm
- Helpful
- Respectful
- Clear
- Concise

---

## Shifty Should Never

- use sarcasm
- make jokes during serious workflows
- invent information
- pressure users
- act emotional
- behave like a social chatbot

---

## Related Specifications

- SFT-002 Personality

---

# Shifty Limitations

## Business Definition

Shifty has clearly defined operational boundaries.

---

## Shifty Cannot

- approve attendance
- bypass permissions
- change schedules automatically
- edit payroll
- delete records
- override business rules

---

## Technical Definition

All actions requiring data modification must be confirmed through standard workflows.

Shifty cannot perform privileged operations without user authorization.

---

## Related Specifications

- SFT-009 Limitations

---

## Related Terms

- Authorization
- Validation

---

# Shifty Context Awareness

## Business Definition

Context Awareness allows Shifty to provide information relevant to the user's current activity.

---

## Technical Definition

Context may include:

- Current screen
- Current organization
- Branch
- User role
- Active workflow
- Selected employee
- Selected shift

---

## Business Context

When viewing an employee profile, Shifty discusses employee-related actions.

When viewing the schedule, Shifty discusses scheduling.

---

## Related Terms

- Context
- Guidance

---

# Shifty Future Capabilities

## Business Definition

Future enterprise editions of ShiftOS may expand Shifty beyond guidance into intelligent operational assistance.

---

## Planned Capabilities

Possible future features include:

- AI schedule optimization
- Staffing predictions
- Attendance forecasting
- Labor cost insights
- Productivity coaching
- Operational summaries
- Natural language reporting
- Conversational analytics

---

## Notes

These features are explicitly outside the MVP and must not influence current implementation decisions.

---

## Related Specifications

- SFT-010 Future AI Features

---

## Related Terms

- Artificial Intelligence
- Reporting
- Analytics

# ShiftOS Dictionary — S (Part 5)

---

# Server

## Business Definition

The Server is the trusted execution environment where ShiftOS processes requests, enforces business rules and stores data.

---

## Technical Definition

The server is responsible for:

- Authentication
- Authorization
- Business logic
- Database access
- Realtime events
- Background jobs
- File storage coordination
- Audit logging

Clients must never be trusted to enforce business rules.

---

## Related Specifications

- API-001 Backend Architecture
- ARCH-003 Service Architecture

---

## Related Terms

- Backend
- API
- Database

---

# Server-side Validation

## Business Definition

Server-side Validation is the process of verifying every data modification on the server before it is committed.

---

## Technical Definition

Every create, update and delete operation must be validated on the backend, regardless of any client-side validation.

Validation includes:

- Required fields
- Permissions
- Organization ownership
- Branch ownership
- Business rules
- State machine transitions
- Referential integrity

---

## Business Context

A malicious or modified client must never be able to bypass validation.

---

## Related Specifications

- API-003 Validation Rules
- SEC-009 Server-side Validation

---

## Related Terms

- Validation
- Authorization
- Security

---

# Shared Component

## Business Definition

A Shared Component is a reusable user interface element used across multiple screens.

---

## Technical Definition

Examples include:

- Buttons
- Modals
- Tables
- Date pickers
- Search bars
- Empty states
- Loading indicators

Shared components promote consistency and reduce duplication.

---

## Related Specifications

- UI-001 Design System

---

## Related Terms

- Component
- Design System

---

# Shared State

## Business Definition

Shared State is application data that must be accessible by multiple parts of the interface.

---

## Technical Definition

Examples include:

- Current authenticated user
- Active organization
- Selected branch
- Notification count
- Theme preferences

Shared state should have a single authoritative source.

---

## Related Specifications

- UI-004 State Management

---

## Related Terms

- State
- Store

---

# Snapshot

## Business Definition

A Snapshot is a point-in-time representation of data.

---

## Technical Definition

Snapshots may be used for reporting, backups or historical comparisons.

---

## Business Context

Examples include:

- Weekly attendance summary
- End-of-month staffing
- Payroll preparation
- KPI reports

---

## Related Terms

- Report
- Backup

---

# Source of Truth

## Business Definition

The Source of Truth is the authoritative location for a particular piece of information.

---

## Technical Definition

Every important dataset should have exactly one authoritative owner.

Examples:

- User authentication → Supabase Auth
- Employee records → Employee table
- Shift schedules → Shift table

Documentation follows the same principle: this Product Bible is the authoritative source for product behavior.

---

## Related Terms

- Single Source of Truth
- Specification

---

# Sprint

## Business Definition

A Sprint is a defined period during which development work is planned and completed.

---

## Technical Definition

Sprints group related implementation tasks and are tracked against the MVP Build Plan.

---

## Business Context

Although development may not follow a strict Scrum process, sprint terminology is used for planning and progress tracking.

---

## Related Specifications

- MVP-002 Development Milestones

---

## Related Terms

- Milestone
- Roadmap

---

# State

## Business Definition

A State represents the current condition of a business object.

---

## Technical Definition

Every entity with a lifecycle progresses through predefined states.

Examples:

- Invitation
- Shift
- Attendance
- Task

State transitions are governed by state machines.

---

## Related Specifications

- Volume 19 — State Machines

---

## Related Terms

- Lifecycle
- Status

---

# State Machine

## Business Definition

A State Machine defines every valid transition between the states of a business object.

---

## Technical Definition

State machines prevent invalid operations and ensure consistent business behavior.

Every transition must be validated on the server.

---

## Business Context

Examples include:

- Invitation Lifecycle
- Shift Lifecycle
- Attendance Lifecycle
- Task Lifecycle
- Notification Lifecycle

---

## Related Specifications

- SM-001 to SM-007

---

## Related Terms

- State
- Workflow

---

# Static Data

## Business Definition

Static Data is information that changes rarely and is primarily used as reference data.

---

## Technical Definition

Examples include:

- Employment types
- Permission definitions
- Countries
- Supported languages
- System constants

---

## Related Terms

- Reference Data
- Configuration

---

# Store

## Business Definition

A Store is the centralized location used by the frontend to manage application state.

---

## Technical Definition

Stores hold reactive data shared across multiple components.

Examples include:

- Authentication Store
- Organization Store
- Notification Store
- Theme Store

---

## Related Specifications

- UI-004 State Management

---

## Related Terms

- Shared State

---

# Success Metric

## Business Definition

A Success Metric is a measurable indicator used to determine whether ShiftOS is achieving its product goals.

---

## Technical Definition

Metrics are defined before implementation and measured through reporting and analytics.

---

## Business Context

Examples include:

- Daily active organizations
- Schedule completion rate
- Attendance compliance
- Task completion rate
- User retention

---

## Related Specifications

- 1.11 Success Metrics
- REP-001 Reporting Philosophy

---

## Related Terms

- KPI
- Analytics

---

# System Event

## Business Definition

A System Event is an occurrence within ShiftOS that may trigger additional actions.

---

## Technical Definition

Examples include:

- User logged in
- Shift created
- Attendance recorded
- Task completed
- Announcement published

Events may trigger:

- Notifications
- Audit logs
- Realtime updates
- Background jobs

---

## Related Specifications

- API-005 Event System
- RT-001 Event Architecture

---

## Related Terms

- Event
- Notification

---

# System Health

## Business Definition

System Health represents the operational condition of the ShiftOS platform.

---

## Technical Definition

Health monitoring includes:

- API availability
- Database connectivity
- Realtime service
- Background workers
- Storage availability
- Error rates

---

## Related Specifications

- OPS-003 Monitoring

---

## Related Terms

- Monitoring
- Availability

---

# System Notification

## Business Definition

A System Notification is a notification generated automatically by ShiftOS rather than manually by a user.

---

## Technical Definition

Examples include:

- Shift reminders
- Invitation emails
- Attendance alerts
- Task reminders
- Security notifications

---

## Related Specifications

- NOTIF-002 Event Triggers

---

## Related Terms

- Notification
- Event

---

# System Setting

## Business Definition

A System Setting is a configurable option that controls platform-wide behavior.

---

## Technical Definition

Settings may exist at different scopes:

- Platform
- Organization
- Branch
- User

Higher-level settings may override lower-level defaults where explicitly designed.

---

## Related Specifications

- ORG-006 Business Settings

---

## Related Terms

- Configuration
- Preferences

---

# System Workflow

## Business Definition

A System Workflow is a predefined sequence of steps that accomplishes a business process.

---

## Technical Definition

Workflows combine:

- User actions
- Business rules
- Validation
- State transitions
- Notifications
- Audit logging

---

## Business Context

Examples include:

- User invitation
- Employee onboarding
- Shift creation
- Clock in
- Task assignment

---

## Related Specifications

- API-004 Workflow Engine

---

## Related Terms

- Process
- State Machine

---

# Summary

The letter **S** contains many of the most important concepts in ShiftOS because it encompasses:

- Platform architecture
- Scheduling
- Security
- Shifty
- State management
- System behavior

Together, Parts 1–5 establish the official terminology for these foundational concepts and should be treated as the authoritative reference throughout the Product Bible.