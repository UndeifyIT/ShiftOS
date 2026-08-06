# ShiftOS Manager Dashboard

**Document ID:** MAN-001

**Document Title:** Manager Dashboard Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the Manager Dashboard experience in ShiftOS.

The Manager Dashboard provides organization-level visibility into workforce operations, performance and important business events.

---

# 2. Primary User

The dashboard is designed for:

- Business owners.
- Organization managers.
- Regional managers.

---

# 3. Dashboard Goal

The dashboard should help managers answer:

- How is my workforce performing?
- Are branches operating correctly?
- What requires attention?
- Where are problems developing?

---

# 4. Dashboard Philosophy

The dashboard should prioritize:

- Exceptions over raw data.
- Trends over individual events.
- Decisions over monitoring.

---

# 5. Screen Structure

Primary layout:

```
Header

↓

Key Metrics

↓

Operational Overview

↓

Alerts

↓

Performance Insights

↓

Recent Activity
```

---

# 6. Header Section

Displays:

- Organization name.
- Current context.
- Date/time period.
- User menu.

Actions:

- Change organization context (if applicable).
- Access settings.

---

# 7. Key Metrics Section

Purpose:

Provide quick organization health overview.

Possible metrics:

- Total employees.
- Active branches.
- Scheduled shifts.
- Attendance summary.

Metrics should avoid unnecessary complexity.

---

# 8. Workforce Overview

Purpose:

Show workforce status across branches.

Examples:

- Employees by branch.
- Staffing levels.
- Attendance trends.

---

# 9. Branch Performance

Purpose:

Allow managers to compare locations.

Information:

- Branch activity.
- Staffing coverage.
- Operational issues.

---

# 10. Alerts Section

Purpose:

Highlight items requiring attention.

Examples:

- Attendance problems.
- Schedule conflicts.
- Staffing shortages.
- Pending approvals.

---

# 11. Reports Preview

Purpose:

Provide quick access to insights.

Examples:

- Attendance trends.
- Workforce utilization.
- Scheduling patterns.

Action:

```
View Reports
```

---

# 12. Recent Activity

Shows important organization events.

Examples:

- Schedule published.
- Employee added.
- Attendance correction completed.

---

# 13. Empty States

New organization:

```
Your workforce data will appear here as operations begin.
```

Recommended actions:

- Add employees.
- Create branches.
- Create schedules.

---

# 14. Loading States

Dashboard loading should support:

- Metric skeletons.
- Progressive loading.
- Preserved layout.

---

# 15. Error States

Examples:

Data unavailable:

```
Unable to load dashboard information.
Retry.
```

---

# 16. Permissions

Managers should only see:

- Authorized organizations.
- Authorized branches.
- Allowed metrics.

Dashboard visibility does not replace backend authorization.

---

# 17. Responsive Behaviour

Desktop:

- Full dashboard layout.
- Multiple information panels.

Tablet:

- Reduced columns.

Mobile:

- Prioritized metrics.
- Stacked sections.

---

# 18. MVP Requirements

Must include:

✅ Organization overview  
✅ Workforce summary  
✅ Branch visibility  
✅ Important alerts  
✅ Navigation to detailed areas  

---

# 19. Future Enhancements

Future versions may introduce:

- Predictive workforce insights.
- AI recommendations.
- Cost forecasting.
- Advanced analytics.

---

# 20. Related Specifications

- MAN-006 Reports
- SUP-001 Supervisor Dashboard
- UI-003 Layout System
- UI-006 Data Tables
- UI-009 Error States

---

# 21. Summary

The ShiftOS Manager Dashboard provides strategic workforce visibility.

Unlike supervisor workflows focused on immediate branch operations, the manager dashboard focuses on organizational health, trends and decision-making.