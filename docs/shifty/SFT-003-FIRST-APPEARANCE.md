# ShiftOS Shifty First Appearance

**Document ID:** SFT-003

**Document Title:** First Appearance

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shifty Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how and when users are first introduced to Shifty within ShiftOS.

The first experience should help users understand Shifty's purpose, capabilities and limitations without interrupting onboarding or daily operations.

---

# 2. First Impression Philosophy

A user's first interaction with Shifty should be:

- Simple.
- Helpful.
- Non-intrusive.
- Informative.
- Optional.

Shifty should introduce itself once and then become available whenever the user chooses to use it.

---

# 3. Initial Introduction

Shifty is introduced after the user completes their initial account setup and reaches the main application for the first time.

The introduction should explain:

- Who Shifty is.
- What Shifty can help with.
- What Shifty cannot do.
- How to access Shifty later.

The introduction should be dismissible.

---

# 4. Welcome Message

A typical introduction may include:

> **Welcome to ShiftOS. I'm Shifty, your operational assistant.**
>
> I can help explain features, answer questions about ShiftOS, identify operational issues and provide recommendations based on your organization's data.
>
> I won't make decisions for you, but I'll help you make informed ones.

The exact wording may evolve while remaining consistent with Shifty's defined personality.

---

# 5. Initial Guidance

During the first session, Shifty may offer guidance such as:

- Creating the first schedule.
- Adding employees.
- Publishing shifts.
- Understanding attendance.
- Managing daily tasks.
- Finding key features.

Guidance should be contextual and based on the user's role.

---

# 6. User Choice

After the introduction, users may choose to:

- Explore Shifty immediately.
- Dismiss the introduction.
- Return to Shifty later.

Users are never required to interact with Shifty to continue using ShiftOS.

---

# 7. Role-Based Introduction

The initial guidance varies by role.

### Manager

Focus on:

- Organization setup.
- Scheduling.
- Workforce oversight.
- Reports.

### Supervisor

Focus on:

- Daily operations.
- Shift management.
- Attendance.
- Tasks.

### Employee

Focus on:

- Viewing schedules.
- Clocking in and out.
- Viewing announcements.
- Completing acknowledgements.

The overall introduction remains consistent while examples are role-specific.

---

# 8. Reintroducing Shifty

Users who dismiss the introduction are not shown the same welcome again.

Future contextual tips may appear when:

- A new feature is introduced.
- The user enters a workflow for the first time.
- Significant product updates are released.

These tips should remain brief and easy to dismiss.

---

# 9. Permissions

All authenticated users may access Shifty.

The information and guidance provided always respect the user's permissions and role.

No additional permissions are required to view the introductory experience.

---

# 10. Database Considerations

A lightweight preference may be stored indicating whether the introductory experience has been completed or dismissed.

Recommended field:

```
user_preferences

shifty_intro_completed
```

Additional onboarding progress should be managed separately from Shifty.

---

# 11. Audit Requirements

The introductory experience does not require audit logging.

If organizations later require onboarding analytics, aggregate usage metrics may be collected separately without affecting operational audit logs.

---

# 12. Future Enhancements

Future versions may support:

- Interactive product tours.
- Personalized onboarding checklists.
- Guided walkthroughs.
- Video introductions.
- Voice introductions.
- Adaptive onboarding based on user activity.

---

# 13. Related Specifications

- SFT-001 Purpose
- SFT-002 Personality
- SFT-004 Onboarding
- SFT-005 Guidance Rules
- DEC-014 Shifty AI Will Assist Rather Than Replace Human Decisions

---

# 14. Summary

Shifty's first appearance introduces users to its role as ShiftOS' intelligent operational assistant.

The introduction is brief, optional and role-aware, helping users understand how Shifty can support their work while making it clear that all operational decisions remain under human control.
