# ShiftOS Password Reset Model

**Document ID:** SEC-005

**Document Title:** Password Reset Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** Security Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the password reset process within ShiftOS.

The purpose of the Password Reset Model is to provide a secure method for users to regain access to their accounts when they cannot remember their passwords.

This document defines:

- Password reset flow.
- Verification requirements.
- Security controls.
- User recovery behaviour.

---

# 2. Password Reset Definition

Password reset is the process of allowing a verified user to create a new password after losing access to their existing password.

Password reset does not:

- Reveal the existing password.
- Bypass authentication security.
- Grant additional permissions.

---

# 3. Password Reset Principles

ShiftOS follows these principles:

---

## User Controlled Recovery

Users recover their own accounts.

---

## No Password Exposure

Existing passwords are never visible.

---

## Secure Verification

Only authorized users should be able to reset accounts.

---

## Preserve Accountability

Reset actions must be recorded.

---

# 4. Password Reset Lifecycle

The lifecycle is:

```
Reset Requested

        |

Verification Sent

        |

Reset Link Opened

        |

Identity Confirmed

        |

New Password Created

        |

Access Restored
```

---

# 5. Reset Request State

## Definition

The user has requested password recovery.

Example:

```
User:

john@example.com


Action:

Forgot Password
```

---

The system creates a recovery process.

---

# 6. Verification Sent State

The system sends a secure password reset link.

The link contains:

- Secure token.
- Expiration period.
- Recovery instructions.

---

# 7. Reset Link Validation

When the user opens the reset link, the system verifies:

- Token validity.
- Token expiration.
- Token usage status.
- Associated account.

---

# 8. Password Creation

After successful verification:

The user creates a new password.

Requirements:

- Follow password policy.
- Replace previous password.
- Securely store new credential.

---

# 9. Password Reset Flow

Example:

```
User Selects Forgot Password

        |

Enters Email Address

        |

Reset Request Created

        |

Verification Email Sent

        |

User Opens Secure Link

        |

Creates New Password

        |

Password Updated

        |

Account Access Restored
```

---

# 10. Password Reset Tokens

Reset tokens must be:

- Securely generated.
- Single use.
- Time limited.
- Invalid after completion.

---

# 11. Reset Token Expiration

Reset links must expire.

Reasons:

- Prevent unauthorized reuse.
- Reduce security exposure.
- Protect inactive accounts.

---

# 12. Invalid Reset Requests

If a reset request fails:

Examples:

- Expired token.
- Invalid token.
- Already used link.

The system should:

- Explain the problem.
- Allow requesting a new reset.

---

# 13. Existing Sessions After Reset

After successful password reset:

The system should evaluate active sessions.

Recommended behaviour:

- Revoke existing sessions.
- Require login again.

Purpose:

Prevent unauthorized users with old sessions from continuing access.

---

# 14. Failed Reset Attempts

The system should monitor suspicious activity.

Examples:

- Excessive reset requests.
- Repeated invalid tokens.
- Unusual recovery patterns.

Possible protections:

- Rate limiting.
- Temporary restrictions.
- Security alerts.

---

# 15. User Responsibilities

Users should:

- Keep recovery email access secure.
- Avoid sharing reset links.
- Create strong passwords.

---

# 16. Administrator Responsibilities

Administrators cannot:

- View user passwords.
- Create passwords for users.
- Access reset links.

Administrators may:

- Disable accounts.
- Remove access.
- Assist with approved recovery procedures.

---

# 17. Employee Password Recovery

Employees with accounts recover access through the same process.

Supervisors cannot reset employee passwords manually.

---

# 18. Password Reset And Invitations

A user accepting an invitation who cannot remember their password should use password reset.

Example:

```
Invitation

        |

Existing Account

        |

Password Recovery

        |

Organization Access
```

---

# 19. Security Requirements

Password reset must:

- Protect reset tokens.
- Use encrypted communication.
- Prevent token reuse.
- Avoid exposing account existence unnecessarily.
- Record security events.

---

# 20. Audit Requirements

The system should record:

- Reset requested.
- Reset completed.
- Reset failed.
- Password changed.

Example:

```
User:

John


Action:

Password Reset Completed


Date:

2026-07-12
```

---

# 21. Non Goals

The MVP password reset system will not include:

- Security questions.
- Manual password recovery by managers.
- Support staff password access.
- Alternative identity verification methods.

---

# 22. Future Capabilities

Future versions may support:

- Multi-factor recovery.
- Phone recovery.
- Enterprise recovery policies.
- Advanced account protection.

---

# 23. Relationship To Other Specifications

## Authentication Domain

- SEC-001 Authentication Model
- SEC-002 Password Policy

---

## Email Domain

- SEC-004 Email Verification Model

---

## User Domain

- USR-001 User Lifecycle

---

# 24. Design Principles

## Recovery Without Weakening Security

Users regain access without bypassing protections.

---

## No Credential Sharing

Passwords remain private.

---

## Audit Everything Important

Recovery events must be traceable.

---

## Simple User Experience

The recovery process should work for real supermarket staff.

---

# 25. Summary

The ShiftOS Password Reset Model defines a secure way for users to regain access to their accounts.

It provides:

- Secure recovery.
- Password protection.
- Session safety.
- Auditability.

Password reset restores access without compromising authentication or authorization controls.