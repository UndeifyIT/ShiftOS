# ShiftOS Database Triggers

**Document ID:** DB-009

**Document Title:** Trigger Strategy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Database

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the strategy for using PostgreSQL triggers within ShiftOS.

Triggers provide automated database-level behavior for consistency, auditing and technical operations.

---

# 2. Trigger Philosophy

Triggers should be used when the database must automatically enforce a rule regardless of how data is modified.

Triggers should not replace application workflows.

The preferred separation is:

```
Application Layer

↓

Business Workflows


Database Layer

↓

Integrity & Automation
```

---

# 3. Trigger Principles

ShiftOS triggers follow these principles:

- Keep triggers simple.
- Avoid hidden business logic.
- Document every trigger.
- Test trigger behavior.
- Review performance impact.

---

# 4. Timestamp Triggers

Most tables should automatically maintain:

```
updated_at
```

Example:

When a record changes:

```
updated_at = current_timestamp
```

Purpose:

- Maintain accurate modification history.
- Avoid repeated application code.

---

# 5. Audit Triggers

Certain sensitive tables may require automatic audit creation.

Examples:

- Employee records.
- Permission changes.
- Security settings.
- Organization configuration.

Audit triggers should capture:

- Action type.
- Changed record.
- Actor context where available.
- Timestamp.

---

# 6. Soft Delete Triggers

Where soft deletion is used, triggers may support:

- Setting deletion timestamps.
- Maintaining related metadata.

Example:

```
deleted_at = current_timestamp
```

Soft delete behavior should remain predictable.

---

# 7. Data Validation Triggers

Triggers may enforce complex database-level rules that cannot be handled easily through constraints.

Examples:

- Advanced temporal validation.
- Complex consistency checks.

Simple validation should use:

- NOT NULL.
- CHECK constraints.
- Foreign keys.

---

# 8. Tenant Protection Triggers

Where necessary, triggers may assist with tenant integrity.

Examples:

Preventing:

- Cross-organization relationships.
- Invalid ownership changes.

However, primary tenant protection remains:

- Row-Level Security.
- Foreign keys.
- Application authorization.

---

# 9. Audit Event Generation

Database-generated audit events should be used for:

- Security-sensitive changes.
- Compliance requirements.
- Critical operational actions.

Not every database update requires an audit event.

---

# 10. Triggers NOT Recommended For

Triggers should not contain:

- Shift assignment logic.
- Task workflow automation.
- Notification business rules.
- Approval workflows.
- Complex operational decisions.

These belong in application services.

---

# 11. Trigger Naming

Trigger names follow DB-002 standards.

Format:

```
trg_<table>_<purpose>
```

Examples:

```
trg_employees_updated_at

trg_audit_logs_insert

trg_permissions_audit
```

---

# 12. Trigger Testing

Triggers must be tested for:

- Expected execution.
- Failure handling.
- Performance impact.
- Migration compatibility.

Testing should include both normal and edge cases.

---

# 13. Performance Considerations

Triggers execute automatically and may affect write performance.

Review:

- Execution frequency.
- Query complexity.
- Locking behavior.
- Impact on large tables.

Heavy processing should move to background jobs.

---

# 14. Future Enhancements

Future versions may introduce:

- Advanced audit automation.
- Database event publishing.
- Temporal data management.
- Automated compliance tracking.

---

# 15. Related Specifications

- DB-006 Constraints
- DB-010 Views
- DB-012 Migrations
- SEC-006 Audit Logging
- ARCH-004 Event-Driven Architecture

---

# 16. Summary

ShiftOS uses database triggers selectively for consistency, timestamps, auditing and technical automation.

By avoiding hidden business workflows inside triggers, the platform maintains clear separation between application logic and database responsibilities while preserving reliability and data integrity.
