# ShiftOS Task Permission Matrix

**Document ID:** PER-002-04

**Document Title:** Task Permission Matrix

**Version:** 2.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to operational task management within ShiftOS.

Task permissions govern the creation, scheduling, monitoring and completion of operational tasks performed during a shift.

The ShiftOS task model is designed specifically for supermarkets and other shift-based businesses where supervisors coordinate work and employees are not expected to use mobile devices during active shifts.

---

# 2. Permission Values

| Value | Meaning |
|:------|:--------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Task Permission Matrix

| Permission                         | Manager | Supervisor | Staff | Admin *(Future)* |
|------------------------------------|:-------:|:----------:|:-----:|:----------------:|
| View Task Dashboard                | Allow   | Allow      | Deny  | Allow            |
| View Task Analytics                | Allow   | Allow      | Deny  | Allow            |
| View All Tasks                     | Allow   | Allow      | Deny  | Allow            |
| View Completed Tasks               | Allow   | Allow      | Deny  | Allow            |
| View Outstanding Tasks             | Allow   | Allow      | Deny  | Allow            |
| View Overdue Tasks                 | Allow   | Allow      | Deny  | Allow            |
| Search Tasks                       | Allow   | Allow      | Deny  | Allow            |
| Filter Tasks                       | Allow   | Allow      | Deny  | Allow            |
| Create Task                        | Deny    | Allow      | Deny  | Deny             |
| Edit Draft Task                    | Deny    | Allow      | Deny  | Deny             |
| Delete Draft Task                  | Deny    | Allow      | Deny  | Deny             |
| Publish Task                       | Allow   | Allow      | Deny  | Deny             |
| Edit Published Task                | Allow   | Deny       | Deny  | Deny             |
| Archive Task                       | Allow   | Allow      | Deny  | Deny             |
| Duplicate Task                     | Deny    | Allow      | Deny  | Deny             |
| Set Task Priority                  | Deny    | Allow      | Deny  | Deny             |
| Set Task Due Time                  | Deny    | Allow      | Deny  | Deny             |
| Mark Task In Progress              | Deny    | Allow      | Deny  | Deny             |
| Mark Task Completed                | Deny    | Allow      | Deny  | Deny             |
| Reopen Completed Task              | Allow   | Allow      | Deny  | Deny             |
| Verify Task Completion             | Allow   | Allow      | Deny  | Deny             |
| Attach Completion Images           | Deny    | Allow      | Deny  | Deny             |
| Attach Completion Documents        | Deny    | Allow      | Deny  | Deny             |
| Add Completion Notes               | Deny    | Allow      | Deny  | Deny             |
| View Task History                  | Allow   | Allow      | Deny  | Allow            |
| Export Task Report                 | Allow   | Allow      | Deny  | Allow            |

---

# 4. Permission Rules

## Operational Ownership

Supervisors own operational task management.

They create tasks, coordinate employees verbally and update task progress within the system.

Managers oversee task execution and intervene only when operationally necessary.

---

## Employee Interaction

Employees do not interact with operational tasks through the ShiftOS application during active shifts.

Task allocation occurs verbally by the Supervisor.

Task completion is recorded by the Supervisor.

---

## Published Tasks

Published tasks represent operational work scheduled for a branch or shift.

Managers may edit published tasks when operational intervention is required.

---

## Task Completion

Only Supervisors may update task progress or mark operational tasks as completed.

Optional evidence such as photos, documents or notes may be attached to completed tasks.

---

## Read-Only Administration

The future Admin role may view task information and export reports.

Admins cannot create, edit, publish or complete operational tasks.

---

# 5. Design Principles

## Supervisor-Led Operations

Operational tasks are coordinated by Supervisors rather than individual employees.

---

## Operational Simplicity

Tasks are tracked at the operational level instead of assigning work through the application.

---

## Management Oversight

Managers oversee operational execution without participating in routine task management.

---

## Auditability

Every task creation, publication, completion and modification should generate an audit record.

---

## Least Privilege

Permissions are limited to the minimum required for each role.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- TSK-001 Task Model
- TSK-002 Operational Tasks
- TSK-003 Task Lifecycle

---

# 7. Summary

The Task Permission Matrix defines how operational tasks are managed within ShiftOS.

Supervisors create, coordinate and complete operational tasks.

Managers oversee task execution and intervene when required.

Employees do not interact with operational tasks through the application during active shifts.

The future Admin role provides read-only visibility without participating in operational task management.