# ShiftOS Organization Management Permission Matrix

**Document ID:** PER-002-01

**Document Title:** Organization Management Permission Matrix

**Version:** 2.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to organization management within ShiftOS.

Organization management includes business information, branches, departments, subscription management and organization-wide settings.

The organization management model follows the ShiftOS operational philosophy:

- Managers own and control the organization.
- Supervisors manage daily operations but do not administer the business.
- Staff have no organization management permissions.
- The future Admin role manages business administration such as subscriptions while remaining read-only for operational activities.

---

# 2. Permission Values

| Value   | Meaning                                      |
|----------|----------------------------------------------|
| Allow    | User may perform the action directly.         |
| Deny     | User cannot perform the action.               |
| Request  | User may submit the action for approval.      |
| Future   | Reserved for future functionality.            |

---

# 3. Organization Permission Matrix

| Permission                              | Manager | Supervisor | Staff | Admin *(Future)* |
|-----------------------------------------|---------|------------|-------|------------------|
| View Organization Profile               | Allow   | Allow      | Deny  | Allow            |
| View Organization Details               | Allow   | Allow      | Deny  | Allow            |
| Edit Organization Details               | Allow   | Deny       | Deny  | Deny             |
| View Business Settings                  | Allow   | Allow      | Deny  | Allow            |
| Edit Business Settings                  | Allow   | Deny       | Deny  | Deny             |
| View Branches                           | Allow   | Allow      | Deny  | Allow            |
| Create Branch                           | Allow   | Deny       | Deny  | Deny             |
| Edit Branch                             | Allow   | Deny       | Deny  | Deny             |
| Archive Branch                          | Allow   | Deny       | Deny  | Deny             |
| Restore Branch                          | Allow   | Deny       | Deny  | Deny             |
| View Departments                        | Allow   | Allow      | Deny  | Allow            |
| Create Department                       | Allow   | Deny       | Deny  | Deny             |
| Edit Department                         | Allow   | Deny       | Deny  | Deny             |
| Archive Department                      | Allow   | Deny       | Deny  | Deny             |
| View Subscription                       | Allow   | Deny       | Deny  | Allow            |
| Upgrade Subscription                    | Allow   | Deny       | Deny  | Allow            |
| Downgrade Subscription                  | Allow   | Deny       | Deny  | Allow            |
| Cancel Subscription                     | Allow   | Deny       | Deny  | Allow            |
| View Billing History                    | Allow   | Deny       | Deny  | Allow            |
| Download Billing Invoices               | Allow   | Deny       | Deny  | Allow            |
| View Organization Audit Logs            | Allow   | Deny       | Deny  | Allow            |
| Export Organization Data                | Allow   | Deny       | Deny  | Allow            |

---

# 4. Permission Rules

## Organization Ownership

The Manager owns the organization and is responsible for all business-level decisions.

Managers may configure organization information, branches, departments and operational settings.

---

## Supervisor Responsibilities

Supervisors focus exclusively on daily branch operations.

Supervisors cannot modify organization-level settings.

---

## Future Admin Responsibilities

The future Admin role is intended to support business administration.

The Admin may:

- View organization information.
- Manage subscriptions.
- Access billing.
- Download invoices.
- View audit logs.

The Admin cannot modify operational settings or participate in day-to-day workforce management.

---

## Staff Access

Staff members do not have access to organization management functionality.

---

# 5. Design Principles

## Separation of Responsibilities

Operational management and business administration remain separate responsibilities.

---

## Least Privilege

Each role receives only the permissions necessary for its responsibilities.

---

## Operational Independence

Daily branch operations continue independently of business administration activities.

---

## Auditability

All organization-level changes should generate permanent audit records.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model
- ORG-003 Subscription Ownership
- ORG-004 Branch Structure
- ORG-005 Departments
- ORG-006 Business Settings

---

# 7. Summary

The Organization Management Permission Matrix defines how organization-level administration is managed within ShiftOS.

Managers own and administer the organization.

Supervisors focus on operational management.

Staff have no organization management permissions.

The future Admin role supports subscriptions and business administration while remaining read-only for operational activities.