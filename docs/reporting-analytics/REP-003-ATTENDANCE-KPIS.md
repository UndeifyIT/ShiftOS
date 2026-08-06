# ShiftOS Attendance KPIs

**Document ID:** REP-003

**Document Title:** Attendance Key Performance Indicators

**Version:** 1.0.0

**Status:** Approved

**Classification:** Reporting & Analytics Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the attendance-related KPIs used throughout ShiftOS.

These KPIs provide managers and supervisors with insights into workforce attendance, punctuality and attendance reliability.

---

# 2. Objectives

Attendance KPIs should help organizations:

- Monitor attendance performance.
- Detect attendance issues early.
- Improve workforce reliability.
- Reduce absenteeism.
- Support payroll preparation.
- Support compliance reporting.

---

# 3. Reporting Scope

Attendance KPIs may be generated for:

- Organization.
- Branch.
- Employee.
- Date range.

---

# 4. Core Attendance KPIs

## Attendance Rate

Definition:

Percentage of scheduled shifts with a recorded attendance outcome other than **Absent**.

Purpose:

Measures overall attendance reliability.

---

## Absence Rate

Definition:

Percentage of scheduled shifts with an attendance outcome of **Absent**.

Purpose:

Identifies workforce availability issues.

---

## Late Arrival Rate

Definition:

Percentage of attended shifts where the employee arrived after the organization's configured grace period.

Purpose:

Measures punctuality.

---

## On-Time Arrival Rate

Definition:

Percentage of attended shifts where the employee arrived on or before the scheduled start time, considering any configured grace period.

Purpose:

Measures punctual attendance.

---

## Attendance Correction Rate

Definition:

Percentage of attendance records that entered the correction workflow.

Purpose:

Highlights operational accuracy and potential process issues.

---

## Attendance Verification Rate

Definition:

Percentage of attendance records that required and successfully completed verification.

Purpose:

Measures completion of attendance review processes.

---

# 5. Trend Metrics

Attendance trends should be available for:

- Daily.
- Weekly.
- Monthly.
- Custom date ranges.

Trend reports should support comparison with previous periods where applicable.

---

# 6. Employee Attendance Metrics

Each employee may have:

- Attendance rate.
- Late arrivals.
- Absences.
- Attendance corrections.
- Consecutive attended shifts.
- Consecutive absences.

These metrics are intended for operational review, not automated disciplinary action.

---

# 7. Branch Attendance Metrics

Each branch may report:

- Overall attendance rate.
- Average lateness.
- Total absences.
- Attendance corrections.
- Attendance trends.

---

# 8. Attendance Exceptions

The system should identify:

- Missing attendance records.
- Duplicate attendance records.
- Attendance outside scheduled shift windows.
- Records awaiting correction approval.

These are operational exceptions requiring review.

---

# 9. Calculation Rules

Attendance KPIs shall:

- Use finalized attendance records.
- Exclude cancelled shifts.
- Respect organization-configured attendance rules.
- Apply the same calculation logic across dashboards, reports and exports.

---

# 10. Visualization Guidelines

Attendance reports may include:

- Summary KPI cards.
- Trend line charts.
- Daily attendance tables.
- Branch comparison charts.

Visualizations should support quick operational understanding rather than complex statistical analysis.

---

# 11. Security

Managers may view attendance KPIs within their authorized organization.

Supervisors may view attendance KPIs for their assigned branches.

Employees may view only their own attendance history and personal attendance metrics.

---

# 12. Performance

Frequently accessed attendance reports should:

- Use indexed attendance tables.
- Leverage materialized views for historical aggregations.
- Refresh according to reporting requirements.

---

# 13. Related Specifications

- REP-001 Reporting Philosophy
- REP-002 Operational KPIs
- MAN-004 Attendance
- SUP-004 Attendance
- DB-011 Materialized Views

---

# 14. Summary

Attendance KPIs provide standardized measurements of workforce attendance, punctuality and attendance quality.

By using consistent calculations and separating operational metrics from attendance-specific analytics, ShiftOS enables organizations to monitor attendance accurately while supporting operational decision-making.