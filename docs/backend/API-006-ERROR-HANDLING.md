# ShiftOS API Error Handling

**Document ID:** API-006

**Document Title:** Error Handling Standards

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the error handling standards used across the ShiftOS backend.

The goal is to provide predictable, secure and actionable error responses across web, mobile and future client applications.

---

# 2. Error Philosophy

Errors should:

- Clearly communicate failure.
- Help users recover.
- Support debugging.
- Protect sensitive information.
- Remain consistent across the platform.

---

# 3. Error Principles

ShiftOS errors follow these principles:

- Never expose internal system details.
- Use consistent error formats.
- Provide meaningful error codes.
- Log technical details separately.
- Separate user messages from developer diagnostics.

---

# 4. Error Categories

ShiftOS uses the following categories:

## Validation Errors

The request contains invalid information.

Examples:

```
INVALID_DATE_RANGE

MISSING_REQUIRED_FIELD

INVALID_SHIFT_TIME
```

---

## Authentication Errors

The user identity cannot be verified.

Examples:

```
UNAUTHENTICATED

SESSION_EXPIRED
```

---

## Authorization Errors

The user is authenticated but cannot perform the action.

Examples:

```
PERMISSION_DENIED

BRANCH_ACCESS_REQUIRED
```

---

## Resource Errors

A requested resource cannot be found or accessed.

Examples:

```
EMPLOYEE_NOT_FOUND

SHIFT_NOT_FOUND
```

---

## Workflow Errors

The requested action violates a business process.

Examples:

```
INVALID_STATUS_TRANSITION

SHIFT_ALREADY_COMPLETED
```

---

## System Errors

Unexpected technical failures.

Examples:

```
DATABASE_ERROR

SERVICE_UNAVAILABLE
```

---

# 5. Error Response Format

All API errors should follow a consistent structure.

Example:

```
{
  "code": "SHIFT_ALREADY_PUBLISHED",
  "message": "This schedule has already been published.",
  "details": {},
  "request_id": "..."
}
```

---

# 6. Error Codes

Error codes should be:

- Unique.
- Descriptive.
- Stable over time.

Naming format:

```
DOMAIN_ERROR_DESCRIPTION
```

Examples:

```
ATTENDANCE_ALREADY_CLOCKED_IN

TASK_NOT_ASSIGNED

SCHEDULE_INVALID_STATE
```

---

# 7. User Messages

User-facing messages should:

- Explain the problem.
- Suggest recovery where possible.
- Avoid technical language.

Bad:

```
Foreign key violation.
```

Good:

```
This employee is no longer available for this assignment.
```

---

# 8. Developer Diagnostics

Technical details should be available through:

- Logs.
- Monitoring systems.
- Request identifiers.

They should not be returned directly to users.

---

# 9. HTTP Status Standards

Common mappings:

## 400 Bad Request

Invalid request format.

---

## 401 Unauthorized

Authentication required.

---

## 403 Forbidden

Permission denied.

---

## 404 Not Found

Resource unavailable.

---

## 409 Conflict

Business conflict.

Example:

Duplicate operation.

---

## 422 Unprocessable Entity

Business validation failure.

---

## 500 Internal Server Error

Unexpected system failure.

---

# 10. Error Logging

Errors should capture:

- Request ID.
- User context.
- Organization context.
- Timestamp.
- Technical details.

Sensitive information should not be logged unnecessarily.

---

# 11. Security Considerations

Errors must not expose:

- Database structure.
- Internal IDs unnecessarily.
- Authentication details.
- Sensitive employee information.

---

# 12. Retryable Errors

Some errors may allow retry.

Examples:

```
TEMPORARY_SERVICE_FAILURE

NETWORK_TIMEOUT
```

Clients should handle retries carefully.

---

# 13. Client Handling

Clients should:

- Display appropriate messages.
- Handle expired sessions.
- Support offline recovery where applicable.
- Avoid exposing raw backend errors.

---

# 14. Monitoring

Error monitoring should track:

- Frequency.
- Impact.
- Affected workflows.
- Customer impact.

Critical errors should trigger alerts.

---

# 15. Future Enhancements

Future versions may introduce:

- Automated error categorization.
- Advanced monitoring.
- AI-assisted debugging.
- Self-healing workflows.

---

# 16. Related Specifications

- API-003 Validation Rules
- API-004 Workflow Engine
- API-008 Logging
- SEC-009 API Security

---

# 17. Summary

ShiftOS error handling provides a consistent approach for communicating failures across the platform.

By separating user-friendly messages from technical diagnostics and maintaining predictable error formats, ShiftOS improves reliability, security and user experience.
