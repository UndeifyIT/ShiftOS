# ShiftOS Backend Architecture

**Document ID:** API-001

**Document Title:** Backend Architecture

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the backend architecture for ShiftOS.

It establishes how backend services process requests, execute business workflows, enforce security, interact with the database and communicate with other system components.

---

# 2. Backend Philosophy

The ShiftOS backend is the central business execution layer.

Its responsibilities include:

- Business logic execution.
- Request processing.
- Authorization enforcement.
- Data validation.
- Workflow orchestration.
- Event publishing.
- Background processing.

The backend ensures that all clients interact with the platform through consistent business rules.

---

# 3. Architectural Principles

The backend follows these principles:

- Server-authoritative business logic.
- Secure by default.
- Domain-driven organization.
- Clear separation of concerns.
- Reusable business workflows.
- Observable operations.
- Maintainable code structure.

---

# 4. Backend Responsibilities

The backend is responsible for:

## Business Logic

Examples:

- Scheduling rules.
- Attendance validation.
- Task workflows.
- Communication permissions.

---

## Security Enforcement

Including:

- Authentication verification.
- Authorization checks.
- Tenant isolation.
- Permission enforcement.

---

## Data Coordination

Including:

- Database operations.
- Transactions.
- Consistency checks.
- Event creation.

---

## Integration Management

Including:

- External services.
- Notifications.
- Background jobs.
- Future integrations.

---

# 5. Backend Architecture Model

ShiftOS follows a layered architecture:

```
Client Applications

(Web / Mobile / PWA)

↓

API Layer

↓

Application Services

↓

Domain Logic

↓

Data Access Layer

↓

PostgreSQL Database
```

Each layer has a defined responsibility.

---

# 6. API Layer

The API layer is responsible for:

- Receiving requests.
- Authentication handling.
- Request formatting.
- Input validation.
- Returning responses.

The API layer should not contain complex business rules.

---

# 7. Application Layer

The application layer coordinates business operations.

Responsibilities:

- Execute workflows.
- Coordinate domain actions.
- Manage transactions.
- Publish events.

Examples:

```
Publish Schedule

Clock In Employee

Complete Task
```

---

# 8. Domain Layer

The domain layer contains business rules.

Examples:

Attendance:

- Valid clock-in conditions.
- Attendance state changes.

Scheduling:

- Shift assignment rules.
- Schedule publishing rules.

Task Management:

- Completion requirements.
- Verification rules.

---

# 9. Database Layer

The database layer manages:

- Queries.
- Persistence.
- Transactions.
- Database functions.
- RLS interaction.

The database remains the source of truth.

---

# 10. Backend Modules

Backend modules align with business domains:

## Organization

Handles:

- Tenants.
- Branches.
- Organization settings.

---

## Workforce

Handles:

- Employees.
- Employment records.

---

## Scheduling

Handles:

- Schedules.
- Shifts.
- Assignments.

---

## Attendance

Handles:

- Clock events.
- Attendance records.

---

## Task Management

Handles:

- Tasks.
- Verification.
- History.

---

## Communication

Handles:

- Announcements.
- Notice boards.

---

## Notification

Handles:

- Delivery.
- Preferences.

---

# 11. Transactions

Business operations requiring consistency should execute within transactions.

Examples:

Publishing a schedule:

```
Validate Schedule

↓

Update Schedule Status

↓

Create Event

↓

Commit Transaction
```

---

# 12. Error Handling

Backend errors should:

- Be predictable.
- Avoid exposing sensitive information.
- Provide useful client feedback.
- Be logged appropriately.

Detailed error handling is defined in API-006.

---

# 13. Scalability

The backend should support:

- Horizontal scaling.
- Stateless services.
- Independent background processing.
- Increased tenant workloads.

The architecture should allow future service extraction if required.

---

# 14. Future Enhancements

Future versions may support:

- Dedicated backend services.
- External API integrations.
- Advanced workflow orchestration.
- Enterprise integrations.
- AI-powered operations.

---

# 15. Related Specifications

- ARCH-003 Service Architecture
- ARCH-005 Workflow Architecture
- DB-001 Database Philosophy
- API-002 RPC Standards
- API-005 Event System
- SEC-009 API Security

---

# 16. Summary

The ShiftOS backend provides the central execution layer for workforce operations.

By organizing around business domains, enforcing security centrally and separating API handling from business logic, the backend provides a scalable foundation for web, mobile and future platform integrations.
