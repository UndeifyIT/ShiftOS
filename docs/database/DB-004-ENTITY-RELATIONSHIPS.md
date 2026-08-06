# ShiftOS Entity Relationships

**Document ID:** DB-004

**Document Title:** Entity Relationships

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the major entity relationships within the ShiftOS database.

It establishes ownership, cardinality and relationship principles used throughout the database design.

Detailed table structures are documented separately.

---

# 2. Relationship Philosophy

ShiftOS database relationships should:

- Represent real-world business ownership.
- Preserve historical accuracy.
- Maintain tenant isolation.
- Support reporting requirements.
- Avoid unnecessary duplication.

Relationships should reflect how organizations actually operate.

---

# 3. Core Entity Hierarchy

The primary ownership hierarchy is:

```
Platform

↓

Organization

↓

Branch

↓

Workforce Resources

↓

Operational Records
```

---

# 4. Organization Relationships

The Organization is the primary tenant boundary.

An organization:

- Owns branches.
- Owns employees.
- Owns schedules.
- Owns attendance records.
- Owns tasks.
- Owns communications.
- Owns operational history.

Relationship:

```
Organization

1 ──────── Many

Branches
```

---

# 5. Branch Relationships

A branch represents an operational location.

A branch:

- Belongs to one organization.
- Contains employees.
- Contains schedules.
- Contains tasks.
- Generates attendance activity.

Relationship:

```
Branch

1 ──────── Many

Employees
```

---

# 6. Employee Relationships

Employees represent workforce members.

An employee:

- Belongs to one organization.
- Belongs to a branch.
- Can have many shifts.
- Can have many attendance records.
- Can receive tasks.
- Can acknowledge communications.

Relationships:

```
Employee

1 ──────── Many

Attendance Records


Employee

1 ──────── Many

Assigned Shifts


Employee

1 ──────── Many

Tasks
```

---

# 7. Scheduling Relationships

Scheduling connects workforce availability with operational requirements.

Core relationships:

```
Schedule

1 ──────── Many

Shifts


Shift

Many ──────── Many

Employees
```

Employee assignments should be modeled explicitly rather than embedded inside schedules.

---

# 8. Attendance Relationships

Attendance records represent employee work activity.

Relationship:

```
Employee

1 ──────── Many

Attendance Records
```

Attendance records should preserve historical information.

Changes to employee information should not rewrite historical attendance data.

---

# 9. Task Management Relationships

Tasks represent operational work.

Relationships:

```
Branch

1 ──────── Many

Tasks


Employee

1 ──────── Many

Task Assignments
```

Tasks may exist independently from a specific employee until assigned.

---

# 10. Communication Relationships

Communication records represent organizational messaging.

Relationships:

```
Organization

1 ──────── Many

Announcements


Announcement

1 ──────── Many

Acknowledgements
```

Visibility rules determine which employees can access communication records.

---

# 11. Notification Relationships

Notifications represent system-generated communication.

Relationships:

```
User

1 ──────── Many

Notifications


Notification

1 ──────── Many

Delivery Attempts
```

Notifications should reference business events where appropriate.

---

# 12. Audit Relationships

Audit records track important system activity.

Relationships:

```
User

1 ──────── Many

Audit Logs


Organization

1 ──────── Many

Audit Logs
```

Audit records should preserve historical context even if related entities change later.

---

# 13. Relationship Rules

The following rules apply:

- Tenant-owned records must have organization ownership.
- Foreign keys should enforce valid relationships.
- Required relationships should not allow orphan records.
- Historical records should preserve previous states.
- Cascading deletes should be used carefully.

---

# 14. Deletion Strategy

Default behavior:

- Avoid physical deletion of operational records.
- Prefer archival or soft deletion where appropriate.
- Preserve historical records required for reporting and compliance.

Cascade deletion should only occur where data loss is acceptable.

---

# 15. Future Relationship Extensions

Future versions may support:

- Multiple branch assignments.
- Employee transfers.
- Department structures.
- Role history.
- Cross-organization partnerships.

Future additions should preserve existing ownership principles.

---

# 16. Related Specifications

- DB-003 Schema Overview
- DB-005 Tables
- DB-006 Constraints
- DB-007 Indexes
- ARCH-002 Multi-Tenant Architecture

---

# 17. Summary

ShiftOS entity relationships are designed around real operational ownership and historical accuracy.

By establishing clear organization, branch, employee and operational relationships while protecting tenant boundaries and preserving historical data, the database provides a reliable foundation for scheduling, attendance, task management and workforce operations.
