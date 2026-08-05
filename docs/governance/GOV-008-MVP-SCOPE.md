# ShiftOS MVP Scope

**Document ID:** GOV-008

**Title:** MVP Scope

**Version:** 1.0.0

**Status:** Approved

**Classification:** Governance

**Owner:** ShiftOS Product Team

---

# Purpose

This document defines the exact scope of the first public release (Minimum Viable Product) of ShiftOS.

Its purpose is to establish clear development boundaries, prevent feature creep, and ensure that engineering effort remains focused on delivering a stable, valuable product.

The MVP is not intended to be a complete workforce management platform. It is intended to validate the core product vision with real customers while providing enough functionality to solve meaningful operational problems.

This document is the authoritative reference for determining whether a feature belongs in the MVP.

---

# MVP Goals

The ShiftOS MVP must enable organizations to successfully manage their daily workforce operations using a single platform.

Specifically, organizations should be able to:

- Create and manage an organization.
- Create and manage one or more branches.
- Invite managers, supervisors and employees.
- Create, edit and publish work schedules.
- Assign employees to shifts.
- Record employee attendance.
- Manage operational tasks.
- Publish announcements.
- Receive notifications for important operational events.
- View operational dashboards and reports.
- Export attendance and payroll preparation data.
- Install and use ShiftOS as a Progressive Web App (PWA).

If these objectives are met reliably, the MVP is considered functionally complete.

---

# Core MVP Capabilities

The following capabilities are included in the MVP.

## Organization Management

- Organization creation
- Business settings
- Branch management
- Multi-branch support
- Organization administration

---

## User & Identity

- User authentication
- Email verification
- Password reset
- Invitations
- Session management
- Profile management

---

## Roles & Permissions

- Manager role
- Supervisor role
- Employee role
- Role-based access control
- Branch isolation
- Organization isolation

---

## Employee Management

- Employee profiles
- Employee lifecycle
- Employment status
- Branch assignment
- Position management

---

## Shift Management

- Shift templates
- Shift scheduling
- Shift editing
- Shift publishing
- Shift reassignment
- Conflict validation
- Calendar views

---

## Attendance

- Clock in
- Clock out
- Attendance history
- Attendance states
- Attendance corrections
- Late tracking
- Absence tracking

---

## Task Management

- Create tasks
- Assign tasks
- Complete tasks
- Verify completion
- Recurring tasks

---

## Communication

- Announcements
- Notice board
- Employee acknowledgements
- Operational notifications

---

## Reporting

- Operational dashboard
- Attendance reporting
- Shift reporting
- Branch reporting
- Payroll preparation exports
- KPI dashboards

---

## Shifty

The MVP includes Shifty as an operational assistant.

Shifty will:

- Guide users through the platform.
- Explain features.
- Surface operational reminders.
- Provide contextual recommendations.
- Improve onboarding.

Shifty will not perform autonomous decision-making in the MVP.

---

## Progressive Web App

The MVP is delivered as a Progressive Web App.

Supported capabilities include:

- Desktop access
- Mobile browser access
- PWA installation
- Responsive layouts
- Push notifications where supported
- Limited offline functionality

Native Android and iOS applications are explicitly outside the MVP.

---

# MVP Exclusions

The following capabilities are intentionally excluded from the MVP.

## Human Resources

- Recruitment
- Applicant tracking
- Performance reviews
- Employee benefits
- Payroll processing
- Leave management
- Learning management

---

## Finance

- Accounting
- Payroll calculations
- Payslips
- Tax management
- Banking integrations

---

## Enterprise Features

- Custom workflows
- White-label deployments
- Single Sign-On (SSO)
- Advanced permission builders
- Multi-organization user switching
- Enterprise analytics
- SLA management

---

## Advanced Scheduling

- Open shifts
- Shift bidding
- Shift swapping
- Automatic scheduling
- Demand forecasting
- AI-generated schedules

---

## Advanced AI

- Autonomous scheduling
- Predictive staffing
- Conversational reporting
- AI-generated operational plans
- Natural language querying

---

## Advanced Integrations

- WhatsApp
- SMS
- Calendar synchronization
- Public API
- Payroll system integrations
- HR integrations

---

## Native Mobile Applications

The MVP does not include:

- Android application
- iOS application

The Progressive Web App serves all supported platforms during the MVP phase.

---

# Technical Scope

The MVP includes:

- Multi-tenant architecture
- PostgreSQL database
- Supabase authentication
- Row-Level Security (RLS)
- Audit logging
- Realtime updates
- Responsive web interface
- Progressive Web App
- Automated deployments
- Monitoring
- Error tracking
- Backup strategy

These technical foundations are considered essential rather than optional.

---

# Launch Readiness Criteria

The MVP is ready for production when all of the following conditions are satisfied:

## Functional Readiness

- All MVP features are implemented.
- All critical workflows function correctly.
- User roles behave as specified.
- Business rules are enforced.
- Permissions are validated server-side.

---

## Quality Readiness

- No known critical defects.
- Successful end-to-end testing.
- Responsive UI across supported devices.
- Accessibility requirements met for core workflows.

---

## Security Readiness

- Authentication implemented.
- Authorization implemented.
- Row-Level Security enforced.
- Audit logging operational.
- Sensitive data protected.
- Secrets managed securely.

---

## Operational Readiness

- Monitoring configured.
- Error tracking configured.
- Backup strategy tested.
- Deployment process documented.
- Rollback procedure validated.

---

# Success Metrics

The MVP will be considered successful if pilot organizations can:

- Schedule employees without external tools.
- Record attendance accurately.
- Coordinate operational tasks.
- Communicate important announcements.
- Prepare payroll data from ShiftOS reports.
- Operate daily workforce activities with confidence.

Success is measured by operational adoption, not by feature count.

---

# Scope Change Process

Any proposed addition to the MVP must satisfy all of the following:

1. Solves a validated customer problem.
2. Aligns with the ShiftOS Vision.
3. Does not compromise launch stability.
4. Fits within the current architecture.
5. Receives formal approval.
6. Is recorded in the Decision Log.
7. Updates this document if accepted.

Features that fail these criteria should be deferred to the Future Roadmap.

---

# Summary

The ShiftOS MVP is intentionally focused.

Its purpose is not to deliver every conceivable workforce management feature, but to provide a reliable, secure and scalable platform that solves the essential operational challenges of organizations with shift workers.

Every feature included in the MVP must contribute directly to that objective.