# ShiftOS Task Assignment

**Document ID:** TASK-002

**Document Title:** Task Assignment

**Version:** 1.0.0

**Status:** Approved

**Classification:** Task Management Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how tasks are assigned within ShiftOS.

Task Assignment ensures that every operational task has a clearly accountable supervisor responsible for coordinating, completing and reporting the work.

ShiftOS assigns responsibility to supervisors rather than directly to employees.

---

# 2. Assignment Philosophy

Every task must have one responsible supervisor.

The assigned supervisor becomes accountable for ensuring the work is completed during the appropriate operational period.

Employees receive work instructions verbally from the supervisor and are not digitally assigned tasks during normal operations.

---

# 3. Assignment Workflow

The standard workflow is:

```
Manager Creates Task

↓

Select Branch

↓

Assign Supervisor

↓

Task Assigned

↓

Supervisor Receives Task

↓

Supervisor Coordinates Work

↓

Task Begins
```

---

# 4. Assignment Requirements

Before a task can be assigned, ShiftOS validates:

- Branch exists.
- Supervisor exists.
- Supervisor is active.
- Supervisor belongs to the selected branch.
- Task information is complete.

If validation fails, assignment is blocked.

---

# 5. Assignment Scope

A task may optionally be linked to:

- Branch.
- Department.
- Schedule.
- Shift.

This allows tasks to be associated with operational activities without requiring every task to belong to a specific schedule.

---

# 6. Supervisor Responsibilities

Once assigned, the supervisor is responsible for:

- Reviewing assigned tasks.
- Organizing work.
- Delegating work verbally.
- Monitoring progress.
- Recording completion.
- Providing completion evidence where required.

The supervisor remains accountable until the task is completed or reassigned.

---

# 7. Employee Responsibilities

Employees:

- Receive instructions from the supervisor.
- Perform the required work.

Employees do not:

- Accept task assignments.
- Decline task assignments.
- Update task status.
- Upload task evidence.

---

# 8. Reassignment

Tasks may be reassigned when operational requirements change.

Examples include:

- Supervisor absence.
- Shift change.
- Branch operational changes.
- Manager decision.

Task reassignment preserves the complete assignment history.

---

# 9. Notifications

When a task is assigned, ShiftOS notifies the assigned supervisor.

Notifications may include:

- Task title.
- Priority.
- Due date.
- Branch.
- Assigned by.

Employees are not notified.

---

# 10. Assignment Permissions

| Permission              | Manager |          Supervisor           | Staff | Admin _(Future)_ |
| ----------------------- | :-----: | :---------------------------: | :---: | :--------------: |
| Create Task             |  Allow  | Allow _(Organization Policy)_ | Deny  |      Allow       |
| Assign Task             |  Allow  | Allow _(Organization Policy)_ | Deny  |       Deny       |
| View Assigned Tasks     |  Allow  |             Allow             | Deny  |      Allow       |
| Reassign Task           |  Allow  | Allow _(Organization Policy)_ | Deny  |       Deny       |
| Cancel Assignment       |  Allow  | Allow _(Organization Policy)_ | Deny  |       Deny       |
| View Assignment History |  Allow  |             Allow             | Deny  |      Allow       |

---

# 11. Database Considerations

Recommended fields:

```
tasks

assigned_supervisor_id

assigned_by

assigned_at
```

Recommended history table:

```
task_assignment_history

id

task_id

previous_supervisor_id

new_supervisor_id

changed_by

reason

changed_at
```

Assignment history should be immutable and retained for auditing.

---

# 12. Audit Requirements

The following events generate audit records:

- Task assigned.
- Task reassigned.
- Assignment cancelled.
- Assignment updated.
- Assignment accepted automatically.

Audit records include:

- User.
- Task.
- Supervisor.
- Previous assignment.
- New assignment.
- Timestamp.

---

# 13. Future Enhancements

Future versions may support:

- Automatic supervisor assignment.
- Workload balancing recommendations.
- AI-assisted assignment suggestions.
- Multi-supervisor task ownership.
- Cross-branch assignments.
- Temporary assignment delegation.

---

# 14. Related Specifications

- TASK-001 Task Model
- TASK-003 Task Completion
- TASK-004 Task Verification
- TASK-005 Recurring Tasks
- SHIFT-008 Shift Assignment
- SCH-007 Schedule Publishing

---

# 15. Summary

Task Assignment ensures every operational task has one clearly accountable supervisor.

Managers assign tasks to supervisors, who coordinate work on the shop floor and remain responsible for recording completion and reporting outcomes.

This model reflects real-world operational practices while maintaining accountability, traceability and operational simplicity.
