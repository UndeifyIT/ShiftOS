# ShiftOS Branch Structure Model

**Document ID:** ORG-004

**Document Title:** Branch Structure Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Organization Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines how branches are structured within ShiftOS.

The purpose of the Branch Structure Model is to establish how supermarket locations are represented and managed within an organization.

This model defines:

- Branch ownership.
- Branch responsibilities.
- Branch-level operations.
- Branch access.
- Relationship between organizations and locations.

---

# 2. Branch Definition

A branch represents a physical supermarket location operated by an organization.

Examples:

- Ikeja Store.
- Lekki Store.
- Yaba Store.

A branch is where daily workforce operations occur.

---

# 3. Branch Relationship

Every branch belongs to exactly one organization.

Relationship:

```
Organization

        |

        +--- Branch 1

        +--- Branch 2

        +--- Branch 3
```

A branch cannot exist without an organization.

---

# 4. Branch Responsibilities

A branch is responsible for local operations.

Including:

- Employees working at the location.
- Shift schedules.
- Attendance tracking.
- Daily tasks.
- Supervisor management.

---

# 5. Example Supermarket Structure

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

 Supervisor       Supervisor


        |                |
        |                |

 Employees        Employees

 Cashiers         Cashiers

 Stockers         Stockers

 Inventory        Inventory
```

---

# 6. Branch Information

A branch contains information about a physical location.

Examples:

## Basic Information

- Branch name.
- Branch code.
- Address.
- Contact information.

---

## Operational Information

- Operating hours.
- Assigned managers.
- Active status.

---

# 7. Branch Lifecycle

Branches have their own lifecycle.

Possible states:

---

## Active

The branch is operational.

Employees can be scheduled.

---

## Inactive

The branch temporarily stops operations.

Employees and historical data remain preserved.

---

## Closed

The branch permanently stops operations.

Historical records remain available.

---

# 8. Single Branch Organizations

ShiftOS must support supermarkets with only one location.

Example:

```
FreshMart

    |

Ikeja Store
```

The user experience should not force small businesses to manage unnecessary branch complexity.

---

# 9. Multi-Branch Organizations

ShiftOS must support supermarket chains.

Example:

```
FreshMart

    |

    +--- Ikeja Store

    +--- Lekki Store

    +--- Yaba Store

    +--- Surulere Store
```

Multi-branch organizations require:

- Central visibility.
- Branch separation.
- Branch-level management.

---

# 10. Branch Ownership Rules

The following rules apply:

## Rule 1

A branch must belong to one organization.

---

## Rule 2

A branch cannot belong to multiple organizations.

---

## Rule 3

Employees assigned to a branch must belong to the same organization.

---

## Rule 4

Operational records created within a branch must maintain organization ownership.

---

# 11. Branch Access Model

Branch access is controlled through permissions.

Examples:

---

## Organization Owner

Can access:

- All branches.
- Organization reports.
- Organization settings.

---

## Manager

Can access:

- Assigned branches.
- Workforce information.
- Reports.

---

## Supervisor

Can access:

- Assigned branch operations.

---

## Employee

Can access:

- Their own information.
- Their assigned branch activities.

---

# 12. Branch And Employees

Employees are associated with branches.

Example:

```
Employee:

John

Organization:

FreshMart

Branch:

Ikeja Store
```

---

# 13. Employee Transfers Between Branches

Future versions may support employee transfers.

Example:

```
Employee

Ikeja Store

        |

Transfer

        |

Lekki Store
```

Requirements:

- Maintain history.
- Preserve attendance records.
- Maintain audit trail.

---

# 14. Branch And Scheduling

Schedules are primarily created at branch level.

Example:

```
Ikeja Store

Monday

Morning Shift:

- Cashier A
- Stocker B

Evening Shift:

- Cashier C
- Supervisor D
```

---

# 15. Branch And Attendance

Attendance records are associated with:

- Employee.
- Branch.
- Shift.

Example:

```
Employee:

John

Branch:

Ikeja Store

Shift:

Morning Shift

Attendance:

Present
```

---

# 16. Branch And Tasks

Tasks are usually created and completed within a branch.

Examples:

Opening tasks:

- Prepare store entrance.
- Check shelves.

Daily tasks:

- Restock products.
- Clean aisles.

Closing tasks:

- Secure store.
- Complete closing checklist.

---

# 17. Branch Reporting

Branch-level reporting may include:

- Attendance rates.
- Shift coverage.
- Task completion.
- Workforce activity.

Organization-level users may compare branches.

---

# 18. Branch Isolation

Branch isolation ensures users only see locations they are permitted to access.

Example:

A supervisor assigned to Ikeja Store cannot manage Lekki Store unless permission is granted.

---

# 19. Branch Data Ownership

Branch-owned data includes:

- Employees assigned to branch.
- Shifts.
- Attendance.
- Tasks.
- Local announcements.

However, all branch data remains owned by the organization.

---

# 20. Branch Deactivation

When a branch closes:

The system should:

- Prevent new scheduling.
- Preserve historical records.
- Maintain reporting access.
- Keep audit history.

---

# 21. Non Goals

The MVP branch model will not include:

- Inventory management.
- Product catalogs.
- Point of sale systems.
- Supplier management.
- Warehouse hierarchy.

These belong to future modules or external systems.

---

# 22. Future Branch Capabilities

Future versions may support:

- Regional managers.
- District structures.
- Franchise locations.
- Branch performance analytics.
- Store benchmarking.

---

# 23. Relationship To Other Specifications

## Organization Domain

- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model
- ORG-003 Subscription Ownership

---

## Workforce Domain

- EMP-001 Employee Model
- SHIFT-001 Scheduling Model
- ATT-001 Attendance Model
- TASK-001 Task Model

---

## Permission Domain

- PER-001 Role Definitions
- PER-007 Branch Access Rules

---

# 24. Design Principles

## Location-Based Operations

Supermarket work happens at branch level.

---

## Simple Growth

A single store must naturally scale into multiple locations.

---

## Clear Ownership

Every branch belongs to one organization.

---

## Controlled Access

Users only access branches they are authorized to manage.

---

# 25. Summary

The branch is the operational location where supermarket workforce activities happen.

The Branch Structure Model allows ShiftOS to support:

- Independent supermarkets.
- Growing retail businesses.
- Multi-location supermarket chains.

while maintaining:

- Security.
- Clear ownership.
- Operational simplicity.
- Future scalability.