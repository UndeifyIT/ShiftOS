# ShiftOS Empty States

**Document ID:** UI-008

**Document Title:** Empty State Design Standards

**Version:** 1.0.0

**Status:** Approved

**Classification:** Frontend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines standards for empty states across ShiftOS applications.

Empty states guide users when information, records or activity do not yet exist.

---

# 2. Empty State Philosophy

Empty states should:

- Explain the current situation.
- Guide the next action.
- Reduce confusion.
- Support onboarding.

An empty screen should never feel like a failure.

---

# 3. Empty State Types

ShiftOS recognizes several empty state categories.

---

# 4. First-Time Empty States

Purpose:

Help new users begin using a feature.

Examples:

No employees:

```
Your team has not been added yet.

Add your first employee to start managing shifts.
```

Action:

```
Add Employee
```

---

# 5. User-Created Empty States

Purpose:

Show that information is missing because users have not created it.

Examples:

No schedules:

```
No schedules created for this period.
```

Action:

```
Create Schedule
```

---

# 6. Search Empty States

Purpose:

Explain when a search returns no results.

Bad:

```
No results.
```

Better:

```
No employees match "John".
Try another search term.
```

---

# 7. Filter Empty States

Purpose:

Explain when filters remove all results.

Example:

```
No employees match these filters.

Clear filters
```

---

# 8. Permission Empty States

Purpose:

Handle situations where users cannot access information.

Example:

```
You do not have access to this section.

Contact your administrator.
```

---

# 9. Empty State Structure

Standard structure:

```
Illustration/Icon

↓

Title

↓

Explanation

↓

Primary Action

↓

Optional Secondary Action
```

---

# 10. Writing Guidelines

Empty state messages should be:

- Clear.
- Short.
- Action-oriented.
- Helpful.

Avoid:

- Technical language.
- Blaming users.
- Generic messages.

---

# 11. Actions

Every empty state should consider:

## Primary Action

The next recommended step.

Example:

```
Create Shift
```

---

## Secondary Action

Optional alternatives.

Example:

```
Import Employees
```

---

# 12. Dashboard Empty States

Dashboards require special handling.

A new organization may have:

- No employees.
- No shifts.
- No attendance history.

The dashboard should guide setup rather than show empty metrics.

---

# 13. Mobile Empty States

Mobile empty states should:

- Use concise messaging.
- Keep actions visible.
- Avoid unnecessary scrolling.

---

# 14. Loading vs Empty

Empty and loading states must be distinguished.

Loading:

```
Data is being retrieved.
```

Empty:

```
Data does not exist yet.
```

---

# 15. Error vs Empty

Errors should not appear as empty states.

Example:

Wrong:

```
No employees found
```

when the database failed.

Correct:

```
Unable to load employees.
Retry.
```

---

# 16. Accessibility

Empty states should support:

- Screen readers.
- Clear focus order.
- Accessible action buttons.

---

# 17. MVP Priority

Important empty states:

- Organization setup.
- Employee list.
- Schedule calendar.
- Task list.
- Attendance history.
- Reports.

---

# 18. Future Enhancements

Future versions may introduce:

- Guided onboarding flows.
- AI setup assistants.
- Industry-specific templates.

---

# 19. Related Specifications

- UI-009 Error States
- UI-005 Forms
- UI-002 Navigation
- UI-012 PWA Behaviour

---

# 20. Summary

ShiftOS empty states transform missing data into guided workflows.

By explaining the situation and providing clear next actions, empty states help users successfully adopt and operate the platform.
