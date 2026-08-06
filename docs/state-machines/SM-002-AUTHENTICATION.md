# ShiftOS Authentication State Machine

**Document ID:** SM-002

**Document Title:** Authentication State Machine

**Version:** 1.0.0

**Status:** Approved

**Classification:** State Machine Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the authentication lifecycle within ShiftOS.

It governs how users authenticate, maintain authenticated sessions, refresh credentials and securely sign out.

It does **not** define authorization or permissions.

---

# 2. Objectives

The authentication state machine ensures:

- Secure identity verification.
- Predictable session behavior.
- Safe token refresh.
- Controlled session expiration.
- Reliable recovery from authentication failures.

---

# 3. Scope

Applies to:

- Manager accounts.
- Supervisor accounts.
- Employee accounts.

Across:

- Web.
- Mobile.
- PWA.

---

# 4. Authentication States

```
UNAUTHENTICATED

↓

AUTHENTICATING

↓

AUTHENTICATED

↓

TOKEN_REFRESHING

↓

SESSION_EXPIRED

↓

SIGNED_OUT
```

---

# 5. State Definitions

## UNAUTHENTICATED

Purpose:

No active authenticated session exists.

Activities:

- Display login screen.
- Accept authentication credentials.
- Accept invitation authentication.
- Accept password reset entry point.

Allowed transitions:

→ AUTHENTICATING

---

## AUTHENTICATING

Purpose:

Verify user identity.

Activities:

- Validate credentials.
- Verify account status.
- Create authenticated session.
- Retrieve identity.

Allowed transitions:

→ AUTHENTICATED

→ UNAUTHENTICATED

---

## AUTHENTICATED

Purpose:

Authenticated user session.

Activities:

- Access protected resources.
- Perform authorized actions.
- Maintain session.

Allowed transitions:

→ TOKEN_REFRESHING

→ SESSION_EXPIRED

→ SIGNED_OUT

---

## TOKEN_REFRESHING

Purpose:

Refresh authentication credentials.

Activities:

- Refresh access token.
- Validate refresh token.
- Update session.

Allowed transitions:

→ AUTHENTICATED

→ SESSION_EXPIRED

---

## SESSION_EXPIRED

Purpose:

Authenticated session is no longer valid.

Examples:

- Refresh token expired.
- Session revoked.
- Security policy triggered.
- User removed.

Activities:

- Block protected actions.
- Prompt user to sign in again.

Allowed transitions:

→ AUTHENTICATING

→ SIGNED_OUT

---

## SIGNED_OUT

Purpose:

Authenticated session intentionally ended.

Activities:

- Destroy local session.
- Clear sensitive data.
- Return to login.

Allowed transitions:

→ AUTHENTICATING

---

# 6. State Transition Diagram

```
UNAUTHENTICATED
        │
        ▼
AUTHENTICATING
        │
        ▼
AUTHENTICATED
      ┌─┴─────────┐
      ▼           ▼
TOKEN_REFRESHING  SESSION_EXPIRED
      │           │
      └─────┬─────┘
            ▼
      AUTHENTICATED

AUTHENTICATED
      │
      ▼
SIGNED_OUT
```

---

# 7. Transition Events

| Event | From | To |
|--------|------|----|
| Login Requested | UNAUTHENTICATED | AUTHENTICATING |
| Login Successful | AUTHENTICATING | AUTHENTICATED |
| Login Failed | AUTHENTICATING | UNAUTHENTICATED |
| Token Near Expiry | AUTHENTICATED | TOKEN_REFRESHING |
| Refresh Successful | TOKEN_REFRESHING | AUTHENTICATED |
| Refresh Failed | TOKEN_REFRESHING | SESSION_EXPIRED |
| Session Timeout | AUTHENTICATED | SESSION_EXPIRED |
| Logout | AUTHENTICATED | SIGNED_OUT |
| Login Again | SIGNED_OUT | AUTHENTICATING |

---

# 8. Authentication Rules

Authentication must verify:

- User identity.
- Organization membership.
- Account status.
- Invitation acceptance (where applicable).

Authentication must **not** determine permissions.

Authorization occurs after successful authentication.

---

# 9. Session Rules

Authenticated sessions shall:

- Use secure server-issued tokens.
- Expire automatically.
- Support refresh tokens.
- Be invalidated on logout.
- Be invalidated after credential changes where required.

---

# 10. Session Expiration

When a session expires:

The application shall:

- Stop protected API requests.
- Clear invalid tokens.
- Preserve unsaved local work where possible.
- Redirect the user to authenticate again.

---

# 11. Logout Behaviour

Logout must:

- Revoke the active session where supported.
- Remove locally stored credentials.
- Clear sensitive cached information.
- Return the user to the authentication screen.

---

# 12. Failure Handling

Authentication failures include:

- Invalid credentials.
- Disabled account.
- Expired invitation.
- Revoked session.
- Network failure.

The application should provide appropriate user feedback without revealing sensitive security information.

---

# 13. Security Rules

Authentication must never:

- Store plaintext passwords.
- Trust client-side identity claims.
- Grant access without server validation.

Every protected request must be validated server-side.

---

# 14. Audit Requirements

The following events shall be audited:

- Successful login.
- Failed login.
- Logout.
- Session expiration.
- Token refresh failure.
- Session revocation.

Audit records shall include timestamp, user, device/session identifier and organization context where applicable.

---

# 15. Related Specifications

- AUTH-001 Authentication Screens
- SEC-001 Authentication
- SEC-003 Authorization
- API-003 Validation Rules
- SM-001 Application State Machine

---

# 16. Summary

The ShiftOS Authentication State Machine defines the complete lifecycle of user authentication from login through session management, token refresh and logout.

It provides a secure, predictable authentication model while keeping authentication concerns separate from authorization and business workflows.