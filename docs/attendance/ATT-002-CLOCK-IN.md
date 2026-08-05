# ShiftOS Clock In

**Document ID:** ATT-002

**Document Title:** Clock In

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employee clock-in is recorded within ShiftOS.

Unlike traditional attendance systems, ShiftOS uses a supervisor-managed clock-in process. Employees do not clock themselves into work. Instead, supervisors record the arrival of employees who are scheduled to work.

Clock-in establishes the beginning of an employee's attendance record for a scheduled shift.

---

# 2. Clock-In Philosophy

Clock-in represents confirmation that a scheduled employee has physically arrived for work.

It is an operational activity performed by the supervisor during shift preparation.

Clock-in is not a self-service action performed by employees.

---

# 3. Clock-In Workflow

The standard workflow is:

```
Published Schedule

↓

Shift Begins

↓

Supervisor Opens Attendance

↓

Scheduled Employees Displayed

↓

Employees Arrive

↓

Supervisor Records Arrival

↓

Clock-In Saved
```

Each recorded arrival immediately creates or updates the attendance record for that shift.

---

# 4. Attendance List

When the supervisor opens attendance, ShiftOS displays only employees assigned to that shift.

Example:

```
Morning Shift

□ John

□ Mary

□ David

□ Sarah
```

The supervisor records attendance as employees arrive.

Employees who are not assigned to the shift are not displayed by default.

---

# 5. Recording Arrival

For each employee, the supervisor records arrival.

ShiftOS automatically stores:

- Employee
- Shift
- Branch
- Arrival time
- Supervisor who recorded attendance
- Date

The arrival timestamp becomes the official clock-in time.

---

# 6. Clock-In Time

Clock-in time is the actual time the supervisor records the employee's arrival.

Example:

```
Scheduled Start

08:00

↓

Employee Arrives

08:07

↓

Clock-In Time

08:07
```

Clock-in is based on actual arrival, not scheduled start time.

---

# 7. Late Employees

Employees arriving after the scheduled shift start are still clocked in.

ShiftOS records:

- Actual arrival time
- Scheduled start time

Lateness calculations are handled separately under:

**ATT-005 Late Rules**

---

# 8. Employees Who Have Not Arrived

Employees who have not yet arrived remain without a clock-in record.

Example:

```
John

✓ Clocked In

Mary

Waiting

David

Waiting
```

The supervisor may continue recording arrivals throughout the attendance period.

---

# 9. Unscheduled Employees

If organization policy permits, supervisors may record attendance for employees who were not originally scheduled.

Examples include:

- Emergency cover
- Replacement staff
- Manager-approved additional shifts

Such attendance records should be clearly identified as **unscheduled attendance** and linked to the appropriate shift where applicable.

---

# 10. Duplicate Clock-In Prevention

An employee may only have one clock-in for a specific scheduled shift.

ShiftOS prevents:

- Duplicate clock-ins
- Multiple active attendance records for the same shift

Corrections must use the Attendance Correction workflow.

---

# 11. Clock-In Permissions

| Permission                            | Manager | Supervisor |          Staff           | Admin _(Future)_ |
| ------------------------------------- | :-----: | :--------: | :----------------------: | :--------------: |
| View Shift Attendance                 |  Allow  |   Allow    |           Deny           |      Allow       |
| Record Employee Clock-In              |  Allow  |   Allow    |           Deny           |       Deny       |
| Record Unscheduled Attendance         |  Allow  |   Allow    |           Deny           |       Deny       |
| View Clock-In Time                    |  Allow  |   Allow    |   Own Attendance Only    |      Allow       |
| Edit Clock-In _(Correction Required)_ |  Allow  |    Deny    |           Deny           |       Deny       |
| Request Clock-In Correction           |  Allow  |   Allow    | Allow _(Own Attendance)_ |       Deny       |

---

# 12. Database Considerations

Recommended fields:

```
attendance

id

employee_id

shift_id

schedule_id

branch_id

clock_in_time

attendance_state

recorded_by

created_at
```

Clock-in should always reference the scheduled shift whenever applicable.

---

# 13. Audit Requirements

The following events generate audit records:

- Employee clocked in
- Unscheduled attendance recorded
- Clock-in corrected
- Clock-in override
- Attendance correction approved

Audit records include:

- User
- Employee
- Shift
- Previous value (if changed)
- New value
- Timestamp

---

# 14. Future Enhancements

Future versions may support:

- QR code verification
- NFC check-in
- Biometric devices
- GPS-assisted verification
- Offline attendance recording
- Hardware attendance terminals

These methods supplement the attendance process but continue to create the same attendance record structure.

---

# 15. Related Specifications

- ATT-001 Attendance Philosophy
- ATT-003 Clock Out
- ATT-005 Late Rules
- ATT-007 Attendance Corrections
- ATT-009 Attendance Validation
- SCH-007 Schedule Publishing

---

# 16. Summary

Clock-In in ShiftOS is a supervisor-managed operational process.

Supervisors record the actual arrival time of employees assigned to a scheduled shift, creating the official attendance record for that shift.

Employees do not clock themselves in, ensuring attendance recording aligns with the operational realities of shift-based businesses while maintaining complete accuracy, accountability and auditability.
