# ShiftOS User Lifecycle Model

**Document ID:** USR-001

**Document Title:** User Lifecycle Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** User Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the lifecycle of users within ShiftOS.

The purpose of the User Lifecycle Model is to establish how individuals interact with the ShiftOS platform from account creation through account removal.

This document defines:

- User states.
- Account transitions.
- Access rules.
- User management principles.

---

# 2. User Definition

A user represents an individual with a ShiftOS account.

A user can authenticate into the platform and perform actions based on assigned permissions.

Examples:

- Organization owner.
- Store manager.
- Supervisor.
- Employee with app access.

---

# 3. User Versus Employee

Users and employees are separate concepts.

---

## User

Represents:

- Login identity.
- Authentication.
- Permissions.
- Platform access.

---

## Employee

Represents:

- Workforce membership.
- Employment information.
- Scheduling.
- Attendance.

---

Example:

```
Employee:

John

Role:

Cashier


User:

John

Access:

Mobile Application
```

---

# 4. User Lifecycle Overview

Users move through these states:

```
Invited

    |

Pending Activation

    |

Active

    |

Suspended

    |

Deactivated

    |

Deleted
```

---

# 5. Lifecycle Principles

The user lifecycle follows these principles:

---

## Security First

Users should only access systems after proper authentication.

---

## Controlled Access

Permissions determine what users can do.

---

## Historical Preservation

User actions should remain traceable.

---

## Separation Of Identity And Employment

A user's login identity should not be destroyed when employment information changes.

---

# 6. Invited State

## Definition

A user invitation has been created but the individual has not completed account setup.

Example:

A supermarket manager invites a new supervisor.

---

## Characteristics

The user:

- Has no active access.
- Has not completed registration.
- Has a pending invitation.

---

# 7. Pending Activation State

## Definition

The user has started registration but has not completed activation.

Examples:

- Email verification incomplete.
- Required setup incomplete.

---

## Characteristics

The user:

- Cannot access normal features.
- Must complete activation steps.

---

# 8. Active State

## Definition

The user has successfully created an account and can access ShiftOS.

---

## Characteristics

The user:

- Can authenticate.
- Can access permitted features.
- Can perform authorized actions.

---

# 9. Suspended State

## Definition

The user's access has temporarily been restricted.

Suspension does not delete the user.

---

## Possible Reasons

Examples:

- Security concerns.
- Suspicious activity.
- Administrative action.

---

## Characteristics

The user:

- Cannot perform normal operations.
- Account data remains preserved.

---

# 10. Deactivated State

## Definition

The user is no longer active within the organization.

Examples:

- Employee leaves the supermarket.
- Manager role removed.
- Account no longer required.

---

## Characteristics

The user:

- Cannot access the organization.
- Historical activity remains available.

---

# 11. Deleted State

## Definition

The user account has been permanently removed according to data retention policies.

Deletion is a controlled process.

---

# 12. User Creation Flow

Example:

```
Organization Owner

        |

Invites User

        |

Invitation Sent

        |

User Accepts

        |

Account Activated

        |

Permissions Applied

        |

User Gains Access
```

---

# 13. User Invitation

Authorized users may invite new users.

Examples:

Organization owner:

- Invite managers.

Manager:

- Invite supervisors if permitted.

---

Invitations should include:

- Organization.
- Intended role.
- Expiration period.

---

# 14. User Authentication

Authentication determines:

- User identity.
- Account validity.

Authentication does not determine permissions.

---

Example:

Login:

```
John@example.com
```

returns:

```
User Identity:

John


Permissions:

Supervisor


Organization:

FreshMart
```

---

# 15. User Organization Membership

A user accesses organizations through membership.

Relationship:

```
User

    |

Organization Membership

    |

Organization
```

---

MVP assumption:

A user belongs to one organization.

---

Future:

A user may access multiple organizations.

Examples:

- Consultants.
- Enterprise administrators.
- Account managers.

---

# 16. User Roles

User capabilities are determined by roles.

Examples:

## Organization Owner

Access:

- Organization settings.
- Subscription.
- Full administration.

---

## Manager

Access:

- Branch management.
- Workforce operations.

---

## Supervisor

Access:

- Daily store operations.

---

## Employee

Access:

- Personal workforce features.

---

# 17. User Access Removal

When access is removed:

The system should:

- Remove permissions.
- Prevent login access where required.
- Preserve historical records.

---

# 18. User And Employee Relationship

A user may or may not represent an employee.

Examples:

---

## Employee With User Account

```
Cashier

+

Mobile access
```

---

## Employee Without User Account

```
Shelf Stocker

+

No login access
```

---

## User Without Employee Record

Future examples:

- External administrator.
- Support staff.

---

# 19. User Transfer Between Organizations

Future versions may support users moving between organizations.

Requirements:

- Preserve identity.
- Remove previous access.
- Create new membership.
- Maintain audit history.

---

# 20. User Audit Requirements

Important user actions must be recorded.

Examples:

- Login.
- Permission changes.
- Invitation.
- Deactivation.
- Role changes.

---

# 21. Security Requirements

User lifecycle must support:

- Secure authentication.
- Permission validation.
- Session management.
- Access revocation.

---

# 22. Non Goals

The user lifecycle does not manage:

- Employee hiring.
- Employee termination.
- Payroll status.
- Attendance status.

These belong to employee/workforce domains.

---

# 23. Future Capabilities

Future versions may support:

- Multiple organization memberships.
- Single sign-on.
- Enterprise identity management.
- Advanced user provisioning.

---

# 24. Relationship To Other Specifications

## Organization Domain

- ORG-001 Organization Model
- ORG-002 Multi-Tenant Model

---

## Permission Domain

- PER-001 Role Definitions
- PER-002 Permission Model

---

## Employee Domain

- EMP-001 Employee Model

---

## Security Domain

- SEC-001 Authentication Model
- SEC-007 Audit Logging

---

# 25. Design Principles

## Identity Is Separate From Employment

Users and employees should not be tightly coupled.

---

## Least Privilege

Users receive only required access.

---

## Preserve History

Removing access should not destroy historical records.

---

## Secure Lifecycle Management

Every state transition should be controlled.

---

# 26. Summary

The User Lifecycle Model defines how individuals gain, use and lose access to ShiftOS.

It ensures:

- Secure account management.
- Clear access states.
- Separation between identity and employment.
- Historical preservation.

Users represent access to the platform, while employees represent workforce members managed by supermarkets.