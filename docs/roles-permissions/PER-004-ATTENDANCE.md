# ShiftOS Attendance Permission Matrix

**Document ID:** PER-002-03

**Document Title:** Attendance Permission Matrix

**Version:** 2.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to attendance management within ShiftOS.

Attendance permissions govern employee attendance recording, monitoring, adjustments, overtime management and attendance reporting.

The attendance model follows the ShiftOS operational philosophy:

- Supervisors record and manage attendance during shifts.
- Managers oversee attendance and approve sensitive attendance changes.
- Employees do not interact with attendance during active shifts.
- The future Admin role has read-only operational visibility.

---

# 2. Permission Values

| Value | Meaning |
|:------|:--------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Attendance Permission Matrix

| Permission                           | Manager | Supervisor | Staff | Admin *(Future)* |
|--------------------------------------|:-------:|:----------:|:-----:|:----------------:|
| View Attendance Dashboard            | Allow   | Allow      | Deny  | Allow            |
| View Attendance Records              | Allow   | Allow      | Deny  | Allow            |
| View Personal Attendance             | Allow   | Allow      | Allow | Allow            |
| View Personal Attendance History     | Allow   | Allow      | Allow | Allow            |
| View Live Attendance                 | Allow   | Allow      | Deny  | Allow            |
| View Attendance Analytics            | Allow   | Allow      | Deny  | Allow            |
| View Attendance Exceptions           | Allow   | Allow      | Deny  | Allow            |
| View Late Arrivals                   | Allow   | Allow      | Deny  | Allow            |
| View Early Departures                | Allow   | Allow      | Deny  | Allow            |
| View Absences                        | Allow   | Allow      | Deny  | Allow            |
| View Overtime                        | Allow   | Allow      | Deny  | Allow            |
| Record Employee Arrival              | Deny    | Allow      | Deny  | Deny             |
| Record Employee Departure            | Deny    | Allow      | Deny  | Deny             |
| Record Late Arrival                  | Deny    | Allow      | Deny  | Deny             |
| Record Early Departure               | Deny    | Allow      | Deny  | Deny             |
| Mark Employee Absent                 | Deny    | Allow      | Deny  | Deny             |
| Correct Attendance Record            | Deny    | Allow      | Deny  | Deny             |
| Submit Attendance Adjustment         | Deny    | Allow      | Deny  | Deny             |
| Approve Attendance Adjustment        | Allow   | Deny       | Deny  | Deny             |
| Reject Attendance Adjustment         | Allow   | Deny       | Deny  | Deny             |
| Record Overtime                      | Deny    | Allow      | Deny  | Deny             |
| Approve Overtime                     | Allow   | Deny       | Deny  | Deny             |
| Reject Overtime                      | Allow   | Deny       | Deny  | Deny             |
| Start Operational Shift              | Deny    | Allow      | Deny  | Deny             |
| End Operational Shift                | Deny    | Allow      | Deny  | Deny             |
| Take Over Operational Shift          | Allow   | Deny       | Deny  | Deny             |
| Export Attendance Records            | Allow   | Allow      | Deny  | Allow            |

---

# 4. Permission Rules

## Attendance Ownership

Supervisors are responsible for recording attendance throughout the working day.

Attendance is recorded against employees scheduled for the current shift.

Managers oversee attendance and intervene only when operationally necessary.

---

## Attendance Recording

Employees do not clock themselves in or out.

The Supervisor records:

- Arrival time
- Departure time
- Late arrivals
- Early departures
- Absences

Attendance timestamps become part of the permanent attendance history.

---

## Attendance Adjustments

Attendance records are never deleted.

If an error occurs:

- The Supervisor submits an attendance adjustment.
- The Manager approves or rejects the adjustment.
- Every adjustment generates an audit record.

---

## Overtime

Supervisors record overtime worked.

Managers approve or reject overtime before it becomes part of official attendance records.

---

## Operational Shift Control

Each shift begins when the Supervisor starts the operational shift.

If the Supervisor fails to start the shift within the configured grace period, the Manager may temporarily assume Supervisor operational responsibilities.

All temporary takeovers are fully audited.

---

## Read-Only Administration

The future Admin role may:

- View attendance
- View analytics
- Export attendance reports

The Admin role cannot modify attendance or approve operational actions.

---

# 5. Design Principles

## Supervisor-Led Attendance

Attendance is managed by Supervisors rather than employees.

---

## Management Oversight

Managers review attendance quality and approve sensitive operational changes.

---

## Auditability

Attendance records are permanent.

Corrections occur through adjustments rather than edits or deletions.

---

## Least Privilege

Permissions are limited to the minimum required for each operational role.

---

## Scalability

The attendance permission model supports future operational roles without redesign.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- ATT-001 Attendance Model
- ATT-002 Attendance Adjustments
- ATT-003 Overtime Management

---

# 7. Summary

The Attendance Permission Matrix defines how attendance is managed within ShiftOS.

Supervisors record and manage attendance throughout each shift.

Managers oversee attendance operations and approve sensitive attendance changes.

Employees have read-only access to their own attendance information outside active working hours.

The future Admin role provides read-only operational visibility without participating in attendance management.