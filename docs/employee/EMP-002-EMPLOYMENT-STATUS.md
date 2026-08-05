# ShiftOS Employment Status

**Document ID:** EMP-002

**Document Title:** Employment Status

**Version:** 1.0.0

**Status:** Approved

**Classification:** Employee Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the employment status lifecycle used within ShiftOS.

Employment Status represents the current relationship between an employee and the organization.

Employment Status is separate from user account access status.

---

# 2. Objectives

Employment Status exists to:

- Track employee lifecycle.
- Support workforce reporting.
- Maintain historical employment records.
- Control operational eligibility.
- Preserve employee history after departure.

---

# 3. Employment Status Model

An employee moves through different employment states during their relationship with an organization.

Example:

```
Pending
   |
   ▼
Active
   |
   ├──────────────┐
   ▼              ▼
On Leave      Suspended
   |              |
   ▼              ▼
Active        Active

   |
   ▼

Terminated

   |
   ▼

Archived
```

---

# 4. Employment Status Values

| Status | Description |
|---|---|
| Pending | Employee record created but employment has not started. |
| Active | Employee currently works for the organization. |
| On Leave | Employee remains employed but is temporarily unavailable. |
| Suspended | Employee remains employed but cannot currently perform normal duties. |
| Terminated | Employment relationship has ended. |
| Archived | Historical employee record retained but no longer operational. |

---

# 5. Status Definitions

## Pending

Used when:

- Employee has been added before their start date.
- Employment details are being completed.
- Onboarding has not finished.

Restrictions:

- Cannot be scheduled.
- Cannot be assigned operational tasks.
- Cannot record attendance.

---

## Active

The normal working state.

Active employees may:

- Be scheduled.
- Have attendance recorded.
- Receive tasks.
- Appear in workforce operations.

---

## On Leave

Used when an employee temporarily stops normal duties.

Examples:

- Approved leave.
- Extended absence.
- Temporary non-working period.

Restrictions:

- Cannot be scheduled during leave period.
- Historical records remain available.

---

## Suspended

Used when employment continues but operational access is temporarily restricted.

Examples:

- Investigation period.
- Temporary removal from duties.

Restrictions:

- Cannot be scheduled.
- Cannot perform assigned work.

---

## Terminated

Used when employment ends.

Examples:

- Employee resigns.
- Employment contract ends.
- Organization ends employment.

Effects:

- Cannot be scheduled.
- Cannot receive new tasks.
- Removed from active workforce views.

Historical data remains available.

---

## Archived

Used for long-term record storage.

Archived employees:

- Remain searchable where permitted.
- Cannot participate in operations.
- Cannot receive new assignments.

---

# 6. Employment Status Rules

## Rule 1 — Status Controls Operational Eligibility

Only eligible employment statuses may participate in workforce operations.

Example:

Only Active employees can:

- Receive schedules.
- Receive tasks.
- Have attendance recorded.

---

## Rule 2 — Employment Status Does Not Control Login Access

Employment status and account status are separate.

Example:

```
Employee Status:
Active

Account Status:
Suspended
```

The employee still exists but cannot access ShiftOS.

---

## Rule 3 — Status Changes Must Be Audited

Every employment status change must record:

- Previous status.
- New status.
- Reason.
- User making the change.
- Date and time.

---

## Rule 4 — Historical Data Must Be Preserved

Changing employment status must not delete:

- Attendance history.
- Schedule history.
- Task history.
- Employment records.

---

# 7. Employment Status Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Employee Status | Allow | Allow | Deny | Allow |
| Change Employee Status | Allow | Request | Deny | Deny |
| Request Suspension | Deny | Allow | Deny | Deny |
| Approve Suspension | Allow | Deny | Deny | Deny |
| Terminate Employee | Allow | Request | Deny | Deny |
| Restore Employee Status | Allow | Request | Deny | Deny |
| View Status History | Allow | Allow | Deny | Allow |

---

# 8. Status Change Approval Rules

Certain status changes may require approval.

Examples:

| Action | Approval Required |
|---|---|
| Active → On Leave | Organization policy dependent |
| Active → Suspended | Manager approval required |
| Active → Terminated | Manager approval required |
| Suspended → Active | Manager approval required |

---

# 9. Employment Status And Scheduling

Scheduling rules:

| Employment Status | Can Schedule? |
|---|---|
| Pending | No |
| Active | Yes |
| On Leave | No |
| Suspended | No |
| Terminated | No |
| Archived | No |

---

# 10. Database Considerations

Employee status should be stored separately from employment history.

Current state:

```
employees
    |
    └── employment_status
```

Historical changes:

```
employment_history
    |
    ├── previous_status
    ├── new_status
    ├── changed_by
    └── timestamp
```

---

# 11. Future Enhancements

Future versions may support:

- Leave management.
- Probation periods.
- Contract expiry.
- Automatic status changes.
- HR integrations.

---

# 12. Related Specifications

- EMP-001 Employee Profile
- EMP-005 Employment History
- USR-003 Account Status
- PER-004 Approval Workflow
- ATT-001 Attendance Model
- SCH-001 Scheduling Model

---

# 13. Summary

Employment Status defines the employee's relationship with the organization.

It controls workforce eligibility while remaining independent from authentication and account access.

Employee history is preserved regardless of status changes to support reporting, compliance and operational visibility.