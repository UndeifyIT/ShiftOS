# ShiftOS Shifty Productivity Suggestions

**Document ID:** SFT-008

**Document Title:** Productivity Suggestions

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shifty Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how Shifty provides productivity suggestions within ShiftOS.

Productivity Suggestions help users complete their work more efficiently by identifying opportunities to improve workflows, reduce repetitive actions and make better use of ShiftOS features.

Unlike operational recommendations, productivity suggestions focus on improving the user's experience within the platform.

---

# 2. Productivity Philosophy

Shifty should help users work smarter, not harder.

Suggestions should:

- Save time.
- Reduce repetitive work.
- Improve workflow efficiency.
- Encourage better use of ShiftOS features.

Suggestions are optional and never interrupt critical operational activities.

---

# 3. Suggestion Sources

Shifty may generate productivity suggestions based on:

- Frequently repeated actions.
- User interaction patterns.
- Incomplete workflows.
- Available ShiftOS features.
- Organization configuration.
- User role.

Suggestions should always respect the user's permissions.

---

# 4. Suggestion Workflow

The standard workflow is:

```
User Activity Observed

↓

Workflow Pattern Identified

↓

Potential Improvement Detected

↓

Suggestion Generated

↓

User Reviews Suggestion

↓

User Applies or Dismisses Suggestion
```

Suggestions never make changes automatically.

---

# 5. Types of Suggestions

Examples include:

### Workflow Suggestions

- Use schedule templates instead of creating schedules manually.
- Create recurring tasks for repetitive work.
- Publish schedules after completing assignments.

---

### Feature Discovery

- Try attendance history to review recent trends.
- Use filters to find employees faster.
- Explore communication history for previous announcements.

---

### Efficiency Improvements

- Complete pending draft schedules.
- Archive outdated announcements.
- Review overdue task verifications.
- Finish incomplete onboarding steps.

---

### Best Practices

- Review attendance before publishing payroll exports (future).
- Verify completed tasks regularly.
- Keep recurring tasks up to date.

---

# 6. Suggestion Content

Each suggestion should include:

- Clear title.
- Brief explanation.
- Expected benefit.
- Suggested action.

Where appropriate, Shifty should explain how much time or effort the suggestion could save.

---

# 7. Suggestion Frequency

Productivity suggestions should:

- Be infrequent.
- Appear only when valuable.
- Avoid repeating dismissed suggestions.
- Prioritize the highest-value opportunity.

Multiple suggestions should not compete for the user's attention.

---

# 8. User Control

Users may:

- Apply the suggestion.
- Dismiss the suggestion.
- Ignore the suggestion.
- View additional information where available.

Dismissed suggestions should not immediately reappear.

---

# 9. Permissions

Suggestions are personalized according to:

- User role.
- Organization settings.
- Branch assignment.
- Available features.
- User permissions.

Shifty never suggests actions the user is not authorized to perform.

---

# 10. Database Considerations

Suggestions should be generated dynamically.

If persistence is required, a lightweight table may be used:

```
shifty_productivity_suggestions

id

user_id

suggestion_type

title

summary

status

generated_at

dismissed_at
```

Operational data remains within its original domain.

---

# 11. Audit Requirements

Viewing or dismissing productivity suggestions does not require operational audit logging.

If a suggestion results in an operational action, the resulting action should be audited by its corresponding domain.

---

# 12. Future Enhancements

Future versions may support:

- Personalized workflow coaching.
- Industry-specific productivity advice.
- AI-generated daily productivity summaries.
- Time-saving opportunity scoring.
- Team productivity benchmarking.
- Adaptive suggestions based on user experience.

---

# 13. Related Specifications

- SFT-001 Purpose
- SFT-005 Guidance Rules
- SFT-006 Notifications
- SFT-007 Recommendations
- SFT-009 Limitations

---

# 14. Summary

Shifty Productivity Suggestions help users work more efficiently within ShiftOS by identifying opportunities to simplify workflows, reduce repetitive tasks and discover useful platform features.

These suggestions are contextual, optional and designed to improve productivity without interrupting operational work or reducing user control.
