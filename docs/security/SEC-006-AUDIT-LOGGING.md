# SEC-006 — Audit Logging

Status: Draft

Version: 0.1.0

Priority: High

Owner:

Dependencies:

Related Specifications:

---

## Purpose

Define the requirements for recording security-relevant events and administrative actions.

## Business Rationale

Audit logging provides accountability, investigation support, and compliance evidence.

## Scope

This specification covers auditable actions, log contents, retention, and review.

## Definitions

- Audit Log: A tamper-aware record of security-relevant activity.

## Business Rules

- Security-sensitive actions must be logged.
- Logs must be retained according to policy and access control rules.
- Audit records must be protected from unauthorized modification.

## User Workflow

- A user or service performs a protected action.
- The system writes an audit record for traceability.

## Permissions

- Audit logs should be visible only to authorized administrators and reviewers.

## UI Behaviour

- Audit views should be readable, filterable, and exportable.

## Backend Behaviour

- The platform must generate immutable or append-only logs for relevant events.

## Database Impact

- Audit data may require dedicated logging tables or storage.

## Events Emitted

- security.audit.recorded

## Notifications

- High-risk events may trigger alerts.

## Reporting Impact

- Audit data should support investigations and compliance reporting.

## Edge Cases

- Failed writes, partial transactions, and log storage issues must be handled.

## Validation Rules

- All required security actions must create corresponding audit records.

## Acceptance Criteria

- The system records audit trails for key administrative and security actions.

## Future Enhancements

- Centralized security log analytics and anomaly detection.

## Open Questions

- What retention period is required for MVP?

## Decision History

**2026-08-09 — Implementation status:** `audit_logs` and `security_events` are
append-only as of migration 024: RLS defines SELECT and INSERT policies only (no
UPDATE/DELETE policy exists, so both commands default-deny), backed by a
`BEFORE UPDATE OR DELETE` trigger that unconditionally rejects mutation, independent
of RLS bypass. Verified live against both the standard `authenticated` role and the
RLS-bypassing table-owner role (2026-08-09).
