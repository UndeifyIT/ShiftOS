# ShiftOS Workforce Permission Matrix

**Document ID:** PER-002-01

**Document Title:** Workforce Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to workforce management within ShiftOS.

These permissions govern employee administration, invitations, workforce visibility, role management, and operational workforce control.

Scheduling, attendance, tasks, and other operational permissions are defined in their respective permission matrices.

---

# 2. Permission Values

| Value | Meaning |
|--------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for manager approval. |
| Future | Reserved for future implementation. |

---

# 3. Workforce Permission Matrix
| Permission                         | Manager | Supervisor | Staff | Admin *(Future)* |
|------------------------------------|:-------:|:----------:|:-----:|:----------------:|
| View Employee Directory            | Allow   | Allow      | Deny  | Allow            |
| View Employee Profile              | Allow   | Allow      | Deny  | Allow            |
| Search Employees                   | Allow   | Allow      | Deny  | Allow            |
| Filter Employees                   | Allow   | Allow      | Deny  | Allow            |
| View Employee Contact Information  | Allow   | Allow      | Deny  | Allow            |
| View Workforce Dashboard           | Allow   | Allow      | Deny  | Allow            |
| View Workforce Summary             | Allow   | Allow      | Deny  | Allow            |
| View Workforce Activity            | Allow   | Allow      | Deny  | Allow            |
| View Workforce History             | Allow   | Allow      | Deny  | Allow            |
| View Branch Workforce              | Allow   | Allow      | Deny  | Allow            |
| View Department Workforce          | Allow   | Allow      | Deny  | Allow            |
| Invite Supervisor                  | Allow   | Deny       | Deny  | Deny             |
| Cancel Supervisor Invitation       | Allow   | Deny       | Deny  | Deny             |
| Resend Supervisor Invitation       | Allow   | Deny       | Deny  | Deny             |
| Invite Staff                       | Deny    | Allow      | Deny  | Deny             |
| Cancel Staff Invitation            | Deny    | Allow      | Deny  | Deny             |
| Resend Staff Invitation            | Deny    | Allow      | Deny  | Deny             |
| View Pending Invitations           | Allow   | Allow      | Deny  | Allow            |
| Promote Staff to Supervisor        | Allow   | Request    | Deny  | Deny             |
| Demote Supervisor to Staff         | Allow   | Request    | Deny  | Deny             |
| Assign Supervisor to Branch        | Allow   | Deny       | Deny  | Deny             |
| Reassign Supervisor                | Allow   | Deny       | Deny  | Deny             |
| Request Employee Deactivation      | Deny    | Allow      | Deny  | Deny             |
| Approve Employee Deactivation      | Allow   | Deny       | Deny  | Deny             |
| Reject Employee Deactivation       | Allow   | Deny       | Deny  | Deny             |
| Reactivate Employee                | Allow   | Deny       | Deny  | Deny             |
| View Employee Status               | Allow   | Allow      | Deny  | Allow            |
| View Employee Employment History   | Allow   | Allow      | Deny  | Allow            |     |
---

# 4. Permission Rules

## Invitations

Managers invite Supervisors.

Supervisors invite Staff.

This delegation model reflects the operational hierarchy used within supermarkets and other shift-based businesses.

---

## Promotions & Demotions

Only Managers may directly promote or demote users.

Supervisors may submit promotion or demotion requests for approval.

---

## Employee Deactivation

Supervisors cannot deactivate employees directly.

Instead, they submit a deactivation request.

Managers review and approve or reject the request.

---

## Workforce Visibility

Managers may view workforce information across all branches they manage.

Supervisors may only view workforce information for branches assigned to them.

---

## Historical Records

Historical workforce records are never removed because an employee leaves the organization or loses platform access.

Historical information remains available for reporting and auditing purposes.

---

# 5. Design Principles

## Operational Delegation

Managers oversee workforce operations.

Supervisors execute day-to-day workforce administration.

---

## Least Privilege

Users receive only the permissions required for their operational responsibilities.

---

## Approval Workflows

High-impact workforce actions use approval workflows rather than unrestricted access.

---

## Auditability

Every workforce action affecting employees should generate an audit log.

---

## Scalability

The permission model supports future roles without requiring changes to existing permissions.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- USR-001 User Lifecycle
- ORG-001 Organization Model
- EMP-001 Employee Model

---

# 7. Summary

The Workforce Permission Matrix defines the permissions governing workforce administration within ShiftOS.

Managers retain oversight and approval authority.

Supervisors handle operational workforce management.

Staff members have no workforce administration permissions.

The permission model reflects real-world supermarket operations while remaining scalable for future platform growth.