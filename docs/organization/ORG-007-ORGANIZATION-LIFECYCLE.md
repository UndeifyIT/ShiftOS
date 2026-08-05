# ShiftOS Organization Lifecycle Model

**Document ID:** ORG-007

**Document Title:** Organization Lifecycle Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Organization Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the lifecycle of organizations within ShiftOS.

The purpose of the Organization Lifecycle Model is to establish how supermarket businesses move through different operational states from creation to closure.

This document defines:

- Organization states.
- Lifecycle transitions.
- State responsibilities.
- Data handling requirements.

---

# 2. Organization Lifecycle Definition

An organization lifecycle represents the journey of a supermarket business account within ShiftOS.

Example:

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

# 3. Lifecycle Principles

The organization lifecycle follows these principles:

## Data Preservation

Historical business records must remain protected.

---

## Clear State Management

Every organization must have a clear current state.

---

## Controlled Transitions

Organizations should only move between valid states.

---

## Separation Of Concerns

Organization status must not be confused with:

- Subscription status.
- Branch status.
- User status.

---

# 4. Organization States

Organizations may exist in the following states:

- Pending Setup.
- Trial.
- Active.
- Suspended.
- Archived.
- Deleted.

---

# 5. Pending Setup State

## Definition

The organization has been created but onboarding has not been completed.

Example:

A supermarket owner creates an account but has not finished setup.

---

## Characteristics

The organization may:

- Complete onboarding.
- Add business information.
- Create first branch.
- Invite users.

---

## Restrictions

The organization may have limited access until setup completion.

---

# 6. Trial State

## Definition

The organization is evaluating ShiftOS before subscribing.

Example:

A supermarket testing employee scheduling and attendance management.

---

## Characteristics

The organization can:

- Configure business settings.
- Add employees.
- Test workflows.

---

## Restrictions

Trial limitations may apply:

- Limited employees.
- Limited branches.
- Limited features.

---

# 7. Active State

## Definition

The organization is fully operational on ShiftOS.

This is the normal operating state.

---

## Characteristics

The organization can:

- Manage branches.
- Manage employees.
- Create schedules.
- Track attendance.
- Use enabled features.

---

# 8. Suspended State

## Definition

The organization is temporarily restricted from normal usage.

Suspension does not mean deletion.

---

## Possible Reasons

Examples:

- Subscription problems.
- Security review.
- Policy violation.
- Administrative action.

---

## Characteristics

The organization may:

- Retain data.
- Access limited functions.

Restrictions may include:

- Preventing new operations.
- Limiting user access.

---

# 9. Archived State

## Definition

The organization is no longer actively using ShiftOS but historical data is retained.

Examples:

- Business closed.
- Customer left platform.
- Organization replaced account.

---

## Characteristics

Archived organizations:

- Cannot perform normal operations.
- Preserve historical records.
- Remain available for controlled access.

---

# 10. Deleted State

## Definition

The organization has been permanently removed according to data retention rules.

Deletion is a controlled process.

---

## Requirements Before Deletion

The system must consider:

- Legal requirements.
- Data retention policies.
- Backups.
- Recovery requirements.

---

# 11. Lifecycle Transitions

Allowed transitions:

```
Pending Setup

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

# 12. Invalid Transitions

The system should prevent invalid transitions.

Examples:

Invalid:

```
Deleted

        |

Active
```

Invalid:

```
Archived

        |

Trial
```

---

# 13. Organization Creation Flow

Example:

```
Business Owner Registers

        |

Organization Created

        |

Setup Completed

        |

Trial Started

        |

Subscription Activated

        |

Active Organization
```

---

# 14. Organization Activation Requirements

Before becoming active, the organization should have:

Required:

- Organization name.
- Owner account.
- At least one branch.
- Required business information.

---

# 15. Organization Suspension Behaviour

When suspended:

The system must define:

## User Access

Whether users:

- Lose access.
- Have read-only access.
- Have limited access.

---

## Data

Data remains preserved.

---

## Recovery

The organization may return to active status.

---

# 16. Organization Archiving Behaviour

When archived:

The system should:

- Stop operational activity.
- Preserve history.
- Maintain reporting availability where appropriate.

---

# 17. Organization Restoration

Archived organizations may be restored if allowed.

Restoration should:

- Reactivate access.
- Preserve historical data.
- Maintain audit records.

---

# 18. Organization Deletion Behaviour

Deletion should:

- Follow approved retention rules.
- Protect backups.
- Remove active access.

Deletion must not bypass compliance requirements.

---

# 19. Relationship With Subscription Lifecycle

Organization lifecycle and subscription lifecycle are separate.

Example:

```
Organization:

Active


Subscription:

Suspended
```

The organization may remain stored while subscription access changes.

---

# 20. Relationship With Branch Lifecycle

Branches have independent lifecycles.

Example:

```
Organization:

Active


Branch 1:

Active


Branch 2:

Closed
```

A closed branch does not close the organization.

---

# 21. Relationship With User Lifecycle

Users also have independent states.

Example:

```
Organization:

Active


Employee:

Inactive
```

---

# 22. Audit Requirements

Lifecycle changes must be recorded.

Example:

```
Organization:

FreshMart


Previous Status:

Active


New Status:

Archived


Changed By:

Organization Owner


Date:

2026-07-12
```

---

# 23. Non Goals

The organization lifecycle does not manage:

- Employee employment lifecycle.
- Subscription billing lifecycle.
- Branch operational lifecycle.
- Inventory lifecycle.

These belong to separate domains.

---

# 24. Future Capabilities

Future versions may support:

- Organization migration.
- Enterprise account merging.
- Account recovery workflows.
- Automated lifecycle management.

---

# 25. Relationship To Other Specifications

## Organization Domain

- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model
- ORG-003 Subscription Ownership
- ORG-004 Branch Structure

---

## Security Domain

- SEC-007 Audit Logging

---

## User Domain

- USR-001 User Lifecycle

---

# 26. Design Principles

## Preserve History

Operational history should never disappear accidentally.

---

## Separate Status Types

Different domains must manage their own lifecycle.

---

## Controlled Changes

Important lifecycle transitions require authorization.

---

## Recovery Friendly

Businesses should be able to recover from temporary states.

---

# 27. Summary

The Organization Lifecycle Model defines how supermarket businesses move through ShiftOS.

It ensures:

- Clear account states.
- Safe transitions.
- Data preservation.
- Operational reliability.

Organizations can grow, pause, close, or return without losing important historical information.
