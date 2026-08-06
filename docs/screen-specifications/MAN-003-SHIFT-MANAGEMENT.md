# ShiftOS Manager Shift Management

**Document ID:** MAN-003

**Document Title:** Manager Shift Management Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the manager-level shift management experience.

The feature provides organization-wide visibility into workforce schedules while allowing managers to monitor and control scheduling operations.

---

# 2. Primary User

Designed for:

- Organization managers.
- Business owners.
- Regional managers.

---

# 3. Management Goal

Managers should be able to understand:

- How branches are staffed.
- Whether schedules are complete.
- Whether coverage problems exist.
- Whether scheduling policies are followed.

---

# 4. Shift Management Philosophy

The manager view prioritizes:

- Oversight.
- Exceptions.
- Workforce planning.

It should not become a replacement for supervisor scheduling workflows.

---

# 5. Screen Structure

Primary layout:

```
Page Header

↓

Schedule Overview

↓

Branch Filters

↓

Organization Schedule View

↓

Issues & Alerts
```

---

# 6. Header Section

Displays:

- Shift Management title.
- Organization context.
- Selected time period.

Actions:

Possible:

```
Review Schedule
```

Depending on permissions:

```
Create Schedule
```

---

# 7. Schedule Overview

Provides high-level information:

Examples:

- Total scheduled shifts.
- Scheduled employees.
- Uncovered shifts.
- Branch completion status.

---

# 8. Branch Schedule View

Managers can view schedules by:

- Branch.
- Date range.
- Department (future).

Information:

- Staffing levels.
- Coverage.
- Schedule completion.

---

# 9. Calendar View

The manager calendar may support:

- Week view.
- Month overview.

Purpose:

Not detailed editing.

Purpose:

```
Understand workforce distribution
```

---

# 10. Shift Details

Selecting a shift displays:

- Employee.
- Branch.
- Time.
- Status.
- Schedule history.

---

# 11. Schedule Status

Schedules may have states:

Examples:

Draft:

```
Being prepared
```

Published:

```
Visible to employees
```

Completed:

```
Historical record
```

---

# 12. Schedule Approval

Future workflows may include:

```
Supervisor Creates Schedule

↓

Manager Reviews

↓

Manager Approves

↓

Schedule Published
```

Approval requirements depend on organization settings.

---

# 13. Coverage Monitoring

Managers should identify:

Examples:

- Missing staff coverage.
- Overstaffed periods.
- Branch scheduling issues.

---

# 14. Editing Permissions

Manager editing should depend on permissions.

Possible permissions:

- View schedules.
- Approve schedules.
- Modify schedules.

---

# 15. Conflict Handling

Examples:

Employee assigned to conflicting shifts:

```
Schedule conflict detected.
Review assignment.
```

---

# 16. Empty States

No schedules:

```
No schedules exist for this period.

Supervisors can begin creating schedules.
```

---

# 17. Error States

Examples:

Unable to load schedules:

```
Schedule information unavailable.
Retry.
```

---

# 18. Responsive Behaviour

Desktop:

- Organization calendar.
- Multiple branch visibility.

Tablet:

- Reduced schedule density.

Mobile:

- Summary-focused view.

---

# 19. MVP Requirements

Must include:

✅ Organization schedule visibility  
✅ Branch filtering  
✅ Schedule status visibility  
✅ Coverage awareness  
✅ Shift detail viewing  

---

# 20. Future Enhancements

Future versions may introduce:

- Workforce forecasting.
- Automated staffing recommendations.
- Labor cost optimization.
- AI scheduling assistance.

---

# 21. Related Specifications

- SUP-003 Shift Operations
- MAN-001 Manager Dashboard
- UI-007 Calendar Components
- API-004 Workflow Engine
- RT-002 Live Updates

---

# 22. Summary

Manager Shift Management provides strategic scheduling oversight.

By separating organization-level visibility from branch-level scheduling operations, ShiftOS matches real workforce management practices and prevents unnecessary administrative complexity.