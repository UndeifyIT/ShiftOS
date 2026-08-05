# ShiftOS Schedule Calendar Views

**Document ID:** SCH-010

**Document Title:** Schedule Calendar Views

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the calendar views available within ShiftOS for viewing and managing schedules.

Calendar Views provide different visual representations of schedules to help managers and supervisors quickly understand workforce coverage, staffing levels and shift distribution.

Employees have a simplified calendar experience focused only on their assigned shifts.

---

# 2. Calendar View Principles

## 2.1 One Schedule, Multiple Views

A schedule may be displayed in multiple ways.

Changing the calendar view does **not** modify the schedule itself.

Example:

```
Same Schedule

↓

Week View

↓

Day View

↓

Employee View
```

---

## 2.2 Views Are Presentation Only

Calendar Views are visual representations.

They do not create, edit or delete schedules.

Operational changes continue to follow the Schedule Editing workflow.

---

## 2.3 Views Are Role-Based

Different roles require different calendar experiences.

Managers require operational oversight.

Supervisors require planning tools.

Employees require only their personal schedules.

---

# 3. Calendar Views

## Weekly View _(Default MVP)_

Primary planning interface.

Displays:

- Entire week
- All scheduled shifts
- Assigned employees
- Shift times

Best suited for:

- Weekly planning
- Operational management

---

## Daily View

Displays one day at a time.

Shows:

- Daily shifts
- Assigned employees
- Shift times

Useful for:

- Daily operations
- Last-minute adjustments
- Attendance preparation

---

## Employee View

Displays shifts grouped by employee.

Example:

```
John

Monday Morning

Wednesday Evening

Friday Morning

-------------------

Mary

Tuesday Evening

Thursday Morning
```

Useful for:

- Reviewing workloads
- Identifying over-assignment
- Employee planning

---

## Shift View

Displays shifts grouped by shift.

Example:

```
Morning Shift

↓

John

Mary

David
```

Useful for:

- Staffing review
- Shift coverage
- Supervisor planning

---

## Branch View

Managers may view schedules for multiple branches.

Example:

```
Ikeja Branch

↓

Week Schedule

-------------------

Lekki Branch

↓

Week Schedule
```

Each branch remains operationally independent.

---

# 4. Employee Calendar

Employees have a simplified calendar.

Displays:

- Assigned shifts
- Shift dates
- Shift times
- Branch
- Position

Employees cannot view:

- Other employees' schedules
- Internal planning information
- Staffing levels
- Schedule drafts

---

# 5. Calendar Navigation

Users may navigate:

- Previous week
- Next week
- Today
- Specific week

Future versions may support:

- Month navigation
- Custom date ranges

---

# 6. Calendar Filters

Managers and supervisors may filter by:

- Branch
- Supervisor
- Department
- Position
- Employee
- Shift
- Status

Employees have no advanced filters in the MVP.

---

# 7. Calendar Indicators

The calendar may visually indicate:

- Published schedules
- Draft schedules
- Locked schedules
- Active schedules
- Completed schedules
- Cancelled shifts
- Staffing shortages
- Scheduling conflicts

These indicators provide quick operational awareness.

---

# 8. Calendar Permissions

| Permission             | Manager | Supervisor |       Staff       | Admin _(Future)_ |
| ---------------------- | :-----: | :--------: | :---------------: | :--------------: |
| View Weekly Calendar   |  Allow  |   Allow    | Own Schedule Only |      Allow       |
| View Daily Calendar    |  Allow  |   Allow    | Own Schedule Only |      Allow       |
| View Employee Calendar |  Allow  |   Allow    |       Deny        |      Allow       |
| View Shift Calendar    |  Allow  |   Allow    |       Deny        |      Allow       |
| View Branch Calendar   |  Allow  |   Allow    |       Deny        |      Allow       |
| Filter Calendar        |  Allow  |   Allow    |      Limited      |      Allow       |
| Export Calendar        |  Allow  |   Allow    |       Deny        |      Allow       |

---

# 9. Database Considerations

Calendar Views are generated from existing scheduling data.

Primary sources:

```
schedules

↓

shifts

↓

shift_assignments

↓

employees
```

No separate calendar tables are required.

Views are presentation layers over operational data.

---

# 10. Performance Considerations

Calendar rendering should support:

- Large weekly schedules
- Hundreds of employees
- Multiple shifts per day
- Fast filtering
- Efficient navigation

Queries should be optimized for branch-based loading.

---

# 11. Audit Requirements

Viewing a calendar does not generate audit records.

Audit records are generated only when users perform operational actions from the calendar, such as:

- Schedule edited
- Shift reassigned
- Schedule published
- Employee assignment changed

---

# 12. Future Enhancements

Future versions may support:

- Monthly calendar view
- Drag-and-drop scheduling
- Heat maps for staffing levels
- AI staffing recommendations
- Personal calendar integration
- Calendar printing
- Color customization

---

# 13. Related Specifications

- SCH-001 Schedule Definition
- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SHIFT-008 Shift Assignment
- ATT-001 Attendance Records

---

# 14. Summary

Schedule Calendar Views provide flexible ways to visualize workforce schedules without changing the underlying schedule data.

Managers and supervisors receive operational planning views that support workforce coordination, while employees receive a simplified personal schedule view focused solely on their assigned shifts.

By separating presentation from scheduling logic, ShiftOS delivers an intuitive and scalable scheduling experience suitable for businesses of all sizes.
