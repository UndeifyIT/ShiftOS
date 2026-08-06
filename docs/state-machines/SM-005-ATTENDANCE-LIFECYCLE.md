# ShiftOS Attendance Lifecycle State Machine

**Document ID:** SM-005

**Document Title:** Attendance Lifecycle State Machine

**Version:** 1.0.0

**Status:** Approved

**Classification:** State Machine Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the lifecycle of attendance records within ShiftOS.

The lifecycle governs how attendance records are created, verified, finalized and archived while preserving complete audit history.

Attendance outcomes (Present, Late, Absent, etc.) are stored separately from lifecycle state.

---

# 2. Objectives

The attendance lifecycle ensures:

- Predictable attendance processing.
- Accurate operational records.
- Controlled corrections.
- Complete auditability.
- Reliable reporting.

---

# 3. Scope

Applies to:

- Supervisor-recorded attendance.
- Employee-confirmed attendance (future).
- Integrated attendance systems (future).

---

# 4. Attendance Lifecycle States

```
PENDING

↓

RECORDED

↓

VERIFIED

↓

FINALIZED

↓

ARCHIVED
```

Exceptional state:

```
CORRECTION_REQUESTED
```

---

# 5. State Definitions

## PENDING

Purpose:

Attendance is expected but has not yet been recorded.

Activities:

- Await attendance event.
- Monitor shift start.

Allowed transitions:

→ RECORDED

---

## RECORDED

Purpose:

Attendance information has been captured.

Activities:

- Store attendance time.
- Store attendance outcome.
- Await verification if required.

Allowed transitions:

→ VERIFIED

→ FINALIZED

→ CORRECTION_REQUESTED

---

## VERIFIED

Purpose:

Attendance has been reviewed by an authorized user.

Activities:

- Validate attendance information.
- Confirm accuracy.

Allowed transitions:

→ FINALIZED

→ CORRECTION_REQUESTED

---

## FINALIZED

Purpose:

Attendance record is complete.

Activities:

- Lock operational values.
- Make available for reporting.

Allowed transitions:

→ ARCHIVED

→ CORRECTION_REQUESTED

---

## CORRECTION_REQUESTED

Purpose:

An attendance correction has been requested.

Activities:

- Await supervisor or manager review.
- Preserve original record.

Allowed transitions:

→ VERIFIED

→ FINALIZED

---

## ARCHIVED

Purpose:

Historical attendance record.

Activities:

- Read-only reporting.
- Compliance.
- Analytics.

Terminal state.

---

# 6. Attendance Outcomes

Attendance outcome is independent of lifecycle state.

Supported outcomes include:

- Present
- Late
- Absent
- Excused
- Partial Shift (future)

Example:

```
Lifecycle State:
FINALIZED

Outcome:
LATE
```

---

# 7. State Transition Diagram

```
PENDING
   │
   ▼
RECORDED
   │
   ▼
VERIFIED
   │
   ▼
FINALIZED
   │
   ▼
ARCHIVED

RECORDED ─────────► CORRECTION_REQUESTED
VERIFIED ─────────► CORRECTION_REQUESTED
FINALIZED ────────► CORRECTION_REQUESTED
          │
          ▼
      VERIFIED
          │
          ▼
      FINALIZED
```

---

# 8. Transition Events

| Event | From | To |
|--------|------|----|
| Attendance Recorded | PENDING | RECORDED |
| Attendance Verified | RECORDED | VERIFIED |
| Auto Finalization | RECORDED | FINALIZED |
| Manual Finalization | VERIFIED | FINALIZED |
| Correction Requested | RECORDED/VERIFIED/FINALIZED | CORRECTION_REQUESTED |
| Correction Approved | CORRECTION_REQUESTED | VERIFIED |
| Record Finalized | VERIFIED | FINALIZED |
| Archive Process | FINALIZED | ARCHIVED |

---

# 9. Attendance Rules

Each attendance record shall:

- Belong to one employee.
- Belong to one shift.
- Have one attendance outcome.
- Maintain a complete audit trail.

Attendance records shall never be deleted.

---

# 10. Correction Rules

Corrections shall:

- Preserve the original record.
- Record the reason.
- Record the approving user.
- Record timestamps.
- Create an audit entry.

The corrected value replaces the operational value while retaining correction history.

---

# 11. Integration Rules

Attendance lifecycle affects:

- Shift reporting.
- Workforce analytics.
- Future payroll integrations.
- Compliance reporting.

---

# 12. Failure Handling

Examples:

- Duplicate attendance submission.
- Invalid attendance time.
- Attendance recorded outside permitted window.
- Missing shift association.

The system shall reject invalid transitions while preserving existing valid records.

---

# 13. Audit Requirements

The following events shall be audited:

- Attendance recorded.
- Attendance verified.
- Attendance finalized.
- Correction requested.
- Correction approved.
- Attendance archived.

Audit records shall include:

- Timestamp.
- Actor.
- Employee.
- Shift.
- Previous values.
- Updated values.
- Reason for correction where applicable.

---

# 14. Related Specifications

- SUP-004 Attendance
- EMPUI-003 Attendance
- SM-004 Shift Lifecycle
- API-003 Validation Rules
- DB-005 Tables

---

# 15. Summary

The Attendance Lifecycle State Machine governs how attendance records evolve from expected attendance through recording, verification, finalization and archival.

By separating lifecycle state from attendance outcome, ShiftOS maintains flexibility, auditability and reporting accuracy.