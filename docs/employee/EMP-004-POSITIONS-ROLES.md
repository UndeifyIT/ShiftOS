# ShiftOS Positions & Roles

**Document ID:** EMP-004

**Document Title:** Positions & Roles

**Version:** 1.0.0

**Status:** Approved

**Classification:** Employee Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how employee positions and operational roles are managed within ShiftOS.

Positions describe an employee's job function.

Roles describe an employee's operational responsibility and system access level.

---

# 2. Objectives

Positions & Roles exist to:

- Identify employee responsibilities.
- Support scheduling decisions.
- Support workforce reporting.
- Define operational ownership.
- Control system permissions.

---

# 3. Position vs Role

## Position

A position represents the employee's job within the organization.

Examples:

```
Cashier

Chef

Sales Assistant

Warehouse Associate

Pharmacy Assistant
```

Positions answer:

> "What work does this employee perform?"

---

## Operational Role

An operational role represents responsibility within ShiftOS.

Examples:

```
Manager

Supervisor

Staff
```

Roles answer:

> "What responsibility does this person have?"

---

# 4. Relationship Model

```
Employee

    |
    |
    ├── Position
    |
    |
    └── Operational Role

            |
            |
            └── Permissions
```

Example:

```
Employee:
John

Position:
Cashier

Operational Role:
Staff

Permissions:
Staff Permissions
```

---

# 5. MVP Operational Roles

ShiftOS supports three primary operational roles.

---

## Manager

Responsible for:

- Organization oversight.
- Supervisor management.
- Workforce visibility.
- Approvals.
- Business decisions.

Managers have the highest operational authority within the organization.

---

## Supervisor

Responsible for:

- Daily branch operations.
- Staff coordination.
- Scheduling execution.
- Attendance management.
- Task coordination.

Supervisors manage day-to-day workforce activity.

---

## Staff

Responsible for:

- Performing assigned work.
- Following schedules.
- Receiving operational communication.

Staff have limited operational access.

---

# 6. Future Administrative Role

A future Admin role may support:

- Subscription management.
- Organization administration.
- Business settings.

Admin does not replace operational roles.

Example:

```
Admin
 |
 ├── Billing
 ├── Organization Settings
 └── Administration

Manager
 |
 ├── Workforce
 ├── Scheduling
 └── Operations
```

---

# 7. Position Management

Organizations may create custom positions.

Examples:

Restaurant:

```
Chef
Waiter
Cashier
Cleaner
```

Retail:

```
Sales Associate
Store Assistant
Inventory Clerk
```

---

# 8. Position Rules

## Rule 1 — Positions Belong To Organizations

Each organization manages its own positions.

Example:

```
Organization A

Cashier
Chef

Organization B

Cashier
Driver
```

Positions are not globally shared.

---

## Rule 2 — Positions Do Not Grant Permissions

A position does not determine system access.

Example:

```
Position:
Cashier

Does NOT automatically mean:

Access:
Staff permissions
```

The operational role determines permissions.

---

## Rule 3 — Employees Must Have One Primary Position

An employee has one primary position.

Future versions may support multiple positions.

---

# 9. Role Assignment Rules

## Manager Assignment

Managers can:

- Assign supervisors.
- Change operational roles.
- Approve role changes.

---

## Supervisor Assignment

Supervisors:

- Cannot directly promote employees.
- May request role changes.

---

## Staff

Staff cannot:

- Change their role.
- Assign roles.
- Manage positions.

---

# 10. Permissions

| Permission | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Employee Position | Allow | Allow | Deny | Allow |
| Create Position | Allow | Deny | Deny | Deny |
| Edit Position | Allow | Deny | Deny | Deny |
| Archive Position | Allow | Deny | Deny | Deny |
| Assign Employee Position | Allow | Allow | Deny | Deny |
| Change Employee Position | Allow | Request | Deny | Deny |
| View Operational Roles | Allow | Allow | Deny | Allow |
| Change Employee Operational Role | Allow | Request | Deny | Deny |
| Promote Staff To Supervisor | Allow | Request | Deny | Deny |
| Assign Manager Role | Deny | Deny | Deny | Future |

---

# 11. Role Change Rules

Role changes must:

- Be authorized.
- Generate audit records.
- Preserve previous role history.

Example:

```
Staff

↓

Supervisor

↓

Manager
```

The system must record:

- Previous role.
- New role.
- Changed by.
- Date.

---

# 12. Database Considerations

Employee:

```
employees

id
organization_id
position_id
operational_role
```

Positions:

```
positions

id
organization_id
name
description
status
```

Role history:

```
employee_role_history

id
employee_id
previous_role
new_role
changed_by
timestamp
```

---

# 13. Audit Requirements

Record:

- Position creation.
- Position updates.
- Position assignment.
- Role changes.
- Approval decisions.

---

# 14. Future Enhancements

Future versions may support:

- Multiple positions.
- Skills.
- Certifications.
- Position requirements.
- Automatic scheduling based on skills.

---

# 15. Related Specifications

- EMP-001 Employee Profile
- EMP-005 Employment History
- PER-001 Role Definitions
- PER-002 Permission Matrix
- PER-004 Approval Workflow

---

# 16. Summary

Positions define what employees do.

Operational roles define responsibility and system access.

ShiftOS keeps these concepts separate to support flexible workforce management while maintaining secure permissions.