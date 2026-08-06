# ShiftOS Dashboard Metrics

**Document ID:** REP-007

**Document Title:** Dashboard Metrics Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Reporting & Analytics Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the operational metrics displayed on ShiftOS dashboards.

Dashboard metrics provide users with an immediate understanding of current operations and highlight areas requiring attention.

Dashboards are designed for monitoring and decision-making, not detailed analysis.

---

# 2. Dashboard Philosophy

Dashboard metrics should be:

- Actionable.
- Easy to understand.
- Updated appropriately.
- Role-specific.
- Limited to the most important information.

Detailed analysis belongs in reports.

---

# 3. Dashboard Principles

Every dashboard should answer:

- What is happening now?
- What needs my attention?
- What should I do next?

If a metric does not help answer one of these questions, it should not appear on the dashboard.

---

# 4. Manager Dashboard Metrics

Primary metrics:

- Active employees.
- Employees currently working.
- Attendance rate (today).
- Scheduled shifts (today).
- Completed shifts (today).
- Open operational issues.
- Overdue tasks.
- Branch operational status.

Optional trend metrics:

- Weekly attendance trend.
- Task completion trend.

---

# 5. Supervisor Dashboard Metrics

Primary metrics:

- Employees currently on shift.
- Shift progress.
- Attendance exceptions.
- Active tasks.
- Overdue tasks.
- Pending task verifications.
- Open operational issues.

Optional trend metrics:

- Today's attendance trend.

---

# 6. Employee Dashboard Metrics

Primary metrics:

- Next scheduled shift.
- Current shift status.
- Outstanding tasks.
- Recent announcements.
- Personal attendance summary.

Employees should not see organization-wide operational metrics.

---

# 7. KPI Cards

Dashboard KPI cards should display:

- Metric name.
- Current value.
- Reporting period.
- Trend indicator (where applicable).
- Last updated timestamp (optional for live metrics).

Examples:

- Attendance Rate: 96%
- Employees Working: 18
- Overdue Tasks: 3

---

# 8. Operational Alerts

Dashboards should prominently display operational alerts such as:

- Attendance exceptions.
- Shift staffing issues.
- Overdue tasks.
- Pending approvals.
- System notices.

Alerts should be actionable and link directly to the relevant workflow.

---

# 9. Data Freshness

Dashboard metrics should indicate their freshness.

Recommended update frequencies:

| Metric Type | Refresh Frequency |
|--------------|------------------|
| Live workforce status | Real-time |
| Attendance | Real-time |
| Tasks | Real-time |
| Historical trends | Scheduled refresh |

---

# 10. Personalization

Dashboard layouts are role-specific.

Future versions may allow users to:

- Reorder dashboard widgets.
- Pin preferred metrics.
- Hide optional widgets.

The MVP uses standardized layouts.

---

# 11. Performance

Dashboard loading should prioritize:

1. Critical KPI cards.
2. Operational alerts.
3. Supporting widgets.
4. Trend visualizations.

Non-critical components may load progressively.

---

# 12. Security

Dashboard metrics must respect:

- Organization boundaries.
- Branch permissions.
- User roles.

No dashboard shall expose unauthorized operational information.

---

# 13. Design Guidelines

Dashboards should:

- Minimize scrolling.
- Highlight exceptions before normal conditions.
- Avoid information overload.
- Provide clear navigation to detailed reports.

---

# 14. Related Specifications

- MAN-001 Manager Dashboard
- SUP-001 Supervisor Dashboard
- EMPUI-001 Employee Dashboard
- REP-002 Operational KPIs
- REP-003 Attendance KPIs

---

# 15. Summary

ShiftOS dashboards provide role-specific operational visibility through a focused set of actionable metrics.

By emphasizing current operational status and immediate actions over historical analysis, dashboards enable managers, supervisors and employees to respond quickly to workforce needs.