# ShiftOS Temporary Operational Takeover

**Document ID:** PER-005

**Document Title:** Temporary Operational Takeover

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Authorization

**Owner:** ShiftOS Product Team

**Created:** 2026-07-12

**Last Updated:** 2026-07-12

---

# 1. Purpose

This document defines the Temporary Operational Takeover mechanism used within ShiftOS.

Temporary Operational Takeover allows a Manager to temporarily perform Supervisor operational responsibilities when no Supervisor has started the shift.

This ensures daily operations can continue without permanently changing user roles.

---

# 2. Objectives

The Temporary Operational Takeover exists to:

- Prevent operational delays.
- Maintain business continuity.
- Ensure shifts can begin on time.
- Avoid permanent role changes.
- Preserve accountability.
- Maintain a complete audit trail.

---

# 3. Activation Conditions

Temporary Operational Takeover may only become available when all of the following conditions are true:

- A scheduled shift exists.
- A Supervisor is assigned to the shift.
- The shift has not been started.
- The configured takeover threshold has been reached.
- A Manager is available.

Example:

Shift Start: **8:00 AM**

Takeover Threshold: **15 minutes**

At **8:15 AM**, the Manager may initiate Temporary Operational Takeover.

---

# 4. Takeover Process

The workflow is as follows:

```
Shift Scheduled
        │
        ▼
Supervisor Fails to Start Shift
        │
        ▼
Takeover Threshold Reached
        │
        ▼
Manager Receives Takeover Option
        │
 ┌──────┴──────┐
 │             │
 ▼             ▼
Accept       Ignore
 │
 ▼
Manager Gains Temporary Supervisor Permissions
 │
 ▼
Manager Operates Shift
 │
 ▼
Takeover Ends
```

---

# 5. Granted Permissions

During Temporary Operational Takeover, the Manager may perform Supervisor operational duties, including:

- Start the shift.
- Record employee attendance.
- Create and publish schedules.
- Assign shifts.
- Manage operational tasks.
- Publish announcements.
- Perform other Supervisor operational responsibilities.

The Manager does not permanently become a Supervisor.

---

# 6. Restrictions

Temporary Operational Takeover does not:

- Change the Manager's role.
- Modify permission assignments.
- Remove the assigned Supervisor.
- Affect organization administration.
- Grant additional security permissions.

The takeover exists only for operational continuity.

---

# 7. Ending the Takeover

The takeover ends when:

- The Manager manually ends it.
- The shift ends.
- The operational session expires.

Ending the takeover immediately removes temporary operational permissions.

---

# 8. Supervisor Arrival

If the assigned Supervisor arrives after the takeover has begun:

The Manager may:

- Continue managing the shift.
- Transfer operational control back to the Supervisor.

The transfer should be recorded in the audit log.

---

# 9. Audit Requirements

Every Temporary Operational Takeover should record:

- Manager
- Assigned Supervisor
- Organization
- Branch
- Shift
- Start time
- End time
- Reason
- Duration

These records must be immutable.

---

# 10. Design Principles

## Operational Continuity

Business operations should never stop because a Supervisor is unavailable.

---

## Temporary Authority

Operational authority is temporary and does not permanently alter user roles.

---

## Accountability

All takeover events must be fully auditable.

---

## Least Privilege

Managers receive only the temporary operational permissions necessary to continue the shift.

---

# 11. Related Specifications

- PER-001 Role Definitions
- PER-003 Permission Evaluation
- PER-006 Access Rules
- SCH-001 Scheduling Model
- ATT-001 Attendance Model
- TSK-001 Task Model

---

# 12. Summary

Temporary Operational Takeover enables Managers to temporarily perform Supervisor operational responsibilities when a scheduled shift has not been started.

The feature ensures business continuity while preserving role integrity, accountability and auditability.