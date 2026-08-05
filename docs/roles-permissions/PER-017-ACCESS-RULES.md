# ShiftOS Access Rules

**Document ID:** PER-006

**Document Title:** Access Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Authorization

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the universal access rules that apply throughout ShiftOS.

These rules govern how authorization is enforced across every feature, API, page and protected resource.

All permission matrices and security specifications build upon these rules.

---

# 2. Objectives

The access rules exist to:

- Protect organization data.
- Ensure consistent authorization.
- Enforce least privilege.
- Prevent unauthorized operations.
- Support secure multi-tenant architecture.
- Maintain predictable system behavior.

---

# 3. Universal Access Rules

## Rule 1 — Authentication Required

Protected resources require an authenticated user.

Unauthenticated users may only access publicly available pages such as:

- Sign In
- Forgot Password
- Reset Password
- Email Verification

All other resources require authentication.

---

## Rule 2 — Authorization Required

Authentication alone never grants access.

Every protected action must pass authorization checks before execution.

---

## Rule 3 — Deny by Default

Access is denied unless explicitly permitted.

Unknown permissions are treated as denied.

---

## Rule 4 — Least Privilege

Users receive only the permissions required for their responsibilities.

Permissions should never exceed operational requirements.

---

## Rule 5 — Server-Side Enforcement

Authorization decisions must always be enforced by the backend.

Client-side permission checks exist only to improve the user experience.

---

## Rule 6 — Role-Based Access

Permissions are determined by the user's assigned role.

Current roles:

- Manager
- Supervisor
- Staff

Future role:

- Admin

---

## Rule 7 — Organization Isolation

Users may access only data belonging to their organization.

Cross-organization access is prohibited.

Organization isolation is defined in **PER-008**.

---

## Rule 8 — Branch Isolation

Where applicable, users may access only resources belonging to authorized branches.

Branch isolation is defined in **PER-007**.

---

## Rule 9 — Active Account Required

Only active user accounts may access protected resources.

Inactive, suspended, archived or blocked accounts are denied access.

---

## Rule 10 — Audit Logging

Security-sensitive actions should generate audit records.

Examples include:

- Login
- Logout
- Permission approvals
- User invitations
- Employee deactivation
- Billing changes
- Security changes

---

## Rule 11 — Read Access Does Not Imply Write Access

Viewing information does not automatically grant permission to modify it.

Read and write permissions are evaluated independently.

---

## Rule 12 — Operational Permissions Do Not Grant Administrative Permissions

Operational responsibilities do not automatically include administrative authority.

For example:

- Supervisors managing attendance cannot modify organization settings.
- Scheduling permissions do not grant billing access.
- Workforce permissions do not grant security permissions.

---

## Rule 13 — Approval-Based Permissions

Permissions marked as **Request** require approval before execution.

Approval behavior is defined in **PER-004 Approval Workflow**.

---

## Rule 14 — Temporary Operational Authority

Temporary Operational Takeover grants additional operational permissions without changing a user's permanent role.

Temporary Operational Takeover is defined in **PER-005**.

---

# 4. Permission Sources

Access decisions are based on:

- Authentication status
- Account status
- Assigned role
- Organization membership
- Branch authorization
- Permission matrix
- Business rules
- Approval requirements

No single factor alone grants access.

---

# 5. Security Principles

## Explicit Authorization

Permissions must be granted explicitly.

No permission should be assumed or inferred.

---

## Consistency

Every feature must follow the same authorization rules.

---

## Predictability

Users with identical permissions should receive identical authorization outcomes.

---

## Separation of Responsibilities

Operational, administrative and security responsibilities remain separate.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- PER-003 Permission Evaluation
- PER-004 Approval Workflow
- PER-005 Temporary Operational Takeover
- PER-007 Branch Isolation
- PER-008 Organization Isolation
- SEC-005 Security Architecture

---

# 7. Summary

The Access Rules define the universal authorization principles used throughout ShiftOS.

Every protected action requires authentication, authorization and compliance with organization, branch and role-based restrictions.

These rules ensure consistent, secure and predictable access control across the platform.