# ShiftOS Database Views

**Document ID:** DB-010

**Document Title:** Database Views Strategy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the strategy for using PostgreSQL views within ShiftOS.

Views provide simplified, reusable representations of operational data for reporting, dashboards and application queries.

---

# 2. View Philosophy

Views are read-oriented database objects that simplify access to complex data relationships.

They should:

- Improve query readability.
- Reduce duplicated query logic.
- Support reporting needs.
- Provide consistent data access patterns.

Views should not replace normalized operational tables.

---

# 3. View Principles

ShiftOS views follow these principles:

- Operational tables remain the source of truth.
- Views should represent useful read models.
- Views should avoid unnecessary complexity.
- Views should have clear ownership.
- Views should be documented.

---

# 4. View Categories

ShiftOS views are divided into:

## Operational Views

Used by application workflows.

Examples:

- Current schedules.
- Employee status.
- Active tasks.

---

## Reporting Views

Used for analytics and reporting.

Examples:

- Attendance summaries.
- Workforce statistics.
- Branch performance.

---

## Administrative Views

Used for management operations.

Examples:

- Organization overview.
- User access summaries.

---

# 5. Workforce Views

Potential views:

## employee_overview

Purpose:

Provides a simplified employee profile.

May include:

- Employee details.
- Branch information.
- Employment status.

---

## employee_status_summary

Purpose:

Provides workforce status information.

Examples:

- Active employees.
- Inactive employees.
- Employment counts.

---

# 6. Scheduling Views

Potential views:

## upcoming_shifts_view

Purpose:

Provides upcoming scheduled shifts.

May include:

- Employee.
- Branch.
- Date.
- Time.

---

## schedule_summary_view

Purpose:

Provides schedule-level information.

Examples:

- Total shifts.
- Assigned employees.
- Coverage status.

---

# 7. Attendance Views

Potential views:

## attendance_summary_view

Purpose:

Provides attendance reporting.

May include:

- Employee.
- Date.
- Status.
- Attendance metrics.

---

## daily_attendance_view

Purpose:

Provides branch daily attendance information.

---

# 8. Task Views

Potential views:

## task_status_view

Purpose:

Provides operational task visibility.

May include:

- Task.
- Assignment.
- Completion status.

---

# 9. Notification Views

Potential views:

## unread_notifications_view

Purpose:

Provides user unread notifications.

---

# 10. Security Views

Potential views:

## user_access_summary_view

Purpose:

Provides simplified access information.

May include:

- User.
- Organization.
- Roles.
- Permissions.

---

# 11. Tenant Awareness

Views must preserve tenant boundaries.

Tenant-owned views should:

- Include organization context.
- Respect Row-Level Security requirements.
- Avoid exposing cross-tenant data.

Views must never become a security bypass.

---

# 12. View Naming

Views follow DB-002 standards.

Examples:

```
employee_overview

attendance_summary_view

branch_statistics
```

Names should describe the data they represent.

---

# 13. View Performance

Views should be monitored for:

- Query complexity.
- Execution time.
- Frequent usage.
- Impact on database resources.

Complex frequently accessed views may become candidates for materialized views.

---

# 14. View Maintenance

Views should be:

- Version controlled.
- Created through migrations.
- Reviewed when underlying tables change.

Breaking view changes should be carefully managed.

---

# 15. Views vs Materialized Views

Standard views:

- Always show current data.
- Execute query when accessed.

Materialized views:

- Store computed results.
- Require refreshing.
- Used for expensive calculations.

The choice depends on workload requirements.

---

# 16. Future Enhancements

Future versions may introduce:

- Analytics views.
- Executive dashboards.
- Workforce intelligence views.
- External reporting views.

---

# 17. Related Specifications

- DB-003 Schema Overview
- DB-005 Tables
- DB-007 Indexes
- DB-011 Materialized Views
- ARCH-006 Data Flow

---

# 18. Summary

ShiftOS views provide simplified read models over normalized operational data.

By using views for reusable queries, reporting and dashboards while keeping operational tables as the source of truth, ShiftOS maintains database clarity, performance and flexibility as the platform grows.
