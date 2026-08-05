# ShiftOS Schedule Validation

**Document ID:** SCH-012

**Document Title:** Schedule Validation

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS validates schedules before they become operational.

Schedule Validation ensures that schedules are complete, internally consistent and operationally feasible before publication.

Validation helps prevent scheduling errors, staffing issues and operational disruptions while maintaining data integrity across the platform.

---

# 2. Validation Principles

## 2.1 Every Schedule Is Validated

Every schedule must pass validation before it can be published.

Validation occurs automatically whenever a user attempts to publish a schedule.

---

## 2.2 Validation Protects Operations

Validation exists to detect issues before they affect daily operations.

Examples include:

- Missing shift assignments.
- Employee conflicts.
- Invalid shift configurations.
- Overlapping schedules.

---

## 2.3 Validation Does Not Modify Data

Validation only evaluates a schedule.

It never changes, corrects or removes schedule information automatically.

Users remain responsible for resolving validation issues.

---

## 2.4 Validation Results Are Predictable

The same schedule should always produce the same validation result unless its data changes.

Validation rules must be deterministic and consistently applied.

---

# 3. Validation Categories

ShiftOS validates the following areas:

- Schedule information
- Shift structure
- Employee assignments
- Supervisor assignments
- Time consistency
- Branch consistency
- Business rules

---

# 4. Schedule Validation Rules

The schedule must:

- Belong to an active organization.
- Belong to an active branch.
- Have a valid planning period.
- Contain at least one shift.
- Have a valid status.
- Have a responsible supervisor assigned.

---

# 5. Shift Validation

Every shift must:

- Have a valid start time.
- Have a valid end time.
- Belong to the schedule.
- Have a valid date.
- Have a valid shift type.
- Pass all rules defined in **SHIFT-012 Shift Validation Rules**.

---

# 6. Employee Validation

Assigned employees must:

- Be active employees.
- Belong to the same organization.
- Belong to the assigned branch.
- Be eligible for scheduling.
- Not be assigned to overlapping shifts.
- Not exceed organization scheduling limits _(where configured)_.

---

# 7. Supervisor Validation

The assigned supervisor must:

- Be active.
- Belong to the branch.
- Have supervisor permissions.
- Be eligible to manage the schedule.

---

# 8. Time Validation

ShiftOS validates:

- Shift start before shift end.
- No negative durations.
- No invalid dates.
- Valid planning period.
- Valid schedule boundaries.

---

# 9. Conflict Validation

The system checks for:

- Employee double-booking.
- Supervisor conflicts.
- Duplicate shifts.
- Overlapping shifts.
- Branch conflicts.
- Invalid assignments.

Critical conflicts prevent publication.

---

# 10. Validation Results

Validation results are classified into three levels.

## Error

Critical issue.

Publication is blocked.

Examples:

- No shifts.
- Invalid dates.
- Employee assigned to overlapping shifts.
- Missing required information.

---

## Warning

Potential operational issue.

Publication may still proceed.

Examples:

- Low staffing level.
- Long working day.
- Unassigned optional shift.

Organization policies may determine whether warnings require acknowledgement.

---

## Information

Non-blocking recommendations.

Examples:

- Shift created recently.
- Schedule differs from previous week.
- Optional staffing recommendation.

Information messages never prevent publication.

---

# 11. Validation Workflow

```
Draft Schedule

↓

Run Validation

↓

Errors?

↓

Yes

↓

Resolve Errors

↓

Run Validation Again

↓

No Errors

↓

Publish Schedule
```

---

# 12. Validation Permissions

| Permission                          | Manager | Supervisor | Staff | Admin _(Future)_ |
| ----------------------------------- | :-----: | :--------: | :---: | :--------------: |
| Run Schedule Validation             |  Allow  |   Allow    | Deny  |       Deny       |
| View Validation Results             |  Allow  |   Allow    | Deny  |      Allow       |
| Publish After Successful Validation |  Allow  |   Allow    | Deny  |       Deny       |
| Override Validation Warnings        |  Allow  |   Allow    | Deny  |       Deny       |
| Override Validation Errors          |  Allow  |    Deny    | Deny  |       Deny       |
| View Validation History             |  Allow  |   Allow    | Deny  |      Allow       |

---

# 13. Database Considerations

Validation should be performed dynamically.

Validation results should **not** be permanently stored unless required for auditing.

Recommended audit table:

```
schedule_validation_history

id

schedule_id

validated_by

validation_result

error_count

warning_count

validated_at
```

Individual validation messages may be stored separately if historical analysis is required.

---

# 14. Audit Requirements

The following events generate audit records:

- Validation completed.
- Validation failed.
- Validation passed.
- Manager validation override.
- Schedule published after validation.

Audit records include:

- User.
- Schedule.
- Validation outcome.
- Timestamp.

---

# 15. Future Enhancements

Future versions may support:

- AI-assisted validation.
- Staffing optimization recommendations.
- Labour cost validation.
- Skills and certification validation.
- Compliance rule validation.
- Predictive conflict detection.
- Organization-specific validation rules.

---

# 16. Related Specifications

- SCH-005 Schedule Creation
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SCH-008 Schedule Versioning
- SHIFT-011 Shift Conflicts
- SHIFT-012 Shift Validation Rules
- EMP-002 Employment Status

---

# 17. Summary

Schedule Validation ensures that every schedule meets operational and business requirements before publication.

By validating schedules, shifts, employee assignments, supervisors and scheduling conflicts, ShiftOS helps organizations prevent operational issues before they affect daily workforce operations.

Validation provides predictable, auditable quality control while allowing managers and supervisors to confidently publish schedules that are accurate, complete and ready for execution.
