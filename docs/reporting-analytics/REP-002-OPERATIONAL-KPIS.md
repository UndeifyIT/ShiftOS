# ShiftOS Operational KPIs

**Document ID:** REP-002

**Document Title:** Operational Key Performance Indicators (KPIs)

**Version:** 1.0.0

**Status:** Approved

**Classification:** Reporting & Analytics Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the standard operational KPIs used throughout ShiftOS.

These KPIs provide managers and supervisors with measurable indicators of workforce performance and operational health.

---

# 2. KPI Philosophy

Operational KPIs should:

- Be actionable.
- Be measurable.
- Be easy to understand.
- Be calculated consistently.
- Support operational decision-making.

Metrics that do not influence decisions should not be presented as KPIs.

---

# 3. KPI Categories

ShiftOS organizes KPIs into the following categories:

- Workforce
- Scheduling
- Attendance
- Tasks
- Branch Operations

---

# 4. Workforce KPIs

## Total Employees

Purpose:

Displays the current active workforce.

Used for:

- Workforce planning.
- Staffing overview.

---

## Active Employees Today

Purpose:

Employees scheduled or working today.

---

## Employees Currently Working

Purpose:

Employees with active shifts.

Useful for:

- Operational visibility.
- Live branch monitoring.

---

# 5. Scheduling KPIs

## Scheduled Shifts Today

Measures:

Total planned shifts.

---

## Completed Shifts

Measures:

Successfully completed shifts.

---

## Cancelled Shifts

Measures:

Cancelled scheduled shifts.

---

## Missed Shifts

Measures:

Shifts that never commenced.

---

# 6. Attendance KPIs

## Attendance Rate

Measures:

Percentage of scheduled employees who attended.

---

## Late Arrival Rate

Measures:

Percentage of employees marked late.

---

## Absence Rate

Measures:

Percentage of scheduled employees marked absent.

---

## Attendance Exceptions

Measures:

Attendance records requiring review or correction.

---

# 7. Task KPIs

## Active Tasks

Measures:

Currently outstanding operational tasks.

---

## Completed Tasks

Measures:

Tasks completed during the reporting period.

---

## Overdue Tasks

Measures:

Tasks that exceeded their due time without completion.

---

## Verification Pending

Measures:

Completed tasks awaiting supervisor verification.

---

# 8. Branch Operations KPIs

## Branch Operational Status

Possible values:

- Normal
- Attention Required
- Critical

Determined from configurable operational thresholds.

---

## Open Operational Issues

Measures:

Outstanding operational exceptions requiring action.

---

# 9. KPI Refresh Frequency

| KPI Type          | Refresh           |
| ----------------- | ----------------- |
| Live Operations   | Real-time         |
| Attendance        | Real-time         |
| Tasks             | Real-time         |
| Historical Trends | Scheduled refresh |

---

# 10. KPI Calculation Rules

All KPIs shall:

- Use authoritative operational data.
- Apply consistent calculation methods.
- Respect organization and branch boundaries.
- Exclude archived or invalid records unless explicitly required.

---

# 11. KPI Timeframes

KPIs may be calculated for:

- Today.
- Yesterday.
- Current week.
- Current month.
- Custom date range.

Historical comparisons may be supported where appropriate.

---

# 12. KPI Thresholds

Organizations may configure thresholds for selected KPIs.

Examples:

Attendance Rate:

- ≥ 95% → Healthy
- 90–94% → Warning
- < 90% → Critical

Threshold values should be configurable rather than hardcoded.

---

# 13. KPI Presentation

KPIs should display:

- Current value.
- Trend direction where available.
- Reporting period.
- Last updated timestamp.

Visual indicators should supplement—not replace—numeric values.

---

# 14. Security

Users may only view KPIs permitted by:

- Organization.
- Branch.
- Role.

Branch managers shall not see metrics outside their authorized scope.

---

# 15. Related Specifications

- REP-001 Reporting Philosophy
- REP-003 Attendance KPIs
- REP-007 Dashboard Metrics
- DB-011 Materialized Views
- API-007 Background Jobs

---

# 16. Summary

ShiftOS Operational KPIs provide a standardized set of actionable workforce metrics that help managers and supervisors monitor daily operations, identify issues quickly and make informed staffing decisions.
