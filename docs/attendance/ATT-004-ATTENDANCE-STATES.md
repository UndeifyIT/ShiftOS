# ShiftOS Attendance States

**Document ID:** ATT-004

**Document Title:** Attendance States

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the operational states that an attendance record may pass through during its lifecycle.

Attendance States provide a consistent representation of employee attendance, enabling reporting, validation, notifications and future payroll integrations.

Each attendance record has one current state at any given time.

---

# 2. Attendance State Principles

## 2.1 Attendance Is State-Based

Attendance progresses through predefined operational states.

Each state represents the current status of the employee's attendance for a scheduled shift.

---

## 2.2 One Current State

An attendance record may have only one active state at a time.

State changes occur only through defined attendance workflows.

---

## 2.3 State Changes Are Audited

Every attendance state transition generates an audit record.

Previous states remain available through attendance history.

---

# 3. Attendance States

## Pending

The employee is scheduled to work but attendance has not yet been recorded.

Example:

```
Published Shift

↓

Pending
```

---

## Clocked In

The supervisor has recorded the employee's arrival.

Example:

```
Pending

↓

Clocked In
```

---

## Clocked Out

The supervisor has recorded the employee's departure.

The attendance record is operationally complete.

Example:

```
Clocked In

↓

Clocked Out
```

---

## Late

The employee arrived after the scheduled shift start time.

Late is determined automatically according to the organization's attendance rules.

Example:

```
Scheduled Start

08:00

↓

Clock In

08:12

↓

Late
```

Detailed rules are defined in:

**ATT-005 Late Rules**

---

## Absent

The employee did not attend the scheduled shift.

Example:

```
Scheduled Shift

↓

No Attendance Recorded

↓

Absent
```

Absence rules are defined separately in:

**ATT-006 Absence Rules**

---

## Corrected

The attendance record has been modified through the Attendance Correction workflow.

The corrected record becomes the official attendance record while preserving the original audit history.

---

# 4. Attendance Lifecycle

Typical lifecycle:

```
Pending

↓

Clocked In

↓

Clocked Out
```

Possible alternative lifecycles:

```
Pending

↓

Late

↓

Clocked Out
```

```
Pending

↓

Absent
```

```
Clocked Out

↓

Corrected
```

---

# 5. State Transitions

Allowed transitions include:

| Current State | Next State  |
| ------------- | ----------- |
| Pending       | Clocked In  |
| Pending       | Late        |
| Pending       | Absent      |
| Clocked In    | Clocked Out |
| Late          | Clocked Out |
| Clocked Out   | Corrected   |
| Absent        | Corrected   |

Undefined transitions are not permitted.

---

# 6. State Determination

Attendance states are determined using:

- Published schedule
- Scheduled shift times
- Recorded clock-in
- Recorded clock-out
- Attendance correction approvals

Users cannot manually select attendance states.

States are derived from attendance data and business rules.

---

# 7. Reporting

Attendance states support reporting such as:

- Present employees
- Late arrivals
- Absent employees
- Completed attendance
- Attendance trends
- Branch attendance summaries

Reports use the current attendance state together with historical audit records.

---

# 8. Attendance Permissions

| Permission                                           | Manager |    Supervisor     |           Staff            | Admin _(Future)_ |
| ---------------------------------------------------- | :-----: | :---------------: | :------------------------: | :--------------: |
| View Attendance State                                |  Allow  |       Allow       |    Own Attendance Only     |      Allow       |
| Generate Attendance State                            | System  |      System       |            Deny            |      System      |
| View Attendance History                              |  Allow  |       Allow       |    Own Attendance Only     |      Allow       |
| Correct Attendance State _(Via Correction Workflow)_ |  Allow  | Allow _(Request)_ | Request _(Own Attendance)_ |       Deny       |

---

# 9. Database Considerations

Recommended field:

```
attendance_state
```

Suggested values:

```
Pending

Clocked In

Clocked Out

Late

Absent

Corrected
```

Historical state transitions should be stored separately.

Recommended table:

```
attendance_state_history

id

attendance_id

previous_state

new_state

changed_by

changed_at
```

---

# 10. Audit Requirements

The following events generate audit records:

- State changed.
- Attendance corrected.
- Late status assigned.
- Absence recorded.
- Manager override.

Audit records include:

- User.
- Employee.
- Shift.
- Previous state.
- New state.
- Timestamp.

---

# 11. Future Enhancements

Future versions may support additional states, including:

- On Break
- Returned From Break
- Working Overtime
- Left Early
- Excused Absence
- Public Holiday
- Remote Attendance

These states may be introduced without affecting the existing attendance lifecycle.

---

# 12. Related Specifications

- ATT-001 Attendance Philosophy
- ATT-002 Clock In
- ATT-003 Clock Out
- ATT-005 Late Rules
- ATT-006 Absence Rules
- ATT-007 Attendance Corrections
- ATT-009 Attendance Validation

---

# 13. Summary

Attendance States define the operational status of an employee's attendance throughout a scheduled shift.

States are automatically determined from attendance records and business rules, ensuring consistency across reporting, validation, auditing and future workforce management capabilities while maintaining a clear and reliable attendance lifecycle.
