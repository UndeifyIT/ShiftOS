# ShiftOS Manager Settings

**Document ID:** MAN-007

**Document Title:** Manager Settings Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the manager settings experience in ShiftOS.

The settings area allows authorized managers to configure organization-level behaviour, preferences and administrative options.

---

# 2. Primary User

Designed for:

- Organization managers.
- Business owners.
- Administrators.

---

# 3. Settings Goal

Managers should be able to configure:

- How their organization operates.
- Workforce preferences.
- Access rules.
- Business information.

---

# 4. Settings Philosophy

Settings should be:

- Organized.
- Discoverable.
- Permission-controlled.
- Safe.

Avoid:

- Technical terminology.
- Overwhelming configuration lists.

---

# 5. Settings Structure

Recommended sections:

```
Organization

↓

Branches

↓

Workforce Rules

↓

Permissions

↓

Notifications

↓

Security

↓

Integrations (Future)
```

---

# 6. Organization Settings

Allows management of:

- Organization name.
- Business information.
- Industry type.
- Time zone.

---

# 7. Branch Settings

Allows:

- Adding branches.
- Editing branch information.
- Managing branch status.

---

# 8. Workforce Settings

Possible settings:

- Shift rules.
- Attendance preferences.
- Task configuration.

Examples:

```
Require attendance confirmation
```

---

# 9. Permission Settings

Allows authorized users to manage:

- Roles.
- Access levels.
- User permissions.

Permissions should follow:

SEC-003 Authorization.

---

# 10. Notification Settings

Controls:

- Email notifications.
- Push notifications.
- Operational alerts.

---

# 11. Security Settings

Possible settings:

- Session preferences.
- Login security.
- Account protection.

---

# 12. Integration Settings

Future functionality:

- Payroll systems.
- HR platforms.
- External tools.

---

# 13. Destructive Actions

Sensitive actions require protection.

Examples:

- Removing branches.
- Changing ownership.
- Deleting organization data.

Requirements:

- Confirmation.
- Permission checks.
- Audit logging.

---

# 14. Empty States

Settings generally do not require empty states.

Possible example:

No integrations:

```
No integrations connected.
```

---

# 15. Error States

Examples:

Failed update:

```
Unable to save settings.
Try again.
```

---

# 16. Permissions

Only authorized users may change settings.

Examples:

Manager:

- View organization settings.

Administrator:

- Modify security settings.

---

# 17. Responsive Behaviour

Desktop:

- Sidebar settings navigation.

Mobile:

- Section-based navigation.

---

# 18. MVP Requirements

Must include:

✅ Organization settings  
✅ Branch settings  
✅ Basic workforce configuration  
✅ Permission management foundation  
✅ Notification preferences  

---

# 19. Future Enhancements

Future versions:

- Advanced policy management.
- Workflow customization.
- Enterprise configuration.
- Audit dashboards.

---

# 20. Related Specifications

- SEC-003 Authorization
- SEC-006 Audit Logging
- ONB-001 Onboarding Screens
- SUP-001 Supervisor Dashboard
- UI-002 Navigation

---

# 21. Summary

Manager Settings provides controlled configuration of ShiftOS behaviour.

By separating business settings from technical configuration, ShiftOS maintains simplicity while supporting enterprise flexibility.