# ShiftOS Multi-Tenant Model

**Document ID:** ORG-002

**Document Title:** Multi-Tenant Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Architecture Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the multi-tenant architecture model for ShiftOS.

The purpose of this document is to establish how multiple supermarket businesses can securely use the same ShiftOS platform while ensuring:

- Complete data isolation.
- Secure access control.
- Scalability.
- Maintainability.
- Enterprise readiness.

This model defines the relationship between:

- Platform.
- Tenants.
- Organizations.
- Users.
- Business data.

---

# 2. Multi-Tenancy Definition

Multi-tenancy is the architecture pattern where a single application instance serves multiple independent customers while keeping each customer's data isolated.

In ShiftOS:

- The platform is shared.
- The application infrastructure is shared.
- The database infrastructure is shared.
- Customer data is isolated.

Each supermarket business operates as its own tenant.

---

# 3. Multi-Tenant Hierarchy

ShiftOS follows this structure:

```
ShiftOS Platform

        |

Multiple Organizations / Tenants

        |

Branches

        |

Employees

        |

Operational Data

(Shifts, Attendance, Tasks, Reports)
```

---

# 4. Tenant Definition

A tenant represents an organization using ShiftOS.

For MVP:

Tenant = Organization

Example:

```
Tenant A

FreshMart Supermarkets


Tenant B

ValueFoods Retail


Tenant C

QuickBuy Stores
```

Each tenant has:

- Separate users.
- Separate employees.
- Separate branches.
- Separate operational records.

---

# 5. Tenant Isolation Principle

The primary security principle of ShiftOS is:

> A tenant must never access another tenant's data.

Example:

FreshMart users must never view:

- ValueFoods employees.
- ValueFoods schedules.
- ValueFoods attendance.
- ValueFoods reports.

Tenant boundaries are absolute.

---

# 6. Shared Infrastructure Model

ShiftOS will use a shared infrastructure model.

This means:

All customers share:

- Application code.
- Backend services.
- Database infrastructure.
- Deployment environment.

However:

Customer data remains logically separated.

---

# 7. Database Isolation Strategy

ShiftOS will use:

## Shared Database

A single PostgreSQL database.

---

## Shared Schema

Tables are shared across tenants.

---

## Tenant Identifier

Tenant-owned records contain organization ownership information.

Example:

```
employees

id
organization_id
name
role
status
```

```
shifts

id
organization_id
branch_id
employee_id
start_time
end_time
```

---

# 8. Organization ID Requirement

All tenant-owned data must have an organization reference.

Examples:

Required:

```
organization_id
```

on:

- Employees.
- Branches.
- Shifts.
- Attendance.
- Tasks.
- Reports.
- Announcements.

---

# 9. Row-Level Security

Supabase PostgreSQL Row-Level Security (RLS) will enforce tenant isolation.

RLS ensures that database queries automatically respect tenant boundaries.

Example:

A user from FreshMart:

Requests:

```
SELECT employees
```

The database automatically limits results to:

```
organization_id = FreshMart
```

---

# 10. Security Layers

Tenant isolation will exist across multiple layers.

---

## Layer 1 — Authentication

Determines:

- Who the user is.
- Their identity.

---

## Layer 2 — Membership

Determines:

- Which organization the user belongs to.
- Their role.

---

## Layer 3 — Authorization

Determines:

- What actions they can perform.

---

## Layer 4 — Database Security

Enforces:

- What data they can actually access.

---

# 11. Frontend Security Rules

The frontend must never be trusted for tenant isolation.

The application must not rely on:

- Hidden UI elements.
- Client-side checks.
- Local storage permissions.

Example:

Incorrect:

```
Hide another organization's employees from the UI.
```

Correct:

```
Database prevents another organization's employees from being returned.
```

---

# 12. Tenant Access Flow

Example:

A supermarket supervisor logs in.

Flow:

```
User Login

        |

Authentication

        |

Identify User

        |

Find Organization Membership

        |

Load Permissions

        |

Apply Tenant Restrictions

        |

Return Authorized Data
```

---

# 13. Cross-Tenant Access

Cross-tenant access is prohibited by default.

A user cannot:

- View another supermarket.
- Search another organization's employees.
- Access another company's reports.

---

# 14. Future Cross-Tenant Administration

Future enterprise support may require limited cross-tenant access.

Examples:

- ShiftOS support staff.
- Internal administrators.
- Enterprise account managers.

This must use:

- Explicit permissions.
- Audit logging.
- Strict controls.

---

# 15. Tenant Data Ownership

The tenant owns all business data created inside the organization.

Examples:

FreshMart owns:

- Employee records.
- Attendance history.
- Schedules.
- Tasks.
- Reports.

ShiftOS provides the platform but does not own customer operational data.

---

# 16. Tenant Lifecycle

Tenant lifecycle follows:

```
Created

   |

Trial

   |

Active

   |

Suspended

   |

Archived

   |

Deleted
```

---

# 17. Tenant Deletion

Tenant deletion must consider:

- Data retention.
- Compliance requirements.
- Backup systems.
- Recovery procedures.

Deletion should not immediately destroy historical records without proper handling.

---

# 18. Scalability Considerations

The multi-tenant model must support:

- Thousands of organizations.
- Millions of employees.
- Large volumes of attendance records.
- Large scheduling histories.

Future scaling strategies may include:

- Database optimization.
- Partitioning.
- Archiving.
- Dedicated infrastructure for large customers.

---

# 19. Non Goals

The MVP multi-tenant model will not support:

- Separate databases per customer.
- Custom infrastructure per customer.
- Customer-managed hosting.
- Complex enterprise tenant hierarchies.

These may be considered later.

---

# 20. Design Principles

## Secure By Default

Access must begin restricted.

---

## Data Isolation First

Tenant separation is more important than convenience.

---

## Shared Infrastructure

The platform should remain efficient and scalable.

---

## Future Enterprise Ready

The design should allow future expansion without rebuilding the foundation.

---

# 21. Relationship To Other Specifications

## Organization Domain

- ORG-001 Organization Model

Defines tenant ownership.

---

## Security Domain

- SEC-001 Authentication Model
- SEC-004 Authorization Model
- SEC-005 Row Level Security

Defines protection mechanisms.

---

## Permission Domain

- PER-001 Role Definitions

Defines user capabilities.

---

## Database Domain

- DB-001 Database Architecture

Defines implementation structure.

---

# 22. Summary

The ShiftOS multi-tenant model allows multiple supermarket organizations to securely operate on one shared SaaS platform.

The model provides:

- Strong tenant isolation.
- Secure data ownership.
- Scalable infrastructure.
- Enterprise readiness.

The organization is the tenant boundary, and every business operation must respect that boundary.
