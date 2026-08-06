# ShiftOS Schema Overview

**Document ID:** DB-003

**Document Title:** Schema Overview

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document provides a high-level overview of the ShiftOS database schema.

It defines how the database is organized into logical domains and establishes the ownership boundaries for each domain without specifying individual table structures.

Detailed table definitions are documented separately.

---

# 2. Schema Philosophy

The ShiftOS database uses a single primary application schema.

Business domains are organized logically through table ownership, naming conventions and application architecture rather than multiple database schemas.

This approach simplifies development, security, migrations and long-term maintenance.

---

# 3. Database Schema Strategy

For Version 1, ShiftOS adopts:

- A single application schema (`public`).
- Logical domain separation.
- Strong Row-Level Security.
- Modular application code.
- Consistent naming conventions.

Additional database schemas may be introduced in the future only when justified by operational requirements.

---

# 4. Logical Domains

The database is organized into the following logical domains:

### Platform

Platform-wide configuration and shared resources.

Examples include:

- Organizations.
- Branches.
- Membership.
- System configuration.

---

### Identity & Access

Authentication and authorization-related resources.

Examples include:

- Users.
- Sessions.
- Permissions.
- Roles.
- Access policies.

---

### Workforce

Employee-related operational data.

Examples include:

- Employees.
- Employment records.
- Departments.
- Positions.

---

### Scheduling

Scheduling and workforce planning.

Examples include:

- Schedules.
- Shifts.
- Assignments.
- Schedule versions.

---

### Attendance

Attendance tracking.

Examples include:

- Attendance records.
- Corrections.
- Validation records.

---

### Task Management

Operational task execution.

Examples include:

- Tasks.
- Task assignments.
- Task verification.
- Task history.

---

### Communications

Internal communications.

Examples include:

- Announcements.
- Notice boards.
- Acknowledgements.

---

### Notifications

Notification management.

Examples include:

- Notifications.
- Delivery attempts.
- User preferences.

---

### Audit & Security

Operational security and auditing.

Examples include:

- Audit logs.
- Security events.
- Login history.

---

### Reporting

Reporting and analytical data structures.

Examples include:

- Reporting views.
- Materialized views.
- Aggregated statistics.

---

# 5. Domain Ownership

Each table belongs to exactly one logical domain.

Every domain owns:

- Its business data.
- Its relationships.
- Its constraints.
- Its validation rules.
- Its lifecycle.

Cross-domain relationships should occur through clearly defined foreign keys.

---

# 6. Shared Infrastructure

Certain resources support the entire platform.

Examples include:

- Audit logging.
- Realtime support.
- Notification infrastructure.
- Background processing metadata.

Shared infrastructure should remain independent of business-specific domains.

---

# 7. Tenant Awareness

Every tenant-owned table should include:

- Organization ownership.
- Appropriate foreign keys.
- Row-Level Security.
- Tenant-aware indexing.

Tenant ownership must remain consistent across all domains.

---

# 8. Schema Evolution

The database schema should evolve through:

- Version-controlled migrations.
- Incremental additions.
- Backward-compatible changes where practical.
- Documented architectural decisions.

Schema evolution should preserve data integrity and minimize operational disruption.

---

# 9. Future Enhancements

Future versions may introduce:

- Dedicated reporting schemas.
- Archive schemas.
- Integration schemas.
- Regional data partitioning.
- Enterprise-specific extensions.

Future expansion should preserve the logical ownership model.

---

# 10. Related Specifications

- DB-001 Database Philosophy
- DB-002 Naming Standards
- DB-004 Entity Relationships
- DB-005 Tables
- DB-012 Migrations
- ARCH-002 Multi-Tenant Architecture

---

# 11. Summary

The ShiftOS database is organized as a single application schema with clearly defined logical business domains.

By separating ownership through domain boundaries rather than multiple database schemas, the platform remains easier to develop, secure and maintain while preserving flexibility for future architectural evolution.
