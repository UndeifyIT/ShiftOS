# ShiftOS API Validation Rules

**Document ID:** API-003

**Document Title:** Validation Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines validation standards for the ShiftOS backend.

Validation ensures that incoming requests contain valid information and that business operations follow approved rules before changes are committed.

---

# 2. Validation Philosophy

Validation exists at multiple layers:

```
Client Validation

↓

API Validation

↓

Business Validation

↓

Database Constraints
```

Each layer has a different responsibility.

Client validation improves usability.

Backend validation protects the business.

Database constraints protect data integrity.

---

# 3. Validation Principles

ShiftOS validation follows these principles:

- Never trust client input.
- Validate before processing.
- Return meaningful errors.
- Keep rules centralized.
- Avoid duplicated business rules.
- Validate authorization separately.

---

# 4. Validation Categories

ShiftOS uses four validation categories:

## Format Validation

Checks data structure.

Examples:

- Email format.
- Phone format.
- Date format.

---

## Required Field Validation

Ensures required information exists.

Examples:

- Employee name.
- Organization ID.
- Shift start time.

---

## Business Rule Validation

Ensures operations follow workforce rules.

Examples:

- Employee cannot clock in outside permitted conditions.
- Published schedules cannot be edited without revision.
- Completed tasks cannot return to pending.

---

## Permission Validation

Ensures the user can perform the action.

Examples:

- Supervisor can manage assigned branch.
- Employee cannot modify another employee's attendance.

---

# 5. Validation Ownership

Validation rules should exist in the appropriate layer.

## Frontend

Purpose:

- User feedback.
- Prevent obvious mistakes.

---

## Backend

Purpose:

- Business enforcement.
- Security validation.
- Workflow decisions.

---

## Database

Purpose:

- Data integrity.
- Relationship protection.

---

# 6. Employee Validation

Examples:

Employee creation requires:

- Valid organization.
- Valid branch.
- Required identity information.
- Valid employment status.

Restrictions:

- Employee cannot belong to another organization.
- Invalid branch references rejected.

---

# 7. Scheduling Validation

Examples:

Creating a shift requires:

- Valid branch.
- Valid employee assignment.
- Valid date.
- End time after start time.

Restrictions:

- Cannot publish incomplete schedules.
- Cannot assign inactive employees.

---

# 8. Attendance Validation

Attendance operations require:

## Clock In

Validate:

- Employee exists.
- Employee is active.
- User has permission.
- Attendance state allows clock-in.
- Shift rules are satisfied.

---

## Clock Out

Validate:

- Active attendance session exists.
- Clock-out occurs after clock-in.

---

## Attendance Correction

Validate:

- Correction reason exists.
- User has approval permission.
- Original record exists.

---

# 9. Task Validation

Task operations require:

## Assignment

Validate:

- Employee exists.
- Employee belongs to correct organization.
- Task is assignable.

---

## Completion

Validate:

- Task is assigned.
- Task is not already completed.
- Required completion information exists.

---

## Verification

Validate:

- Verifier has permission.
- Task completion exists.

---

# 10. Communication Validation

Announcements require:

- Authorized publisher.
- Valid audience.
- Required content.
- Valid publishing state.

---

# 11. Notification Validation

Notifications require:

- Valid recipient.
- Supported channel.
- Valid priority.
- Delivery rules applied.

---

# 12. Error Response Standards

Validation errors should include:

- Error code.
- Human-readable message.
- Field information where applicable.

Example:

```
SHIFT_END_BEFORE_START

"The shift end time must be after the start time."
```

---

# 13. Validation Logging

Failed validations may be logged when they involve:

- Security events.
- Permission violations.
- Suspicious activity.

Normal user mistakes should not create excessive logs.

---

# 14. Testing Requirements

Validation rules must test:

- Valid operations.
- Invalid inputs.
- Unauthorized attempts.
- Boundary conditions.
- Concurrent operations.

---

# 15. Future Enhancements

Future versions may introduce:

- Shared validation libraries.
- Rule configuration.
- Workflow-specific validation engines.
- AI-assisted validation suggestions.

---

# 16. Related Specifications

- API-001 Backend Architecture
- API-002 RPC Standards
- API-004 Workflow Engine
- API-006 Error Handling
- DB-006 Constraints
- SEC-010 Server-side Validation

---

# 17. Summary

ShiftOS validation rules ensure that every operation is correctly formatted, properly authorized and consistent with workforce business rules.

By combining client feedback, backend enforcement and database protection, ShiftOS maintains reliable operations while preventing invalid or unauthorized changes.
