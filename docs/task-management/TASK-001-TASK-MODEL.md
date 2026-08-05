# ShiftOS Task Model

**Document ID:** TASK-001

**Document Title:** Task Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Task Management Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the core task model used throughout ShiftOS.

Tasks enable managers and supervisors to organize, assign, monitor and verify operational work performed during scheduled shifts.

ShiftOS tasks are designed for operational businesses where employees primarily receive work instructions verbally from supervisors rather than through the mobile application.

---

# 2. Task Philosophy

Tasks in ShiftOS represent operational work that must be completed within a business.

Tasks are assigned to supervisors, who are responsible for ensuring the work is completed by the appropriate employees during the shift.

Employees do not interact with tasks directly through the application during normal operations.

Instead, supervisors coordinate work on the shop floor and record task completion within ShiftOS.

---

# 3. Core Principles

## 3.1 Tasks Support Operations

Tasks exist to help manage day-to-day business operations.

Examples include:

- Restocking shelves.
- Cleaning work areas.
- Opening procedures.
- Closing procedures.
- Inventory checks.
- Equipment inspections.
- Customer area inspections.

---

## 3.2 Supervisor Ownership

Every task has one responsible supervisor.

The supervisor is accountable for:

- Managing task execution.
- Coordinating employees.
- Recording task completion.
- Providing evidence where required.

---

## 3.3 Employees Do Not Manage Tasks

Employees perform the assigned work but do not:

- Receive digital task assignments.
- Mark tasks as complete.
- Upload completion evidence.
- Update task status.

Task management remains a supervisor responsibility.

---

## 3.4 Tasks Are Operational Records

Tasks become part of the organization's operational history.

Each task records:

- What work was required.
- Who assigned it.
- Who was responsible.
- When it was completed.
- Supporting evidence (if provided).

---

# 4. Task Lifecycle

The standard lifecycle is:

```
Task Created

↓

Assigned to Supervisor

↓

In Progress

↓

Completed

↓

Verified
```

If a task cannot be completed:

```
Task Created

↓

Assigned

↓

Cancelled
```

---

# 5. Task Components

A task may contain:

- Title.
- Description.
- Branch.
- Department (optional).
- Assigned supervisor.
- Due date.
- Due time.
- Priority.
- Status.
- Completion notes.
- Photo evidence (optional).
- Verification details.

Future versions may support additional fields.

---

# 6. Task Categories

Organizations may organize tasks into categories.

Examples include:

- Cleaning.
- Stocking.
- Safety.
- Maintenance.
- Operations.
- Inventory.
- Customer Service.

Categories improve reporting and filtering.

---

# 7. Task Priorities

Supported priorities:

- Low
- Normal
- High
- Critical

Priority assists supervisors in determining task urgency.

---

# 8. Task Statuses

Tasks progress through predefined statuses.

Supported statuses:

- Draft
- Assigned
- In Progress
- Completed
- Verified
- Cancelled

Status changes occur only through approved workflows.

---

# 9. Relationship With Scheduling

Tasks may optionally be associated with:

- A schedule.
- A specific shift.
- A business date.

This enables managers to assign work that is relevant to a particular shift without requiring every task to be schedule-dependent.

---

# 10. Operational Responsibilities

### Manager

Responsible for:

- Creating tasks.
- Assigning tasks to supervisors.
- Reviewing completed tasks.
- Verifying completed work.
- Monitoring operational performance.

---

### Supervisor

Responsible for:

- Receiving assigned tasks.
- Distributing work verbally.
- Monitoring task progress.
- Recording completion.
- Uploading supporting evidence.
- Reporting operational issues.

---

### Employee

Responsible for:

- Completing work assigned verbally by the supervisor.

Employees do not interact with the task management system during their shifts.

---

# 11. Database Considerations

Recommended table:

```
tasks

id

organization_id

branch_id

department_id

schedule_id (nullable)

shift_id (nullable)

title

description

priority

status

assigned_by

assigned_supervisor_id

completion_notes

completed_at

verified_at

verified_by

created_at

updated_at
```

Supporting files (such as images) should be stored separately and linked to the task.

---

# 12. Audit Requirements

The following events generate audit records:

- Task created.
- Task assigned.
- Task updated.
- Task completed.
- Evidence uploaded.
- Task verified.
- Task cancelled.

Audit records include:

- User.
- Task.
- Action.
- Previous values (where applicable).
- New values.
- Timestamp.

---

# 13. Future Enhancements

Future versions may support:

- AI-generated task suggestions.
- Task templates.
- Automatic task generation.
- QR code task verification.
- Location-based task validation.
- Multi-supervisor collaboration.
- Employee task acknowledgement (optional).

---

# 14. Related Specifications

- TASK-002 Task Assignment
- TASK-003 Task Completion
- TASK-004 Task Verification
- TASK-005 Recurring Tasks
- TASK-006 Task History
- SCH-007 Schedule Publishing
- SHIFT-008 Shift Assignment

---

# 15. Summary

The ShiftOS Task Model provides a structured approach to managing operational work in shift-based businesses.

Tasks are assigned to supervisors rather than individual employees, reflecting real-world operational workflows where supervisors coordinate work on the shop floor and record progress within the system.

This model delivers accountability, operational visibility and complete auditability while keeping employee workflows simple and focused on the work itself.
