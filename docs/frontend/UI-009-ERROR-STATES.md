# ShiftOS Error States

**Document ID:** UI-009

**Document Title:** Frontend Error State Standards

**Version:** 1.0.0

**Status:** Approved

**Classification:** Frontend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines how ShiftOS handles errors in the user interface.

The goal is to provide clear communication, recovery paths and reliable user experiences when operations fail.

---

# 2. Error State Philosophy

Errors should:

- Explain what happened.
- Help users recover.
- Avoid unnecessary technical details.
- Maintain user confidence.

---

# 3. Error State Principles

ShiftOS follows these principles:

## Actionable Errors

Users should know what to do next.

---

## Contextual Errors

Errors should appear where the problem occurred.

---

## Human Language

Avoid technical messages.

---

## Recovery First

Whenever possible, provide a solution.

---

# 4. Error Categories

ShiftOS frontend errors are grouped into categories.

---

# 5. Validation Errors

Cause:

User input does not satisfy requirements.

Examples:

```
End time must be after start time.
```

Display:

Near the relevant field.

---

# 6. Permission Errors

Cause:

User cannot perform an action.

Examples:

```
You do not have permission to publish schedules.
```

Actions:

- Explain restriction.
- Suggest contacting administrator.

---

# 7. Network Errors

Cause:

Connection problems.

Examples:

```
Unable to connect.

Check your internet connection and try again.
```

Actions:

- Retry.
- Show offline status where relevant.

---

# 8. Server Errors

Cause:

Unexpected backend failure.

Examples:

```
We could not complete this action.

Please try again.
```

Avoid exposing:

- Database errors.
- Internal details.

---

# 9. Conflict Errors

Important for workforce operations.

Examples:

Schedule conflict:

```
This employee already has another shift at this time.
```

Attendance conflict:

```
This attendance record has already been updated.
```

---

# 10. Session Errors

Examples:

```
Your session has expired.

Please sign in again.
```

---

# 11. Error Display Patterns

Common patterns:

## Inline Errors

Used for:

- Forms.
- Fields.

---

## Toast Messages

Used for:

- Temporary confirmations.
- Minor failures.

---

## Error Pages

Used for:

- Full page failures.

---

## Dialog Errors

Used for:

- Important decisions.
- Destructive actions.

---

# 12. Retry Behavior

Retry should be available when appropriate.

Examples:

Network failure:

```
Retry
```

Permission failure:

No retry.

---

# 13. Offline Errors

Offline situations should explain:

- Current connection state.
- Available actions.
- Pending changes.

Example:

```
Changes saved locally.

Waiting for connection.
```

---

# 14. Error Recovery

Recovery options may include:

- Retry.
- Edit information.
- Return to previous step.
- Contact administrator.

---

# 15. Error Logging

Frontend errors should provide:

- Error context.
- User action.
- Technical reference ID where available.

---

# 16. Accessibility

Errors should support:

- Screen reader announcements.
- Visible indicators.
- Clear focus movement.

---

# 17. Performance Considerations

Error handling should avoid:

- Infinite retry loops.
- Repeated failed requests.
- Blocking the entire application unnecessarily.

---

# 18. MVP Priority

Important error experiences:

- Login failures.
- Schedule conflicts.
- Attendance failures.
- Form submission errors.
- Network problems.

---

# 19. Future Enhancements

Future versions may introduce:

- Automated recovery suggestions.
- AI troubleshooting.
- Predictive error prevention.

---

# 20. Related Specifications

- UI-004 State Management
- UI-005 Forms
- UI-008 Empty States
- API-006 Error Handling
- API-009 Rate Limiting

---

# 21. Summary

ShiftOS error states turn failures into guided recovery experiences.

By providing clear explanations, appropriate actions and consistent behavior, ShiftOS maintains user trust even when operations fail.
