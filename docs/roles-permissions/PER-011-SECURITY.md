# ShiftOS Security Permission Matrix

**Document ID:** PER-002-08

**Document Title:** Security Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to security management within ShiftOS.

Security permissions govern access to security logs, authentication events, session management, password administration and other security-sensitive operations.

The security model follows the ShiftOS operational philosophy:

- Managers oversee organization security.
- Supervisors manage day-to-day operations but have limited security privileges.
- Staff have access only to security features related to their own accounts.
- The future Admin role has read-only visibility into operational security while supporting business administration.

---

# 2. Permission Values

| Value | Meaning |
|-------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Security Permission Matrix

| Permission                           | Manager | Supervisor | Staff | Admin *(Future)* |
|--------------------------------------|---------|------------|-------|------------------|
| View Security Dashboard              | Allow   | Deny       | Deny  | Allow            |
| View Security Events                 | Allow   | Deny       | Deny  | Allow            |
| View Security Audit Logs             | Allow   | Deny       | Deny  | Allow            |
| Search Security Logs                 | Allow   | Deny       | Deny  | Allow            |
| Filter Security Logs                 | Allow   | Deny       | Deny  | Allow            |
| View Active Sessions                 | Allow   | Allow      | Allow | Allow            |
| Terminate Own Session                | Allow   | Allow      | Allow | Allow            |
| Terminate All Own Sessions           | Allow   | Allow      | Allow | Allow            |
| Force User Sign Out                  | Allow   | Deny       | Deny  | Deny             |
| View Login History                   | Allow   | Allow      | Allow | Allow            |
| View Failed Login Attempts           | Allow   | Deny       | Deny  | Allow            |
| Lock User Account                    | Allow   | Deny       | Deny  | Deny             |
| Unlock User Account                  | Allow   | Deny       | Deny  | Deny             |
| Require Password Reset               | Allow   | Deny       | Deny  | Deny             |
| Reset Personal Password              | Allow   | Allow      | Allow | Allow            |
| View Organization Security Settings  | Allow   | Deny       | Deny  | Allow            |
| Edit Organization Security Settings  | Allow   | Deny       | Deny  | Deny             |
| Export Security Audit Logs           | Allow   | Deny       | Deny  | Allow            |

---

# 4. Permission Rules

## Security Ownership

Managers are responsible for organization-level security oversight.

Managers may review security events, audit logs and enforce security policies.

---

## Supervisor Responsibilities

Supervisors manage daily operations but do not administer organization security.

Supervisors may access only security information relating to their own accounts.

---

## Staff Responsibilities

Staff may:

- View their own login history.
- Manage their own sessions.
- Reset their own password.

Staff cannot access organization security information.

---

## Future Admin Responsibilities

The future Admin role provides administrative visibility into security information.

Admins may:

- View security dashboards.
- View audit logs.
- Export audit logs.

Admins cannot enforce operational security actions such as locking accounts or forcing sign-outs.

---

# 5. Design Principles

## Least Privilege

Security permissions are limited to the minimum required for each role.

---

## Auditability

All security-sensitive actions should generate permanent audit records.

---

## Separation of Responsibilities

Operational management and security administration remain separate responsibilities.

---

## Organization Protection

Only Managers may perform actions that affect other users' security or organization-wide security settings.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- SEC-001 Authentication
- SEC-002 Password Policy
- SEC-003 Session Management
- SEC-004 Account Status
- SEC-005 Security Architecture

---

# 7. Summary

The Security Permission Matrix defines how security-related actions are managed within ShiftOS.

Managers oversee organization security and enforce security policies.

Supervisors and Staff manage only the security of their own accounts.

The future Admin role provides read-only visibility into security information for business administration.