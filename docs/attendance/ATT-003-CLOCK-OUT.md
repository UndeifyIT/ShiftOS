# ShiftOS Clock Out

**Document ID:** ATT-003

**Document Title:** Clock Out

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employee clock-out is recorded within ShiftOS.

Clock-out represents the end of an employee's attendance for a scheduled shift.

Like clock-in, clock-out is a supervisor-managed operational activity rather than an employee self-service action.

---

# 2. Clock-Out Philosophy

Supervisors record when employees complete their scheduled work and leave the workplace.

Employees do not clock themselves out.

Clock-out completes the attendance record and enables accurate reporting of worked time.

---

# 3. Clock-Out Workflow

The standard workflow is:

```
Shift Nears Completion

↓

Supervisor Opens Attendance

↓

Clocked-In Employees Displayed

↓

Employees Finish Work

↓

Supervisor Records Departure

↓

Clock-Out Saved

↓

Attendance Finalized
```

---

# 4. Attendance List

When recording clock-out, ShiftOS displays employees who have already been clocked in for the shift.

Example:

```
Morning Shift

✓ John

✓ Mary

✓ David

Waiting

Sarah
```

Only employees with an existing clock-in record may be clocked out.

---

# 5. Recording Departure

For each employee, ShiftOS records:

- Employee
- Shift
- Branch
- Departure time
- Supervisor recording attendance
- Date

The recorded timestamp becomes the official clock-out time.

---

# 6. Clock-Out Time

Clock-out time reflects the actual time the supervisor records that the employee has completed work.

Example:

```
Scheduled End

17:00

↓

Employee Leaves

17:08

↓

Clock-Out Time

17:08
```

Clock-out reflects actual operational events rather than planned schedule times.

---

# 7. Early Departure

If an employee leaves before the scheduled end of the shift, the supervisor still records the actual departure time.

Examples:

- Illness
- Approved early release
- Emergency
- Operational decision

Early departure rules are evaluated separately by attendance validation and reporting.

---

# 8. Missing Clock-Out

If an employee was clocked in but no clock-out is recorded:

- The attendance record remains incomplete.
- Validation identifies the missing clock-out.
- The supervisor or manager must resolve the issue.

Automatic clock-out is not performed in the MVP.

---

# 9. Duplicate Clock-Out Prevention

Each attendance record may contain only one clock-out time.

ShiftOS prevents:

- Duplicate clock-outs.
- Multiple departures for the same attendance record.

Corrections must use the Attendance Correction workflow.

---

# 10. Attendance Completion

Once both clock-in and clock-out exist, the attendance record becomes operationally complete.

Example:

```
Clock In

08:02

↓

Clock Out

17:01

↓

Attendance Complete
```

Further modifications require an attendance correction.

---

# 11. Clock-Out Permissions

| Permission                             | Manager | Supervisor |          Staff           | Admin _(Future)_ |
| -------------------------------------- | :-----: | :--------: | :----------------------: | :--------------: |
| View Shift Attendance                  |  Allow  |   Allow    |           Deny           |      Allow       |
| Record Employee Clock-Out              |  Allow  |   Allow    |           Deny           |       Deny       |
| View Clock-Out Time                    |  Allow  |   Allow    |   Own Attendance Only    |      Allow       |
| Edit Clock-Out _(Correction Required)_ |  Allow  |    Deny    |           Deny           |       Deny       |
| Request Clock-Out Correction           |  Allow  |   Allow    | Allow _(Own Attendance)_ |       Deny       |

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

clock_out_time

attendance_state

recorded_by

updated_at
```

Worked duration should be calculated rather than permanently stored to avoid inconsistencies.

---

# 13. Audit Requirements

The following events generate audit records:

- Employee clocked out.
- Clock-out corrected.
- Clock-out override.
- Attendance finalized.
- Attendance correction approved.

Audit records include:

- User.
- Employee.
- Shift.
- Previous value (if changed).
- New value.
- Timestamp.

---

# 14. Future Enhancements

Future versions may support:

- Automatic reminder for missing clock-outs.
- Supervisor bulk clock-out.
- Biometric verification.
- Offline attendance synchronization.
- Hardware attendance terminals.
- AI anomaly detection.

---

# 15. Related Specifications

- ATT-001 Attendance Philosophy
- ATT-002 Clock In
- ATT-004 Attendance States
- ATT-007 Attendance Corrections
- ATT-009 Attendance Validation

---

# 16. Summary

Clock-Out completes an employee's attendance record for a scheduled shift.

Supervisors record the actual departure time of employees, ensuring attendance accurately reflects operational reality.

By pairing supervisor-managed clock-in and clock-out with comprehensive validation and auditing, ShiftOS provides reliable attendance records that support reporting, workforce management and future payroll integrations.
