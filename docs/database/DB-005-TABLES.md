# ShiftOS Database Tables

**Document ID:** DB-005

**Document Title:** Database Tables

**Version:** 1.0.0

**Status:** Draft

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the core database tables used within the ShiftOS platform.

Each table represents a persistent business entity or supporting system resource.

Detailed column definitions, constraints and indexes are documented separately.

---

# 2. Table Design Principles

ShiftOS tables follow these principles:

- One table represents one primary business concept.
- Tables have clear ownership.
- Tenant-owned tables include organization ownership.
- Historical data is preserved where required.
- Relationships are enforced through foreign keys.
- Tables should support reporting requirements.

---

# 3. Platform Tables

## organizations

Purpose:

Stores tenant organizations using the ShiftOS platform.

Ownership:

Platform

Contains:

- Organization identity.
- Subscription information.
- Organization settings.
- Lifecycle status.

---

## branches

Purpose:

Stores physical operating locations belonging to organizations.

Ownership:

Platform

Relationship:

Organization → Many Branches

Contains:

- Branch identity.
- Location information.
- Operational settings.
- Status.

---

# 4. Identity & Access Tables

## users

Purpose:

Stores authenticated system users.

Ownership:

Identity

Contains:

- User identity.
- Authentication references.
- Account status.

---

## organization_members

Purpose:

Links users to organizations.

Ownership:

Identity

Relationship:

User ↔ Organization

Contains:

- Membership status.
- Organization access.
- User association.

---

## roles

Purpose:

Stores system roles.

Ownership:

Security

Contains:

- Role definitions.
- Permission groups.

---

## permissions

Purpose:

Stores available system permissions.

Ownership:

Security

Contains:

- Permission identifiers.
- Permission descriptions.

---

## role_permissions

Purpose:

Maps permissions to roles.

Relationship:

Role ↔ Permission

---

# 5. Workforce Tables

## employees

Purpose:

Stores employee workforce records.

Ownership:

Workforce

Relationship:

Organization → Employees

Contains:

- Employee profile information.
- Employment status.
- Branch association.

---

## employee_history

Purpose:

Stores historical changes to employee information.

Ownership:

Workforce

Contains:

- Previous values.
- Effective dates.
- Change reasons.

---

# 6. Scheduling Tables

## schedules

Purpose:

Stores workforce schedules.

Ownership:

Scheduling

Contains:

- Schedule information.
- Date ranges.
- Publishing status.

---

## schedule_versions

Purpose:

Stores historical versions of schedules.

Ownership:

Scheduling

Purpose:

Allows schedule changes to be tracked.

---

## shifts

Purpose:

Stores individual shift records.

Ownership:

Scheduling

Contains:

- Start time.
- End time.
- Shift status.

---

## shift_assignments

Purpose:

Maps employees to shifts.

Relationship:

Employee ↔ Shift

---

# 7. Attendance Tables

## attendance_records

Purpose:

Stores employee attendance activity.

Ownership:

Attendance

Contains:

- Clock-in information.
- Clock-out information.
- Attendance state.

---

## attendance_corrections

Purpose:

Stores approved attendance adjustments.

Ownership:

Attendance

Contains:

- Original values.
- Corrected values.
- Approval information.

---

# 8. Task Management Tables

## tasks

Purpose:

Stores operational tasks.

Ownership:

Task Management

Contains:

- Task details.
- Status.
- Priority.

---

## task_assignments

Purpose:

Maps tasks to employees.

Relationship:

Employee ↔ Task

---

## task_history

Purpose:

Stores task lifecycle changes.

Contains:

- Status changes.
- Verification events.
- Completion records.

---

# 9. Communication Tables

## announcements

Purpose:

Stores organizational announcements.

Ownership:

Communication

---

## announcement_acknowledgements

Purpose:

Stores employee acknowledgement records.

Relationship:

Announcement ↔ Employee

---

# 10. Notification Tables

## notifications

Purpose:

Stores generated notifications.

Ownership:

Notification

---

## notification_preferences

Purpose:

Stores user notification settings.

---

## notification_delivery_attempts

Purpose:

Tracks notification delivery status.

---

# 11. Audit & Security Tables

## audit_logs

Purpose:

Stores important system activity.

Contains:

- Actor.
- Action.
- Resource.
- Timestamp.

---

## security_events

Purpose:

Stores security-related events.

Examples:

- Login activity.
- Permission changes.
- Session events.

---

# 12. Reporting Tables

Reporting structures may include:

- Database views.
- Materialized views.
- Aggregated reporting tables.

These should not replace operational tables.

---

# 13. Common Table Columns

Most tables should include:

```
id

organization_id (where applicable)

created_at

updated_at

deleted_at (where applicable)
```

Additional columns depend on the business purpose of each table.

---

# 14. Table Ownership Rules

Each table must have:

- One owning domain.
- Defined relationships.
- Defined lifecycle.
- Defined security rules.

Tables should not become shared dumping grounds for unrelated features.

---

# 15. Future Tables

Potential future additions:

- Departments.
- Employee certifications.
- Payroll integrations.
- External integrations.
- Advanced analytics storage.
- AI recommendation history.

Future tables should follow the same ownership principles.

---

# 16. Related Specifications

- DB-003 Schema Overview
- DB-004 Entity Relationships
- DB-006 Constraints
- DB-007 Indexes
- DB-008 Enums
- DB-012 Migrations

---

# 17. Summary

The ShiftOS database consists of domain-owned tables representing organizations, workforce operations, scheduling, attendance, tasks, communication, notifications and security activity.

Each table exists to represent durable business information and follows consistent ownership, relationship and security principles.

The table architecture provides a strong foundation for reliable workforce operations while remaining flexible for future platform expansion.
