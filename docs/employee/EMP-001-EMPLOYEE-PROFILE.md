# ShiftOS Employee Profile

**Document ID:** EMP-001

**Document Title:** Employee Profile

**Version:** 1.0.0

**Status:** Approved

**Classification:** Employee Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the Employee Profile model within ShiftOS.

The Employee Profile represents a person's employment relationship with an organization.

Employee records are separate from user accounts.

An employee may exist without having access to ShiftOS.

---

# 2. Objectives

The Employee Profile exists to:

- Maintain accurate workforce records.
- Support scheduling and attendance operations.
- Provide employee identification.
- Support workforce reporting.
- Maintain employment history.
- Separate workforce data from authentication data.

---

# 3. Employee Model Relationship

ShiftOS separates:

## User Account

Represents access to the ShiftOS platform.

Examples:

- Login credentials.
- Sessions.
- Permissions.
- Authentication status.

---

## Employee Record

Represents a person's relationship with a business.

Examples:

- Name.
- Employment details.
- Branch assignment.
- Position.
- Employment status.

---

Relationship:

```
Organization

    |
    |
Employee

    |
    |
(Optional)

User Account
```

---

# 4. Employee Ownership

Every employee record belongs to:

- One organization.
- One primary branch.
- One employment relationship.

Employee records must never exist without organization ownership.

---

# 5. Employee Profile Information

## Personal Information

The employee profile contains:

| Field | Description | Required |
|---|---|---|
| Employee ID | Unique identifier within organization | Yes |
| First Name | Employee first name | Yes |
| Last Name | Employee surname | Yes |
| Profile Photo | Optional employee image | No |
| Date of Birth | Employee birth date | No |
| Gender | Employee gender information | No |
| Phone Number | Employee contact number | No |
| Email Address | Employee email address | No |

---

## Employment Information

| Field | Description | Required |
|---|---|---|
| Employment Type | Full-time, part-time, temporary, etc. | Yes |
| Employment Status | Current employment state | Yes |
| Position | Employee job position | Yes |
| Department | Assigned department | Yes |
| Branch | Assigned branch | Yes |
| Start Date | Employment start date | Yes |
| End Date | Employment end date | No |

---

# 6. Employee Profile Rules

## Rule 1 — Employee Records Are Organization-Owned

Employee information belongs to the organization that created the record.

Employees cannot transfer themselves between organizations.

---

## Rule 2 — Employee ID Uniqueness

Employee IDs must be unique within an organization.

Different organizations may have identical employee IDs.

Example:

Organization A:

```
EMP-001
```

Organization B:

```
EMP-001
```

Both are valid.

---

## Rule 3 — Employee Does Not Require Login Access

Creating an employee record does not automatically create:

- User account.
- Login credentials.
- Permissions.

Access must be separately granted through invitation workflows.

---

## Rule 4 — Employee Information History

Changes to important employee information should be recorded.

Examples:

- Branch changes.
- Position changes.
- Employment status changes.

---

# 7. Employee Profile Permissions

| Action | Manager | Supervisor | Staff | Admin *(Future)* |
|---|:---:|:---:|:---:|:---:|
| View Employee Directory | Allow | Allow | Deny | Allow |
| View Employee Profile | Allow | Allow | Deny | Allow |
| Create Employee Record | Deny | Allow | Deny | Deny |
| Edit Employee Information | Allow | Allow | Deny | Deny |
| Delete Employee Record | Deny | Deny | Deny | Deny |
| Archive Employee Record | Allow | Request | Deny | Deny |
| View Employee History | Allow | Allow | Deny | Allow |

---

# 8. Employee Data Restrictions

Employees cannot:

- View other employee profiles.
- Modify their employment information.
- Change their branch.
- Change their position.
- Modify attendance records.

---

# 9. Employee Profile Audit Requirements

The system should record changes to:

- Employee creation.
- Profile updates.
- Branch changes.
- Position changes.
- Status changes.
- Record archival.

Audit records should contain:

- User making the change.
- Date and time.
- Previous value.
- New value.

---

# 10. Future Enhancements

Future versions may support:

- Employee documents.
- Certifications.
- Emergency contacts.
- Payroll integrations.
- Performance records.
- Employee self-service portal.

---

# 11. Related Specifications

- DEC-016 — User Identity Separate From Employee Records
- EMP-002 — Employment Status
- EMP-003 — Branch Assignment
- EMP-004 — Positions & Roles
- EMP-005 — Employment History
- USR-001 — User Identity Model
- ORG-002 — Organization Model

---

# 12. Summary

The Employee Profile is the foundation of the ShiftOS workforce domain.

It represents the employee's relationship with a business while remaining separate from authentication and platform access.

Employee records support workforce operations including scheduling, attendance, tasks and reporting.