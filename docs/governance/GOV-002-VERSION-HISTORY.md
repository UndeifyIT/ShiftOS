# Version History

**Document ID:** GOV-002

**Document Title:** Version History

**Version:** 1.0.0

**Status:** Approved

**Owner:** ShiftOS Product Team

**Last Updated:** 2026-07-10

---

# 1. Purpose

This document maintains the official version history of all ShiftOS specifications.

It serves as the authoritative record of document versions, approvals, revisions and publication history.

This document does not describe why changes were made.

Reasons for changes are recorded in the Decision Log.

---

# 2. Objectives

The Version History exists to:

- Track every specification version.
- Record publication dates.
- Record document status.
- Prevent confusion over outdated specifications.
- Support traceability.
- Support future audits.
- Ensure developers always reference the latest approved specification.

---

# 3. Version Numbering Standard

All ShiftOS specifications use Semantic Versioning.

Format:

MAJOR.MINOR.PATCH

Example:

1.0.0

---

## 3.1 Major Version

Increment when:

- A specification undergoes a major redesign.
- Breaking behavioural changes occur.
- Large architectural changes are introduced.

Example:

1.0.0 → 2.0.0

---

## 3.2 Minor Version

Increment when:

- New approved functionality is added.
- Existing behaviour is expanded.
- New business rules are introduced.

Example:

1.2.0 → 1.3.0

---

## 3.3 Patch Version

Increment when:

- Typos are corrected.
- Clarifications are made.
- Formatting changes occur.
- Non-behavioural improvements are added.

Example:

1.2.3 → 1.2.4

---

# 4. Document Status

Every specification shall use one of the following statuses.

| Status | Description |
|---------|-------------|
| Draft | Initial work in progress. |
| In Review | Under review and awaiting approval. |
| Approved | Official specification. |
| Deprecated | Replaced by a newer specification. |
| Archived | Retained for historical purposes only. |

---

# 5. Release Rules

Every approved update must:

- Increase the document version.
- Update the Last Updated field.
- Record the change date.
- Update this Version History.
- Reference the relevant Decision Log entry where applicable.

---

# 6. Master Version Register

The table below records the latest approved version of every specification.

| Specification | Current Version | Status | Last Updated |
|---------------|----------------:|--------|--------------|
| GOV-001 | 1.0.0 | Approved | 2026-07-10 |
| GOV-002 | 1.0.0 | Approved | 2026-07-10 |

> As additional specifications are created and approved, they must be added to this register.

---

# 7. Version Control Rules

### VER-001

Only approved versions may be used for implementation.

---

### VER-002

Draft versions must never replace approved versions.

---

### VER-003

Historical versions must remain accessible for reference.

---

### VER-004

Every specification must display its version number in the document header.

---

### VER-005

Version numbers must never decrease.

---

### VER-006

Breaking behavioural changes require a major version increment.

---

### VER-007

Clarifications that do not change behaviour require a patch version increment.

---

# 8. Document Revision Process

Every document revision follows this workflow:

Draft
↓

Review
↓

Approval
↓

Implementation
↓

Future Revision (if required)

No document should bypass the review and approval stages.

---

# 9. Archived Versions

Deprecated and archived specifications shall remain in the repository for historical reference.

They must be clearly marked as:

- Deprecated

or

- Archived

and must not be used for new implementation work.

---

# 10. Success Criteria

This document is considered successful when:

- Every specification has a recorded version.
- Only one current approved version exists for each specification.
- Historical versions remain traceable.
- Developers can quickly identify the latest approved specification.