# ShiftOS Personnel Permission Matrix

**Document ID:** PER-002-10

**Document Title:** Personnel Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to personnel management within ShiftOS.

Personnel management governs employee records, employment information and employment lifecycle actions.

The personnel management model follows the ShiftOS operational philosophy:

- Managers oversee personnel across the organization.
- Supervisors manage employee records for operational purposes.
- Staff may only view limited information relating to their own employment.
- The future Admin role provides read-only visibility for business administration.

---

# 2. Permission Values

| Value | Meaning |
|-------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Personnel Permission Matrix

| Permission                          | Manager | Supervisor | Staff              | Admin *(Future)* |
|-------------------------------------|---------|------------|--------------------|------------------|
| View Employee Directory             | Allow   | Allow      | Deny               | Allow            |
| View Employee Profile               | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| Search Employees                    | Allow   | Allow      | Deny               | Allow            |
| Filter Employees                    | Allow   | Allow      | Deny               | Allow            |
| View Employment Information         | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| Edit Employee Information           | Allow   | Allow      | Deny               | Deny             |
| View Employment Status              | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| Update Employment Status            | Allow   | Request    | Deny               | Deny             |
| View Hire Date                      | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| View Employee ID                    | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| View Assigned Branch                | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| View Assigned Department            | Allow   | Allow      | Allow *(Own Only)* | Allow            |
| Assign Employee to Branch           | Allow   | Deny       | Deny               | Deny             |
| Assign Employee to Department       | Allow   | Allow      | Deny               | Deny             |
| Transfer Employee Between Branches  | Allow   | Request    | Deny               | Deny             |
| View Personnel History              | Allow   | Allow      | Deny               | Allow            |
| View Personnel Audit Log            | Allow   | Deny       | Deny               | Allow            |
| Export Personnel Report             | Allow   | Allow      | Deny               | Allow            |

---

# 4. Permission Rules

## Personnel Ownership

Managers oversee personnel administration across the organization.

Supervisors maintain employee records required for daily operations.

---

## Personnel Updates

Supervisors may edit operational employee information.

Changes affecting employment status or branch assignment require Manager approval.

---

## Staff Access

Staff members may only view information relating to their own employment.

Staff cannot modify employment records.

---

## Future Admin Responsibilities

The future Admin role may:

- View personnel records.
- View personnel reports.
- Export personnel reports.
- View audit logs.

Admins cannot modify employee information or employment records.

---

# 5. Design Principles

## Separation of Responsibilities

Personnel management remains separate from scheduling, attendance and task management.

---

## Operational Simplicity

Supervisors manage day-to-day personnel information while Managers retain authority over structural employment decisions.

---

## Least Privilege

Personnel permissions are limited to the minimum required for each role.

---

## Auditability

All personnel changes should generate permanent audit records.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- WF-001 Workforce Model
- USR-009 Profile Management
- USR-010 Account Status

---

# 7. Summary

The Personnel Permission Matrix defines how employee records and employment information are managed within ShiftOS.

Managers oversee personnel administration.

Supervisors maintain employee records for operational purposes.

Staff may only view their own employment information.

The future Admin role provides read-only visibility into personnel records without operational control.