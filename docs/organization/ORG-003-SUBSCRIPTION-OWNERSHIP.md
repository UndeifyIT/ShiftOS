# ShiftOS Subscription Ownership Model

**Document ID:** ORG-003

**Document Title:** Subscription Ownership Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Organization Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines how subscriptions are owned, managed and associated with organizations within ShiftOS.

The purpose of this model is to establish:

- Who owns a subscription.
- How subscription access is granted.
- How plans affect platform capabilities.
- How organizations transition between subscription states.

This document provides the foundation for:

- Billing.
- Feature access.
- Account management.
- Future monetization systems.

---

# 2. Subscription Ownership Principle

The organization is the owner of the ShiftOS subscription.

A subscription belongs to the business using ShiftOS.

Users do not own subscriptions individually.

---

Example:

```
FreshMart Supermarkets

        |

ShiftOS Subscription

        |

Users

- Owner
- Manager
- Supervisors
- Employees
```

---

# 3. Why Organizations Own Subscriptions

ShiftOS is a business operations platform.

The value provided is for the entire organization, including:

- Workforce management.
- Scheduling.
- Attendance.
- Tasks.
- Reporting.

Therefore, subscription ownership belongs at the organization level.

---

# 4. Subscription Relationship

The relationship is:

```
Organization

        |

Subscription

        |

Subscription Plan

        |

Feature Access
```

---

Example:

```
FreshMart Supermarkets

Subscription:

Growth Plan

Includes:

- 100 employees
- 5 branches
- Advanced reports
- Task management
```

---

# 5. Subscription Components

A subscription consists of:

---

## 5.1 Subscription Owner

The organization that pays for and uses ShiftOS.

---

## 5.2 Subscription Plan

Defines available capabilities.

Examples:

- Starter.
- Growth.
- Business.
- Enterprise.

---

## 5.3 Subscription Status

Defines current access state.

Examples:

- Trial.
- Active.
- Past Due.
- Suspended.
- Cancelled.

---

## 5.4 Subscription Limits

Defines usage boundaries.

Examples:

- Maximum employees.
- Maximum branches.
- Available features.

---

# 6. Subscription Lifecycle

Subscriptions follow a lifecycle.

```
Trial

   |

Active

   |

Past Due

   |

Suspended

   |

Cancelled

   |

Archived
```

---

# 7. Trial Subscription

A newly created organization may begin with a trial period.

Purpose:

Allow supermarkets to evaluate ShiftOS before subscribing.

Trial access may include:

- Core workforce features.
- Limited users.
- Limited branches.

---

# 8. Active Subscription

An active subscription means:

- Payment is valid.
- Organization has platform access.
- Features are available according to plan.

---

# 9. Past Due Subscription

A subscription becomes past due when payment requirements are not satisfied.

Possible actions:

- Payment reminders.
- Grace period.
- Limited restrictions.

---

# 10. Suspended Subscription

A suspended subscription temporarily restricts organization access.

Possible reasons:

- Extended payment failure.
- Security concerns.
- Account review.

---

# 11. Cancelled Subscription

A cancelled subscription means the organization has chosen to stop using ShiftOS.

The organization may:

- Continue access until the billing period ends.
- Enter archived status later.

---

# 12. Subscription Plans

Initial subscription plans:

---

# Starter Plan

Target:

Small supermarkets.

Limits:

- Up to 25 employees.
- Single branch.

Purpose:

Replace manual processes.

---

# Growth Plan

Target:

Growing supermarket businesses.

Limits:

- Up to 100 employees.
- Multiple branches.

Purpose:

Primary business plan.

---

# Business Plan

Target:

Large supermarket operators.

Limits:

- Up to 500 employees.
- Multiple locations.

Purpose:

Advanced operations.

---

# Enterprise Plan

Target:

Large retail organizations.

Limits:

Custom.

---

# 13. Feature Access

Subscription plans determine available features.

Example:

Starter:

- Employee management.
- Basic scheduling.
- Attendance.

Growth:

Includes Starter plus:

- Advanced scheduling.
- Tasks.
- Reports.

Business:

Includes Growth plus:

- Advanced analytics.
- Additional controls.

---

# 14. Subscription Enforcement

Feature access must be enforced through:

- Backend authorization.
- Subscription checks.
- Server-side validation.

The frontend must not be responsible for protecting paid features.

---

Incorrect:

```
Hide premium feature button.
```

Correct:

```
Backend checks subscription entitlement before allowing action.
```

---

# 15. Employee Access

Employees do not require individual subscriptions.

Their access is provided through their organization's subscription.

Example:

```
FreshMart Subscription

        |

50 Employees

        |

All employees access approved features
```

---

# 16. Branch Limits

Subscription plans may limit the number of branches.

Example:

Starter:

1 branch

Growth:

5 branches

Business:

25 branches

---

# 17. Employee Limits

Subscription plans may limit workforce size.

Example:

Starter:

25 employees

Growth:

100 employees

Business:

500 employees

---

# 18. Subscription Upgrade

Organizations may upgrade when they require:

- More employees.
- More branches.
- Additional features.

Example:

```
Starter

    |

Growth

    |

Business
```

---

# 19. Subscription Downgrade

Downgrades require validation.

Potential issues:

- Current employee count exceeds limits.
- Branch count exceeds limits.
- Premium features are actively used.

The system must handle downgrade scenarios safely.

---

# 20. Non Goals

The MVP subscription model will not include:

- Individual employee payments.
- Marketplace billing.
- Complex enterprise contracts.
- Usage-based billing.
- Custom pricing automation.

---

# 21. Future Subscription Capabilities

Future versions may support:

- Add-ons.
- Custom enterprise packages.
- Usage-based pricing.
- Regional pricing.
- Partner billing.
- Invoice management.

---

# 22. Security Considerations

Subscription data must be protected.

Requirements:

- Only authorized users can view billing information.
- Subscription changes must be audited.
- Payment information must not be stored insecurely.

---

# 23. Relationship To Other Specifications

## Organization Domain

- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model

---

## Security Domain

- SEC-001 Authentication
- SEC-004 Authorization

---

## Pricing Domain

- PF-012 Pricing Strategy

---

## Billing Domain

Future:

- BILL-001 Billing Architecture

---

# 24. Design Principles

## Organization Owned

Subscriptions belong to businesses, not individuals.

---

## Predictable Pricing

Customers should understand what they are paying for.

---

## Secure Enforcement

Paid capabilities must be protected server-side.

---

## Growth Friendly

Customers should naturally upgrade as operations grow.

---

# 25. Summary

The ShiftOS subscription model places ownership at the organization level.

This allows supermarket businesses to purchase ShiftOS as an operational platform for their entire workforce.

The model supports:

- Simple SME pricing.
- Multi-branch growth.
- Future enterprise expansion.
- Secure feature management.

The organization is the customer, and users receive access through that organization's subscription.