# ShiftOS Shifty Recommendations

**Document ID:** SFT-007

**Document Title:** Recommendations

**Version:** 1.0.0

**Status:** Approved

**Classification:** Shifty Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how Shifty generates operational recommendations within ShiftOS.

Recommendations help managers and supervisors make informed workforce decisions by analyzing operational data and suggesting practical actions.

Recommendations are advisory only and never result in automatic operational changes.

---

# 2. Recommendation Philosophy

Shifty recommends.

Users decide.

Every recommendation should:

- Be supported by operational data.
- Be understandable.
- Be actionable.
- Be explainable.

Recommendations should improve operational efficiency without replacing managerial judgement.

---

# 3. Recommendation Sources

Shifty may generate recommendations using information from:

- Schedules.
- Shifts.
- Attendance.
- Tasks.
- Announcements.
- Workforce trends.
- Historical operational data.

Recommendations are limited to data the user is authorized to access.

---

# 4. Recommendation Workflow

The standard workflow is:

```
Operational Data Evaluated

↓

Pattern Identified

↓

Recommendation Generated

↓

Explanation Created

↓

Recommendation Presented

↓

User Reviews

↓

User Accepts, Ignores or Dismisses
```

No operational action is performed automatically.

---

# 5. Recommendation Categories

Examples include:

### Scheduling

- Potential staffing shortages.
- Uneven shift distribution.
- Upcoming coverage gaps.

---

### Attendance

- Employees with repeated lateness.
- Attendance trends.
- Frequent absences.

---

### Task Management

- Overdue operational tasks.
- Unverified completed tasks.
- Supervisor workload imbalance.

---

### Operations

- Branch activity trends.
- Operational bottlenecks.
- Areas requiring managerial attention.

Future recommendation categories may be added as the platform evolves.

---

# 6. Recommendation Content

Every recommendation should include:

- A clear title.
- A concise explanation.
- The operational reason.
- Suggested next action.

Where appropriate, Shifty should also explain the potential impact of taking or ignoring the recommendation.

---

# 7. Explainability

Users should always understand why a recommendation was generated.

Examples:

> "Five employees have arrived late at least three times this month."

> "The afternoon shift has 30% fewer staff than similar days over the last four weeks."

Recommendations should never appear without supporting context.

---

# 8. User Actions

Users may:

- Review recommendations.
- Dismiss recommendations.
- Ignore recommendations.
- Follow the suggested workflow.

Recommendations never modify operational records directly.

---

# 9. Permissions

Recommendations are personalized according to user permissions.

### Managers

May receive organization-wide recommendations.

### Supervisors

Receive recommendations limited to their operational responsibilities.

### Employees

Receive only personal recommendations, such as:

- Upcoming shifts.
- Missed acknowledgements.
- Attendance reminders.

Employees never receive management insights.

---

# 10. Database Considerations

Recommendations should be generated dynamically from operational data.

If recommendation persistence is required, a lightweight table may be used:

```
shifty_recommendations

id

user_id

recommendation_type

priority

title

summary

status

generated_at

dismissed_at
```

Operational evidence remains stored in its original domain.

---

# 11. Audit Requirements

Recommendations themselves do not require operational audit logging.

If a recommendation results in an operational action, the action is audited within its corresponding domain.

Aggregate recommendation analytics may be collected separately.

---

# 12. Future Enhancements

Future versions may support:

- Predictive scheduling recommendations.
- Workforce optimization suggestions.
- AI-powered branch benchmarking.
- Labor cost optimization.
- Seasonal staffing predictions.
- Natural language operational advice.

---

# 13. Related Specifications

- SFT-001 Purpose
- SFT-005 Guidance Rules
- SFT-006 Notifications
- SFT-008 Productivity Suggestions
- SFT-009 Limitations
- DEC-014 Shifty AI Will Assist Rather Than Replace Human Decisions

---

# 14. Summary

Shifty Recommendations transform operational data into clear, explainable and actionable suggestions.

By combining workforce intelligence with transparent reasoning, Shifty helps managers and supervisors make better operational decisions while ensuring that every final decision remains under human control.
