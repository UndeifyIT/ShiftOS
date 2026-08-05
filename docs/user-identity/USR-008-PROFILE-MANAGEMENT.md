# ShiftOS Profile Management Model

**Document ID:** USR-002

**Document Title:** Profile Management Model

**Version:** 1.0.0

**Status:** Approved

**Classification:** User Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines how user profiles are created, managed and updated within ShiftOS.

The purpose of Profile Management is to establish how personal user information is maintained while keeping identity, employment and organization data properly separated.

This document defines:

- Profile ownership.
- Editable information.
- Profile updates.
- Privacy boundaries.

---

# 2. Profile Definition

A user profile represents personal information associated with a ShiftOS user account.

A profile describes:

- Who the user is.
- How they appear in the platform.
- Personal preferences.

---

# 3. Profile Versus Employee Record

Profiles and employee records serve different purposes.

---

## User Profile

Contains:

- Name.
- Profile image.
- Contact preferences.
- Personal settings.

---

## Employee Record

Contains:

- Employment information.
- Job position.
- Branch assignment.
- Workforce status.

---

Example:

```
User Profile:

John Smith


Employee Record:

Cashier

Ikeja Branch

Active
```

---

# 4. Profile Ownership

Profiles belong to users.

Relationship:

```
User Account

        |

User Profile
```

The user controls personal information.

---

# 5. Profile Information

A user profile may contain:

## Basic Information

- Full name.
- Profile photo.
- Preferred display name.

---

## Contact Information

- Email address.
- Phone number.

---

## Personal Preferences

- Language preference.
- Notification preferences.

---

# 6. Profile Creation

Profiles are created during account activation.

Flow:

```
User Account Created

        |

Profile Created

        |

User Completes Information

        |

Profile Active
```

---

# 7. Profile Editing

Users may update permitted profile information.

Examples:

Users can edit:

- Name.
- Profile image.
- Personal preferences.

---

# 8. Restricted Profile Information

Some information may require additional controls.

Examples:

- Email address.
- Account identity information.

Changes may require:

- Verification.
- Security confirmation.

---

# 9. Profile Update Flow

Example:

```
User Opens Profile

        |

Edits Information

        |

Validation Performed

        |

Changes Saved

        |

Audit Recorded Where Required
```

---

# 10. Profile Photo Management

Future support may include profile images.

Requirements:

- Secure upload.
- File validation.
- Storage protection.

---

# 11. Profile And Organization Membership

A profile identifies the person.

Organization membership determines access.

Example:

```
User Profile

        |

Organization Membership

        |

Role

        |

Permissions
```

---

# 12. Profile And Employee Relationship

A user profile may connect to an employee record.

However:

- Not every user is an employee.
- Not every employee requires a user account.

---

Examples:

## User Without Employee Record

```
Organization Administrator
```

---

## Employee Without User Account

```
Shelf Stocker
```

---

# 13. Profile Privacy

Users should only access profile information they are authorized to view.

Requirements:

- Protect personal information.
- Limit unnecessary exposure.
- Follow privacy principles.

---

# 14. Profile Visibility

Visibility depends on permissions.

Example:

## Organization Owner

May view:

- User identities.
- Organization members.

---

## Supervisor

May view:

- Relevant team information.

---

## Employee

May view:

- Their own profile.

---

# 15. Profile Deactivation

When a user account is deactivated:

The profile should:

- Remain associated with historical records.
- Become inaccessible where required.
- Preserve audit references.

---

# 16. Profile Deletion

Profile deletion must follow data retention requirements.

The system should consider:

- Legal obligations.
- Audit requirements.
- Historical records.

---

# 17. Profile Audit Requirements

Important profile changes should be recorded.

Examples:

- Email change.
- Name change.
- Profile update.

---

# 18. Profile Security Requirements

Profile management must:

- Validate user permissions.
- Protect personal information.
- Prevent unauthorized modification.
- Secure uploaded content.

---

# 19. Non Goals

The MVP profile system will not include:

- Social profiles.
- Public user pages.
- Employee performance profiles.
- Personal analytics.

---

# 20. Future Profile Capabilities

Future versions may support:

- Custom profile fields.
- Employee self-service profiles.
- Profile completion tracking.
- Advanced preferences.

---

# 21. Relationship To Other Specifications

## User Domain

- USR-001 User Lifecycle

---

## Security Domain

- SEC-001 Authentication Model
- SEC-004 Email Verification Model
- SEC-007 Audit Logging

---

## Employee Domain

- EMP-001 Employee Model

---

# 22. Design Principles

## Separate Identity From Employment

Profiles represent people, not jobs.

---

## User Ownership

Users control personal information.

---

## Privacy First

Personal information should only be accessible when necessary.

---

## Historical Preservation

Profile changes should not destroy historical accountability.

---

# 23. Summary

The ShiftOS Profile Management Model defines how user personal information is maintained.

It ensures:

- Clear separation between identity and employment.
- Secure profile updates.
- Privacy protection.
- Consistent user experience.

Profiles represent people, while employee records represent workforce relationships.