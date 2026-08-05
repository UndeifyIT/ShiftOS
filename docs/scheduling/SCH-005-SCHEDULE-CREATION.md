# ShiftOS Schedule Creation

**Document ID:** SCH-005

**Document Title:** Schedule Creation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedules are created within ShiftOS.

Schedule creation is the process of building a new operational schedule for a branch over a defined planning period. During this process, supervisors or managers create the schedule, populate it with shifts, assign employees, resolve conflicts and prepare it for publication.

---

# 2. Schedule Creation Principles

## 2.1 Supervisors Own Schedule Creation

Creating schedules is primarily a supervisor responsibility.

Managers may also create schedules when required, particularly when:

- Covering for an unavailable supervisor.
- Correcting operational issues.
- Creating schedules for new branches.

---

## 2.2 Every Schedule Belongs To One Branch

A schedule must belong to exactly one branch.

Example:

```
Organization

↓

Ikeja Branch

↓

Week 29 Schedule
```

Schedules cannot span multiple branches.

---

## 2.3 Every Schedule Covers One Planning Period

For the MVP, schedules are created for a single calendar week.

Example:

```
Monday

↓

Sunday
```

Future versions may support additional planning periods.

---

## 2.4 Schedules Begin As Drafts

Every newly created schedule starts in the **Draft** state.

Example:

```
Create Schedule

↓

Draft
```

Schedules are not visible to employees until they are published.

---

# 3. Schedule Creation Methods

ShiftOS supports the following creation methods.

---

## Method 1 — Create From Scratch

The supervisor creates an empty schedule and manually adds shifts.

Workflow:

```
Create Schedule

↓

Select Branch

↓

Select Week

↓

Add Shifts

↓

Assign Employees
```

---

## Method 2 — Create From Schedule Template

The supervisor selects an existing Schedule Template.

Workflow:

```
Choose Template

↓

Select Week

↓

Generate Draft Schedule
```

The generated schedule remains fully editable.

---

## Method 3 — Duplicate Existing Schedule

An existing schedule may be duplicated into a new planning period.

Workflow:

```
Previous Week

↓

Duplicate

↓

Select New Week

↓

Generate Draft
```

Employee assignments may be retained or removed depending on user preference.

---

# 4. Schedule Information

Every schedule must contain:

- Organization
- Branch
- Planning Week
- Start Date
- End Date
- Supervisor
- Status
- Version

---

# 5. Shift Population

After schedule creation, shifts may be added by:

- Creating new shifts.
- Using Shift Templates.
- Using Schedule Templates.
- Duplicating previous shifts.

The schedule is not considered operational until published.

---

# 6. Employee Assignment

Employees are assigned to individual shifts—not directly to the schedule.

Example:

```
Schedule

↓

Monday Morning Shift

↓

John
Mary
David
```

The schedule acts as the container for all assigned shifts.

---

# 7. Validation During Creation

Before a schedule is saved, ShiftOS validates:

- Branch exists.
- User has scheduling permission.
- Planning week is valid.
- No overlapping schedule exists for the branch.
- Required information is complete.

Validation errors prevent schedule creation.

---

# 8. Conflict Detection

After creation, ShiftOS checks for:

- Employee scheduling conflicts.
- Supervisor conflicts.
- Duplicate shifts.
- Branch inconsistencies.
- Invalid shift configurations.

Warnings may be shown before publication.

---

# 9. Draft Management

Draft schedules may be:

- Saved.
- Edited.
- Deleted.
- Duplicated.

Drafts remain invisible to employees.

---

# 10. Automatic Status

A newly created schedule receives:

```
Status

Draft
```

It remains in Draft until:

- Validation succeeds.
- Supervisor publishes it.

---

# 11. Schedule Creation Permissions

| Permission                    | Manager | Supervisor | Staff | Admin _(Future)_ |
| ----------------------------- | :-----: | :--------: | :---: | :--------------: |
| Create Schedule               |  Allow  |   Allow    | Deny  |       Deny       |
| Create From Template          |  Allow  |   Allow    | Deny  |       Deny       |
| Create From Existing Schedule |  Allow  |   Allow    | Deny  |       Deny       |
| Save Draft                    |  Allow  |   Allow    | Deny  |       Deny       |
| Delete Draft                  |  Allow  |   Allow    | Deny  |       Deny       |
| View Draft Schedule           |  Allow  |   Allow    | Deny  |      Allow       |
| Duplicate Schedule            |  Allow  |   Allow    | Deny  |       Deny       |

---

# 12. Database Considerations

Primary schedule record:

```
schedules

id

organization_id

branch_id

period_start

period_end

status

version

created_by

created_at
```

Related entities:

```
Schedule

↓

Shifts

↓

Employees
```

No employee is assigned directly to the schedule.

Assignments always belong to shifts.

---

# 13. Audit Requirements

The following events generate audit records:

- Schedule created
- Draft saved
- Draft deleted
- Schedule duplicated
- Template used
- Initial shift population

Audit records include:

- User
- Action
- Schedule
- Timestamp

---

# 14. Future Enhancements

Future versions may support:

- AI-assisted schedule generation.
- Automatic staffing recommendations.
- Labor demand forecasting.
- Holiday-aware schedule creation.
- Multi-week schedule generation.
- Organization default scheduling patterns.

---

# 15. Related Specifications

- SCH-001 Schedule Definition
- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-004 Schedule Templates
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SHIFT-005 Shift Creation
- SHIFT-012 Shift Validation Rules

---

# 16. Summary

Schedule Creation is the process of building a new operational schedule for a branch.

Schedules always begin as Drafts and may be created manually, from templates or by duplicating existing schedules.

A schedule acts as the operational container for shifts, while employee assignments remain attached to individual shifts.

Validation and conflict detection ensure schedules are accurate before publication, supporting efficient and reliable workforce planning across ShiftOS.
