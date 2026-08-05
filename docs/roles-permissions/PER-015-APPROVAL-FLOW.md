# ShiftOS Approval Workflow

**Document ID:** PER-004

**Document Title:** Approval Workflow

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Authorization

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the approval workflow used throughout ShiftOS.

Approval workflows allow actions that require higher authorization to be reviewed before execution.

Rather than immediately performing an action, the system creates an approval request that must be reviewed by an authorized approver.

---

# 2. Objectives

The approval workflow exists to:

- Protect sensitive operations.
- Prevent unauthorized changes.
- Support delegated operational management.
- Maintain accountability.
- Provide a complete audit trail.
- Standardize approval behavior across the platform.

---

# 3. Approval Process

Every approval request follows the same lifecycle.

```
User Action
      │
      ▼
Permission Check
      │
      ▼
Permission = Request
      │
      ▼
Create Approval Request
      │
      ▼
Notify Approver
      │
      ▼
Approver Reviews Request
      │
 ┌────┴────┐
 │         │
 ▼         ▼
Approve   Reject
 │         │
 ▼         ▼
Execute   Close Request
Action
```

---

# 4. Approval Statuses

| Status | Description |
|---------|-------------|
| Pending | Awaiting review by an approver. |
| Approved | Request approved and action executed. |
| Rejected | Request denied. |
| Cancelled | Request withdrawn before review. |
| Expired | Request expired before a decision was made. |

---

# 5. Approval Rules

## Rule 1 — Request Required

Only permissions marked as **Request** create approval requests.

Permissions marked **Allow** execute immediately.

Permissions marked **Deny** are rejected immediately.

---

## Rule 2 — Single Decision

Each approval request may receive only one final decision.

Once approved or rejected, the request is closed.

---

## Rule 3 — Authorized Approver

Only users with the required approval permission may approve or reject a request.

---

## Rule 4 — Immutable History

Approval records must never be modified after completion.

Any future changes require a new approval request.

---

## Rule 5 — Audit Logging

Every stage of the approval workflow should generate audit records.

This includes:

- Request creation
- Approval
- Rejection
- Cancellation
- Expiration

---

# 6. Approval Information

Every approval request should record:

- Request ID
- Request type
- Requested action
- Requesting user
- Approving user
- Organization
- Branch (if applicable)
- Date created
- Date completed
- Current status
- Optional reason
- Audit references

---

# 7. Notification Rules

When a request is created:

- The designated approver should be notified.

When a request is approved:

- The requester should be notified.

When a request is rejected:

- The requester should be notified.

---

# 8. Approval Execution

An approved request immediately executes the requested action.

Rejected, cancelled and expired requests do not modify system data.

---

# 9. Future Expansion

The approval framework is designed to support additional approval-based features without architectural changes.

Future approval types may include:

- Employee transfers
- Leave requests
- Role changes
- Schedule exceptions
- Organization settings
- Billing changes

---

# 10. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- PER-003 Permission Evaluation
- PER-006 Access Rules
- SEC-005 Security Architecture

---

# 11. Summary

The Approval Workflow standardizes how ShiftOS handles actions requiring higher authorization.

Request-based permissions create approval requests rather than immediately executing actions.

Each request follows a consistent lifecycle, generates a complete audit trail and ensures sensitive operations remain accountable and secure.