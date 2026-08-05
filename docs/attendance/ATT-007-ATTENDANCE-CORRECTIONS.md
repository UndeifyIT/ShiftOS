# ShiftOS Attendance Corrections

**Document ID:** ATT-007

**Document Title:** Attendance Corrections

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how attendance records may be corrected within ShiftOS.

Attendance Corrections ensure that inaccurate attendance records can be updated while preserving accountability, historical accuracy and complete audit trails.

Corrections modify attendance records—they never erase historical information.

---

# 2. Correction Philosophy

Attendance records should represent what actually happened during a shift.

If an attendance record is inaccurate, it should be corrected using the official correction workflow rather than editing the record directly.

Every correction remains permanently traceable.

---

# 3. When Corrections Are Required

Attendance corrections may be required when:

- A supervisor forgot to clock an employee in.
- A supervisor forgot to clock an employee out.
- An incorrect time was recorded.
- An employee was incorrectly marked absent.
- An employee was mistakenly recorded against the wrong shift.
- A system or operational error occurred.

---

# 4. Correction Workflow

```
Attendance Issue

↓

Correction Requested

↓

Manager Review
(If Required)

↓

Approved

↓

Attendance Updated

↓

Audit Record Created
```

Organizations may configure whether manager approval is required.

---

# 5. Correction Requests

A correction request should include:

- Employee
- Shift
- Attendance date
- Reason for correction
- Requested change
- Supporting notes (optional)

Future versions may support file attachments.

---

# 6. Approval Rules

Organization policy determines whether corrections require approval.

Typical workflow:

- Supervisor submits correction.
- Manager reviews the request.
- Manager approves or rejects the correction.

Organizations may allow supervisors to apply corrections directly if configured.

---

# 7. Employee Requests

Employees may request corrections for **their own attendance records**.

Employees cannot directly modify attendance.

Examples:

- Incorrect clock-in time.
- Missing clock-out.
- Incorrect absence.

Employee requests must follow the organization's approval workflow.

---

# 8. Applying Corrections

When approved, ShiftOS updates the attendance record while preserving:

- Original value.
- Corrected value.
- Reason.
- User performing the correction.
- Approval details (if applicable).

Historical values are never deleted.

---

# 9. Attendance Permissions

| Permission                    | Manager |          Supervisor           |          Staff           | Admin _(Future)_ |
| ----------------------------- | :-----: | :---------------------------: | :----------------------: | :--------------: |
| View Attendance Corrections   |  Allow  |             Allow             |    Own Requests Only     |      Allow       |
| Submit Attendance Correction  |  Allow  |             Allow             | Allow _(Own Attendance)_ |       Deny       |
| Approve Attendance Correction |  Allow  | Allow _(Organization Policy)_ |           Deny           |       Deny       |
| Reject Attendance Correction  |  Allow  | Allow _(Organization Policy)_ |           Deny           |       Deny       |
| Apply Approved Correction     |  Allow  | Allow _(Organization Policy)_ |           Deny           |       Deny       |
| View Correction History       |  Allow  |             Allow             |   Own Attendance Only    |      Allow       |

---

# 10. Database Considerations

Recommended table:

```
attendance_corrections

id

attendance_id

requested_by

approved_by

status

reason

original_clock_in

corrected_clock_in

original_clock_out

corrected_clock_out

created_at

approved_at
```

Attendance records should reference correction history rather than overwriting previous values.

---

# 11. Audit Requirements

The following events generate audit records:

- Correction requested.
- Correction approved.
- Correction rejected.
- Correction applied.
- Attendance recalculated.

Audit records include:

- Employee.
- Shift.
- Previous values.
- Updated values.
- User.
- Timestamp.
- Reason.

---

# 12. Future Enhancements

Future versions may support:

- Attachment uploads.
- Multi-level approval workflows.
- AI anomaly detection.
- Bulk attendance corrections.
- Correction expiry windows.
- Automatic correction suggestions.

---

# 13. Related Specifications

- ATT-001 Attendance Philosophy
- ATT-002 Clock In
- ATT-003 Clock Out
- ATT-004 Attendance States
- ATT-005 Late Rules
- ATT-006 Absence Rules
- ATT-008 Attendance History
- ATT-009 Attendance Validation

---

# 14. Summary

Attendance Corrections provide the controlled process for updating inaccurate attendance records while maintaining complete accountability.

Employees may request corrections to their own attendance records, while supervisors and managers resolve operational issues according to organization policy.

Every correction preserves the original record, the corrected values and a complete audit history, ensuring attendance data remains accurate, transparent and trustworthy.
