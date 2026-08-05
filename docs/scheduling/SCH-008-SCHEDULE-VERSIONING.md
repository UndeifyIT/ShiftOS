# ShiftOS Schedule Versioning

**Document ID:** SCH-008

**Document Title:** Schedule Versioning

**Version:** 1.0.0

**Status:** Approved

**Classification:** Scheduling Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how schedule versions are managed within ShiftOS.

Schedule Versioning ensures that every published schedule maintains a complete history of changes, allowing supervisors and managers to track revisions, audit modifications and understand exactly what employees were scheduled to work at any point in time.

Versioning provides accountability without losing historical data.

---

# 2. Versioning Principles

## 2.1 Every Schedule Begins At Version 1

A newly created schedule starts with Version 1.

Example:

```
Week 29 Schedule

Version 1
```

---

## 2.2 Every Published Revision Creates A New Version

Whenever a published schedule is modified and republished, ShiftOS creates a new version.

Example:

```
Version 1

↓

Version 2

↓

Version 3
```

Older versions remain available for historical reference.

---

## 2.3 Draft Edits Do Not Create Versions

While a schedule remains in Draft, users may edit it multiple times.

These edits do not create new versions.

Only publication creates an official version.

---

## 2.4 Versions Are Immutable

Once created, a version can never be modified.

Future changes always create a newer version.

Example:

```
Version 2

✗ Cannot Edit

↓

Version 3
```

---

# 3. Why Versioning Exists

Versioning allows organizations to:

- Understand schedule history.
- Investigate disputes.
- Review operational decisions.
- Support audits.
- Restore confidence in workforce records.

---

# 4. Version Creation

A new version is created when:

- A schedule is published for the first time.
- A published schedule is edited and republished.
- A manager republishes an updated schedule.

Examples that create new versions:

- Shift reassigned.
- Employee replaced.
- Shift time changed.
- Shift added.
- Shift removed.

---

# 5. Version Numbers

Version numbers increase sequentially.

Example:

```
Version 1

↓

Version 2

↓

Version 3

↓

Version 4
```

Numbers are never reused.

---

# 6. Version History

Every schedule maintains a version history.

Example:

| Version | Published By | Date        |
| ------- | ------------ | ----------- |
| 1       | Supervisor   | 13 Jul 2026 |
| 2       | Supervisor   | 14 Jul 2026 |
| 3       | Manager      | 15 Jul 2026 |

The latest version is always considered the active operational version.

---

# 7. Viewing Previous Versions

Managers and supervisors may review previous versions.

Previous versions are read-only.

Historical versions cannot become operational simply by opening them.

---

# 8. Comparing Versions

ShiftOS should allow users to compare versions.

Example comparison:

```
Version 2

John

↓

Morning Shift

Version 3

John

↓

Evening Shift
```

Differences may include:

- Shift additions.
- Shift removals.
- Employee changes.
- Time changes.
- Supervisor changes.

---

# 9. Restoring A Previous Version

Previous versions cannot be directly reactivated.

Instead, users restore by creating a new version based on an older one.

Example:

```
Version 2

↓

Restore

↓

Version 5
```

This preserves the audit trail.

---

# 10. Employee Visibility

Employees always see only the latest published version.

Historical versions are not visible to employees.

---

# 11. Version Permissions

| Permission                                       | Manager | Supervisor |         Staff          | Admin _(Future)_ |
| ------------------------------------------------ | :-----: | :--------: | :--------------------: | :--------------: |
| View Current Version                             |  Allow  |   Allow    | Own Published Schedule |      Allow       |
| View Version History                             |  Allow  |   Allow    |          Deny          |      Allow       |
| Compare Versions                                 |  Allow  |   Allow    |          Deny          |      Allow       |
| Restore Previous Version _(Creates New Version)_ |  Allow  |   Allow    |          Deny          |       Deny       |
| Export Version History                           |  Allow  |   Allow    |          Deny          |      Allow       |

---

# 12. Database Considerations

Recommended fields:

```
version

published_at

published_by
```

Recommended history table:

```
schedule_versions

id

schedule_id

version_number

published_by

published_at

change_summary

created_at
```

A snapshot of the published schedule should be retained for every version.

---

# 13. Audit Requirements

The following actions generate audit records:

- Version created.
- Version restored.
- Version compared.
- Manager override.
- Version exported.

Audit records include:

- User.
- Schedule.
- Version number.
- Action.
- Timestamp.

---

# 14. Future Enhancements

Future versions may support:

- Side-by-side visual comparison.
- AI-generated change summaries.
- Automatic rollback recommendations.
- Color-coded version differences.
- Version approval workflows.

---

# 15. Related Specifications

- SCH-001 Schedule Definition
- SCH-002 Schedule Lifecycle
- SCH-003 Schedule States
- SCH-006 Schedule Editing
- SCH-007 Schedule Publishing
- SCH-009 Schedule Locking

---

# 16. Summary

Schedule Versioning ensures that every published schedule maintains a permanent historical record.

Only published schedules create versions, while draft edits remain part of the working draft.

Versioning provides complete traceability, supports operational accountability and enables organizations to review, compare and restore previous schedules without compromising audit integrity.
