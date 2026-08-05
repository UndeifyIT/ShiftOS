# ShiftOS Shift Creation

**Document ID:** SHIFT-005

**Document Title:** Shift Creation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the process for creating operational shifts within ShiftOS.

Shift Creation allows authorized users to create actual work periods that employees will be expected to attend.

A created shift becomes the foundation for:

- Scheduling.
- Attendance tracking.
- Task execution.
- Workforce reporting.

---

# 2. Shift Creation Principles

## 2.1 Creating A Shift Creates An Operational Record

A shift represents real planned work.

Example:

```
Branch:

Ikeja Branch


Date:

Monday 14 July 2026


Shift:

Morning Shift


Time:

08:00 - 16:00
```

---

## 2.2 Templates Are Optional

Users may create shifts:

- From a shift template.
- Manually.

Example:

```
Template:

Morning Shift

↓

Created Shift:

Monday Morning Shift
```

---

## 2.3 Creation Does Not Mean Execution

A created shift is not automatically active.

Lifecycle:

```
Created

↓

Draft

↓

Published

↓

Scheduled

↓

Active
```

---

# 3. Shift Creation Actors

## Supervisor

Primary shift creator.

Responsible for:

- Creating daily shifts.
- Preparing branch schedules.
- Assigning operational requirements.

---

## Manager

Can:

- Create shifts when necessary.
- Override supervisor workflows.
- Take operational control when required.

---

## Staff

Cannot:

- Create shifts.
- Edit shifts.
- Manage schedules.

---

# 4. Shift Creation Methods

ShiftOS supports two creation methods.

---

# 4.1 Create From Template

A user selects an existing template.

Example:

```
Template:

Opening Shift

Time:

08:00 - 16:00


Creates:

Monday Opening Shift
```

The user can adjust details before saving.

---

# 4.2 Manual Creation

A user creates a shift without a template.

Required information:

- Shift date.
- Start time.
- End time.
- Branch.
- Supervisor.

---

# 5. Shift Creation Data Requirements

A valid shift requires:

| Field | Required | Description |
|---|---|---|
| Organization | Yes | Owner business |
| Branch | Yes | Work location |
| Date | Yes | Shift date |
| Start Time | Yes | Expected start |
| End Time | Yes | Expected end |
| Supervisor | Yes | Operational owner |
| Template | Optional | Source template |
| Notes | Optional | Additional information |

---

# 6. Shift Creation Workflow

```
User Selects Create Shift

        |

Choose Template Or Manual Creation

        |

Enter Shift Details

        |

Validate Shift

        |

Save Draft Shift

        |

Publish When Ready
```

---

# 7. Shift Validation During Creation

Before saving, ShiftOS validates:

## Required Information

The system checks:

- Branch exists.
- Supervisor exists.
- Times are provided.
- Date is valid.

---

## Time Validation

The system checks:

- End time occurs after start time.
- Duration is reasonable.
- No invalid time ranges.

---

## Organizational Validation

The system checks:

- User has permission.
- Branch belongs to organization.
- Supervisor belongs to organization.

---

# 8. Duplicate Shift Prevention

The system should warn when:

- The same branch has overlapping shifts.
- The same supervisor is assigned to conflicting shifts.
- Employees may be double scheduled.

Example:

```
Warning:

Supervisor already assigned to:

Morning Shift

08:00 - 16:00
```

---

# 9. Shift Creation States

After creation:

| Creation Result | State |
|---|---|
| Saved but incomplete | Draft |
| Complete and released | Published |
| Added to schedule | Scheduled |

---

# 10. Shift Creation Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Shift Creation | Allow | Allow | Deny | Allow |
| Create Shift | Allow | Allow | Deny | Deny |
| Create From Template | Allow | Allow | Deny | Deny |
| Create Manual Shift | Allow | Allow | Deny | Deny |
| Save Draft Shift | Allow | Allow | Deny | Deny |
| Publish Created Shift | Allow | Allow | Deny | Deny |
| Delete Draft Shift | Allow | Allow | Deny | Deny |

---

# 11. Manager Override

Managers may create shifts when:

- Supervisor is unavailable.
- Emergency staffing changes occur.
- Operational takeover is required.

All overrides must generate audit records.

---

# 12. Shift Creation And Scheduling

Shift creation creates the operational unit.

Scheduling determines:

- When it occurs.
- Who works.
- How it appears in workforce planning.

---

# 13. Database Considerations

Shift creation stores:

```
shifts

id

organization_id

branch_id

template_id

supervisor_id

date

start_time

end_time

status

created_by

created_at
```

---

# 14. Audit Requirements

The following actions require audit records:

- Shift creation.
- Template usage.
- Manual creation.
- Draft saving.
- Publishing.
- Deletion.

Audit records include:

- Creator.
- Shift.
- Timestamp.
- Creation method.

---

# 15. Future Enhancements

Future versions may support:

- Bulk shift creation.
- Recurring schedules.
- AI-assisted scheduling.
- Availability matching.
- Automatic conflict resolution.

---

# 16. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-002 Shift Lifecycle
- SHIFT-003 Shift States
- SHIFT-004 Shift Templates
- SHIFT-006 Shift Editing
- SHIFT-008 Shift Assignment
- SHIFT-011 Shift Conflicts
- SHIFT-012 Shift Validation Rules

---

# 17. Summary

Shift Creation defines how operational shifts are created in ShiftOS.

Supervisors create daily workforce structures.

Managers provide oversight and intervention.

Created shifts become the foundation for scheduling, attendance and operational execution.