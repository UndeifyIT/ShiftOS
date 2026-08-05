# ShiftOS Dictionary — W

**Document ID:** GOV-DICT-W

**Title:** ShiftOS Dictionary – Terms Beginning with "W"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines all official ShiftOS terminology beginning with the letter **W**.

These definitions are authoritative and shall be used consistently throughout the ShiftOS Product Bible, technical documentation and implementation.

---

# Warning

## Business Definition

A Warning is a message informing a user that an action may have consequences but is not necessarily prohibited.

---

## Technical Definition

Warnings are informational and do not automatically block user actions.

They should clearly explain:

- The potential issue
- The reason for the warning
- The possible consequences
- Any recommended corrective action

---

## Business Context

Examples include:

- Publishing a schedule with unassigned shifts
- Assigning excessive weekly hours
- Editing a completed attendance record
- Leaving required information incomplete

---

## Related Terms

- Validation
- Error
- Notification

---

# Web Application

## Business Definition

The Web Application is the primary platform through which managers, supervisors, and employees access ShiftOS.

---

## Technical Definition

The ShiftOS web application is built as a Progressive Web App (PWA), providing a responsive experience across desktop, tablet, and mobile devices.

It supports:

- Modern web browsers
- Installation as a PWA
- Push notifications (where supported)
- Offline capabilities for selected features

The web application is the primary delivery platform for the MVP.

---

## Related Specifications

- ARCH-007 PWA Architecture
- UI-012 PWA Behaviour

---

## Related Terms

- Progressive Web App
- Browser

---

# Webhook

## Business Definition

A Webhook is an automated HTTP callback triggered when a specific event occurs.

---

## Technical Definition

Webhooks enable ShiftOS to communicate with external systems in real time.

Potential future uses include:

- Payroll integrations
- HR systems
- Accounting software
- Calendar synchronization

---

## Related Specifications

- INT-007 Public API (Future)

---

## Related Terms

- API
- Integration

---

# Widget

## Business Definition

A Widget is a reusable interface element that displays focused information or functionality.

---

## Technical Definition

Widgets are commonly used on dashboards to surface key operational information.

Examples include:

- Attendance Summary
- Today's Shifts
- Task Progress
- Notifications
- Branch Overview

Widgets should be modular, reusable and independently testable.

---

## Related Terms

- Component
- Dashboard

---

# Window

## Business Definition

A Window is the visible browser or application area where ShiftOS is displayed.

---

## Technical Definition

The interface must adapt gracefully to different window sizes through responsive design principles.

---

## Related Specifications

- UI-010 Responsive Design

---

## Related Terms

- Viewport
- Responsive Design

---

# Work Schedule

## Business Definition

A Work Schedule is the planned allocation of employee shifts over a defined period.

---

## Technical Definition

Schedules are composed of one or more shifts assigned to employees within an organization.

Schedules may be viewed by:

- Day
- Week
- Month

The schedule represents the authoritative operational plan for workforce deployment.

---

## Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-005 Shift Creation

---

## Related Terms

- Shift
- Calendar

---

# Worker

## Business Definition

A Worker is any employee performing operational duties within an organization.

---

## Technical Definition

Within ShiftOS documentation, the preferred term is **Employee**.

The term **Worker** may appear in broader architectural discussions or when describing workforce concepts generally.

---

## Related Terms

- Employee
- Workforce

---

# Workflow

## Business Definition

A Workflow is a predefined sequence of business actions performed to accomplish a specific operational objective.

---

## Technical Definition

Workflows combine:

- User interactions
- Business rules
- Validation
- State transitions
- Notifications
- Audit logging
- Realtime synchronization

Each workflow has a clearly defined start state, end state and permitted transitions.

---

## Business Context

Examples include:

- Employee invitation
- Employee onboarding
- Shift creation
- Shift publishing
- Clock in
- Clock out
- Task assignment
- Attendance correction

---

## Related Specifications

- API-004 Workflow Engine
- Volume 19 — State Machines

---

## Related Terms

- State Machine
- Business Process

---

# Workflow Engine

## Business Definition

The Workflow Engine coordinates and executes business workflows across ShiftOS.

---

## Technical Definition

The Workflow Engine ensures:

- Correct state transitions
- Business rule enforcement
- Audit logging
- Notification generation
- Event publication
- Error handling

The engine provides consistent execution for all business processes.

---

## Related Specifications

- API-004 Workflow Engine

---

## Related Terms

- Workflow
- Event System

---

# Workflow State

## Business Definition

A Workflow State represents the current stage of an active workflow.

---

## Technical Definition

Workflow states are governed by predefined state machines and cannot transition arbitrarily.

---

## Related Terms

- State Machine
- Lifecycle

---

# Workforce

## Business Definition

The Workforce is the complete collection of employees working within an organization.

---

## Technical Definition

The workforce may span multiple branches while remaining under a single organization.

Workforce-related reporting includes:

- Staffing levels
- Attendance
- Productivity
- Scheduling
- Labor utilization

---

## Related Terms

- Employee
- Organization

---

# Workforce Operations

## Business Definition

Workforce Operations refers to the day-to-day activities involved in planning, managing and monitoring employees.

---

## Business Context

Examples include:

- Scheduling
- Attendance management
- Task assignment
- Employee communication
- Operational reporting

ShiftOS is designed primarily as a workforce operations platform.

---

## Related Terms

- Scheduling
- Attendance
- Tasks

---

# Workload

## Business Definition

Workload is the amount of work assigned to an employee or team during a defined period.

---

## Technical Definition

Workload analysis may consider:

- Number of shifts
- Total scheduled hours
- Assigned tasks
- Overtime
- Attendance history

Future reporting features may use workload metrics to support staffing decisions.

---

## Related Specifications

- REP-002 Operational KPIs

---

## Related Terms

- Employee
- Shift

---

# Workweek

## Business Definition

A Workweek is the organization's defined operational week used for scheduling, attendance and reporting.

---

## Technical Definition

Organizations may configure the start day of the workweek according to local business practices.

The workweek influences:

- Schedule views
- Weekly reports
- Labor calculations
- Operational KPIs

---

## Related Terms

- Calendar
- Reporting

---

# Write Operation

## Business Definition

A Write Operation is any action that creates, modifies or deletes system data.

---

## Technical Definition

Examples include:

- Creating an employee
- Editing a shift
- Recording attendance
- Completing a task

Every write operation must pass:

- Authentication
- Authorization
- Server-side validation
- Audit logging (where applicable)

---

## Related Specifications

- SEC-010 Server-side Validation
- API-003 Validation Rules

---

## Related Terms

- Read Operation
- Audit Log

---

# Summary

The letter **W** establishes terminology around workforce management, workflows, web architecture and operational planning. These concepts form the backbone of how ShiftOS coordinates business processes, user interactions and day-to-day workforce operations.