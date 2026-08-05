# ShiftOS Authentication Model

**Document ID:** SEC-001

**Document Title:** Authentication Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Security Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the authentication model for ShiftOS.

The purpose of this document is to establish how users securely identify themselves and access the ShiftOS platform.

This document defines:

- Authentication methods.
- Account verification.
- Session management.
- Password management.
- Authentication security requirements.

---

# 2. Authentication Definition

Authentication is the process of verifying the identity of a user.

Authentication answers:

> "Who is this person?"

Example:

A supervisor enters login credentials.

ShiftOS verifies:

```
User Identity

        |

Authentication

        |

Access Granted
```

---

# 3. Authentication Versus Authorization

Authentication and authorization are separate systems.

---

## Authentication

Determines:

- User identity.
- Whether credentials are valid.
- Whether an account can access the platform.

---

## Authorization

Determines:

- What the user can access.
- What actions they can perform.
- Which branches they can manage.

---

Example:

A supervisor may successfully authenticate but still only access their assigned branch.

---

# 4. Authentication Architecture

ShiftOS authentication will use:

- Supabase Authentication.
- Secure session management.
- PostgreSQL user relationships.

Authentication identity is separate from business data.

---

# 5. Authentication Flow

The standard login flow:

```
User Opens ShiftOS

        |

Enters Credentials

        |

Authentication Provider Verifies Identity

        |

Session Created

        |

User Identity Retrieved

        |

Organization Membership Checked

        |

Permissions Loaded

        |

Access Granted
```

---

# 6. Supported Authentication Methods

## MVP Authentication

Initial authentication method:

- Email and password.

Reason:

- Simple implementation.
- Widely supported.
- Suitable for business accounts.

---

# 7. Future Authentication Methods

Future versions may support:

- Phone number authentication.
- Single Sign-On (SSO).
- Enterprise identity providers.
- Social authentication.

These are not MVP requirements.

---

# 8. User Registration

Users should not freely create business accounts without context.

Account creation occurs through:

- Organization creation.
- Organization invitation.

---

Examples:

## Business Owner

Creates:

```
Organization

+

Personal Account
```

---

## Supervisor

Receives:

```
Invitation

+

Account Setup
```

---

# 9. Email Verification

Email verification confirms ownership of an email address.

Requirements:

- New users verify their email.
- Unverified accounts have restricted access.

---

# 10. Password Management

Users must be able to:

- Create passwords.
- Change passwords.
- Reset forgotten passwords.

---

# 11. Password Security Requirements

Passwords must:

- Never be stored in plain text.
- Be securely hashed.
- Follow secure authentication provider practices.

---

# 12. Password Reset Flow

Example:

```
User Requests Reset

        |

Verification Email Sent

        |

User Confirms Identity

        |

New Password Created

        |

Account Access Restored
```

---

# 13. Session Management

Sessions represent an authenticated user's active access.

Sessions must support:

- Secure storage.
- Expiration.
- Renewal.
- Revocation.

---

# 14. Session Security

The system must protect against:

- Session theft.
- Unauthorized reuse.
- Invalid access attempts.

---

# 15. Logout

Users must be able to end their active session.

Logout should:

- Invalidate session.
- Remove active authentication state.
- Require authentication again.

---

# 16. Failed Login Attempts

The system should protect against repeated failed attempts.

Possible protections:

- Rate limiting.
- Temporary restrictions.
- Security monitoring.

---

# 17. Account Recovery

Account recovery must verify ownership before restoring access.

Recovery must not:

- Bypass permissions.
- Create unauthorized access.

---

# 18. Authentication And Organization Access

Authentication alone does not provide business access.

After login:

The system must determine:

```
User

        |

Organization Membership

        |

Role

        |

Permissions

        |

Allowed Actions
```

---

# 19. Authentication And Multi-Tenancy

Authentication must work with the multi-tenant model.

A logged-in user must only access organizations they belong to.

Example:

```
User:

John


Organization:

FreshMart


Allowed:

FreshMart data


Denied:

ValueFoods data
```

---

# 20. Account Deactivation

When a user is deactivated:

The system must:

- Prevent authentication where required.
- Revoke active sessions.
- Preserve historical records.

---

# 21. Security Requirements

Authentication must support:

- Secure credential handling.
- Session protection.
- Identity verification.
- Access revocation.
- Audit logging.

---

# 22. Audit Requirements

Authentication events should be recorded.

Examples:

- Successful login.
- Failed login.
- Password reset.
- Account activation.
- Session revocation.

---

# 23. Non Goals

The MVP authentication system will not include:

- Biometric authentication.
- Hardware security keys.
- Enterprise SSO.
- Advanced identity federation.

These may be introduced later.

---

# 24. Future Authentication Capabilities

Future versions may support:

- Multi-factor authentication.
- Enterprise SSO.
- Identity provider integration.
- Advanced security policies.

---

# 25. Relationship To Other Specifications

## User Domain

- USR-001 User Lifecycle

---

## Organization Domain

- ORG-002 Multi-Tenant Model

---

## Permission Domain

- PER-001 Role Definitions
- PER-002 Permission Model

---

## Security Domain

- SEC-004 Authorization Model
- SEC-007 Audit Logging

---

# 26. Design Principles

## Identity Separation

Authentication identity should remain separate from business data.

---

## Secure By Default

Access should require verified identity.

---

## Simple MVP Experience

The login process should be easy for supermarket staff.

---

## Future Ready

The foundation should allow stronger authentication methods later.

---

# 27. Summary

The ShiftOS Authentication Model defines how users securely access the platform.

It provides:

- Secure identity verification.
- Account management.
- Session control.
- Integration with multi-tenant security.

Authentication confirms who a user is, while authorization determines what they can do.