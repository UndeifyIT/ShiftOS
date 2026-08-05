# ShiftOS Shifty Guidance Rules

**Document ID:** SFT-005

**Document Title:** Guidance Rules

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shifty Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines when and how Shifty provides guidance within ShiftOS.

Guidance Rules ensure that Shifty delivers timely, relevant and helpful assistance without interrupting operational workflows or overwhelming users.

---

# 2. Guidance Philosophy

Shifty provides guidance only when it adds value.

Guidance should:

- Be contextual.
- Be actionable.
- Be concise.
- Respect the user's workflow.

Users should feel assisted, not interrupted.

---

# 3. When Guidance Is Provided

Shifty may provide guidance when:

- A user enters a feature for the first time.
- A workflow appears incomplete.
- A validation error occurs.
- An operational issue is detected.
- A recommendation is relevant.
- A user explicitly requests help.

Guidance should always relate to the user's current context.

---

# 4. When Guidance Is Not Provided

Shifty should remain silent when:

- The user is actively completing routine work.
- Guidance would interrupt time-sensitive tasks.
- The same suggestion has been repeatedly dismissed.
- No useful recommendation can be made.
- The user lacks permission to perform the suggested action.

Silence is preferable to unnecessary guidance.

---

# 5. Context Awareness

Guidance may consider:

- User role.
- Organization settings.
- Branch.
- Current screen.
- Active workflow.
- Published schedules.
- Attendance status.
- Assigned tasks.

Shifty must never use data the user is not authorized to access.

---

# 6. Guidance Principles

Every piece of guidance should:

- Explain the situation.
- Explain why it matters.
- Suggest a practical next step.

Example:

> "Three employees are scheduled to start in the next 15 minutes. Consider confirming that today's opening tasks are assigned."

Avoid vague suggestions such as:

> "Something needs your attention."

---

# 7. Frequency

Guidance should be limited.

General principles include:

- Avoid repeating the same guidance unnecessarily.
- Avoid displaying multiple guidance cards simultaneously.
- Prioritize the most valuable recommendation.
- Allow users to dismiss guidance easily.

The goal is to reduce cognitive load, not increase it.

---

# 8. Timing

Guidance should appear:

- Before mistakes become problems.
- After important events.
- When entering unfamiliar workflows.
- During natural pauses in user activity.

Guidance should not interrupt critical operational actions such as:

- Clocking attendance.
- Publishing schedules.
- Recording task completion.

---

# 9. User Control

Users may:

- Dismiss guidance.
- Ignore recommendations.
- Request additional explanations.
- Reopen guidance later where supported.

Ignoring guidance should never restrict product functionality.

---

# 10. Permissions

Shifty only provides guidance related to features and data the current user is authorized to access.

Managers, supervisors and employees may receive different guidance based on their responsibilities.

---

# 11. Database Considerations

Guidance is generated dynamically.

No permanent database table is required for guidance itself.

Optional user preferences may include:

```
user_preferences

shifty_tips_enabled

shifty_guidance_dismissed
```

Operational data remains stored within its respective domains.

---

# 12. Audit Requirements

General guidance interactions do not require audit logging.

If a user accepts a recommendation that results in an operational action, the operational action itself should be audited through its corresponding domain.

---

# 13. Future Enhancements

Future versions may support:

- Personalized guidance frequency.
- Industry-specific guidance.
- Learning from dismissed suggestions.
- Adaptive guidance based on experience level.
- Voice-based guidance.
- AI-generated workflow coaching.

---

# 14. Related Specifications

- SFT-001 Purpose
- SFT-002 Personality
- SFT-004 Onboarding
- SFT-006 Notifications
- SFT-007 Recommendations
- SFT-009 Limitations

---

# 15. Summary

Shifty Guidance Rules define when and how the assistant provides operational assistance within ShiftOS.

By delivering contextual, timely and concise guidance while respecting user workflows and permissions, Shifty improves operational efficiency without becoming distracting or intrusive.
