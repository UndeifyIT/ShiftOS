# ShiftOS Conflict Resolution

**Document ID:** RT-005

**Document Title:** Conflict Resolution

**Version:** 1.0.0

**Status:** Approved

**Classification:** Realtime Domain

**Owner:** ShiftOS Product Team

**Created:** 2026-07-14

**Last Updated:** 2026-07-14

---

# 1. Purpose

This document defines how ShiftOS detects, prevents and resolves conflicts when multiple users or devices attempt to modify the same operational data.

Conflict Resolution ensures data integrity while supporting collaborative, realtime workflows across web and mobile clients.

---

# 2. Conflict Resolution Philosophy

Conflicts should be:

- Prevented where possible.
- Detected immediately.
- Resolved consistently.
- Never silently ignored.

The database remains the authoritative source of truth.

No client may overwrite committed server data without validation.

---

# 3. What Is a Conflict?

A conflict occurs when two or more operations attempt to modify the same resource based on different versions of that resource.

Examples include:

- Two supervisors editing the same schedule.
- A manager updating an employee while another user edits the same record.
- Multiple users modifying the same task.
- A mobile device submitting stale offline data after the server has already changed the record.

---

# 4. Conflict Detection

Before applying an update, the server should verify that:

- The resource still exists.
- The user has permission.
- The submitted resource version matches the current server version.

If the versions differ, a conflict exists.

---

# 5. Conflict Workflow

The standard workflow is:

```
User Retrieves Resource

↓

Another User Updates Resource

↓

Original User Attempts Save

↓

Version Validation

↓

Conflict Detected

↓

Update Rejected

↓

Latest Resource Returned

↓

User Reviews Changes

↓

User Resubmits If Appropriate
```

The original update should never overwrite newer server data automatically.

---

# 6. Conflict Prevention

ShiftOS should reduce conflicts by:

- Providing realtime updates.
- Displaying presence indicators.
- Showing "currently being edited" indicators where appropriate.
- Synchronizing clients frequently.
- Updating only affected resources.

Prevention reduces conflict frequency but does not eliminate it.

---

# 7. Resolution Strategy

ShiftOS uses **optimistic concurrency control**.

This means:

- Multiple users may edit simultaneously.
- The server validates resource versions during save.
- Conflicting updates are rejected.
- Users review the latest version before attempting another save.

Automatic merging is not supported unless explicitly defined for a resource type.

---

# 8. User Experience

When a conflict occurs:

- The user receives a clear explanation.
- The latest server version is retrieved.
- Unsaved local changes should be preserved where practical.
- The user chooses whether to reapply their changes.

Users should never lose work without warning.

---

# 9. Offline Conflicts

If offline changes conflict with newer server data:

- The server rejects stale updates.
- The client downloads the latest version.
- The user is informed of the conflict.
- Manual review is required before resubmission.

Offline synchronization must never overwrite newer server records.

---

# 10. Permissions

Permission validation occurs before conflict resolution.

Unauthorized updates are rejected regardless of version status.

Conflict handling never bypasses authorization rules.

---

# 11. Database Considerations

Resources participating in optimistic concurrency should include:

```
version

updated_at
```

The version number should increment with every successful update.

Version validation should occur within the same database transaction as the update.

---

# 12. Audit Requirements

The following events may be logged for diagnostics:

- Conflict detected.
- Update rejected due to version mismatch.
- Conflict resolved successfully.

Operational audit records continue to reflect only successful business actions.

Rejected updates should not create operational audit entries.

---

# 13. Future Enhancements

Future versions may support:

- Resource-specific merge strategies.
- Collaborative editing.
- Side-by-side conflict comparison.
- Automatic conflict recovery for safe field-level changes.
- AI-assisted merge suggestions.

Any automated merge capability must preserve data integrity and remain fully transparent to users.

---

# 14. Related Specifications

- RT-001 Event Architecture
- RT-002 Live Updates
- RT-003 Presence
- RT-004 Synchronization Rules
- SCH-006 Schedule Editing
- TASK-002 Task Assignment

---

# 15. Summary

ShiftOS uses optimistic concurrency control to ensure consistent conflict resolution across all operational domains.

By validating resource versions before updates, rejecting stale changes and requiring users to review newer data before resubmitting, ShiftOS protects data integrity while enabling collaborative realtime workflows across multiple users and devices.
