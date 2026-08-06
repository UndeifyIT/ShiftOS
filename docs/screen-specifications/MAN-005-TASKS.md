# ShiftOS Manager Tasks

**Document ID:** MAN-005

**Document Title:** Manager Task Management Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the manager-level task management experience.

The feature provides organization-wide visibility into task execution, completion rates and operational consistency.

---

# 2. Primary User

Designed for:

- Organization managers.
- Business owners.
- Regional managers.

---

# 3. Management Goal

Managers should understand:

- Are operational tasks being completed?
- Which branches have issues?
- Are teams following required processes?

---

# 4. Task Philosophy

The manager task experience focuses on:

- Oversight.
- Trends.
- Exceptions.

Daily task execution belongs primarily to supervisors and employees.

---

# 5. Screen Structure

Primary layout:

```
Page Header

↓

Task Summary

↓

Completion Trends

↓

Branch Performance

↓

Outstanding Issues

↓

Task Details
```

---

# 6. Header Section

Displays:

- Task Management title.
- Organization context.
- Date range.

Actions:

Possible:

```
Create Task Template
```

Depending on permissions.

---

# 7. Task Summary

Provides overview metrics.

Examples:

- Total tasks created.
- Completion rate.
- Overdue tasks.
- Active task templates.

---

# 8. Completion Trends

Purpose:

Identify operational patterns.

Examples:

- Weekly completion rates.
- Missed task trends.
- Improvement/decline patterns.

---

# 9. Branch Performance

Shows task execution across locations.

Information:

- Branch completion percentage.
- Outstanding tasks.
- Repeated failures.

---

# 10. Task Templates

Managers may manage reusable task structures.

Examples:

- Opening checklist.
- Closing checklist.
- Safety checks.
- Inventory tasks.

---

# 11. Task Details

Managers may view:

- Task name.
- Branch.
- Assigned team.
- Status.
- Completion history.

---

# 12. Task Escalations

Important issues may be highlighted.

Examples:

```
Branch A has missed closing tasks for 5 consecutive days.
```

---

# 13. Task Assignment

Manager assignment capability depends on organization rules.

Possible:

- Create templates.
- Assign to branches.

Not necessarily:

- Individual daily assignments.

---

# 14. Empty States

No tasks:

```
Create operational tasks to begin tracking execution.
```

---

# 15. Error States

Examples:

Unable to load tasks:

```
Task information unavailable.
Retry.
```

---

# 16. Permissions

Managers should only access:

- Authorized branches.
- Allowed task information.

---

# 17. Responsive Behaviour

Desktop:

- Analytics.
- Branch comparison.
- Tables.

Tablet:

- Summary and exceptions.

Mobile:

- Alerts and quick insights.

---

# 18. MVP Requirements

Must include:

✅ Task overview  
✅ Completion visibility  
✅ Branch comparison  
✅ Task history  
✅ Task detail access  

---

# 19. Future Enhancements

Future versions:

- AI-generated task recommendations.
- Automated compliance checks.
- Performance scoring.
- Task optimization.

---

# 20. Related Specifications

- SUP-005 Tasks
- MAN-006 Reports
- UI-006 Data Tables
- API-004 Workflow Engine
- RT-002 Live Updates

---

# 21. Summary

Manager Tasks provides operational oversight rather than daily execution management.

By focusing on completion trends and exceptions, ShiftOS helps managers maintain consistency across branches without adding unnecessary administrative workload.