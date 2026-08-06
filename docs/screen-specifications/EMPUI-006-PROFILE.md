# ShiftOS Employee Profile

**Document ID:** EMPUI-006

**Document Title:** Employee Profile Screen Specification

**Version:** 1.0.0

**Status:** Approved

**Classification:** Screen Specification

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the employee profile experience in ShiftOS.

The feature allows employees to view and manage permitted personal account information.

---

# 2. Primary User

Designed for:

- Employees.
- Shift workers.
- Team members.

---

# 3. Employee Goal

Employees should be able to:

- View their information.
- Update permitted details.
- Manage account preferences.

---

# 4. Profile Philosophy

The profile experience prioritizes:

- Accuracy.
- Privacy.
- Employee control.

---

# 5. Screen Structure

Primary layout:

```
Profile Header

↓

Personal Information

↓

Employment Information

↓

Account Settings

↓

Security Settings
```

---

# 6. Profile Header

Displays:

- Employee name.
- Profile image (future).
- Branch information.

---

# 7. Personal Information

Possible fields:

- Full name.
- Phone number.
- Email address.
- Emergency contact (future).

---

# 8. Employment Information

Displays:

- Employee ID.
- Branch.
- Employment type.
- Join date.

Important:

Most employment fields are view-only.

---

# 9. Account Settings

Possible settings:

- Notification preferences.
- Language preferences (future).
- App preferences.

---

# 10. Security Settings

Allows:

- Password changes.
- Login security options.

---

# 11. Editing Rules

Employees may edit:

- Approved personal fields.

Employees cannot edit:

- Employment status.
- Branch assignment.
- Attendance records.
- Payroll-related information.

---

# 12. Profile Verification

Future options:

- Verify contact details.
- Confirm personal information.

---

# 13. Empty States

Profile should always contain data.

Possible future:

No profile image:

```
Add a profile picture.
```

---

# 14. Error States

Examples:

Unable to save profile:

```
Profile update failed.
Try again.
```

---

# 15. Permissions

Employees can access:

- Their own profile only.

They cannot:

- View other employee profiles.

---

# 16. Responsive Behaviour

Mobile:

Primary experience.

Desktop:

Secondary experience.

---

# 17. MVP Requirements

Must include:

✅ View personal details  
✅ View employment details  
✅ Update permitted information  
✅ Account settings  

---

# 18. Future Enhancements

Future versions:

- Profile pictures.
- Digital employee documents.
- Certifications.
- Skills management.

---

# 19. Related Specifications

- EMPUI-001 Employee Dashboard
- MAN-002 Employee Management
- SEC-003 Authorization
- DB-005 Tables

---

# 20. Summary

Employee Profile provides workers with ownership of their personal information while maintaining business control over operational records.