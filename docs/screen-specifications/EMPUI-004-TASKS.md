# ShiftOS Employee Tasks

**Document ID:** EMPUI-004

**Document Title:** Employee Task Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the employee task experience in ShiftOS.

The feature allows employees to view assigned tasks, understand requirements and record completion.

---

# 2. Primary User

Designed for:

- Employees.
- Shift workers.
- Team members.

---

# 3. Employee Goal

Employees should be able to:

- See assigned tasks.
- Understand instructions.
- Complete tasks.
- Review task history.

---

# 4. Task Philosophy

Employee tasks prioritize:

- Clarity.
- Speed.
- Minimal interaction.

---

# 5. Screen Structure

Primary layout:

```
Task Header

↓

Active Tasks

↓

Task Details

↓

Completion Action

↓

Completed History
```

---

# 6. Header Section

Displays:

- Task title.
- Current shift context.

---

# 7. Active Tasks

Displays assigned tasks.

Information:

- Task name.
- Due time.
- Priority.
- Status.

---

# 8. Task Details

Selecting a task shows:

- Instructions.
- Assigned time.
- Additional notes.
- Completion requirements.

---

# 9. Task Status

Possible states:

```
Assigned

↓

In Progress

↓

Completed
```

Future:

```
Needs Review
```

---

# 10. Completing Tasks

Employee may:

- Mark task complete.
- Add completion notes.

Future:

- Upload evidence.
- Add photos.
- Confirm checklist items.

---

# 11. Task Instructions

Instructions should support:

- Short descriptions.
- Step-by-step guidance.
- Operational notes.

Avoid long documents.

---

# 12. Task Verification

Depending on organization settings:

Possible workflows:

## Employee Completion

```
Employee completes task

↓

Task marked complete
```

---

## Supervisor Verification

```
Employee completes task

↓

Supervisor verifies
```

---

# 13. Missed Tasks

If a task is overdue:

Employee sees:

- Task status.
- Due information.
- Required action.

---

# 14. Task History

Employees can view:

- Completed tasks.
- Previous assignments.

---

# 15. Empty States

No tasks:

```
You have no assigned tasks.
```

---

# 16. Error States

Examples:

Unable to update task:

```
Task completion failed.
Try again.
```

---

# 17. Permissions

Employees can only:

- View assigned tasks.
- Update allowed task statuses.

They cannot:

- View other employees' tasks.
- Modify task definitions.

---

# 18. Offline Behaviour

Future support:

- View cached tasks.
- Complete tasks offline.
- Sync later.

Requires conflict handling.

---

# 19. Responsive Behaviour

Mobile:

Primary experience.

Desktop:

Secondary experience.

---

# 20. MVP Requirements

Must include:

✅ View assigned tasks  
✅ View instructions  
✅ Complete tasks  
✅ Task history  

---

# 21. Future Enhancements

Future versions:

- Photo evidence.
- Digital checklists.
- Task comments.
- Supervisor feedback.
- Task performance scoring.

---

# 22. Related Specifications

- SUP-005 Tasks
- MAN-005 Tasks
- EMPUI-001 Employee Dashboard
- API-004 Workflow Engine
- DB-005 Tables

---

# 23. Summary

Employee Tasks provides workers with a simple way to understand and complete assigned responsibilities.

The workflow connects daily operations with accountability while keeping employee interaction minimal.