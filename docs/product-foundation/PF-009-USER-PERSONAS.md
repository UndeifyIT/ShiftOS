# ShiftOS User Personas

**Document ID:** PF-009

**Title:** User Personas

**Version:** 1.0.0

**Status:** Approved

**Classification:** Product Foundation

**Owner:** ShiftOS Product Team

---

# Purpose

This document defines the primary users of ShiftOS and describes their goals, responsibilities, behaviours, frustrations and expectations.

User personas guide:

- User experience design.
- Feature prioritization.
- Workflow decisions.
- Permission design.
- Interface complexity.
- Onboarding experiences.

Every feature within ShiftOS should consider the needs of the users who will interact with it.

---

# User Persona Philosophy

ShiftOS is designed around the reality that different users have different responsibilities.

A platform that gives every user the same experience creates unnecessary complexity.

ShiftOS follows the principle:

> **The right information and actions should be available to the right person at the right time.**

Users should only see what they need to perform their responsibilities effectively.

---

# User Hierarchy

ShiftOS has three primary user categories:

1. Manager
2. Supervisor
3. Employee

These roles represent different levels of operational responsibility.

---

# Persona 1 — Manager

## Persona Overview

The Manager is responsible for planning, organizing and overseeing workforce operations.

They have broader permissions and require visibility across employees, schedules, attendance and operational performance.

Examples:

- Store manager.
- Restaurant manager.
- Operations manager.
- Branch manager.

---

# Primary Responsibilities

The Manager is responsible for:

- Creating and reviewing schedules.
- Managing employees.
- Monitoring attendance.
- Ensuring operational coverage.
- Reviewing performance information.
- Communicating important updates.
- Maintaining operational standards.

---

# Primary Goals

The Manager wants to:

- Keep operations running smoothly.
- Reduce administrative workload.
- Quickly understand workforce status.
- Prevent staffing problems.
- Make informed decisions.
- Maintain accountability.

---

# Daily Tasks

Typical daily activities:

- Review today's schedule.
- Check staffing levels.
- Review attendance.
- Handle shift changes.
- Assign tasks.
- Communicate updates.
- Review operational issues.

---

# Pain Points

The Manager struggles with:

- Too much manual administration.
- Information scattered across tools.
- Difficulty seeing operational status quickly.
- Time wasted fixing scheduling problems.
- Poor historical visibility.

---

# Current Tools

They may currently use:

- Spreadsheets.
- Messaging applications.
- Paper schedules.
- Attendance books.
- Verbal communication.

---

# What The Manager Needs From ShiftOS

The Manager needs:

- Clear dashboards.
- Workforce visibility.
- Fast scheduling workflows.
- Reliable reports.
- Control over operational settings.
- Confidence that information is accurate.

---

# Product Experience Requirements

The Manager experience should prioritize:

- Efficiency.
- Visibility.
- Control.
- Decision-making.

The Manager should not need to perform repetitive employee-level tasks.

---

# Persona 2 — Supervisor

## Persona Overview

The Supervisor is responsible for executing daily operations.

They are usually the person closest to employees and real-time operational situations.

Examples:

- Shift leader.
- Team lead.
- Floor supervisor.
- Department supervisor.

---

# Primary Responsibilities

The Supervisor is responsible for:

- Managing daily activities.
- Monitoring attendance.
- Supporting employees.
- Assigning tasks.
- Handling operational changes.
- Communicating instructions.

---

# Primary Goals

The Supervisor wants to:

- Keep the shift running smoothly.
- Quickly understand what needs attention.
- Resolve problems immediately.
- Coordinate employees effectively.
- Avoid unnecessary administrative work.

---

# Daily Tasks

Typical activities:

- Check who is working.
- Monitor attendance.
- Assign tasks.
- Track completion.
- Communicate updates.
- Handle unexpected situations.

---

# Pain Points

The Supervisor struggles with:

- Lack of real-time information.
- Slow communication.
- Unclear responsibilities.
- Too many manual follow-ups.
- Tools designed for administrators rather than operators.

---

# What The Supervisor Needs From ShiftOS

The Supervisor needs:

- Fast access to today's operations.
- Simple workflows.
- Clear employee information.
- Task visibility.
- Immediate notifications.

---

# Product Experience Requirements

The Supervisor experience should prioritize:

- Speed.
- Simplicity.
- Real-time information.
- Minimal clicks.

The Supervisor should be able to complete important actions during busy periods.

---

# Persona 3 — Employee

## Persona Overview

The Employee is the person performing scheduled work.

Employees interact with ShiftOS primarily to understand their responsibilities and stay connected with workplace operations.

Examples:

- Cashier.
- Server.
- Sales associate.
- Warehouse worker.
- Technician.

---

# Primary Responsibilities

The Employee is responsible for:

- Attending assigned shifts.
- Completing assigned tasks.
- Following workplace instructions.
- Staying informed about updates.

---

# Primary Goals

The Employee wants to:

- Know when they work.
- Understand expectations.
- Receive important information.
- Track attendance.
- Complete assigned work.

---

# Daily Tasks

Typical activities:

- View schedule.
- Check announcements.
- Confirm shift information.
- Complete tasks.
- Review personal records.

---

# Pain Points

The Employee struggles with:

- Not knowing schedule changes.
- Poor communication.
- Confusion about responsibilities.
- Lack of attendance transparency.
- Difficulty accessing workplace information.

---

# What The Employee Needs From ShiftOS

The Employee needs:

- Simple mobile access.
- Clear schedules.
- Important notifications.
- Task visibility.
- Personal information management.

---

# Product Experience Requirements

The Employee experience should prioritize:

- Simplicity.
- Accessibility.
- Speed.
- Mobile usability.

Employees should not feel like they are using complex business software.

---

# Persona 4 — Organization Administrator (Future)

## Persona Overview

Some larger organizations may require administrators who manage system-level settings.

This role may appear as ShiftOS expands.

---

# Possible Responsibilities

- Managing organization settings.
- Managing subscriptions.
- Configuring integrations.
- Reviewing audit information.
- Managing permissions.

---

# Product Considerations

This persona should not influence MVP complexity unless customer demand requires it.

---

# User Comparison Matrix

| User | Primary Focus | Main Need |
|---|---|---|
| Manager | Planning and oversight | Visibility and control |
| Supervisor | Daily execution | Speed and operational clarity |
| Employee | Personal responsibilities | Simplicity and information access |
| Organization Administrator (Future) | Platform management | Configuration and governance |

---

# User Design Principles

Every ShiftOS user experience should follow these principles:

## Managers Need Insight

Provide information needed to make decisions.

---

## Supervisors Need Action

Provide tools needed to execute operations quickly.

---

## Employees Need Clarity

Provide simple access to schedules, tasks and communication.

---

# Permission Implications

User personas directly influence permissions.

Users should only access information required for their responsibilities.

Examples:

- Managers may view broader workforce information.
- Supervisors may manage daily operations.
- Employees may only access their own information.

Detailed permissions are defined in:

- PER-001 Role Definitions.
- PER-005 Permission Matrix.

---

# Relationship To Other Documents

This document supports:

- PF-007 — Target Market
- PF-008 — Customer Personas
- PF-004 — Value Proposition
- PER-001 — Role Definitions
- UI-001 — Design System
- NAV-001 — Navigation Flows

---

# Governance

User personas should be reviewed based on:

- Customer feedback.
- Usage patterns.
- Support requests.
- Product analytics.

Any significant change should update affected UX, permissions and workflow documentation.

---

# Summary

ShiftOS serves three primary users:

- Managers who need control and visibility.
- Supervisors who need speed and operational clarity.
- Employees who need simple access to their work information.

Successful ShiftOS design requires understanding that each user has different goals, responsibilities and expectations.

The platform succeeds when every user can complete their responsibilities with minimal friction.