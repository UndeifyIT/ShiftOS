# ShiftOS Scheduling Permission Matrix

**Document ID:** PER-002-02

**Document Title:** Scheduling Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the permissions governing shift scheduling within ShiftOS.

Scheduling permissions determine which users can create, modify, publish and oversee employee schedules.

The scheduling model follows the ShiftOS operational philosophy:

- Supervisors manage scheduling.
- Managers oversee scheduling.
- Staff consume schedules.
- Admins have read-only visibility for business administration.

---

# 2. Permission Values

| Value | Meaning |
|:------|:--------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Scheduling Permission Matrix

| Permission                          | Manager | Supervisor | Staff | Admin *(Future)* |
|-------------------------------------|:-------:|:----------:|:-----:|:----------------:|
| View Schedule Calendar              | Allow   | Allow      | Allow | Allow            |
| View Personal Schedule              | Allow   | Allow      | Allow | Allow            |
| View Shift Details                  | Allow   | Allow      | Allow | Allow            |
| View Schedule History               | Allow   | Allow      | Deny  | Allow            |
| View Scheduling Dashboard           | Allow   | Allow      | Deny  | Allow            |
| View Scheduling Analytics           | Allow   | Allow      | Deny  | Allow            |
| View Unassigned Shifts              | Allow   | Allow      | Deny  | Allow            |
| Create Shift Template               | Deny    | Allow      | Deny  | Deny             |
| Edit Shift Template                 | Allow   | Allow      | Deny  | Deny             |
| Delete Shift Template               | Allow   | Allow      | Deny  | Deny             |
| Duplicate Shift Template            | Allow   | Allow      | Deny  | Deny             |
| Create Schedule                     | Deny    | Allow      | Deny  | Deny             |
| Edit Draft Schedule                 | Deny    | Allow      | Deny  | Deny             |
| Delete Draft Schedule               | Deny    | Allow      | Deny  | Deny             |
| Publish Schedule                    | Allow   | Allow      | Deny  | Deny             |
| Edit Published Schedule             | Allow   | Deny       | Deny  | Deny             |
| Override Published Schedule         | Allow   | Deny       | Deny  | Deny             |
| Assign Employee to Shift            | Deny    | Allow      | Deny  | Deny             |
| Remove Employee from Shift          | Deny    | Allow      | Deny  | Deny             |
| Reassign Employee to Shift          | Deny    | Allow      | Deny  | Deny             |
| Move Shift                          | Deny    | Allow      | Deny  | Deny             |
| Copy Schedule                       | Deny    | Allow      | Deny  | Deny             |
| Cancel Shift                        | Allow   | Allow      | Deny  | Deny             |
| Mark Shift as Open                  | Deny    | Allow      | Deny  | Deny             |
| Resolve Scheduling Conflict         | Deny    | Allow      | Deny  | Deny             |
| Approve Shift Swap                  | Deny    | Allow      | Deny  | Deny             |
| Reject Shift Swap                   | Deny    | Allow      | Deny  | Deny             |
| Export Schedule                     | Allow   | Allow      | Deny  | Allow            |
| Receive Schedule Published Alert    | Allow   | Deny       | Deny  | Deny             |

---

# 4. Permission Rules

## Scheduling Ownership

Scheduling is primarily the responsibility of Supervisors.

Managers are responsible for ensuring schedules meet operational requirements but do not routinely create schedules.

---

## Shift Templates

Shift templates are created and maintained by Supervisors.

Managers may edit or remove templates to maintain operational consistency.

---

## Published Schedules

Supervisors may publish schedules once they are complete.

Managers are automatically notified whenever a schedule is published.

Managers may intervene by editing or overriding a published schedule if operational changes are required.

---

## Shift Assignments

Only Supervisors may assign, remove or reassign employees during normal operations.

Managers intervene only when necessary.

---

## Shift Swaps

Supervisors review and approve shift swap requests.

Managers may override decisions when operational continuity requires intervention.

---

## Read-Only Administration

The future Admin role may view scheduling information and export schedules but cannot create, edit, publish or approve schedules.

---

# 5. Design Principles

## Operational Ownership

Supervisors own the scheduling process.

---

## Management Oversight

Managers oversee scheduling quality and intervene only when required.

---

## Least Privilege

Users receive only the permissions required to perform their responsibilities.

---

## Auditability

Every published schedule, edit and override should generate an audit log.

---

## Scalability

The permission model supports future expansion without redesigning existing permissions.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- SCH-001 Shift Scheduling
- SCH-002 Shift Templates
- SCH-003 Shift Swaps

---

# 7. Summary

The Scheduling Permission Matrix reflects the operational structure of shift-based businesses.

Supervisors are responsible for creating and maintaining schedules.

Managers oversee scheduling and intervene when operationally necessary.

Staff members consume schedules but do not manage them.

The future Admin role has read-only scheduling visibility and does not participate in operational scheduling activities.