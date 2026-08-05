# ShiftOS Business Settings Model

**Document ID:** ORG-006

**Document Title:** Business Settings Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Organization Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the business-level settings available within ShiftOS organizations.

The purpose of Business Settings is to establish how supermarket organizations configure their business identity and general platform preferences.

This document defines:

- Organization information.
- Business configuration.
- Communication preferences.
- General operational preferences.

---

# 2. Business Settings Definition

Business Settings represent configuration that applies across the entire organization.

Examples:

```
FreshMart Supermarkets

        |

Business Settings

- Business name
- Logo
- Contact information
- General preferences
```

---

# 3. Settings Ownership

Business settings belong to the organization.

Relationship:

```
Organization

        |

Business Settings
```

A branch does not own business settings.

---

# 4. Business Settings Categories

Business settings are divided into:

- Identity Settings.
- Contact Settings.
- Localization Settings.
- Communication Settings.
- Platform Preferences.

---

# 5. Organization Identity Settings

Identity settings define how the business appears within ShiftOS.

Includes:

## Business Name

Example:

```
FreshMart Supermarkets
```

---

## Business Logo

Used for:

- Organization branding.
- Reports.
- Future employee experiences.

---

## Business Description

Optional information describing the supermarket business.

---

## Business Type

MVP:

```
Supermarket / Retail
```

Future:

- Restaurant.
- Hospitality.
- Warehouse.
- Other industries.

---

# 6. Contact Information Settings

Organizations may store contact details.

Includes:

- Business email.
- Phone number.
- Address.

Purpose:

- Account communication.
- Organization identification.

---

# 7. Location Settings

Organization-level location settings include:

- Country.
- State.
- Time zone.
- Default location preferences.

Example:

```
Country:

Nigeria

Time Zone:

Africa/Lagos
```

---

# 8. Currency Settings

Organizations require a default currency.

MVP:

```
Nigerian Naira (NGN)
```

Future support:

- USD.
- GBP.
- Other currencies.

Currency affects:

- Future billing.
- Reports.
- Financial integrations.

---

# 9. Communication Settings

Organizations may configure communication preferences.

Examples:

## Notifications

- Email notifications.
- In-app notifications.

---

## Announcements

Preferences for organization-wide communication.

---

# 10. Platform Preferences

General preferences affecting organization experience.

Examples:

- Default language.
- Date format.
- Time format.

---

# 11. Business Settings Access

Access to business settings is permission controlled.

Example:

## Organization Owner

Can:

- Edit business identity.
- Manage organization preferences.

---

## Manager

May:

- View selected settings.

Cannot:

- Change ownership information.

---

## Supervisor

Normally:

- No access.

---

## Employee

No access.

---

# 12. Settings Change Management

Changes to important business settings should be recorded.

Examples:

- Organization name changes.
- Ownership changes.
- Major configuration updates.

---

# 13. Audit Requirements

Important changes should create audit records.

Example:

```
User:

John Manager


Action:

Changed organization name


Previous:

FreshMart


New:

FreshMart Supermarkets
```

---

# 14. Business Settings And Branches

Business settings apply across all branches.

Example:

```
Organization:

FreshMart

Currency:

NGN


Branches:

Ikeja

Lekki

Yaba
```

All branches inherit organization settings.

---

# 15. Branch-Specific Settings

Branch-specific configuration does not belong here.

Examples:

- Store opening hours.
- Branch address.
- Branch manager.
- Local operations.

These belong to:

ORG-004 Branch Structure.

---

# 16. Workforce Settings Boundary

The following do not belong in Business Settings:

- Shift rules.
- Attendance rules.
- Overtime rules.
- Scheduling rules.

These belong to workforce domains.

---

# 17. Non Goals

Business Settings will not manage:

- Inventory configuration.
- Product information.
- Payroll settings.
- Accounting settings.
- Supplier information.
- Customer information.

---

# 18. Future Business Settings

Future versions may support:

- Custom branding.
- Multiple currencies.
- Regional settings.
- Advanced organization preferences.
- Enterprise configurations.

---

# 19. Relationship To Other Specifications

## Organization Domain

- ORG-001 Organization Model
- ORG-004 Branch Structure

---

## Security Domain

- SEC-004 Authorization Model
- SEC-007 Audit Logging

---

## Workforce Domain

- EMP Domain
- SHIFT Domain
- ATT Domain

---

# 20. Design Principles

## Clear Ownership

Settings must belong to the correct domain.

---

## Avoid Settings Overload

Business settings should not become a storage location for unrelated configuration.

---

## Permission Controlled

Only authorized users can modify important settings.

---

## Future Ready

The model should allow expansion without restructuring.

---

# 21. Summary

Business Settings define how a supermarket organization is represented and configured inside ShiftOS.

They provide:

- Business identity.
- Organization preferences.
- Communication configuration.
- Platform customization.

Business Settings belong to the organization and provide the foundation for a consistent experience across all branches.