# ShiftOS Permission Evaluation

**Document ID:** PER-003

**Document Title:** Permission Evaluation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Authorization

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines how ShiftOS evaluates user permissions before allowing any protected action.

Permission evaluation provides a consistent authorization model across the entire platform, ensuring every feature enforces access control using the same rules.

This document applies to all web, mobile and API requests.

---

# 2. Objectives

The permission evaluation model exists to:

- Ensure consistent authorization across the platform.
- Prevent unauthorized access.
- Enforce least privilege.
- Support approval-based workflows.
- Support future role expansion.
- Maintain predictable permission behavior.
- Simplify backend authorization logic.

---

# 3. Permission Values

| Permission | Meaning |
|------------|---------|
| Allow | The user may perform the action immediately. |
| Request | The user may submit a request for approval before the action is performed. |
| Deny | The action is prohibited. |
| Future | Reserved for future functionality and treated as Deny until implemented. |

---

# 4. Permission Evaluation Order

Every protected action shall be evaluated using the following order.

## Step 1 — Authentication

The user must have a valid authenticated session.

Unauthenticated users are immediately denied.

---

## Step 2 — Organization Isolation

The requested resource must belong to the same organization as the authenticated user.

Cross-organization access is never permitted.

---

## Step 3 — Branch Isolation

Where applicable, the requested resource must belong to a branch the user is authorized to access.

Branch restrictions are evaluated before role permissions.

---

## Step 4 — Account Status

The user's account must be active.

Blocked, suspended, archived or inactive accounts may not perform protected actions.

---

## Step 5 — Role Evaluation

The user's assigned role determines whether the requested permission is:

- Allow
- Request
- Deny
- Future

---

## Step 6 — Business Rules

Some actions require additional validation beyond role permissions.

Examples include:

- Manager approval requirements.
- Resource ownership.
- Shift status.
- Organization settings.
- Operational constraints.

---

## Step 7 — Audit Logging

Every protected action should generate an audit record where required by the relevant specification.

---

# 5. Permission Outcomes

## Allow

The requested action is executed immediately.

---

## Request

The action is not executed immediately.

Instead:

- A request is created.
- The appropriate approver is notified.
- The request remains pending until approved or rejected.

---

## Deny

The action is rejected immediately.

No system changes occur.

---

## Future

Future permissions behave exactly like Deny until the associated functionality is implemented.

---

# 6. Permission Principles

## Principle 1 — Deny by Default

If permission cannot be positively established, access must be denied.

---

## Principle 2 — Server Authority

Permissions must always be enforced by the backend.

Client-side permission checks exist only to improve user experience.

---

## Principle 3 — Least Privilege

Users receive only the permissions necessary for their role.

---

## Principle 4 — Explicit Authorization

Permissions must be granted explicitly.

No permission should be inferred from unrelated capabilities.

---

## Principle 5 — Consistent Evaluation

Every protected action must follow the same evaluation process regardless of platform.

---

## Principle 6 — Auditability

Authorization decisions should be traceable through audit logs where appropriate.

---

# 7. Manager Override Rules

Managers may intervene in operational workflows where permitted by the relevant permission matrix.

Examples include:

- Editing published schedules.
- Approving attendance adjustments.
- Approving employee deactivation.
- Reopening completed operational tasks.

Manager overrides do not bypass organization isolation, branch isolation or security policies.

---

# 8. Request-Based Permissions

Permissions marked as **Request** require approval before execution.

Examples include:

- Supervisor requesting employee promotion.
- Supervisor requesting employee transfer.
- Supervisor requesting employment status changes.

Approval workflows are defined separately in **PER-004 Approval Workflow**.

---

# 9. Future Role Expansion

The permission evaluation model is designed to support additional roles without changing the evaluation process.

Future roles inherit the same evaluation pipeline:

1. Authentication
2. Organization Isolation
3. Branch Isolation
4. Account Status
5. Role Evaluation
6. Business Rules
7. Audit Logging

---

# 10. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- PER-004 Approval Workflow
- PER-005 Temporary Role Escalation
- PER-006 Access Rules
- PER-007 Branch Isolation
- PER-008 Organization Isolation
- SEC-001 Authentication
- SEC-005 Security Architecture

---

# 11. Summary

Permission evaluation defines the authorization process used throughout ShiftOS.

Every protected action follows the same sequence of authentication, organization isolation, branch isolation, account validation, role evaluation, business rule validation and audit logging.

This ensures a secure, predictable and maintainable authorization model across the entire platform.