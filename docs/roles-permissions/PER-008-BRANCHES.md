# ShiftOS Branch Permission Matrix

**Document ID:** PER-002-02

**Document Title:** Branch Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to branch management within ShiftOS.

Branches represent the operational locations of an organization. This permission matrix governs who may view, create, configure and manage branch information.

The branch management model follows the ShiftOS operational philosophy:

- Managers administer branch configuration.
- Supervisors operate within their assigned branches.
- Staff do not manage branch information.
- Future Admins have read-only visibility for administrative purposes.

---

# 2. Permission Values

| Value | Meaning |
|-------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Branch Permission Matrix
| Permission                   | Manager | Supervisor | Staff | Admin *(Future)* |
|-----------------------------|---------|------------|-------|------------------|
| View Branch List            | Allow   | Allow      | Deny  | Allow            |
| View Branch Details         | Allow   | Allow      | Deny  | Allow            |
| Search Branches             | Allow   | Allow      | Deny  | Allow            |
| Filter Branches             | Allow   | Allow      | Deny  | Allow            |
| Create Branch               | Allow   | Deny       | Deny  | Deny             |
| Edit Branch Information     | Allow   | Deny       | Deny  | Deny             |
| Archive Branch              | Allow   | Deny       | Deny  | Deny             |
| Restore Branch              | Allow   | Deny       | Deny  | Deny             |
| Assign Supervisor to Branch | Allow   | Deny       | Deny  | Deny             |
| Reassign Supervisor         | Allow   | Deny       | Deny  | Deny             |
| View Branch Settings        | Allow   | Allow      | Deny  | Allow            |
| Edit Branch Settings        | Allow   | Deny       | Deny  | Deny             |
| View Branch Operating Hours | Allow   | Allow      | Deny  | Allow            |
| Edit Branch Operating Hours | Allow   | Deny       | Deny  | Deny             |
| View Branch Workforce       | Allow   | Allow      | Deny  | Allow            |
| View Branch Reports         | Allow   | Allow      | Deny  | Allow            |
| Export Branch Reports       | Allow   | Allow      | Deny  | Allow            |
| View Branch Audit Logs      | Allow   | Deny       | Deny  | Allow            |

---

# 4. Permission Rules

## Branch Ownership

Managers are responsible for the creation, configuration and lifecycle management of branches.

Managers may create, edit, archive and restore branches.

---

## Supervisor Responsibilities

Supervisors are assigned to operate a branch.

Supervisors may view branch information and operational settings but cannot modify the branch structure or configuration.

---

## Staff Access

Staff members have no access to branch management functionality.

---

## Future Admin Responsibilities

The future Admin role provides administrative oversight.

Admins may:

- View branch information.
- View branch settings.
- View reports.
- Export reports.
- View audit logs.

Admins cannot modify branch configuration or operational settings.

---

# 5. Design Principles

## Operational Ownership

Branches are operational entities managed by Managers and operated by Supervisors.

---

## Separation of Responsibilities

Business administration and operational management remain separate responsibilities.

---

## Least Privilege

Each role receives only the permissions required for its responsibilities.

---

## Auditability

All branch configuration changes should generate permanent audit records.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- ORG-004 Branch Structure
- ORG-006 Business Settings
- ORG-007 Organization Lifecycle

---

# 7. Summary

The Branch Permission Matrix defines how branch management is controlled within ShiftOS.

Managers administer branch configuration and lifecycle.

Supervisors operate within their assigned branches without modifying branch configuration.

Staff have no branch management permissions.

The future Admin role provides read-only administrative visibility without operational control.