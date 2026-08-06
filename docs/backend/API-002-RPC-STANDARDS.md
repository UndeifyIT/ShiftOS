# ShiftOS RPC Standards

**Document ID:** API-002

**Document Title:** RPC Standards

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the standards for using Remote Procedure Calls (RPCs) within ShiftOS.

RPCs provide controlled execution of business operations that require server-side processing, transactions or complex workflows.

---

# 2. RPC Philosophy

RPCs represent business actions.

They should describe what the system does rather than how data is stored.

Preferred:

```
publish_schedule()
clock_in_employee()
complete_task()
```

Avoid:

```
update_schedule_table()
insert_attendance_record()
change_task_status()
```

---

# 3. RPC Principles

ShiftOS RPCs follow these principles:

- Business-focused naming.
- Server-controlled execution.
- Transaction safety.
- Permission enforcement.
- Clear input/output contracts.
- Minimal database exposure.

---

# 4. When To Use RPCs

RPCs are appropriate for:

- Multi-step workflows.
- Operations requiring transactions.
- Actions requiring permission checks.
- Complex database operations.
- Operations shared across clients.

Examples:

```
Clock In Employee

↓

Validate shift

↓

Check permissions

↓

Create attendance record

↓

Publish event
```

---

# 5. When NOT To Use RPCs

Avoid RPCs for simple operations.

Examples:

Do not create:

```
get_employee_by_id()
```

when a simple query is sufficient.

Do not create:

```
create_employee_record()
```

if no additional business logic exists.

---

# 6. RPC Naming Standards

RPC names should use:

```
verb_object
```

Format:

```
<action>_<entity>
```

Examples:

```
create_employee

publish_schedule

assign_task

verify_task

send_announcement
```

Names should describe the business action.

---

# 7. RPC Input Standards

Inputs should:

- Be explicit.
- Use meaningful names.
- Avoid unnecessary parameters.
- Validate required fields.

Example:

```
employee_id

shift_id

clock_time

location
```

Avoid ambiguous parameters:

```
data

payload

value
```

---

# 8. RPC Output Standards

RPC responses should provide useful results.

Possible outputs:

- Created record.
- Updated status.
- Validation result.
- Error information.

Responses should avoid exposing unnecessary database details.

---

# 9. Security Requirements

Every RPC must enforce:

- Authentication.
- Authorization.
- Tenant ownership.
- Input validation.

Client-side checks are not sufficient.

---

# 10. Transaction Requirements

RPCs performing multiple database operations should use transactions.

Example:

Task completion:

```
Validate task

↓

Update task status

↓

Create history record

↓

Publish event

↓

Commit
```

Partial completion should not occur.

---

# 11. RPC Error Handling

RPCs should return predictable errors.

Examples:

```
SHIFT_NOT_AVAILABLE

PERMISSION_DENIED

INVALID_STATUS_CHANGE

EMPLOYEE_NOT_FOUND
```

Errors should be meaningful without exposing sensitive information.

---

# 12. RPC Documentation

Every RPC should document:

- Purpose.
- Inputs.
- Outputs.
- Permissions required.
- Side effects.
- Failure conditions.

---

# 13. RPC Versioning

Breaking RPC changes require versioning.

Example:

```
clock_in_employee_v1()

clock_in_employee_v2()
```

Existing clients should not break unexpectedly.

---

# 14. Testing Requirements

RPCs require testing for:

- Valid workflows.
- Invalid inputs.
- Permission failures.
- Transaction failures.
- Edge cases.

---

# 15. Future Enhancements

Future versions may introduce:

- RPC generation tooling.
- Shared API contracts.
- Automated documentation.
- Workflow orchestration services.

---

# 16. Related Specifications

- API-001 Backend Architecture
- API-003 Validation Rules
- API-004 Workflow Engine
- API-006 Error Handling
- SEC-009 API Security

---

# 17. Summary

ShiftOS uses RPCs selectively to expose secure, transactional business operations.

By treating RPCs as business actions rather than database shortcuts, the platform maintains clean boundaries between clients, backend logic and PostgreSQL while preserving scalability and maintainability.
