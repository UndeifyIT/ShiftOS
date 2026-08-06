# ShiftOS Database Naming Standards

**Document ID:** DB-002

**Document Title:** Database Naming Standards

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the naming conventions used throughout the ShiftOS database.

Consistent naming improves readability, maintainability, onboarding, debugging and long-term scalability.

These standards apply to all database objects unless explicitly documented otherwise.

---

# 2. General Principles

Database names should be:

- Descriptive.
- Consistent.
- Predictable.
- Human-readable.
- Easy to search.
- Stable over time.

Readability takes precedence over shortening names.

---

# 3. Letter Case

All database object names shall use:

- Lowercase letters.
- Snake_case.
- ASCII characters.

Examples:

```
organization_members
employee_attendance
schedule_versions
created_at
organization_id
```

The following are prohibited:

```
OrganizationMembers
employeeAttendance
EmployeeAttendance
employee-attendance
```

---

# 4. Table Names

Table names should:

- Use plural nouns.
- Describe collections of records.
- Avoid abbreviations where practical.

Examples:

```
organizations
branches
employees
schedules
shifts
attendance_records
tasks
announcements
notifications
audit_logs
```

---

# 5. Column Names

Column names should:

- Clearly describe stored values.
- Avoid repeating the table name unnecessarily.
- Remain consistent across tables.

Examples:

```
id
organization_id
branch_id
employee_id
created_at
updated_at
deleted_at
published_at
```

---

# 6. Primary Keys

Every table should use:

```
id
```

Primary key names should remain consistent across the platform.

---

# 7. Foreign Keys

Foreign keys should follow:

```
<referenced_table_singular>_id
```

Examples:

```
organization_id
branch_id
employee_id
schedule_id
task_id
notification_id
```

Foreign key names should match the referenced resource.

---

# 8. Junction Tables

Many-to-many tables should:

- Use plural table names.
- Combine entity names in a consistent order.

Examples:

```
employee_roles
employee_skills
schedule_employees
branch_managers
```

Junction table names should remain descriptive.

---

# 9. Timestamp Columns

Standard timestamp fields include:

```
created_at
updated_at
deleted_at
published_at
started_at
completed_at
verified_at
expires_at
```

Timestamp names should describe the business event being recorded.

---

# 10. Boolean Columns

Boolean fields should read naturally.

Preferred prefixes include:

```
is_
has_
can_
requires_
```

Examples:

```
is_active
is_locked
has_acknowledged
can_publish
requires_verification
```

Avoid ambiguous names such as:

```
active
locked
verified
```

---

# 11. Constraint Names

Constraints should follow consistent prefixes.

Examples:

```
pk_employees
fk_employees_branch
uq_employee_email
chk_shift_duration
```

Suggested prefixes:

- pk_ (Primary Key)
- fk_ (Foreign Key)
- uq_ (Unique Constraint)
- chk_ (Check Constraint)

---

# 12. Index Names

Indexes should follow:

```
idx_<table>_<column>
```

Examples:

```
idx_employees_branch_id
idx_shifts_schedule_id
idx_attendance_employee_id
```

Composite indexes should include all indexed columns in order.

---

# 13. Trigger Names

Triggers should use:

```
trg_<table>_<purpose>
```

Examples:

```
trg_employees_updated_at
trg_tasks_audit
trg_attendance_validation
```

---

# 14. View Names

Views should use descriptive nouns.

Examples:

```
employee_summary
schedule_overview
attendance_dashboard
branch_statistics
```

Materialized views should use the same naming style without additional abbreviations.

---

# 15. Enum Names

Enum types should follow:

```
<domain>_<purpose>_enum
```

Examples:

```
attendance_status_enum
task_priority_enum
notification_channel_enum
```

Enum values should remain lowercase with underscores.

---

# 16. Migration Files

Migration names should clearly describe their purpose.

Examples:

```
create_employees_table
add_schedule_versioning
create_attendance_indexes
add_notification_preferences
```

Migration names should remain meaningful years after creation.

---

# 17. Prohibited Practices

The following should be avoided:

- Inconsistent abbreviations.
- Mixed naming conventions.
- CamelCase.
- Spaces.
- Special characters.
- Reserved SQL keywords.
- Cryptic identifiers.

Naming should prioritize long-term clarity.

---

# 18. Related Specifications

- DB-001 Database Philosophy
- DB-005 Tables
- DB-006 Constraints
- DB-007 Indexes
- DB-008 Enums
- DB-012 Migrations

---

# 19. Summary

ShiftOS adopts consistent, descriptive and predictable database naming conventions based on lowercase snake_case formatting.

By standardizing the names of tables, columns, keys, constraints, indexes, triggers, views and migrations, the platform improves readability, reduces developer errors and creates a maintainable schema that can evolve confidently over time.
