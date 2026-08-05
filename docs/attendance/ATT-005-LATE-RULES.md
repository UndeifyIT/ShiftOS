# ShiftOS Late Rules

**Document ID:** ATT-005

**Document Title:** Late Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS determines whether an employee is late for a scheduled shift.

Late Rules provide a consistent and auditable method of identifying late arrivals while supporting accurate attendance reporting and future payroll integrations.

---

# 2. Late Philosophy

An employee is considered late when their recorded clock-in time is later than the scheduled shift start time, after applying any organization-configured grace period.

Late status is calculated automatically by the system.

Supervisors do not manually mark employees as late.

---

# 3. Late Calculation

ShiftOS compares:

```
Scheduled Shift Start

↓

Recorded Clock-In Time
```

If the recorded clock-in exceeds the permitted threshold, the attendance record is classified as **Late**.

---

# 4. Grace Period

Organizations may define an optional grace period.

Example:

```
Shift Start

08:00

Grace Period

5 Minutes

Late After

08:05
```

If no grace period is configured, lateness begins immediately after the scheduled start time.

---

# 5. Examples

| Scheduled Start | Clock-In                 | Result  |
| --------------- | ------------------------ | ------- |
| 08:00           | 07:58                    | On Time |
| 08:00           | 08:00                    | On Time |
| 08:00           | 08:03 _(5-minute grace)_ | On Time |
| 08:00           | 08:06 _(5-minute grace)_ | Late    |
| 08:00           | 08:18                    | Late    |

---

# 6. Automatic Determination

Late status is generated automatically after clock-in.

Users cannot manually assign or remove a Late classification.

Any change to the recorded clock-in time requires an attendance correction.

---

# 7. Reporting

Late Rules support:

- Daily attendance monitoring.
- Employee attendance history.
- Branch attendance summaries.
- Repeated lateness reporting.
- Future payroll and compliance integrations.

---

# 8. Permissions

| Permission                                   | Manager |    Supervisor     |           Staff            | Admin _(Future)_ |
| -------------------------------------------- | :-----: | :---------------: | :------------------------: | :--------------: |
| View Late Status                             |  Allow  |       Allow       |    Own Attendance Only     |      Allow       |
| Calculate Late Status                        | System  |      System       |            Deny            |      System      |
| Override Late Status                         |  Deny   |       Deny        |            Deny            |       Deny       |
| Correct Clock-In _(Via Correction Workflow)_ |  Allow  | Allow _(Request)_ | Request _(Own Attendance)_ |       Deny       |

---

# 9. Database Considerations

Late status should be calculated from:

- Scheduled shift start.
- Grace period.
- Recorded clock-in time.

Recommended field:

```
is_late
```

The system should avoid storing duplicate lateness calculations where they can be derived reliably.

---

# 10. Audit Requirements

Audit records are generated for:

- Clock-in corrections affecting lateness.
- Attendance correction approvals.
- Attendance recalculation.

---

# 11. Future Enhancements

Future versions may support:

- Department-specific grace periods.
- Position-specific lateness rules.
- Escalation after repeated lateness.
- AI attendance trend analysis.

---

# 12. Related Specifications

- ATT-002 Clock In
- ATT-004 Attendance States
- ATT-006 Absence Rules
- ATT-007 Attendance Corrections
- ATT-009 Attendance Validation

---

# 13. Summary

Late Rules automatically determine whether an employee arrived after their scheduled shift start time.

By using published schedules, recorded clock-in times and configurable grace periods, ShiftOS provides consistent, objective and auditable lateness calculations without requiring supervisors to manually classify attendance outcomes.
