# ShiftOS Recurring Tasks

**Document ID:** TASK-005

**Document Title:** Recurring Tasks

**Version:** 1.0.0

**Status:** Approved

**Classification:** Task Management Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how recurring operational tasks are managed within ShiftOS.

Recurring Tasks allow organizations to automate the creation of routine operational work without requiring managers to recreate the same tasks repeatedly.

Each occurrence of a recurring task becomes an independent task that follows the standard task lifecycle.

---

# 2. Recurring Task Philosophy

Many operational activities occur on a predictable schedule.

Examples include:

- Opening checklists.
- Closing checklists.
- Daily cleaning.
- Weekly inventory counts.
- Monthly equipment inspections.
- End-of-day cash reconciliation.

Instead of manually creating these tasks each time, ShiftOS generates them automatically based on predefined recurrence rules.

---

# 3. Recurrence Workflow

The standard workflow is:

```
Manager Creates Task Template

↓

Configure Recurrence

↓

Recurrence Saved

↓

Scheduled Time Reached

↓

ShiftOS Generates New Task

↓

Supervisor Receives Task

↓

Normal Task Workflow Begins
```

Each generated task is independent of previous and future occurrences.

---

# 4. Supported Recurrence Patterns

The MVP supports:

- Daily.
- Weekly.
- Monthly.

Each recurrence may define:

- Start date.
- End date (optional).
- Execution time.
- Assigned branch.
- Assigned supervisor.
- Priority.

Future versions may support more advanced scheduling rules.

---

# 5. Independent Task Instances

Each generated task has its own:

- Task ID.
- Assignment.
- Status.
- Completion record.
- Verification record.
- Audit history.

Completing today's task does not complete tomorrow's task.

---

# 6. Editing Recurring Tasks

Managers may edit the recurrence template.

Changes affect only future task generations.

Previously generated tasks remain unchanged.

---

# 7. Pausing Recurring Tasks

Managers may temporarily pause recurring tasks.

While paused:

- No new tasks are generated.
- Existing generated tasks remain available.
- Historical records remain unchanged.

Recurring tasks may later be resumed.

---

# 8. Ending Recurring Tasks

Managers may permanently stop a recurring task.

Stopping a recurrence:

- Prevents future task generation.
- Does not delete existing generated tasks.
- Preserves the recurrence history.

---

# 9. Recurrence Permissions

| Permission            | Manager |          Supervisor           | Staff | Admin _(Future)_ |
| --------------------- | :-----: | :---------------------------: | :---: | :--------------: |
| Create Recurring Task |  Allow  | Allow _(Organization Policy)_ | Deny  |      Allow       |
| Edit Recurring Task   |  Allow  | Allow _(Organization Policy)_ | Deny  |       Deny       |
| Pause Recurring Task  |  Allow  | Allow _(Organization Policy)_ | Deny  |       Deny       |
| Resume Recurring Task |  Allow  | Allow _(Organization Policy)_ | Deny  |       Deny       |
| Stop Recurring Task   |  Allow  |             Deny              | Deny  |       Deny       |
| View Recurring Tasks  |  Allow  |             Allow             | Deny  |      Allow       |

---

# 10. Database Considerations

Recommended table:

```
task_recurrence

id

organization_id

branch_id

template_name

recurrence_type

start_date

end_date

execution_time

assigned_supervisor_id

priority

is_paused

created_by

created_at

updated_at
```

Each generated task should reference its originating recurrence.

Recommended field in `tasks`:

```
recurrence_id (nullable)
```

---

# 11. Audit Requirements

The following events generate audit records:

- Recurring task created.
- Recurrence updated.
- Recurrence paused.
- Recurrence resumed.
- Recurrence stopped.
- Task generated automatically.

Audit records include:

- User.
- Recurrence.
- Task (where applicable).
- Action.
- Timestamp.

---

# 12. Future Enhancements

Future versions may support:

- Custom recurrence intervals.
- Multiple execution times.
- Holiday exclusions.
- Branch-specific recurrence overrides.
- AI-generated recurring tasks.
- Dependency-based task generation.

---

# 13. Related Specifications

- TASK-001 Task Model
- TASK-002 Task Assignment
- TASK-003 Task Completion
- TASK-004 Task Verification
- TASK-006 Task History
- SCH-007 Schedule Publishing

---

# 14. Summary

Recurring Tasks automate the creation of routine operational work within ShiftOS.

Managers define a recurrence once, and ShiftOS generates independent task instances according to the configured schedule.

This reduces repetitive administrative work while ensuring every occurrence maintains its own assignment, completion, verification and audit history.
