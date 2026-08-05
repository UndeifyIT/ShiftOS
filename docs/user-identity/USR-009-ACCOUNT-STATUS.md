# ShiftOS Account Status Model

**Document ID:** USR-003

**Document Title:** Account Status Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** User Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the account statuses used to manage user access within ShiftOS.

The purpose of the Account Status Model is to establish how user accounts are controlled throughout their operational lifetime.

This document defines:

- Account states.
- Status transitions.
- Access behaviour.
- Security implications.

---

# 2. Account Status Definition

Account status represents whether a user account can currently access ShiftOS.

Account status controls:

- Login availability.
- Platform access.
- Security restrictions.

---

# 3. Account Status Versus Other Status Types

Account status is separate from other platform states.

---

## User Account Status

Controls:

- Login access.
- Authentication availability.

---

## Employee Status

Controls:

- Employment relationship.
- Workforce membership.

---

## Organization Status

Controls:

- Business account availability.

---

Example:

```
Employee:

Active


Account:

Suspended
```

The employee still exists, but access is restricted.

---

# 4. Account Status Lifecycle

The lifecycle is:

```
Pending

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

# 5. Pending Status

## Definition

The account exists but is not fully activated.

Examples:

- Invitation accepted but setup incomplete.
- Email verification incomplete.

---

## Behaviour

The user:

- Cannot access full functionality.
- Must complete required setup steps.

---

# 6. Active Status

## Definition

The account is fully operational.

The user can:

- Authenticate.
- Access permitted features.
- Perform authorized actions.

---

# 7. Suspended Status

## Definition

The account is temporarily restricted.

Suspension does not remove the account.

---

## Possible Reasons

Examples:

- Security concern.
- Suspicious activity.
- Temporary administrative action.
- Investigation required.

---

## Behaviour

A suspended user:

- Cannot access normal features.
- Retains historical records.
- May be restored.

---

# 8. Deactivated Status

## Definition

The account is no longer available for normal use.

Examples:

- User leaves organization.
- Access is permanently removed.
- Account is no longer required.

---

## Behaviour

The user:

- Cannot login.
- Cannot perform actions.
- Remains in historical records.

---

# 9. Deleted Status

## Definition

The account has been permanently removed according to retention policies.

Deletion is a controlled process.

---

## Requirements

Before deletion:

- Retention requirements considered.
- Audit requirements considered.
- Recovery requirements considered.

---

# 10. Account Status Transitions

Valid transitions:

```
Pending

    |

Active

    |

Suspended

    |

Active


Active

    |

Deactivated

    |

Deleted
```

---

# 11. Invalid Transitions

The system should prevent invalid state changes.

Examples:

```
Deleted

    |

Active
```

Not allowed.

```
Suspended

    |

Deleted
```

Requires controlled deletion process.

---

# 12. Account Activation

An account becomes active when:

Required conditions are completed:

- Identity created.
- Verification completed.
- Organization membership established.
- Required setup completed.

---

# 13. Account Suspension

Suspension should:

- Remove active access.
- Preserve information.
- Record reason.
- Record administrator action.

---

# 14. Account Restoration

Suspended accounts may return to active status.

Requirements:

- Authorized user approval.
- Reason recorded.
- Security checks completed where required.

---

# 15. Account Deactivation

Deactivation removes normal access.

Examples:

```
Manager leaves supermarket

        |

Account Deactivated
```

The employee history remains.

---

# 16. Account Status And Permissions

Account status controls whether access is possible.

Permissions control what actions are allowed.

Example:

```
Account:

Active


Role:

Supervisor


Permissions:

Manage Shifts
```

---

A suspended account:

```
Account:

Suspended


Role:

Supervisor


Access:

Blocked
```

---

# 17. Account Status And Sessions

Status changes must affect active sessions.

Examples:

## Suspension

Should:

- Revoke active sessions.
- Prevent continued access.

---

## Deactivation

Should:

- Remove access.
- End active sessions.

---

# 18. Account Status And Audit History

All status changes should be recorded.

Example:

```
User:

John


Previous Status:

Active


New Status:

Suspended


Changed By:

Organization Owner


Reason:

Security Review
```

---

# 19. Account Status Permissions

Only authorized users may change account status.

Examples:

## Organization Owner

Can:

- Suspend users.
- Deactivate users.

---

## Manager

May have limited user management permissions.

---

## Employee

Cannot modify account status.

---

# 20. Security Requirements

Account status management must:

- Prevent unauthorized changes.
- Maintain audit history.
- Revoke access when required.
- Preserve historical records.

---

# 21. Non Goals

The MVP account status system will not include:

- Automated risk scoring.
- AI-based account blocking.
- Advanced fraud detection.

---

# 22. Future Capabilities

Future versions may support:

- Automated security responses.
- Account activity monitoring.
- Device-based restrictions.
- Advanced identity policies.

---

# 23. Relationship To Other Specifications

## User Domain

- USR-001 User Lifecycle
- USR-002 Profile Management

---

## Security Domain

- SEC-001 Authentication Model
- SEC-006 Session Management
- SEC-007 Audit Logging

---

## Organization Domain

- ORG-002 Multi-Tenant Model

---

# 24. Design Principles

## Access Control

Account state determines whether access is possible.

---

## Preserve History

Removing access should not erase important records.

---

## Controlled Changes

Sensitive status changes require authorization.

---

## Clear Separation

Account status should not replace employee or organization status.

---

# 25. Summary

The ShiftOS Account Status Model defines how user access is controlled.

It provides:

- Clear access states.
- Secure account management.
- Historical preservation.
- Controlled recovery.

Account status determines platform access while remaining separate from employment and organizational states.