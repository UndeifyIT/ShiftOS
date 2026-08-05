# ShiftOS Shift Validation Rules

**Document ID:** SHIFT-012

**Document Title:** Shift Validation Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shift Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the validation rules applied to shifts throughout the ShiftOS scheduling lifecycle.

Validation ensures that shifts are operationally accurate, properly configured and compatible with workforce rules.

---

# 2. Validation Principles

## 2.1 Validation Protects Data Quality

ShiftOS must prevent invalid scheduling records.

Examples:

Invalid:

```
End Time:

08:00


Start Time:

16:00
```

Valid:

```
Start:

08:00


End:

16:00
```

---

## 2.2 Validation Should Not Replace Human Decisions

The system assists supervisors.

It does not replace operational judgment.

Example:

```
Warning:

Employee already has another shift nearby.


Supervisor Decision:

Continue
```

---

## 2.3 Validation Applies Throughout The Shift Lifecycle

Validation occurs during:

- Creation.
- Editing.
- Publishing.
- Assignment.
- Reassignment.
- Activation.

---

# 3. Core Shift Validation Rules

---

# 3.1 Required Information Validation

Every shift must contain:

| Field | Required |
|---|:---:|
| Organization | Yes |
| Branch | Yes |
| Date | Yes |
| Start Time | Yes |
| End Time | Yes |
| Supervisor | Yes |
| Status | Yes |

---

# 3.2 Organization Validation

The system checks:

- Shift belongs to a valid organization.
- Creator has access to organization.
- Branch belongs to organization.

Example:

```
User:

Organization A


Attempt:

Create shift in Organization B


Result:

Blocked
```

---

# 3.3 Branch Validation

The system checks:

- Branch exists.
- Branch is active.
- User has branch permission.

---

# 3.4 Time Validation

The system checks:

- Start time exists.
- End time exists.
- Duration is valid.

---

## Overnight Shift Support

ShiftOS must support overnight operations.

Example:

```
Start:

22:00


End:

06:00
```

This should be treated as:

```
22:00 today

↓

06:00 next day
```

---

# 3.5 Shift Duration Validation

The system checks:

- Minimum allowed duration.
- Maximum allowed duration.

Example:

Invalid:

```
00:00 - 23:59
```

unless organization rules allow it.

---

# 3.6 Date Validation

The system checks:

- Date format.
- Organization scheduling rules.
- Past date restrictions.

Example:

A supervisor should not create a new operational shift for a date already completed.

---

# 4. Assignment Validation Rules

When employees are assigned:

---

## 4.1 Employee Status

Employee must be:

Allowed:

```
Active
```

Not allowed:

```
Inactive

Suspended

Terminated
```

---

## 4.2 Organization Membership

Employee must belong to:

```
Same Organization
```

---

## 4.3 Branch Compatibility

Employee must:

- Belong to branch.
- Have permission to work branch.

---

## 4.4 Role Compatibility

The system checks:

Example:

```
Required:

Cashier


Employee:

Cashier


Result:

Valid
```

---

# 5. Conflict Validation

Before confirming changes, ShiftOS checks:

| Conflict | Validation |
|---|---|
| Employee overlap | Prevent impossible schedules |
| Supervisor overlap | Detect management conflicts |
| Duplicate assignment | Prevent duplicate records |
| Branch mismatch | Prevent invalid assignments |
| Role mismatch | Warn or block |

---

# 6. Publishing Validation

Before publishing a shift schedule:

System checks:

- Required information exists.
- No unresolved critical conflicts.
- Assigned employees are valid.
- Branch is active.

---

# 7. Editing Validation

When editing a shift:

System checks:

- User permission.
- Shift state.
- New values.
- Existing assignments.

---

Example:

Changing:

```
Branch A

↓

Branch B
```

requires:

- Branch validation.
- Employee compatibility check.

---

# 8. Cancellation Validation

Before cancellation:

System checks:

- User permission.
- Shift is not completed.
- Reason provided.

---

# 9. Validation Severity

| Severity | Meaning |
|---|---|
| Error | Action blocked |
| Warning | User decision required |
| Information | Awareness only |

---

# 10. Validation Examples

## Example 1

```
Create Shift

Branch:

Ikeja


Time:

08:00 - 16:00


Result:

Valid
```

---

## Example 2

```
Assign Employee

Employee:

Inactive


Result:

Blocked
```

---

## Example 3

```
Assign Employee

Existing Shift:

08:00 - 16:00


New Shift:

15:00 - 20:00


Result:

Warning
```

---

# 11. Validation Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Validation Errors | Allow | Allow | Deny | Allow |
| Resolve Validation Issues | Allow | Allow | Deny | Deny |
| Override Warnings | Allow | Allow | Deny | Deny |
| Override Critical Errors | Allow | Request | Deny | Deny |
| View Validation History | Allow | Allow | Deny | Allow |

---

# 12. Database Considerations

Validation records:

```
shift_validation_events

id

shift_id

validation_type

severity

message

resolved_by

created_at
```

---

# 13. Audit Requirements

The system must record:

- Validation failure.
- Override action.
- User responsible.
- Reason.
- Timestamp.

---

# 14. Future Enhancements

Future capabilities:

- Organization-specific validation rules.
- Custom overtime rules.
- Labour compliance rules.
- AI scheduling validation.
- Predictive conflict detection.

---

# 15. Related Specifications

- SHIFT-001 Shift Definition
- SHIFT-003 Shift States
- SHIFT-005 Shift Creation
- SHIFT-006 Shift Editing
- SHIFT-008 Shift Assignment
- SHIFT-009 Shift Reassignment
- SHIFT-011 Shift Conflicts

---

# 16. Summary

Shift Validation Rules protect scheduling accuracy by ensuring shifts are properly configured before entering operational use.

The system prevents invalid data while allowing supervisors and managers the flexibility required for real-world workforce operations.