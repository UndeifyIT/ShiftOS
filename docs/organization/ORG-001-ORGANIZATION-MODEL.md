# ShiftOS Organization Model

**Document ID:** ORG-001

**Document Title:** Organization Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Organization Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the organizational structure within ShiftOS.

The Organization Model establishes how supermarket businesses are represented inside the platform and defines the relationship between:

- Organizations.
- Branches.
- Users.
- Employees.
- Workforce operations.

This model provides the foundation for:

- Multi-tenancy.
- Data ownership.
- Security isolation.
- Permissions.
- Subscription management.
- Reporting.
- Future expansion.

The goal of this model is to allow ShiftOS to support small independent supermarkets while also supporting future multi-branch retail organizations.

---

# 2. Organization Definition

An organization represents a business using ShiftOS.

It is the highest-level ownership entity within the platform.

For the MVP, an organization represents a supermarket business or supermarket group.

Examples:

- A single supermarket store.
- A supermarket chain operating multiple locations.
- A retail grocery business.

An organization is responsible for managing its workforce operations through ShiftOS.

---

# 3. Organization Hierarchy

ShiftOS follows the following hierarchy:

```
ShiftOS Platform

        |

Organization

        |

Branches

        |

Departments (Future)

        |

Employees

        |

Workforce Operations

(Shifts, Attendance, Tasks, Communication)
```

---

# 4. Example Organization Structure

Example:

```
Organization

FreshMart Supermarkets


        |

        +----------------+
        |                |
        |                |

    Ikeja Branch     Lekki Branch


        |                |
        |                |

 Store Manager     Store Manager


        |

 Supervisors


        |

 Employees

 - Cashiers
 - Shelf Stockers
 - Inventory Staff
 - Customer Service Staff
 - Security Staff
```

---

# 5. Organization Responsibilities

An organization owns and manages:

---

## 5.1 Business Identity

Including:

- Organization name.
- Logo.
- Contact information.
- Business settings.

---

## 5.2 Workforce Structure

Including:

- Branches.
- Employees.
- User access.
- Operational roles.

---

## 5.3 Operational Data

Including:

- Shifts.
- Attendance records.
- Tasks.
- Announcements.
- Reports.

---

## 5.4 Subscription Ownership

The organization is responsible for:

- Subscription plan.
- Billing status.
- Feature access.

---

# 6. Organization As The Tenant Boundary

Each organization represents a separate tenant within ShiftOS.

Tenant isolation means that every organization operates as an independent business environment.

A supermarket organization can only access its own:

- Employees.
- Branches.
- Shifts.
- Attendance.
- Tasks.
- Reports.
- Settings.

Example:

FreshMart employees must never appear inside another supermarket's account.

---

# 7. Organization Creation

Organizations can be created through:

---

## 7.1 Business Registration

A supermarket owner or administrator creates an account and establishes a new organization.

Example:

A supermarket owner creates:

```
Organization:
FreshMart Supermarkets
```

---

## 7.2 Invitation Flow

Existing organization administrators can invite users.

Examples:

- Store managers.
- Supervisors.
- Employees.

---

## 7.3 Future Enterprise Setup

Large supermarket groups may require assisted onboarding.

Examples:

- Franchise groups.
- National retail chains.
- Enterprise customers.

---

# 8. Organization Lifecycle

Organizations move through different lifecycle states.

---

# 8.1 Trial

A newly created organization evaluating ShiftOS.

Characteristics:

- Limited access period.
- Testing product workflows.
- Not yet subscribed.

---

# 8.2 Active

A fully operational organization using ShiftOS.

Characteristics:

- Active subscription.
- Normal platform access.
- Workforce operations enabled.

---

# 8.3 Suspended

An organization temporarily restricted.

Possible reasons:

- Subscription issues.
- Security concerns.
- Administrative action.

---

# 8.4 Archived

An organization that is no longer actively operating but retained for historical purposes.

---

# 8.5 Deleted

An organization permanently removed according to data retention policies.

---

# 9. Organization Ownership

Every organization must have an owner.

The owner is responsible for:

- Creating the organization.
- Managing subscription decisions.
- Managing organization settings.
- Controlling administrative access.

Ownership does not automatically bypass permissions.

All actions must still follow the permission system.

---

# 10. Organization Users

Users access organizations through membership.

A user membership determines:

- Which organization they belong to.
- Their assigned role.
- Their permissions.
- Their access scope.

Examples:

---

## Manager

Organization-level visibility.

Responsibilities:

- Workforce oversight.
- Branch management.
- Reports.

---

## Supervisor

Branch-level operations.

Responsibilities:

- Daily scheduling.
- Attendance monitoring.
- Task management.

---

## Employee

Personal workforce access.

Responsibilities:

- Viewing schedule.
- Completing assigned tasks.
- Managing attendance actions.

---

# 11. Organization And Branch Relationship

An organization may contain:

- One branch.
- Multiple branches.

---

## Single Branch Example

```
FreshMart Supermarkets

        |

    Ikeja Store
```

---

## Multi Branch Example

```
FreshMart Supermarkets

        |

        +--- Ikeja Store

        |

        +--- Lekki Store

        |

        +--- Yaba Store
```

---

# 12. Single Branch Support

ShiftOS must support small supermarkets with one location.

A single-store business should not experience unnecessary complexity.

The system should allow:

- Simple setup.
- Simple employee management.
- Simple scheduling.
- Simple reporting.

without requiring multi-branch configuration.

---

# 13. Multi Branch Support

Supermarket chains require centralized visibility.

The organization level provides:

- Total workforce overview.
- Branch comparison.
- Organization reporting.
- Central administration.

Branches provide:

- Local scheduling.
- Local attendance management.
- Local supervisors.
- Daily store operations.

---

# 14. Branch Ownership Rules

Branches belong to exactly one organization.

A branch cannot exist independently.

Valid:

```
Organization

      |

Branch
```

Invalid:

```
Branch

(no organization)
```

---

# 15. Organization Data Ownership

All business data must have a clear ownership path.

---

## Employee

Owned by:

Organization

Assigned to:

Branch

---

## Shift

Owned by:

Organization

Created for:

Branch

---

## Attendance

Owned by:

Organization

Associated with:

- Employee.
- Branch.
- Shift.

---

## Task

Owned by:

Organization

Assigned within:

Branch operations.

---

# 16. Organization Isolation Rules

The following rules apply:

---

## Rule 1

Users cannot access another organization's data.

---

## Rule 2

All tenant-owned records must contain organization ownership information.

---

## Rule 3

Authorization must be enforced server-side.

---

## Rule 4

The frontend must never be trusted for tenant security.

---

# 17. Organization Settings

Organization-level settings include:

---

## Business Settings

Examples:

- Organization name.
- Logo.
- Contact information.

---

## Workforce Settings

Examples:

- Attendance rules.
- Scheduling preferences.
- Shift settings.

---

## Notification Settings

Examples:

- Communication preferences.
- Alert settings.

---

# 18. Future Organization Capabilities

Future versions may support:

- Parent retail groups.
- Franchise structures.
- Regional management.
- Corporate hierarchy.
- Enterprise reporting.

These are not MVP requirements.

---

# 19. Non Goals

The organization model will not manage:

- Accounting structures.
- Payroll processing.
- Inventory management.
- Supplier management.
- Customer management.
- Point of sale operations.

These belong to separate systems or future ShiftOS modules.

---

# 20. Relationship To Other Specifications

## Organization Domain

Related documents:

- ORG-002 Multi Tenant Model
- ORG-003 Subscription Ownership
- ORG-004 Branch Structure

---

## User Domain

Related documents:

- USR-001 User Lifecycle
- USR-002 Authentication

---

## Permission Domain

Related documents:

- PER-001 Role Definitions
- PER-007 Branch Isolation
- PER-008 Organization Isolation

---

## Workforce Domains

Related documents:

- EMP Domain
- SHIFT Domain
- ATT Domain
- TASK Domain

---

# 21. Design Principles

## Clear Ownership

Every business record must have a clear owner.

---

## Secure By Default

Access begins restricted and expands through permissions.

---

## Growth Ready

A small supermarket should be able to grow into a multi-branch retail organization without restructuring.

---

## Avoid Premature Complexity

Enterprise capabilities should not complicate MVP workflows.

---

# 22. Summary

The organization represents the supermarket business using ShiftOS.

It is the foundation for:

- Tenant isolation.
- Branch management.
- Workforce operations.
- Subscription ownership.
- Reporting.

The organization model allows ShiftOS to support:

- Small independent supermarkets.
- Growing retail businesses.
- Future multi-branch supermarket chains.

while maintaining a secure and scalable SaaS architecture.
