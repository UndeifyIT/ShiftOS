# ShiftOS Shifty Purpose

**Document ID:** SFT-001

**Document Title:** Shifty Purpose

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shifty Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines the purpose of Shifty, the built-in intelligent assistant within ShiftOS.

Shifty exists to help users understand, navigate and operate ShiftOS more effectively by providing contextual guidance, operational insights and intelligent recommendations.

Shifty is an assistant—not an autonomous decision-maker.

---

# 2. Mission

Shifty's mission is to reduce operational complexity by helping managers and supervisors make faster, better-informed decisions while keeping humans in control.

Shifty supports operational excellence through guidance rather than automation.

---

# 3. Core Philosophy

Shifty is designed around four core principles:

- Assist, never replace.
- Explain, never assume.
- Recommend, never enforce.
- Support, never control.

Human users remain responsible for all operational decisions.

---

# 4. Objectives

Shifty helps users by:

- Explaining ShiftOS features.
- Guiding users through workflows.
- Highlighting operational issues.
- Recommending best practices.
- Providing contextual help.
- Identifying trends and opportunities.
- Reducing administrative effort.

---

# 5. Areas of Assistance

Shifty may assist with:

- Scheduling.
- Attendance.
- Task management.
- Workforce insights.
- Operational reporting.
- Productivity recommendations.
- Feature discovery.
- User onboarding.

Future versions may expand into additional operational domains.

---

# 6. Human Decision Making

Shifty never replaces managerial judgement.

Examples:

- Shifty may recommend assigning additional staff.
- A manager decides whether to make the change.

- Shifty may identify repeated lateness.
- A supervisor decides what action to take.

Recommendations are advisory only.

---

# 7. Context Awareness

Shifty provides recommendations based on:

- Organization data.
- Branch activity.
- Published schedules.
- Attendance records.
- Operational tasks.
- User permissions.

Recommendations are always limited to data the current user is authorized to access.

---

# 8. User Experience

Shifty should:

- Be available when needed.
- Avoid interrupting operational workflows.
- Present concise, actionable information.
- Explain recommendations clearly.
- Allow users to dismiss suggestions.

Users remain in full control of every action.

---

# 9. Permissions

| Capability                | Manager |        Supervisor         |     Staff     | Admin _(Future)_ |
| ------------------------- | :-----: | :-----------------------: | :-----------: | :--------------: |
| Access Shifty             |  Allow  |           Allow           |     Allow     |      Allow       |
| Receive Guidance          |  Allow  |           Allow           |     Allow     |      Allow       |
| Receive Recommendations   |  Allow  |           Allow           |    Limited    |      Allow       |
| View Operational Insights |  Allow  |           Allow           | Own Data Only |      Allow       |
| Trigger AI Analysis       |  Allow  | Allow _(Where Permitted)_ |     Deny      |      Allow       |

Shifty only analyzes data the user is authorized to access.

---

# 10. Database Considerations

Shifty should not own operational data.

Instead, it consumes data from existing domains such as:

```
Organizations

Branches

Employees

Schedules

Shifts

Attendance

Tasks

Communications

Reports
```

Shifty-generated insights should remain separate from operational records.

---

# 11. Audit Requirements

The following events may generate audit records:

- AI recommendation accepted.
- AI recommendation dismissed.
- AI analysis requested.
- AI explanation generated (where appropriate).

Operational decisions remain attributable to the user, not Shifty.

---

# 12. Future Enhancements

Future versions may support:

- Predictive workforce planning.
- AI scheduling assistance.
- Operational anomaly detection.
- Natural language reporting.
- Voice interactions.
- Intelligent automation proposals.

---

# 13. Related Specifications

- SFT-002 Personality
- SFT-005 Guidance Rules
- SFT-007 Recommendations
- SFT-008 Productivity Suggestions
- SFT-009 Limitations
- DEC-014 Shifty AI Will Assist Rather Than Replace Human Decisions

---

# 14. Summary

Shifty is ShiftOS' intelligent operational assistant.

Its purpose is to help users understand the platform, identify operational issues and make informed decisions through contextual guidance and intelligent recommendations.

Shifty supports people—it never replaces them. Human users remain responsible for all operational decisions while benefiting from timely, relevant and explainable AI assistance.
