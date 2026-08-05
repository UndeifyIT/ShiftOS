# ShiftOS Schedule Definition

**Document ID:** SCH-001

**Document Title:** Schedule Definition

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines what a Schedule is within ShiftOS.

A schedule is the operational plan that organizes multiple shifts over a defined period for a branch.

Schedules are the primary planning tool used by supervisors to coordinate workforce operations.

---

# 2. Schedule Definition

A Schedule is a collection of planned shifts grouped together for a specific branch and scheduling period.

Example:

```
Schedule

Branch:
Ikeja Branch

Period:
1 July – 7 July

Contains:

Monday Morning Shift
Monday Evening Shift
Tuesday Morning Shift
Tuesday Evening Shift
...
Sunday Evening Shift
```

A schedule does not represent one shift.

A schedule represents an entire operational planning period.

---

# 3. Schedule Principles

## 3.1 A Schedule Contains Multiple Shifts

Every schedule consists of one or more shifts.

Example:

```
Weekly Schedule

↓

Monday Morning

Monday Evening

Tuesday Morning

Tuesday Evening

Wednesday Morning

...
```

---

## 3.2 A Shift Belongs To One Schedule

A shift may belong to only one schedule.

Example:

```
Morning Shift

✓ Weekly Schedule

✗ Another Weekly Schedule
```

This prevents duplicate planning.

---

## 3.3 Schedules Are Branch-Specific

Each schedule belongs to exactly one branch.

Example:

```
Organization

↓

Ikeja Branch

↓

Week 28 Schedule
```

Different branches maintain independent schedules.

---

## 3.4 Schedules Cover A Defined Time Period

Schedules are created for operational periods.

Examples:

- Daily
- Weekly _(Default MVP)_
- Bi-weekly _(Future)_
- Monthly _(Future)_

For MVP, weekly scheduling is the standard workflow.

---

# 4. Schedule Components

Every schedule contains:

- Organization
- Branch
- Schedule Period
- Collection of Shifts
- Assigned Employees
- Supervisor
- Status
- Version
- Creation Information

---

# 5. Schedule Ownership

## Supervisor

Primary schedule owner.

Responsible for:

- Creating schedules
- Building shifts
- Assigning employees
- Publishing schedules

---

## Manager

Provides oversight.

Can:

- View schedules
- Edit schedules
- Publish schedules
- Override supervisor decisions

---

## Staff

May only view published schedules that apply to them.

Staff cannot:

- Edit schedules
- Create schedules
- Publish schedules

---

## Admin _(Future)_

Read-only visibility.

Can:

- View schedules
- Export reports

Cannot:

- Modify operational schedules

---

# 6. Schedule Scope

A schedule defines:

- Who works
- Where they work
- When they work
- Which shifts they work

It does not define:

- Attendance
- Task completion
- Payroll
- Performance

Those belong to separate domains.

---

# 7. Schedule Relationships

```
Organization

      │

      ▼

Branch

      │

      ▼

Schedule

      │

      ▼

Shifts

      │

      ▼

Employees
```

---

# 8. Schedule Lifecycle

A schedule progresses through several operational stages.

Example:

```
Draft

↓

Ready

↓

Published

↓

Active

↓

Completed

↓

Archived
```

Detailed lifecycle behavior is defined in **SCH-002 Schedule Lifecycle**.

---

# 9. Schedule Identification

Every schedule should have:

- Unique identifier
- Organization
- Branch
- Schedule period
- Version
- Current status

Example:

```
Schedule ID

SCH-2026-000145
```

---

# 10. Schedule Rules

A valid schedule must:

- Belong to one organization.
- Belong to one branch.
- Have a defined scheduling period.
- Contain at least one shift before publishing.
- Have an assigned supervisor.
- Pass validation checks before publication.

---

# 11. Schedule Permissions

| Permission            | Manager | Supervisor |       Staff        | Admin _(Future)_ |
| --------------------- | :-----: | :--------: | :----------------: | :--------------: |
| View Schedule         |  Allow  |   Allow    | Own Published Only |      Allow       |
| Create Schedule       |  Allow  |   Allow    |        Deny        |       Deny       |
| Edit Schedule         |  Allow  |   Allow    |        Deny        |       Deny       |
| Delete Draft Schedule |  Allow  |   Allow    |        Deny        |       Deny       |
| View Schedule History |  Allow  |   Allow    |        Deny        |      Allow       |

---

# 12. Database Considerations

Primary table:

```
schedules

id

organization_id

branch_id

supervisor_id

period_start

period_end

status

version

created_by

created_at

updated_at
```

Relationship:

```
Schedule

↓

Many Shifts

↓

Many Employees
```

---

# 13. Audit Requirements

The following actions generate audit records:

- Schedule created
- Schedule edited
- Schedule deleted
- Supervisor changed
- Schedule published
- Version created

Audit records include:

- User
- Action
- Schedule
- Timestamp

---

# 14. Future Enhancements

Future versions may support:

- Monthly schedules
- Bi-weekly schedules
- Schedule duplication
- AI schedule generation
- Multi-branch scheduling
- Schedule templates across branches

---

# 15. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-005 Shift Creation
- SHIFT-008 Shift Assignment
- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-004 Schedule Periods
- SCH-005 Schedule Creation

---

# 16. Summary

A Schedule is the operational planning container that groups multiple shifts for a single branch over a defined period.

Supervisors are responsible for creating and managing schedules.

Managers oversee and intervene when necessary.

Schedules form the operational foundation for attendance tracking, workforce coordination and reporting throughout ShiftOS.
