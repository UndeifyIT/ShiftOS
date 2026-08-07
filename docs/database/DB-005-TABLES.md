# ShiftOS Database Tables

**Document ID:** DB-005

**Document Title:** Database Tables

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-06

---

# 1. Purpose

This document defines the 27 authoritative database tables used within the ShiftOS platform.

---

# 2. Table Design Principles

ShiftOS tables follow these principles:
- Normalized relational model.
- Enterprise-grade tenant isolation with Row-Level Security.
- Composite foreign keys for referential integrity.
- Automated system auditing.

---

# 3. Core Table Definitions (Inventory of All 27 Tables)

## 1. organizations
Stores tenant organizations using the ShiftOS platform.

## 2. branches
Stores physical operating locations belonging to organizations.

## 3. users
Stores authenticated system users.

## 4. organization_memberships
Junction table linking users to organizations and assigning roles.

## 5. roles
Stores organization-specific security roles.

## 6. permissions
Stores system-wide access permissions.

## 7. role_permissions
Junction table mapping permissions to roles.

## 8. employees
Stores employee workforce records.

## 9. employee_history
Tracks historical changes to employee records for audit compliance.

## 10. shift_templates
Reusable branch-scoped shift templates used by scheduling.

## 11. schedules
Weekly scheduling boundaries holding planned shifts.

## 12. schedule_versions
Stores historical snapshotted versions of published schedules.

## 13. shifts
Scheduled work shifts scoped to branches.

## 14. shift_assignments
Maps scheduled shifts to employees.

## 15. attendance_records
Tracks actual clock punches, break times, and worked durations.

## 16. attendance_corrections
Approved administrative manual adjustments to employee clock punches.

## 17. leave_requests
Employee leave submissions, balance tracking, and approvals.

## 18. tasks
Operational tasks assigned by managers.

## 19. task_assignments
Maps operational tasks to employees.

## 20. task_history
Lifecycle logs of task state progressions.

## 21. announcements
Tenant-wide or branch-scoped messaging.

## 22. announcement_acknowledgements
Tracks employee read acknowledgments for announcements.

## 23. notifications
Generated user notification records.

## 24. notification_preferences
User delivery configurations (push, email, SMS).

## 25. notification_delivery_attempts
Audit logs of notification retries and outcomes.

## 26. audit_logs
Platform security and administrative change tracking logs.

## 27. security_events
Tracks authentication logins, security overrides, and role changes.

---

# 4. Related Specifications
- DB-001 Database Philosophy
- DB-003 Schema Overview
- DB-012 Migrations
- SEC-004 Row-Level Security
