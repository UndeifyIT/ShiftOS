# ShiftOS Schedule Editing

**Document ID:** SCH-006

**Document Title:** Schedule Editing

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedules may be edited within ShiftOS.

Schedule editing allows supervisors and managers to modify schedules before and, where operationally necessary, after publication while maintaining complete auditability and minimizing disruption to branch operations.

---

# 2. Editing Principles

## 2.1 Schedules Are Editable Throughout Their Lifecycle

Schedules may be edited depending on their current lifecycle state.

The amount of editing permitted becomes more restrictive as the schedule progresses.

---

## 2.2 Editing Does Not Remove Audit History

Every modification creates an audit record.

Previous values are never lost.

---

## 2.3 Operational Stability Takes Priority

Changes to published schedules should be minimized.

Where changes affect employees, ShiftOS should notify affected users.

---

## 2.4 Employees Cannot Edit Schedules

Employees have no permission to edit schedules.

They only view schedules assigned to them.

---

# 3. Editable Schedule Information

The following schedule information may be edited when permitted:

- Schedule name _(optional)_
- Planning period _(Draft only)_
- Assigned supervisor
- Shift collection
- Employee assignments
- Schedule notes
- Internal comments

---

# 4. Editing By Schedule State

## Draft

Fully editable.

Users may:

- Add shifts
- Remove shifts
- Edit shifts
- Assign employees
- Remove assignments
- Change planning dates
- Delete schedule

---

## Ready

Limited editing.

Users may:

- Correct schedule details
- Resolve validation issues
- Return schedule to Draft

Major structural changes are discouraged.

---

## Published

Operational editing only.

Examples:

- Replace unavailable employee
- Add emergency shift
- Remove cancelled shift
- Correct scheduling mistakes

Any significant change should notify affected employees.

---

## Active

Restricted editing.

Allowed examples:

- Reassign upcoming shifts
- Replace absent employees
- Add emergency cover shifts

Completed shifts cannot be modified.

---

## Completed

No operational editing.

Historical records remain read-only.

---

## Archived

No editing permitted.

---

## Cancelled

No editing permitted.

---

# 5. Shift Editing

Editing a schedule may include:

- Adding shifts
- Removing shifts
- Editing shift details
- Updating staffing levels
- Changing assigned supervisor

Individual shift rules are defined in:

- SHIFT-006 Shift Editing

---

# 6. Employee Assignment Changes

Users may:

- Assign employees
- Remove employees
- Replace employees
- Reassign employees between shifts

Every assignment change is validated for:

- Scheduling conflicts
- Availability
- Branch assignment
- Employment status

---

# 7. Validation During Editing

ShiftOS validates:

- Branch consistency
- Date validity
- Shift overlap
- Employee conflicts
- Supervisor conflicts
- Staffing requirements

Invalid edits are rejected.

---

# 8. Notifications

When editing published schedules, ShiftOS should notify affected employees.

Examples:

- Shift added
- Shift removed
- Shift reassigned
- Shift time changed

Notification delivery is defined separately in the Notification Domain.

---

# 9. Editing Permissions

| Permission                 | Manager | Supervisor |       Staff        | Admin _(Future)_ |
| -------------------------- | :-----: | :--------: | :----------------: | :--------------: |
| View Schedule              |  Allow  |   Allow    | Own Published Only |      Allow       |
| Edit Draft Schedule        |  Allow  |   Allow    |        Deny        |       Deny       |
| Edit Published Schedule    |  Allow  |   Allow    |        Deny        |       Deny       |
| Edit Active Schedule       |  Allow  |   Allow    |        Deny        |       Deny       |
| Add Shift                  |  Allow  |   Allow    |        Deny        |       Deny       |
| Remove Shift               |  Allow  |   Allow    |        Deny        |       Deny       |
| Reassign Employee          |  Allow  |   Allow    |        Deny        |       Deny       |
| Change Assigned Supervisor |  Allow  |    Deny    |        Deny        |       Deny       |
| Delete Draft Schedule      |  Allow  |   Allow    |        Deny        |       Deny       |
| View Edit History          |  Allow  |   Allow    |        Deny        |      Allow       |

---

# 10. Manager Overrides

Managers may override supervisor decisions when operationally necessary.

Examples:

- Correct staffing shortages
- Resolve scheduling conflicts
- Cover supervisor absence
- Handle emergency operational changes

All overrides generate audit records.

---

# 11. Database Considerations

Relevant fields:

```
updated_at

updated_by

version
```

Recommended audit table:

```
schedule_edit_history

id

schedule_id

edited_by

field_changed

old_value

new_value

edited_at
```

---

# 12. Audit Requirements

The following events generate audit records:

- Schedule edited
- Shift added
- Shift removed
- Employee reassigned
- Supervisor changed
- Manager override

Audit records include:

- User
- Schedule
- Action
- Previous value
- New value
- Timestamp

---

# 13. Future Enhancements

Future versions may support:

- Approval before major schedule edits
- Bulk editing tools
- AI-assisted schedule optimization
- Automatic conflict resolution
- Scheduled future edits
- Undo/rollback functionality

---

# 14. Related Specifications

- SCH-001 Schedule Definition
- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-005 Schedule Creation
- SCH-007 Schedule Publishing
- SHIFT-006 Shift Editing
- SHIFT-009 Shift Reassignment

---

# 15. Summary

Schedule Editing allows supervisors and managers to modify schedules throughout their operational lifecycle while protecting schedule integrity.

Draft schedules are fully editable, while published and active schedules permit only operationally necessary changes.

All edits are validated, audited and, where appropriate, communicated to affected employees, ensuring transparency, accountability and reliable workforce operations.
