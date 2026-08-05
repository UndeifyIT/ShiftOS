# ShiftOS Billing Permission Matrix

**Document ID:** PER-002-09

**Document Title:** Billing Permission Matrix

**Version:** 1.0.0

**Status:** Approved

**Classification:** Permission Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines all permissions related to subscription and billing management within ShiftOS.

Billing permissions govern subscription plans, invoices, payments, billing history and organization subscriptions.

The billing model follows the ShiftOS operational philosophy:

- Managers own billing during the MVP.
- Supervisors do not participate in billing.
- Staff have no billing access.
- The future Admin role will become the primary billing administrator.

---

# 2. Permission Values

| Value | Meaning |
|-------|---------|
| Allow | User may perform the action directly. |
| Deny | User cannot perform the action. |
| Request | User may submit the action for approval. |
| Future | Reserved for future functionality. |

---

# 3. Billing Permission Matrix

| Permission                         | Manager | Supervisor | Staff | Admin *(Future)* |
|------------------------------------|---------|------------|-------|------------------|
| View Subscription                  | Allow   | Deny       | Deny  | Allow            |
| View Current Plan                  | Allow   | Deny       | Deny  | Allow            |
| View Billing Dashboard             | Allow   | Deny       | Deny  | Allow            |
| View Billing History               | Allow   | Deny       | Deny  | Allow            |
| View Payment History               | Allow   | Deny       | Deny  | Allow            |
| View Invoices                      | Allow   | Deny       | Deny  | Allow            |
| Download Invoice                   | Allow   | Deny       | Deny  | Allow            |
| Upgrade Subscription               | Allow   | Deny       | Deny  | Allow            |
| Downgrade Subscription             | Allow   | Deny       | Deny  | Allow            |
| Change Subscription Plan           | Allow   | Deny       | Deny  | Allow            |
| Cancel Subscription                | Allow   | Deny       | Deny  | Allow            |
| Renew Subscription                 | Allow   | Deny       | Deny  | Allow            |
| Update Billing Information         | Allow   | Deny       | Deny  | Allow            |
| Update Payment Method              | Allow   | Deny       | Deny  | Allow            |
| View Upcoming Renewal              | Allow   | Deny       | Deny  | Allow            |
| Export Billing History             | Allow   | Deny       | Deny  | Allow            |

---

# 4. Permission Rules

## Billing Ownership

During the MVP, Managers are responsible for all billing and subscription activities.

Managers may manage subscriptions, payment methods, invoices and billing information.

---

## Supervisor Responsibilities

Supervisors have no access to subscription or billing information.

Operational responsibilities remain separate from financial administration.

---

## Staff Responsibilities

Staff members have no access to billing functionality.

---

## Future Admin Responsibilities

When introduced, the Admin role will become the primary billing administrator.

Admins may:

- Manage subscriptions.
- Update payment methods.
- Manage billing information.
- View invoices.
- Download invoices.
- Review payment history.

Operational permissions remain separate from billing administration.

---

# 5. Design Principles

## Separation of Responsibilities

Billing administration remains independent of operational workforce management.

---

## Financial Security

Only authorized business administrators may access financial information.

---

## Least Privilege

Billing permissions are limited to the minimum required for each role.

---

## Auditability

All subscription, billing and payment changes should generate permanent audit records.

---

# 6. Related Specifications

- PER-001 Role Definitions
- PER-002 Permission Matrix Index
- ORG-003 Subscription Ownership
- BILL-001 Billing Model
- BILL-002 Subscription Plans

---

# 7. Summary

The Billing Permission Matrix defines how subscription and financial administration are managed within ShiftOS.

Managers own billing during the MVP.

Supervisors and Staff have no billing permissions.

The future Admin role will become the primary billing administrator while remaining separate from operational workforce management.