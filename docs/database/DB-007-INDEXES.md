# ShiftOS Database Indexes

**Document ID:** DB-007

**Document Title:** Database Index Strategy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the indexing strategy used within the ShiftOS database.

Indexes improve query performance by allowing PostgreSQL to efficiently locate and retrieve data without scanning entire tables unnecessarily.

---

# 2. Index Philosophy

Indexes should be created based on:

- Real application queries.
- Common filtering patterns.
- Sorting requirements.
- Relationship lookups.
- Reporting requirements.

Indexes should improve performance without creating unnecessary database overhead.

---

# 3. Index Principles

ShiftOS indexes follow these principles:

- Every foreign key should be reviewed for indexing.
- High-frequency queries receive priority.
- Composite indexes should match query patterns.
- Indexes should not replace good schema design.
- Performance should be measured before optimization.

---

# 4. Primary Key Indexes

Every primary key automatically receives an index.

Example:

```
organizations.id
employees.id
shifts.id
```

Primary key indexes support:

- Record lookup.
- Foreign key relationships.
- Entity retrieval.

---

# 5. Foreign Key Indexes

Foreign keys should generally be indexed.

Examples:

```
employees.organization_id

employees.branch_id

attendance_records.employee_id

shifts.schedule_id
```

Benefits:

- Faster joins.
- Faster tenant filtering.
- Faster relationship queries.

---

# 6. Tenant Indexing

Multi-tenant queries are a core workload.

Tenant-owned tables should support queries such as:

```
WHERE organization_id = ?
```

Common indexes:

```
organization_id
organization_id + created_at
organization_id + status
```

Tenant filtering should remain efficient as customer data grows.

---

# 7. Workforce Indexes

Common workforce queries:

- Employees by branch.
- Active employees.
- Employee search.

Potential indexes:

```
employees(branch_id)

employees(organization_id, status)

employees(organization_id, last_name)
```

---

# 8. Scheduling Indexes

Common scheduling queries:

- Branch schedules.
- Upcoming shifts.
- Employee assignments.

Potential indexes:

```
schedules(branch_id)

schedules(start_date)

shifts(schedule_id)

shift_assignments(employee_id)

shift_assignments(shift_id)
```

---

# 9. Attendance Indexes

Attendance will become one of the largest tables.

Important indexes:

```
attendance_records(employee_id)

attendance_records(organization_id, date)

attendance_records(branch_id, date)

attendance_records(status)
```

These support:

- Attendance history.
- Daily monitoring.
- Reporting.

---

# 10. Task Indexes

Common task queries:

- Open tasks.
- Employee assignments.
- Branch task lists.

Potential indexes:

```
tasks(branch_id)

tasks(status)

task_assignments(employee_id)

task_assignments(task_id)
```

---

# 11. Notification Indexes

Common notification queries:

- User notifications.
- Unread notifications.

Potential indexes:

```
notifications(user_id)

notifications(user_id, read_status)

notifications(created_at)
```

---

# 12. Audit Log Indexes

Audit logs may become very large.

Important indexes:

```
audit_logs(organization_id)

audit_logs(actor_id)

audit_logs(created_at)

audit_logs(resource_type, resource_id)
```

---

# 13. Composite Indexes

Composite indexes should match actual query order.

Example:

Query:

```
organization_id + branch_id + date
```

Recommended:

```
(organization_id, branch_id, date)
```

Column order matters.

---

# 14. Partial Indexes

Partial indexes may be used where only a subset of data is frequently queried.

Examples:

Active records:

```
WHERE deleted_at IS NULL
```

Unread notifications:

```
WHERE read_at IS NULL
```

Partial indexes should be introduced only when justified.

---

# 15. Index Maintenance

Indexes require monitoring.

Review:

- Query performance.
- Index usage.
- Storage growth.
- Duplicate indexes.
- Unused indexes.

Unused indexes should be removed.

---

# 16. Performance Testing

Index decisions should be validated through:

- Query analysis.
- PostgreSQL query plans.
- Production metrics.
- Load testing.

Indexes should be evidence-driven.

---

# 17. Future Enhancements

Future versions may support:

- Advanced query optimization.
- Partitioning strategies.
- Specialized reporting indexes.
- Analytics-specific indexing.

---

# 18. Related Specifications

- DB-005 Tables
- DB-006 Constraints
- DB-010 Views
- DB-011 Materialized Views
- ARCH-009 Scalability Strategy

---

# 19. Summary

ShiftOS uses a query-driven indexing strategy designed around real operational workflows.

By indexing important relationships, tenant filters and high-frequency queries while avoiding unnecessary indexes, the database remains fast, scalable and maintainable as workforce data grows.
