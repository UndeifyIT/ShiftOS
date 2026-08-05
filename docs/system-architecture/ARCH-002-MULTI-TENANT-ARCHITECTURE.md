# ShiftOS Multi-Tenant Architecture

**Document ID:** ARCH-002

**Document Title:** Multi-Tenant Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** System Architecture

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the multi-tenant architecture used throughout ShiftOS.

The architecture enables multiple organizations to securely share the same application infrastructure while maintaining complete logical isolation of their data, operations and users.

---

# 2. Multi-Tenant Philosophy

ShiftOS is a shared-platform, multi-tenant SaaS application.

Organizations share infrastructure but never share operational data.

Every tenant-owned resource belongs to exactly one organization.

Tenant isolation is a fundamental architectural principle rather than an application feature.

---

# 3. Architectural Model

ShiftOS uses a **shared application, shared database** architecture with logical tenant isolation.

Isolation is enforced through:

- Authentication.
- Authorization.
- Row-Level Security (RLS).
- Tenant-aware APIs.
- Realtime filtering.
- Background job context.
- Storage access controls.

Physical database separation is not required for standard organizations.

---

# 4. Tenant Hierarchy

The ownership hierarchy is:

```
Platform

↓

Organization (Tenant)

↓

Branch

↓

Operational Resources
```

Operational resources include:

- Employees.
- Schedules.
- Shifts.
- Attendance.
- Tasks.
- Announcements.
- Notifications.
- Audit records.

Every operational resource ultimately belongs to one organization.

---

# 5. Tenant Context

Every authenticated request should include an established tenant context.

Tenant context is determined from:

- The authenticated user.
- Organization membership.
- Active organization selection where applicable.

Tenant context should never rely on user-supplied organization identifiers alone.

---

# 6. Resource Ownership

Every tenant-owned record should include a permanent organization identifier.

Tenant ownership:

- Is established when the record is created.
- Is validated during every protected operation.
- Remains immutable during normal operations.

Changing ownership requires a controlled migration process.

---

# 7. Tenant Isolation Layers

Isolation is enforced independently at multiple layers:

### Application Layer

- Authorization.
- Business rules.
- Tenant-aware services.

---

### Database Layer

- Row-Level Security.
- Foreign keys.
- Constraints.

---

### Realtime Layer

- Event filtering.
- Presence visibility.
- Notification delivery.

---

### Storage Layer

- File access authorization.
- Tenant-specific storage organization.

No individual layer should be solely responsible for tenant isolation.

---

# 8. Shared Platform Services

The following services are shared across all organizations:

- Authentication infrastructure.
- Realtime infrastructure.
- Notification infrastructure.
- Background workers.
- Monitoring.
- Logging.
- Deployment infrastructure.

Shared services must preserve strict tenant boundaries.

---

# 9. Background Processing

Background jobs execute within the context of a single organization.

Every background task should:

- Resolve its tenant context.
- Process only authorized tenant resources.
- Produce tenant-aware logs and audit records.

Cross-tenant processing is prohibited unless explicitly required for platform administration.

---

# 10. Data Lifecycle

Throughout its lifecycle, tenant-owned data should remain associated with the same organization.

Lifecycle stages include:

- Creation.
- Modification.
- Retrieval.
- Archival.
- Backup.
- Restoration.
- Deletion.

Tenant ownership must be preserved at every stage.

---

# 11. Performance Considerations

The architecture should scale efficiently as tenant counts grow.

Design considerations include:

- Indexed tenant identifiers.
- Tenant-aware queries.
- Efficient RLS policies.
- Incremental synchronization.
- Partitioning strategies where appropriate.

Scalability must not weaken tenant isolation.

---

# 12. Failure Isolation

Operational failures affecting one organization should not affect other organizations wherever possible.

Examples include:

- Failed background jobs.
- Invalid data imports.
- Notification failures.
- Realtime synchronization issues.

Failures should remain isolated to the affected tenant whenever practical.

---

# 13. Future Enhancements

Future versions may support:

- Enterprise parent-child organizations.
- Controlled tenant migration.
- Dedicated infrastructure for premium tenants.
- Regional data residency.
- Multi-region deployments.

Future enhancements must preserve the existing tenant isolation model.

---

# 14. Related Specifications

- ARCH-001 System Overview
- SEC-003 Authorization
- SEC-004 Row-Level Security (RLS)
- SEC-005 Tenant Isolation
- RT-001 Event Architecture
- SEC-012 Backup & Recovery

---

# 15. Summary

ShiftOS uses a shared application, shared database multi-tenant architecture with strict logical isolation.

By assigning every operational resource to a single organization and enforcing tenant context across application services, databases, realtime infrastructure, storage and background processing, the platform delivers secure, scalable and maintainable multi-tenant operations suitable for enterprise SaaS environments.
