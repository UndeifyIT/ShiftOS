# ShiftOS Schedule Periods

**Document ID:** SCH-004

**Document Title:** Schedule Periods

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedules are grouped into operational time periods within ShiftOS.

A Schedule Period represents the date range covered by a schedule and provides the planning window for workforce scheduling.

For the MVP, ShiftOS adopts weekly scheduling as the standard planning period while maintaining an architecture that supports additional period types in future releases.

---

# 2. Schedule Period Definition

A Schedule Period is the continuous span of dates covered by a single schedule.

Example:

```
Schedule

Week 29

Start:
Monday, 13 July 2026

End:
Sunday, 19 July 2026
```

The schedule period defines the operational planning window—not individual shifts.

---

# 3. Schedule Period Principles

## 3.1 Every Schedule Has One Period

Each schedule belongs to exactly one scheduling period.

Example:

```
Week 29 Schedule

↓

13 July

↓

19 July
```

---

## 3.2 Schedule Periods Cannot Overlap

A branch cannot have two active schedules covering the same dates.

Example:

Invalid:

```
Schedule A

13 Jul - 19 Jul

Schedule B

15 Jul - 21 Jul
```

The system should prevent overlapping schedule periods.

---

## 3.3 Periods Are Branch-Specific

Different branches may have independent schedules covering the same calendar dates.

Example:

```
Ikeja Branch

13 Jul - 19 Jul

✓

Victoria Island Branch

13 Jul - 19 Jul
```

No conflict exists because the branches are different.

---

## 3.4 Weekly Scheduling Is The MVP Standard

ShiftOS MVP supports:

- Weekly schedules

Future versions may introduce:

- Daily schedules
- Bi-weekly schedules
- Monthly schedules
- Custom scheduling periods

---

# 4. Schedule Period Components

Every schedule period includes:

- Organization
- Branch
- Start Date
- End Date
- Schedule
- Status
- Version

---

# 5. Period Boundaries

For MVP:

Start of Period:

```
Monday
```

End of Period:

```
Sunday
```

Organizations may be allowed to customize scheduling periods in future versions.

---

# 6. Schedule Period Rules

A valid schedule period must:

- Have a start date.
- Have an end date.
- Start before the end date.
- Belong to one branch.
- Not overlap another schedule period for the same branch.
- Contain at least one shift before publication.

---

# 7. Schedule Period Workflow

```
Select Branch

       │

       ▼

Choose Week

       │

       ▼

Create Schedule

       │

       ▼

Add Shifts

       │

       ▼

Assign Employees

       │

       ▼

Publish Schedule
```

---

# 8. Future Schedule Period Types

The architecture should support:

## Daily

```
Monday Only
```

---

## Weekly _(MVP)_

```
Monday

↓

Sunday
```

---

## Bi-Weekly

```
Week 1

+

Week 2
```

---

## Monthly

```
1 August

↓

31 August
```

---

## Custom

Organization-defined planning periods.

---

# 9. Period Validation

Before creating a schedule, the system validates:

- Start date exists.
- End date exists.
- End date is after start date.
- No overlapping period exists.
- Branch is active.
- User has scheduling permission.

---

# 10. Period Identification

Each schedule period should include:

- Schedule ID
- Period Start
- Period End
- Calendar Week
- Branch

Example:

```
Schedule

Week 29

13 Jul - 19 Jul

Ikeja Branch
```

---

# 11. Period Permissions

| Permission                   | Manager | Supervisor |            Staff            | Admin _(Future)_ |
| ---------------------------- | :-----: | :--------: | :-------------------------: | :--------------: |
| View Schedule Period         |  Allow  |   Allow    | Own Published Schedule Only |      Allow       |
| Create Schedule Period       |  Allow  |   Allow    |            Deny             |       Deny       |
| Edit Schedule Period         |  Allow  |   Allow    |            Deny             |       Deny       |
| Delete Draft Schedule Period |  Allow  |   Allow    |            Deny             |       Deny       |
| View Schedule Period History |  Allow  |   Allow    |            Deny             |      Allow       |

---

# 12. Database Considerations

The schedule record should include:

```
period_start

period_end
```

Example:

```
schedules

id

organization_id

branch_id

period_start

period_end

status

version
```

Additional fields may include:

```
calendar_week

calendar_year
```

to improve reporting and searching.

---

# 13. Audit Requirements

The following events generate audit records:

- Schedule period created
- Schedule period modified
- Schedule period deleted
- Period dates changed

Audit records include:

- User
- Action
- Schedule
- Previous value
- New value
- Timestamp

---

# 14. Future Enhancements

Future versions may support:

- Organization-defined work weeks
- Multiple scheduling calendars
- Fiscal scheduling periods
- Holiday-aware scheduling
- Automatic schedule generation
- AI-assisted scheduling recommendations

---

# 15. Related Specifications

- SCH-001 Schedule Definition
- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SHIFT-001 Shift Definition

---

# 16. Summary

A Schedule Period defines the time window covered by a schedule.

For the MVP, ShiftOS standardizes on weekly scheduling from Monday through Sunday.

Each branch maintains independent schedule periods, and overlapping schedule periods for the same branch are not permitted.

The scheduling architecture remains flexible enough to support additional planning periods in future releases without changing the underlying scheduling model.
