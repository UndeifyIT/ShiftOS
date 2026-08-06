# ShiftOS Invitation Lifecycle State Machine

**Document ID:** SM-003

**Document Title:** Invitation Lifecycle State Machine

**Version:** 1.0.0

**Status:** Approved

**Classification:** State Machine Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the lifecycle of invitations within ShiftOS.

Invitations allow authorized users to securely invite managers, supervisors and employees into an organization.

The state machine ensures invitations progress through predictable, auditable states.

---

# 2. Objectives

The invitation lifecycle ensures:

- Secure onboarding.
- Controlled account creation.
- Prevention of duplicate invitations.
- Complete auditability.
- Consistent invitation behavior.

---

# 3. Scope

Applies to:

- Manager invitations.
- Supervisor invitations.
- Employee invitations.

---

# 4. Invitation States

```
DRAFT

↓

PENDING

↓

DELIVERED

↓

ACCEPTED

↓

COMPLETED
```

Terminal states:

```
EXPIRED

CANCELLED

FAILED
```

---

# 5. State Definitions

## DRAFT

Purpose:

Invitation has been created but not sent.

Activities:

- Validate recipient information.
- Assign intended role.
- Assign organization and branch (where applicable).

Allowed transitions:

→ PENDING

→ CANCELLED

---

## PENDING

Purpose:

Invitation is queued for delivery.

Activities:

- Generate secure invitation token.
- Prepare notification.

Allowed transitions:

→ DELIVERED

→ FAILED

→ CANCELLED

---

## DELIVERED

Purpose:

Invitation has been successfully sent.

Activities:

- Await recipient action.
- Monitor expiry period.

Allowed transitions:

→ ACCEPTED

→ EXPIRED

→ CANCELLED

---

## ACCEPTED

Purpose:

Recipient has validated the invitation.

Activities:

- Verify invitation token.
- Collect required onboarding information.
- Begin account creation.

Allowed transitions:

→ COMPLETED

---

## COMPLETED

Purpose:

Invitation process finished successfully.

Activities:

- User account created or linked.
- Invitation permanently closed.

This is a terminal state.

---

## EXPIRED

Purpose:

Invitation expired before acceptance.

Activities:

- Prevent further use.
- Allow creation of a new invitation.

Terminal state.

---

## CANCELLED

Purpose:

Invitation withdrawn by an authorized user.

Activities:

- Immediately invalidate invitation token.

Terminal state.

---

## FAILED

Purpose:

Invitation delivery failed.

Examples:

- Email delivery failure.
- Invalid destination.
- Messaging provider failure.

Allowed transitions:

→ PENDING

→ CANCELLED

---

# 6. State Transition Diagram

```
DRAFT
  │
  ▼
PENDING
  │
  ▼
DELIVERED
  │
  ▼
ACCEPTED
  │
  ▼
COMPLETED

PENDING ─────► FAILED
   │
   └──────────► CANCELLED

DELIVERED ───► EXPIRED
DELIVERED ───► CANCELLED
FAILED ──────► PENDING
```

---

# 7. Transition Events

| Event | From | To |
|--------|------|----|
| Invitation Prepared | DRAFT | PENDING |
| Invitation Sent | PENDING | DELIVERED |
| Delivery Failed | PENDING | FAILED |
| Invitation Opened & Validated | DELIVERED | ACCEPTED |
| Onboarding Completed | ACCEPTED | COMPLETED |
| Invitation Expired | DELIVERED | EXPIRED |
| Invitation Cancelled | DRAFT/PENDING/DELIVERED | CANCELLED |
| Retry Delivery | FAILED | PENDING |

---

# 8. Invitation Rules

Each invitation shall:

- Belong to one organization.
- Target one recipient.
- Specify one intended role.
- Have a unique secure token.
- Have an expiration date.

Completed, cancelled and expired invitations cannot be reactivated.

A new invitation must be created instead.

---

# 9. Duplicate Invitations

Before sending a new invitation, the system shall verify:

- No active invitation exists for the same recipient and organization.
- No existing active user account already matches the invitation.

If either condition is true, the invitation should be blocked or require explicit administrator action.

---

# 10. Security Rules

Invitation tokens shall:

- Be cryptographically secure.
- Be single-use.
- Expire automatically.
- Be invalid after cancellation.
- Be invalid after successful acceptance.

The server must validate every invitation token.

---

# 11. Failure Handling

Examples:

- Invalid token.
- Expired invitation.
- Cancelled invitation.
- Duplicate acceptance attempt.

The system shall display appropriate guidance without exposing sensitive system information.

---

# 12. Audit Requirements

The following events shall be recorded:

- Invitation created.
- Invitation sent.
- Delivery failure.
- Invitation cancelled.
- Invitation accepted.
- Account created from invitation.
- Invitation expired.

Audit records shall include:

- Timestamp.
- Actor.
- Organization.
- Intended role.
- Recipient identifier.

---

# 13. Related Specifications

- AUTH-001 Authentication Screens
- ONB-001 Onboarding Screens
- API-004 Workflow Engine
- SEC-001 Authentication
- SM-002 Authentication

---

# 14. Summary

The ShiftOS Invitation Lifecycle State Machine governs the secure onboarding of new users from invitation creation through successful account setup or termination.

By enforcing explicit states and one-way transitions, ShiftOS maintains security, prevents duplicate onboarding and provides complete auditability.