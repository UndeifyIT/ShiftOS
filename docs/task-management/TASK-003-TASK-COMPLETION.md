# ShiftOS Task Completion

**Document ID:** TASK-003

**Document Title:** Task Completion

**Version:** 1.0.0

**Status:** Approved

**Classification:** Task Management Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how tasks are completed within ShiftOS.

Task Completion records when assigned operational work has been finished and provides the information required for managers to review and verify the completed work.

---

# 2. Completion Philosophy

Completing a task confirms that the assigned work has been finished.

The supervisor is responsible for determining when a task has been completed and recording its completion in ShiftOS.

Task completion does not automatically mean the work has been verified.

Verification is a separate workflow.

---

# 3. Completion Workflow

The standard workflow is:

```
Task Assigned

↓

Supervisor Coordinates Work

↓

Employees Complete Work

↓

Supervisor Reviews Work

↓

Supervisor Marks Task Complete

↓

Completion Recorded

↓

Awaiting Verification
```

---

# 4. Completing a Task

To complete a task, the supervisor records:

- Completion status.
- Completion time.
- Completion notes (optional).
- Supporting evidence (optional).

Once saved, the task moves to the **Completed** status.

---

# 5. Completion Notes

Supervisors may include notes explaining:

- Work completed.
- Operational observations.
- Issues encountered.
- Items requiring follow-up.

Notes become part of the permanent task record.

---

# 6. Supporting Evidence

Organizations may require evidence before a task can be considered complete.

Supported evidence may include:

- Photos.
- Written notes.

Evidence is optional unless required by organization policy.

Future versions may support additional evidence types.

---

# 7. Incomplete Tasks

If work cannot be completed, the supervisor should not mark the task as completed.

Instead, they may:

- Leave the task In Progress.
- Request reassignment.
- Add notes explaining the issue.
- Request cancellation if appropriate.

---

# 8. Partial Completion

Tasks are considered either:

- In Progress.
- Completed.

Partial completion percentages are not supported in the MVP.

If only part of the work has been finished, the task remains **In Progress** until all required work is complete.

---

# 9. Completion Permissions

| Permission                 | Manager | Supervisor | Staff | Admin _(Future)_ |
| -------------------------- | :-----: | :--------: | :---: | :--------------: |
| View Task                  |  Allow  |   Allow    | Deny  |      Allow       |
| Mark Task Complete         |  Allow  |   Allow    | Deny  |       Deny       |
| Add Completion Notes       |  Allow  |   Allow    | Deny  |       Deny       |
| Upload Completion Evidence |  Allow  |   Allow    | Deny  |       Deny       |
| Reopen Completed Task      |  Allow  |    Deny    | Deny  |       Deny       |

---

# 10. Completion Validation

Before a task can be marked complete, ShiftOS validates:

- Task exists.
- Task is assigned.
- Supervisor is authorized.
- Task is not already completed.
- Required evidence has been provided (if applicable).

If validation fails, completion is blocked.

---

# 11. Database Considerations

Recommended fields:

```
tasks

status

completed_at

completed_by

completion_notes
```

Recommended evidence table:

```
task_evidence

id

task_id

file_url

file_type

uploaded_by

uploaded_at
```

Multiple evidence files may be linked to a single task.

---

# 12. Audit Requirements

The following events generate audit records:

- Task completed.
- Completion notes updated.
- Evidence uploaded.
- Completion reopened.
- Completion cancelled.

Audit records include:

- User.
- Task.
- Action.
- Timestamp.
- Previous values (where applicable).
- New values.

---

# 13. Future Enhancements

Future versions may support:

- Video evidence.
- Voice notes.
- QR code verification.
- Offline completion recording.
- AI evidence analysis.
- Automatic completion reminders.

---

# 14. Related Specifications

- TASK-001 Task Model
- TASK-002 Task Assignment
- TASK-004 Task Verification
- TASK-005 Recurring Tasks
- TASK-006 Task History

---

# 15. Summary

Task Completion records when operational work has been finished by the assigned supervisor.

Supervisors remain responsible for confirming completion, recording supporting information and providing evidence where required.

Completion prepares the task for verification while maintaining a complete operational record and audit trail.
