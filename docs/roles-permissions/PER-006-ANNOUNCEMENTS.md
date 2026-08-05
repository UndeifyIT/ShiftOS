# ShiftOS Announcement Permission Matrix

**Document ID:** PER-002-05

**Document Title:** Announcement Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to announcements within ShiftOS.

Announcements are used to communicate important information across the organization, branches and departments.

The announcement model follows the ShiftOS operational philosophy:

- Supervisors publish operational announcements.
- Managers oversee communication and may intervene when necessary.
- Staff consume announcements outside active working hours.
- Admins have read-only visibility for business administration.

---

# 2. Permission Values

| Value | Meaning |
|:------|:--------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Announcement Permission Matrix

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|--------------------------------------|:-------:|:----------:|:-----:|:----------------:|
| View Announcement Feed               | Allow   | Allow      | Allow | Allow            |
| View Announcement Details            | Allow   | Allow      | Allow | Allow            |
| Search Announcements                 | Allow   | Allow      | Allow | Allow            |
| Filter Announcements                 | Allow   | Allow      | Allow | Allow            |
| View Announcement History            | Allow   | Allow      | Allow | Allow            |
| Create Announcement                  | Deny    | Allow      | Deny  | Deny             |
| Edit Draft Announcement              | Deny    | Allow      | Deny  | Deny             |
| Delete Draft Announcement            | Deny    | Allow      | Deny  | Deny             |
| Publish Announcement                 | Allow   | Allow      | Deny  | Deny             |
| Edit Published Announcement          | Allow   | Deny       | Deny  | Deny             |
| Archive Announcement                 | Allow   | Allow      | Deny  | Deny             |
| Pin Announcement                     | Allow   | Allow      | Deny  | Deny             |
| Unpin Announcement                   | Allow   | Allow      | Deny  | Deny             |
| Attach Images                        | Allow   | Allow      | Deny  | Deny             |
| Attach Documents                     | Allow   | Allow      | Deny  | Deny             |
| Schedule Announcement                | Deny    | Allow      | Deny  | Deny             |
| Target Organization                  | Allow   | Deny       | Deny  | Deny             |
| Target Branch                        | Allow   | Allow      | Deny  | Deny             |
| Target Department                    | Deny    | Allow      | Deny  | Deny             |
| View Announcement Analytics          | Allow   | Allow      | Deny  | Allow            |
| Export Announcement Report           | Allow   | Allow      | Deny  | Allow            |

---

# 4. Permission Rules

## Announcement Ownership

Supervisors are responsible for creating and managing operational announcements for their branches.

Managers oversee communication and may intervene by editing or publishing announcements where necessary.

---

## Announcement Visibility

Announcements are visible according to their target audience:

- Entire organization
- Branch
- Department

Staff members only see announcements relevant to them.

---

## Operational Communication

Announcements are intended primarily for communication before shifts, after shifts or on employees' days off.

During active shifts, Supervisors communicate operational instructions verbally.

---

## Published Announcements

Once an announcement has been published:

- Supervisors may archive or pin announcements.
- Managers may edit published announcements if operationally required.

---

## Read-Only Administration

The future Admin role may view announcements and reporting information but cannot create or manage operational communications.

---

# 5. Design Principles

## Operational Ownership

Supervisors own day-to-day communication within their branches.

---

## Management Oversight

Managers oversee organizational communication and intervene only when necessary.

---

## Read-Only Administration

The Admin role provides business oversight without participating in operational communication.

---

## Auditability

Publishing, editing, archiving and pinning announcements should generate audit records.

---

## Least Privilege

Announcement permissions are limited to the minimum required for each operational role.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- ANN-001 Announcement Model
- ANN-002 Announcement Targeting

---

# 7. Summary

The Announcement Permission Matrix defines how communication is managed within ShiftOS.

Supervisors manage operational announcements.

Managers oversee communication and intervene when required.

Staff consume announcements outside active working hours.

The future Admin role provides read-only visibility into organizational communications.