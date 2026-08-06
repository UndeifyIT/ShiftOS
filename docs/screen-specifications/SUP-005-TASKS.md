# ShiftOS Supervisor Tasks

**Document ID:** SUP-005

**Document Title:** Supervisor Task Management Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the supervisor task management experience in ShiftOS.

The feature allows supervisors to create, assign, monitor and verify operational tasks within their branch.

---

# 2. Primary User

Designed for:

- Branch supervisors.
- Shift managers.
- Team leads.

---

# 3. Operational Goal

Supervisors should be able to:

- Assign work.
- Monitor completion.
- Identify missed tasks.
- Maintain branch standards.

---

# 4. Task Philosophy

Supervisor tasks prioritize:

- Execution.
- Accountability.
- Operational consistency.

---

# 5. Screen Structure

Primary layout:

```
Task Header

↓

Today's Tasks

↓

Task Groups

↓

Completion Status

↓

Task Actions
```

---

# 6. Header Section

Displays:

- Branch name.
- Selected date.
- Task status summary.

---

# 7. Today's Tasks

Displays active operational tasks.

Information:

- Task name.
- Assigned employee/team.
- Due time.
- Status.

---

# 8. Task Status

Possible states:

```
Pending

↓

In Progress

↓

Completed

↓

Missed
```

---

# 9. Creating Tasks

Supervisors may create tasks.

Required:

- Task name.
- Assigned person/team.
- Due period.

Optional:

- Instructions.
- Notes.

---

# 10. Task Assignment

Assignment options:

- Individual employee.
- Shift team.
- Department (future).

---

# 11. Task Completion

Completion methods:

Future possibilities:

- Employee confirmation.
- Supervisor verification.

For MVP:

- Supervisor verification may be required.

---

# 12. Task Templates

Support reusable operational tasks.

Examples:

Opening checklist:

```
Unlock store

Check equipment

Prepare workspace
```

Closing checklist:

```
Clean area

Secure equipment

Complete closing checks
```

---

# 13. Missed Tasks

When tasks are incomplete:

System should show:

- Task name.
- Responsible person.
- Due time.
- History.

---

# 14. Task Notes

Supervisors may add context.

Examples:

- Task delayed.
- Issue discovered.
- Replacement assigned.

---

# 15. Empty States

No tasks:

```
No tasks assigned today.

Create operational tasks for your branch.
```

---

# 16. Error States

Examples:

Failed task update:

```
Unable to update task status.
Try again.
```

---

# 17. Permissions

Supervisors can only manage:

- Their assigned branches.
- Allowed task categories.

---

# 18. Real-Time Behaviour

Updates may include:

- Task completion.
- Assignment changes.
- Supervisor actions.

---

# 19. Responsive Behaviour

Desktop:

- Full task board.

Tablet:

- Supervisor operations view.

Mobile:

- Quick checklist experience.

---

# 20. MVP Requirements

Must include:

✅ Create tasks  
✅ Assign tasks  
✅ Track completion  
✅ View missed tasks  
✅ Task history  

---

# 21. Future Enhancements

Future versions:

- Employee task confirmation.
- Photo evidence.
- Automated checklists.
- AI task recommendations.
- Compliance workflows.

---

# 22. Related Specifications

- MAN-005 Tasks
- SUP-001 Supervisor Dashboard
- EMPUI-004 Tasks
- API-004 Workflow Engine
- DB-005 Tables

---

# 23. Summary

Supervisor Tasks provides the operational execution layer for ShiftOS.

By connecting tasks to branches, employees and shifts, ShiftOS helps businesses maintain consistent daily operations.