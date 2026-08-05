# ShiftOS Shift Templates

**Document ID:** SHIFT-004

**Document Title:** Shift Templates

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines reusable Shift Templates within ShiftOS.

Shift Templates allow organizations to create predefined shift structures that can be reused when creating schedules.

Templates reduce repetitive manual scheduling work while maintaining operational flexibility.

---

# 2. Shift Template Definition

A Shift Template is a reusable configuration that defines the standard structure of a shift.

A template contains:

- Shift name.
- Default time range.
- Default duration.
- Branch applicability.
- Operational notes.

A template does not represent an actual working shift.

---

# 3. Template vs Shift

## Shift Template

A reusable blueprint.

Example:

```
Template:

Morning Shift

Time:

08:00 - 16:00
```

---

## Shift

A real scheduled occurrence.

Example:

```
Shift:

Monday 14 July

Morning Shift

08:00 - 16:00

Assigned Employees:
5 Staff Members
```

---

# 4. Shift Template Principles

## 4.1 Templates Do Not Track Attendance

Attendance belongs to actual shifts.

Example:

```
Template:

Morning Shift


Attendance:

Not Available
```

---

## 4.2 Templates Do Not Have Employees

Employees are assigned when creating actual shifts.

Example:

```
Template:

Night Shift


Employees:

None
```

---

## 4.3 Templates Are Organization Owned

Each organization manages its own templates.

Example:

```
Organization A:

Morning Shift
Night Shift


Organization B:

Opening Shift
Closing Shift
```

Templates cannot be shared between organizations.

---

# 5. Template Components

| Component | Description |
|---|---|
| Template ID | Unique identifier |
| Organization | Owner organization |
| Name | Template name |
| Start Time | Default start time |
| End Time | Default end time |
| Duration | Expected shift length |
| Branch Scope | Where template can be used |
| Notes | Additional instructions |
| Status | Active or Archived |

---

# 6. Template Examples

## Retail

```
Opening Shift

08:00 - 16:00
```

```
Closing Shift

16:00 - 00:00
```

---

## Restaurant

```
Kitchen Morning

09:00 - 17:00
```

```
Evening Service

17:00 - 01:00
```

---

# 7. Template Lifecycle

Templates follow this lifecycle:

```
Created

   |

Active

   |

Archived
```

---

# 8. Template States

## Active

Available for creating shifts.

---

## Archived

No longer available for new shifts.

Existing shifts created from the template remain unchanged.

---

# 9. Template Management

## Creating Templates

Authorized users may create templates.

Required:

- Template name.
- Start time.
- End time.

---

## Editing Templates

Changing a template does not modify existing shifts.

Example:

```
Template:

Morning Shift

08:00 - 16:00


Changed To:

07:00 - 15:00
```

Existing shifts remain:

```
08:00 - 16:00
```

---

## Archiving Templates

Archived templates:

- Cannot create new shifts.
- Remain available historically.
- Do not affect existing shifts.

---

# 10. Template Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Templates | Allow | Allow | Deny | Allow |
| Create Template | Deny | Allow | Deny | Deny |
| Edit Template | Allow | Allow | Deny | Deny |
| Archive Template | Allow | Allow | Deny | Deny |
| Restore Template | Allow | Allow | Deny | Deny |
| Create Shift From Template | Allow | Allow | Deny | Deny |
| Export Template Data | Allow | Allow | Deny | Allow |

---

# 11. Manager Oversight

Managers may:

- View templates.
- Modify templates.
- Override supervisor-created templates.

Managers do not normally create daily shifts.

---

# 12. Supervisor Responsibility

Supervisors manage operational templates.

They may:

- Create reusable shift structures.
- Maintain branch scheduling patterns.
- Create shifts using templates.

---

# 13. Template Validation Rules

Templates must validate:

Required:

```
Name

+

Start Time

+

End Time
```

The system must check:

- End time is valid.
- Duration is within allowed limits.
- Template belongs to correct organization.

---

# 14. Database Considerations

Shift templates:

```
shift_templates

id

organization_id

branch_id

name

start_time

end_time

duration

status

created_by

created_at
```

---

Shift creation reference:

```
shifts

id

template_id

organization_id

branch_id

date

start_time

end_time
```

---

# 15. Audit Requirements

The following actions require audit records:

- Template creation.
- Template editing.
- Template archiving.
- Template restoration.

Audit records include:

- User.
- Template.
- Action.
- Timestamp.

---

# 16. Future Enhancements

Future versions may support:

- Recurring templates.
- Weekly schedule generation.
- Employee preference matching.
- Availability rules.
- AI-assisted scheduling.

---

# 17. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-002 Shift Lifecycle
- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing
- SHIFT-008 Shift Assignment
- SHIFT-011 Shift Conflicts

---

# 18. Summary

Shift Templates provide reusable scheduling structures.

Templates simplify shift creation without replacing actual scheduling decisions.

Actual shifts remain the source of truth for attendance, operations and reporting.