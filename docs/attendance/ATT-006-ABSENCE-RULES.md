# ShiftOS Absence Rules

**Document ID:** ATT-006

**Document Title:** Absence Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS determines and records employee absences.

Absence Rules provide a consistent method for identifying employees who did not attend scheduled shifts while supporting accurate operational reporting, workforce analytics and future payroll integrations.

---

# 2. Absence Philosophy

An employee is considered absent when they were scheduled to work but no valid attendance record exists after the organization's attendance recording window has closed.

Absence is determined automatically by the system based on scheduled shifts and attendance records.

Supervisors do not manually mark employees as absent.

---

# 3. Absence Determination

ShiftOS evaluates:

```
Published Schedule

↓

Scheduled Employee

↓

Attendance Record Exists?

↓

Yes → Present

No → Continue

↓

Attendance Window Closed?

↓

Yes → Absent

No → Pending
```

Employees remain in a **Pending** attendance state until the attendance window closes.

---

# 4. Attendance Window

Organizations may define how long supervisors have to complete attendance recording.

Example:

```
Shift Start

08:00

↓

Attendance Window

30 Minutes

↓

08:30

↓

No Clock-In

↓

Absent
```

If no attendance window is configured, ShiftOS uses the organization's default attendance policy.

---

# 5. Scheduled Employees Only

Absence is evaluated only for employees assigned to published shifts.

Employees without scheduled shifts are never automatically marked absent.

---

# 6. Unscheduled Attendance

Where organization policies allow unscheduled work:

- An unscheduled employee may still receive an attendance record.
- They are **not** considered absent because no scheduled shift existed.

---

# 7. Attendance Corrections

If an employee was incorrectly classified as absent, the attendance record may be corrected through the Attendance Correction workflow.

Examples include:

- Supervisor forgot to record attendance.
- System interruption.
- Approved manual attendance adjustment.

The correction preserves the complete audit history.

---

# 8. Reporting

Absence Rules support reporting such as:

- Daily absences.
- Branch absence rates.
- Employee attendance history.
- Repeated absences.
- Workforce planning trends.
- Future payroll integrations.

---

# 9. Permissions

| Permission                    | Manager |          Supervisor           |          Staff           | Admin _(Future)_ |
| ----------------------------- | :-----: | :---------------------------: | :----------------------: | :--------------: |
| View Absence Status           |  Allow  |             Allow             |   Own Attendance Only    |      Allow       |
| Determine Absence             | System  |            System             |           Deny           |      System      |
| Manually Mark Absent          |  Deny   |             Deny              |           Deny           |       Deny       |
| Request Attendance Correction |  Allow  |             Allow             | Allow _(Own Attendance)_ |       Deny       |
| Approve Attendance Correction |  Allow  | Allow _(Organization Policy)_ |           Deny           |       Deny       |

---

# 10. Database Considerations

Absence should be derived from:

- Published schedule.
- Attendance record.
- Attendance recording window.

Recommended field:

```
is_absent
```

Absence should not require manual storage when it can be reliably calculated.

---

# 11. Audit Requirements

The following events generate audit records:

- Employee classified as absent.
- Attendance correction submitted.
- Attendance correction approved.
- Attendance correction rejected.
- Attendance recalculated.

Audit records include:

- Employee.
- Shift.
- Previous status.
- Updated status.
- User (where applicable).
- Timestamp.

---

# 12. Future Enhancements

Future versions may support:

- Excused absences.
- Approved leave integration.
- Sick leave integration.
- Automatic manager alerts.
- AI absence trend analysis.
- Attendance compliance dashboards.

---

# 13. Related Specifications

- ATT-001 Attendance Philosophy
- ATT-002 Clock In
- ATT-004 Attendance States
- ATT-005 Late Rules
- ATT-007 Attendance Corrections
- ATT-009 Attendance Validation
- SCH-007 Schedule Publishing

---

# 14. Summary

Absence Rules automatically determine when a scheduled employee did not attend work based on published schedules and recorded attendance.

By relying on objective business rules rather than manual classification, ShiftOS ensures consistent, auditable and accurate absence reporting while supporting operational oversight and future workforce management capabilities.
