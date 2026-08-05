# ShiftOS Attendance Philosophy

**Document ID:** ATT-001

**Document Title:** Attendance Philosophy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Attendance Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the attendance philosophy used throughout ShiftOS.

Attendance in ShiftOS is designed for shift-based operational businesses where employees are actively working on the shop floor and are not expected to interact with the system during their shifts.

Unlike traditional workforce management systems that rely on employee self-service clocking, ShiftOS uses a supervisor-managed attendance model.

---

# 2. Attendance Philosophy

ShiftOS treats attendance as an operational responsibility rather than an employee self-service activity.

Attendance is recorded by supervisors based on the employees physically present for a scheduled shift.

Employees are not responsible for clocking themselves in or out during working hours.

This approach reflects how many restaurants, supermarkets, retail stores, pharmacies, warehouses and similar businesses operate in practice.

---

# 3. Core Principles

## 3.1 Attendance Is Schedule-Driven

Attendance begins with the published schedule.

Only employees assigned to scheduled shifts are expected to have attendance recorded.

Example:

```
Published Schedule

↓

Morning Shift

↓

Expected Employees

↓

Attendance Recorded
```

---

## 3.2 Supervisors Record Attendance

Supervisors are responsible for recording employee attendance.

As employees arrive for their scheduled shift, the supervisor records their arrival in ShiftOS.

Similarly, when the shift ends, the supervisor records employee departures.

Employees do not perform these actions themselves.

---

## 3.3 Attendance Reflects Reality

Attendance should reflect what actually occurred during operations.

If an employee:

- Arrived late
- Left early
- Did not attend
- Worked as scheduled

The attendance record should accurately capture those events.

---

## 3.4 One Attendance Record Per Scheduled Shift

Each employee may have one attendance record for each scheduled shift.

Example:

```
John

↓

Monday Morning Shift

↓

Attendance Record
```

If an employee works multiple shifts in one day, each shift maintains its own attendance record.

---

## 3.5 Attendance Supports Operations

Attendance exists to support:

- Daily workforce management.
- Operational visibility.
- Reporting.
- Historical records.
- Future payroll integrations.

Attendance is not designed as an employee monitoring tool.

---

# 4. Attendance Workflow

The standard attendance workflow is:

```
Published Schedule

↓

Supervisor Opens Attendance

↓

Expected Employees Displayed

↓

Employees Arrive

↓

Supervisor Records Attendance

↓

Shift Operates

↓

Supervisor Records Clock Out

↓

Attendance Finalized
```

---

# 5. Attendance Sources

Attendance information may originate from:

- Supervisor attendance recording _(MVP)_
- Attendance corrections
- Manager-approved adjustments

Future versions may support:

- QR code check-in
- NFC
- Biometric devices
- Hardware time clocks
- GPS verification
- API integrations

Regardless of the source, all attendance records follow the same business rules.

---

# 6. Relationship With Scheduling

Attendance depends on published schedules.

The published schedule defines:

- Expected employees.
- Expected shift times.
- Expected branch.
- Expected supervisor.

Attendance records are created against those scheduled shifts.

Employees who are not scheduled are not expected to have attendance records unless organization policies allow unscheduled work.

---

# 7. Operational Responsibilities

### Manager

Responsible for:

- Attendance oversight.
- Reviewing attendance reports.
- Approving attendance corrections when required.
- Monitoring attendance trends.

---

### Supervisor

Responsible for:

- Recording arrivals.
- Recording departures.
- Managing attendance during shifts.
- Reporting attendance issues.
- Requesting attendance corrections where necessary.

---

### Employee

Responsible for:

- Reporting for scheduled shifts.
- Requesting attendance corrections after the shift if an attendance record is incorrect.

Employees do not clock themselves in or out.

---

# 8. Design Principles

## Simplicity

Attendance recording should be fast enough to complete during busy operational periods.

---

## Accuracy

Attendance records should represent actual employee attendance.

---

## Accountability

Every attendance action should identify the user who performed it.

---

## Auditability

Attendance history must never be silently altered.

Corrections should remain fully traceable.

---

## Operational First

Attendance workflows should prioritize operational efficiency over unnecessary user interaction.

---

# 9. Database Considerations

Attendance records should reference:

```
attendance

id

schedule_id

shift_id

employee_id

branch_id

clock_in_time

clock_out_time

attendance_state

recorded_by

created_at

updated_at
```

Attendance records should always be linked to the scheduled shift whenever applicable.

---

# 10. Audit Requirements

The following actions generate audit records:

- Attendance recorded.
- Clock-in recorded.
- Clock-out recorded.
- Attendance corrected.
- Attendance approved.
- Attendance rejected.

Audit records include:

- User.
- Employee.
- Shift.
- Action.
- Timestamp.
- Previous values (where applicable).

---

# 11. Future Enhancements

Future versions may support:

- Automatic attendance capture.
- Facial recognition.
- Geofencing.
- Hardware attendance devices.
- Offline attendance synchronization.
- AI attendance anomaly detection.

These enhancements will supplement—not replace—the supervisor-managed attendance model unless an organization explicitly adopts an alternative workflow.

---

# 12. Related Specifications

- SCH-007 Schedule Publishing
- SHIFT-008 Shift Assignment
- ATT-002 Clock In
- ATT-003 Clock Out
- ATT-004 Attendance States
- ATT-009 Attendance Validation

---

# 13. Summary

ShiftOS adopts a supervisor-managed attendance model designed specifically for shift-based operational businesses.

Attendance is driven by published schedules and recorded by supervisors rather than employees.

This approach reflects real-world operational practices, reduces employee interaction during working hours and provides accurate, auditable attendance records that support daily operations, reporting and future workforce management capabilities.
