# ShiftOS Shift Editing

**Document ID:** SHIFT-006

**Document Title:** Shift Editing

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how existing shifts are edited within ShiftOS.

Shift Editing allows authorized users to correct, update or adjust shift information while maintaining operational accuracy and audit history.

---

# 2. Shift Editing Principles

## 2.1 Editing Must Preserve History

Shift changes must never silently overwrite operational history.

Example:

Before:

```
Morning Shift

08:00 - 16:00
```

After:

```
Morning Shift

09:00 - 17:00
```

The system must record:

```
Changed:

Start Time

From:

08:00

To:

09:00

Changed By:

Supervisor

Date:

14 July 2026
```

---

## 2.2 Editing Rules Depend On Shift State

The ability to edit depends on the current shift state.

Example:

```
Draft Shift:

Flexible Editing


Active Shift:

Restricted Editing


Completed Shift:

Locked
```

---

# 3. Who Can Edit Shifts

## Supervisor

Primary editor.

Responsible for:

- Correcting schedules.
- Adjusting operational details.
- Managing branch workforce needs.

---

## Manager

Provides oversight.

Can:

- Edit supervisor-created shifts.
- Override changes.
- Correct operational mistakes.

---

## Staff

Cannot:

- Edit shifts.
- Change assignments.
- Modify schedules.

---

## Admin *(Future)*

Read-only operational visibility.

Cannot:

- Edit shifts.
- Modify schedules.
- Change operational records.

---

# 4. Editable Shift Information

| Field | Draft | Published | Scheduled | Active | Completed |
|---|:---:|:---:|:---:|:---:|:---:|
| Shift Name | Yes | Limited | Limited | No | No |
| Date | Yes | Limited | Limited | No | No |
| Start Time | Yes | Yes | Limited | Restricted | No |
| End Time | Yes | Yes | Limited | Restricted | No |
| Notes | Yes | Yes | Yes | Yes | No |
| Supervisor | Yes | Yes | Limited | Restricted | No |
| Branch | Yes | Limited | No | No | No |
| Employees | Yes | Through Assignment Workflow | Through Assignment Workflow | No | No |

---

# 5. Shift Editing Workflow

```
User Opens Shift

        |

System Checks Permission

        |

System Checks Shift State

        |

User Updates Allowed Fields

        |

System Validates Changes

        |

Save Changes

        |

Create Audit Record

        |

Notify Affected Users If Required
```

---

# 6. Editing Rules By Shift State

---

# 6.1 Draft Shifts

Draft shifts have the highest flexibility.

Allowed:

- Change times.
- Change date.
- Change branch.
- Change supervisor.
- Update notes.
- Modify assignments.

---

# 6.2 Published Shifts

Published shifts have operational impact.

Allowed:

- Correct times.
- Update notes.
- Modify operational details.

Restrictions:

- Important changes require notification.

---

# 6.3 Scheduled Shifts

Scheduled shifts are part of the official workforce plan.

Changes must consider:

- Employee expectations.
- Attendance preparation.
- Operational coverage.

---

# 6.4 Active Shifts

Active shifts are currently running.

Only operational corrections are allowed.

Examples:

Allowed:

- Add supervisor notes.
- Correct operational information.

Restricted:

- Changing shift time.
- Moving branch.
- Removing assigned employees.

---

# 6.5 Completed Shifts

Completed shifts are historical records.

Normal editing is disabled.

Corrections require controlled adjustment workflows.

---

# 7. Edit Validation Rules

Before saving changes, ShiftOS validates:

## Time Changes

The system checks:

- End time remains after start time.
- Shift duration remains valid.
- No invalid overlap is created.

---

## Branch Changes

The system checks:

- Branch belongs to organization.
- Supervisor has access.
- Assigned employees belong to valid branch scope.

---

## Supervisor Changes

The system checks:

- New supervisor exists.
- User has supervisor permissions.
- Supervisor belongs to organization.

---

# 8. Notifications

Affected users may receive notifications when:

- Shift time changes.
- Shift date changes.
- Supervisor changes.
- Branch changes.
- Assignment changes.

---

# 9. Shift Editing Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Shift | Allow | Allow | Own Only | Allow |
| Edit Draft Shift | Allow | Allow | Deny | Deny |
| Edit Published Shift | Allow | Allow | Deny | Deny |
| Edit Scheduled Shift | Allow | Allow | Deny | Deny |
| Edit Active Shift | Allow | Restricted | Deny | Deny |
| Edit Completed Shift | Request | Request | Deny | Deny |
| Change Shift Times | Allow | Allow | Deny | Deny |
| Change Shift Location | Allow | Allow | Deny | Deny |
| Change Supervisor | Allow | Allow | Deny | Deny |
| View Edit History | Allow | Allow | Deny | Allow |

---

# 10. Manager Override

Managers may override supervisor edits when:

- Incorrect schedules are created.
- Operational requirements change.
- Supervisor is unavailable.

Manager overrides must:

- Be logged.
- Include reason.
- Preserve previous values.

---

# 11. Database Considerations

Current shift:

```
shifts

id

organization_id

branch_id

supervisor_id

date

start_time

end_time

status

updated_at
```

---

Edit history:

```
shift_edit_history

id

shift_id

field_changed

previous_value

new_value

changed_by

reason

created_at
```

---

# 12. Audit Requirements

The following actions require audit records:

- Shift time changes.
- Date changes.
- Branch changes.
- Supervisor changes.
- Operational overrides.

Audit records include:

- User.
- Shift.
- Change.
- Timestamp.

---

# 13. Future Enhancements

Future versions may support:

- Edit approval workflows.
- Employee acknowledgement.
- Automatic notification preferences.
- Change impact analysis.

---

# 14. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-002 Shift Lifecycle
- SHIFT-003 Shift States
- SHIFT-005 Shift Creation
- SHIFT-007 Shift Cancellation
- SHIFT-008 Shift Assignment
- SHIFT-009 Shift Reassignment
- SHIFT-011 Shift Conflicts
- SHIFT-012 Shift Validation Rules

---

# 15. Summary

Shift Editing provides controlled modification of operational shifts.

Supervisors manage normal adjustments.

Managers maintain oversight and intervention capability.

All changes remain traceable to protect scheduling accuracy and operational accountability.