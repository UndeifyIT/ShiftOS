# ShiftOS Database Enums

**Document ID:** DB-008

**Document Title:** Enum Strategy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the strategy for using PostgreSQL enum types within the ShiftOS database.

Enums provide controlled sets of values for stable system states while maintaining data consistency.

---

# 2. Enum Philosophy

Enums should represent:

- Stable system states.
- Technical classifications.
- Limited controlled values.

Enums should not represent:

- User-configurable data.
- Frequently changing business rules.
- Organization-specific settings.

---

# 3. Enum Principles

ShiftOS enums follow these principles:

- Keep enums small.
- Avoid unnecessary enums.
- Prefer tables for dynamic data.
- Review enum changes carefully.
- Maintain backward compatibility.

---

# 4. Enum Naming

Enums follow DB-002 naming standards.

Format:

```
<domain>_<purpose>_enum
```

Examples:

```
attendance_status_enum

task_priority_enum

notification_channel_enum
```

---

# 5. Attendance Enums

## attendance_status_enum

Purpose:

Represents attendance states.

Values:

```
present

late

absent

on_leave

pending_review

corrected
```

---

# 6. Shift Enums

## shift_status_enum

Purpose:

Represents shift lifecycle.

Values:

```
draft

published

started

completed

cancelled
```

---

# 7. Schedule Enums

## schedule_status_enum

Purpose:

Represents schedule lifecycle.

Values:

```
draft

published

archived
```

---

# 8. Task Enums

## task_status_enum

Purpose:

Represents task progress.

Values:

```
pending

assigned

in_progress

completed

verified

cancelled
```

---

## task_priority_enum

Purpose:

Represents task urgency.

Values:

```
low

medium

high

urgent
```

---

# 9. Notification Enums

## notification_channel_enum

Purpose:

Represents delivery methods.

Values:

```
in_app

push

email

sms
```

---

## notification_priority_enum

Purpose:

Represents notification importance.

Values:

```
low

normal

high

critical
```

---

# 10. Communication Enums

## announcement_status_enum

Purpose:

Represents announcement lifecycle.

Values:

```
draft

published

expired
```

---

# 11. User Account Enums

## account_status_enum

Purpose:

Represents user account state.

Values:

```
active

inactive

suspended

pending
```

---

# 12. Employment Enums

## employment_status_enum

Purpose:

Represents employee lifecycle.

Values:

```
active

inactive

terminated

on_leave
```

---

# 13. Where NOT To Use Enums

The following should usually be tables:

## Employee roles

Reason:

Businesses create custom roles.

---

## Departments

Reason:

Organizations define their own departments.

---

## Branch types

Reason:

Organizations may have different classifications.

---

## Task categories

Reason:

Businesses require customization.

---

# 14. Enum Migration Rules

Enum changes require careful handling.

Before adding values:

- Confirm backwards compatibility.
- Review application impact.
- Update documentation.
- Test migrations.

Removing enum values requires additional migration planning.

---

# 15. Future Expansion

Future versions may introduce:

- Additional workflow states.
- Enterprise-specific classifications.
- More advanced operational states.

New enums should only be created when values are stable across organizations.

---

# 16. Related Specifications

- DB-005 Tables
- DB-006 Constraints
- DB-012 Migrations
- TASK-001 Task Model
- NOTIF-004 Priority Levels

---

# 17. Summary

ShiftOS uses PostgreSQL enums selectively for stable system states while avoiding enums for frequently changing business concepts.

This approach provides strong data consistency without limiting future customization for different organizations and industries.
