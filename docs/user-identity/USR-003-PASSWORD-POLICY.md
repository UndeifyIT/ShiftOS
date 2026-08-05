# ShiftOS Password Policy

**Document ID:** SEC-002

**Document Title:** Password Policy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Security Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the password security requirements for ShiftOS.

The purpose of this policy is to ensure user accounts are protected against unauthorized access while maintaining a practical experience for supermarket employees, supervisors and managers.

This document defines:

- Password requirements.
- Password protection rules.
- Password recovery requirements.
- Security responsibilities.

---

# 2. Password Policy Principles

ShiftOS follows these principles:

## Security Without Excessive Friction

Passwords must be secure without creating unnecessary complexity for users.

---

## Protection Through Multiple Layers

Password security is not achieved only through complexity.

It also depends on:

- Secure storage.
- Authentication controls.
- Session security.
- Account monitoring.

---

## No Plain Text Storage

Passwords must never be stored or accessible in readable form.

---

# 3. Password Ownership

Passwords belong to individual user accounts.

Organizations do not own or manage employee passwords.

Example:

```
FreshMart

        |

User Account

        |

Personal Password
```

---

# 4. Password Requirements

MVP password requirements:

Minimum:

- 8 characters.

Recommended:

- Combination of letters and numbers.
- Avoid commonly used passwords.

---

# 5. Password Complexity

ShiftOS should encourage strong passwords.

Recommended:

Passwords should contain:

- Uppercase letters.
- Lowercase letters.
- Numbers.
- Special characters.

However, the system should avoid unnecessary complexity requirements that harm usability.

---

# 6. Password Restrictions

Users should not use:

- Extremely common passwords.
- Passwords known to be compromised.
- Empty passwords.
- Previously rejected passwords.

---

# 7. Password Storage

ShiftOS must never store passwords directly.

Passwords must be:

- Hashed.
- Protected by the authentication provider.
- Inaccessible to application code.

---

# 8. Password Transmission

Passwords must only be transmitted through secure encrypted connections.

Requirements:

- HTTPS only.
- No insecure communication.
- No password logging.

---

# 9. Password Creation

Passwords are created during:

- Account registration.
- Invitation acceptance.
- Password reset.

---

# 10. Password Change Flow

Users changing passwords must:

```
Authenticate User

        |

Verify Current Access

        |

Accept New Password

        |

Securely Update Credential

        |

Invalidate Old Sessions Where Required
```

---

# 11. Password Reset Flow

Users who forget passwords must use the approved recovery process.

Example:

```
User Requests Reset

        |

Identity Verification

        |

Reset Link Sent

        |

New Password Created

        |

Account Access Restored
```

---

# 12. Password Reset Security

Reset processes must:

- Use secure tokens.
- Expire reset links.
- Prevent token reuse.
- Avoid exposing whether accounts exist unnecessarily.

---

# 13. Failed Password Attempts

ShiftOS should protect against repeated failed login attempts.

Possible protections:

- Rate limiting.
- Temporary restrictions.
- Security monitoring.

---

# 14. Account Lockout

MVP approach:

Avoid permanent account lockouts.

Reason:

Supermarket employees may frequently need assistance recovering access.

Instead:

- Use temporary restrictions.
- Require verification.
- Allow recovery.

---

# 15. Password Expiration

MVP policy:

Passwords do not require regular forced expiration.

Reason:

Forced frequent password changes often reduce security because users create predictable patterns.

---

# 16. Administrator Password Management

Administrators cannot view user passwords.

Administrators may:

- Disable accounts.
- Remove access.
- Trigger recovery processes.

They may not:

- Retrieve passwords.
- Share passwords.
- Access credentials.

---

# 17. Employee Password Management

Employees manage their own passwords.

Supervisors cannot:

- View employee passwords.
- Change passwords on behalf of employees.

---

# 18. Shared Accounts

Shared accounts are prohibited.

Each person requiring access should have an individual account.

Example:

Incorrect:

```
Supervisor Account

Used by all supervisors
```

Correct:

```
John - Supervisor Account

Mary - Supervisor Account
```

---

# 19. Temporary Access

Temporary access should use:

- Invitations.
- Permission changes.
- Account lifecycle controls.

Temporary passwords should not be manually shared.

---

# 20. Password Security Monitoring

Future versions may monitor:

- Suspicious login patterns.
- Credential attacks.
- Unusual access behaviour.

---

# 21. Non Goals

The MVP password policy will not include:

- Passwordless authentication.
- Hardware security keys.
- Advanced enterprise identity policies.
- Mandatory password rotation.

---

# 22. Future Password Capabilities

Future versions may support:

- Multi-factor authentication.
- Passwordless login.
- Enterprise security policies.
- Advanced authentication controls.

---

# 23. Relationship To Other Specifications

## Authentication Domain

- SEC-001 Authentication Model

---

## User Domain

- USR-001 User Lifecycle

---

## Security Domain

- SEC-004 Authorization Model
- SEC-007 Audit Logging

---

# 24. Design Principles

## Secure Storage

Passwords are never stored directly.

---

## Practical Security

Security requirements must work for real supermarket users.

---

## Least Exposure

Users and administrators should only handle credentials they own.

---

## Recovery First

Lost passwords should be recoverable without weakening security.

---

# 25. Summary

The ShiftOS Password Policy defines how user passwords are created, protected and recovered.

It ensures:

- Secure authentication.
- Reduced credential risk.
- Practical usability.
- Strong account protection.

Passwords verify identity, but overall security depends on authentication, authorization and tenant isolation working together.