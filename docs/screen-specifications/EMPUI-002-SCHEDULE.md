# ShiftOS Employee Schedule

**Document ID:** EMPUI-002

**Document Title:** Employee Schedule Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the employee schedule experience in ShiftOS.

The feature allows employees to view their assigned work shifts and understand upcoming responsibilities.

---

# 2. Primary User

Designed for:

- Employees.
- Shift workers.
- Team members.

---

# 3. Employee Goal

Employees should quickly know:

- When they work.
- Where they work.
- How long their shift is.
- If anything changed.

---

# 4. Schedule Philosophy

The employee schedule prioritizes:

- Simplicity.
- Clarity.
- Mobile access.

---

# 5. Screen Structure

Primary layout:

```
Schedule Header

↓

Upcoming Shift

↓

Calendar/List View

↓

Shift Details

↓

Notifications
```

---

# 6. Header Section

Displays:

- Schedule title.
- Current date range.

---

# 7. Upcoming Shift Card

Highlights the next scheduled shift.

Information:

- Date.
- Start time.
- End time.
- Branch/location.

Example:

```
Next Shift

Monday

9:00 AM - 5:00 PM

Main Branch
```

---

# 8. Schedule Views

Supported views:

## List View

Best for mobile.

Displays:

- Upcoming shifts.
- Dates.
- Times.

---

## Calendar View

Future enhancement.

Allows:

- Monthly overview.
- Shift distribution.

---

# 9. Shift Details

Selecting a shift displays:

- Shift date.
- Start/end time.
- Branch.
- Notes.
- Assigned information.

---

# 10. Schedule Changes

When changes occur:

Employee should receive:

- Updated schedule information.
- Notification.

Examples:

```
Your Monday shift has been updated.
```

---

# 11. Shift Status

Possible states:

- Upcoming.
- Completed.
- Cancelled.

---

# 12. Empty States

No scheduled shifts:

```
You currently have no upcoming shifts.
```

---

# 13. Error States

Examples:

Unable to load schedule:

```
Your schedule is unavailable.
Retry.
```

---

# 14. Permissions

Employees can only view:

- Their own schedules.
- Authorized branch information.

---

# 15. Offline Behaviour

Future support:

- Cached upcoming shifts.
- Last synchronized schedule.

Important:

Offline data must display synchronization status.

---

# 16. Responsive Behaviour

Mobile:

Primary experience.

Desktop:

Secondary experience.

---

# 17. MVP Requirements

Must include:

✅ Upcoming shifts  
✅ Shift details  
✅ Schedule history  
✅ Schedule updates  
✅ Notifications foundation  

---

# 18. Future Enhancements

Future versions:

- Shift swap requests.
- Availability preferences.
- Calendar integrations.
- Personal reminders.

---

# 19. Related Specifications

- SUP-003 Shift Operations
- EMPUI-001 Employee Dashboard
- EMPUI-003 Attendance
- UI-007 Calendar Components
- API-004 Workflow Engine

---

# 20. Summary

Employee Schedule provides workers with a simple and reliable view of their assigned shifts.

It intentionally separates schedule consumption from schedule management, keeping the employee experience simple while preserving supervisor control.