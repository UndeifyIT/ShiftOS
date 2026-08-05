# ShiftOS Shifty Onboarding

**Document ID:** SFT-004

**Document Title:** Shifty Onboarding

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shifty Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how Shifty assists users during onboarding within ShiftOS.

Shifty provides contextual guidance throughout onboarding, helping users understand workflows, complete setup tasks and discover key features without taking control of the onboarding process.

---

# 2. Onboarding Philosophy

Shifty is an onboarding guide.

It explains.

It recommends.

It answers questions.

It never completes onboarding steps on behalf of the user.

Users remain responsible for configuring their organization and making operational decisions.

---

# 3. Onboarding Objectives

Shifty helps new users:

- Understand ShiftOS.
- Learn important workflows.
- Complete setup with confidence.
- Discover key features.
- Avoid common mistakes.

The objective is to reduce learning time while maintaining user control.

---

# 4. Guided Assistance

During onboarding, Shifty may provide contextual guidance for:

- Organization setup.
- Branch creation.
- Department setup.
- Employee management.
- Schedule creation.
- Shift creation.
- Attendance configuration.
- Task management.
- Communication features.

Guidance appears only when relevant to the current workflow.

---

# 5. Contextual Tips

Shifty may display short contextual tips such as:

- Explaining unfamiliar terms.
- Highlighting recommended next steps.
- Suggesting best practices.
- Clarifying business rules.

Tips should be concise and dismissible.

---

# 6. Progressive Guidance

Shifty introduces information progressively.

Users should receive only the guidance needed for their current task.

Advanced concepts should appear only when relevant.

This reduces cognitive load during onboarding.

---

# 7. Role-Based Guidance

Shifty adapts onboarding guidance based on the user's role.

### Manager

Examples include:

- Creating the first branch.
- Inviting supervisors.
- Publishing schedules.
- Reviewing reports.

---

### Supervisor

Examples include:

- Managing shifts.
- Recording attendance.
- Completing tasks.
- Viewing announcements.

---

### Employee

Examples include:

- Viewing schedules.
- Clocking in.
- Reading announcements.
- Acknowledging important communications.

---

# 8. Optional Assistance

All onboarding assistance is optional.

Users may:

- Dismiss tips.
- Skip guidance.
- Continue independently.
- Reopen guidance later if needed.

Shifty never blocks onboarding progress.

---

# 9. Learning From Progress

Shifty may adjust future guidance based on onboarding progress.

Examples include:

- Hiding completed guidance.
- Recommending unfinished setup steps.
- Highlighting optional features after core setup is complete.

Recommendations remain informational only.

---

# 10. Permissions

Shifty provides onboarding guidance only for features the current user is authorized to access.

Users never receive onboarding guidance for restricted functionality.

---

# 11. Database Considerations

Recommended preference fields:

```
user_preferences

shifty_intro_completed

shifty_tips_enabled
```

Onboarding progress itself should be managed by the product onboarding system rather than the Shifty domain.

---

# 12. Audit Requirements

Viewing onboarding guidance does not require audit logging.

If onboarding analytics are collected, they should be stored separately from operational audit logs.

---

# 13. Future Enhancements

Future versions may support:

- Interactive walkthroughs.
- Personalized onboarding checklists.
- AI-generated learning plans.
- Adaptive onboarding based on industry.
- Voice-guided onboarding.
- In-app tutorial simulations.

---

# 14. Related Specifications

- SFT-001 Purpose
- SFT-002 Personality
- SFT-003 First Appearance
- SFT-005 Guidance Rules
- COM-001 Announcements

---

# 15. Summary

Shifty Onboarding provides contextual, role-aware guidance that helps users learn ShiftOS efficiently without interrupting their workflow.

By delivering progressive, optional and context-sensitive assistance, Shifty accelerates user adoption while ensuring that all setup and operational decisions remain under human control.
