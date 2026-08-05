# ShiftOS Dictionary — G

**Document ID:** GOV-DICT-G

**Title:** ShiftOS Dictionary – Terms Beginning with "G"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document contains the official definitions of all ShiftOS terminology beginning with the letter **G**.

These definitions are authoritative and shall be used consistently across all ShiftOS specifications, source code, APIs, database schemas, reports, user interfaces and internal documentation.

---

# Global Search

## Business Definition

Global Search is a centralized search capability that allows users to quickly locate information across multiple modules without navigating individually through each section.

---

## Technical Definition

Global Search queries indexed data from multiple authorized entities while respecting role permissions, tenant isolation and branch isolation.

---

## Business Context

Managers and supervisors may search for:

- Employees
- Shifts
- Attendance records
- Tasks
- Announcements
- Reports

Search results are limited to information the current user is authorized to access.

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- UI-002 Navigation

---

## Related Terms

- Filter
- Query
- Permission

---

## Notes

Global Search is planned for a future release and is not included in the MVP.

---

# Governance

## Business Definition

Governance is the framework of policies, standards, decisions and documentation that guides how ShiftOS is designed, developed, maintained and operated.

---

## Technical Definition

Governance is represented through controlled documentation, version history, decision logs, naming conventions and architectural standards.

---

## Business Context

Governance ensures that every engineering and product decision remains consistent with the ShiftOS Product Bible.

---

## Used By

- Product Team
- Engineering Team
- QA Team

---

## Related Specifications

- Volume 0 — Governance

---

## Related Terms

- Decision Log
- Version History
- Product Principles
- Specification

---

## Notes

The Product Bible is the primary governance artifact for ShiftOS.

---

# Grace Period

## Business Definition

A Grace Period is a configurable amount of time during which a minor deviation from a scheduled event is accepted without triggering penalties or exceptions.

---

## Technical Definition

Grace periods are organization-level configuration values used during attendance validation.

---

## Business Context

Example:

Shift begins at **8:00 AM**

Grace Period = **10 minutes**

Employee clocks in at **8:07 AM**

Attendance Status:

**On Time**

Employee clocks in at **8:12 AM**

Attendance Status:

**Late**

---

## Used By

- Managers
- Supervisors
- Employees

---

## Related Specifications

- ATT-005 Late Rules
- ORG-006 Business Settings

---

## Related Terms

- Clock In
- Attendance
- Late Arrival

---

## Notes

Grace periods apply only where explicitly configured by the organization.

---

# Group

## Business Definition

A Group is a logical collection of related items managed together.

---

## Technical Definition

Groups are organizational constructs rather than independent business entities.

---

## Business Context

Examples include:

- Employees within a branch
- Scheduled shifts for a day
- Notifications by category

---

## Used By

- Entire Platform

---

## Related Specifications

- UI-006 Data Tables

---

## Related Terms

- Collection
- Category

---

# Guideline

## Business Definition

A Guideline is a recommended practice intended to promote consistency without being a mandatory business rule.

---

## Technical Definition

Guidelines influence implementation but are not enforced programmatically.

---

## Business Context

Examples include:

- UI design recommendations
- Documentation standards
- Coding conventions
- Accessibility recommendations

---

## Used By

- Product Team
- Engineering Team
- Design Team

---

## Related Specifications

- UI-001 Design System
- GOV-010 Naming Conventions

---

## Related Terms

- Standard
- Business Rule
- Policy

---

## Notes

Unlike business rules, guidelines may allow justified exceptions.

---

# Guest

## Business Definition

A Guest is a person who accesses a public resource without possessing an authenticated ShiftOS account.

---

## Technical Definition

Guests have no authenticated session and no organizational permissions.

---

## Business Context

The MVP does not provide guest access to operational functionality.

Future public resources may include:

- Status pages
- Marketing pages
- Public documentation

---

## Used By

- Public Users

---

## Related Specifications

- USR-002 Authentication

---

## Related Terms

- Authentication
- User
- Session

---

## Notes

Operational data is never accessible to guest users.

---

# General Availability (GA)

## Business Definition

General Availability (GA) is the stage at which a feature or product is considered production-ready and available to all customers.

---

## Technical Definition

GA indicates completion of required development, testing and release criteria.

---

## Business Context

Features typically progress through:

- Internal Development
- Testing
- Beta (optional)
- General Availability

---

## Used By

- Product Team
- Engineering Team

---

## Related Specifications

- MVP-004 Launch Checklist

---

## Related Terms

- Beta
- Release
- Deployment

---

# Generated Report

## Business Definition

A Generated Report is a report created dynamically using current operational data.

---

## Technical Definition

Reports are generated through backend reporting services and may be exported in supported formats.

---

## Business Context

Examples include:

- Attendance Summary
- Branch Performance
- Payroll Preparation
- Shift Utilization

---

## Used By

- Managers

---

## Related Specifications

- REP-008 Data Exports

---

## Related Terms

- Report
- Export
- Dashboard

---

# Grid

## Business Definition

A Grid is a structured visual layout used to organize information into rows and columns.

---

## Technical Definition

Grids provide scalable presentation for calendars, tables and dashboards.

---

## Business Context

Examples include:

- Shift Calendar
- Employee Tables
- KPI Dashboards

---

## Used By

- Managers
- Supervisors

---

## Related Specifications

- UI-003 Layout System
- UI-006 Data Tables

---

## Related Terms

- Table
- Calendar
- Card

---

# Group Notification

## Business Definition

A Group Notification is a notification delivered simultaneously to multiple recipients based on a shared characteristic.

---

## Technical Definition

Recipients are determined dynamically using organizational rules rather than individual selection.

---

## Business Context

Examples include:

- All Employees
- All Supervisors
- Entire Branch
- Entire Organization

---

## Used By

- Managers
- System

---

## Related Specifications

- NOTIF-002 Event Triggers

---

## Related Terms

- Notification
- Broadcast
- Announcement

---

## Notes

Group notifications improve operational efficiency by eliminating the need to notify recipients individually.

---

# Growth

## Business Definition

Growth refers to the ability of ShiftOS to expand in users, organizations, branches, data volume and functionality without requiring major architectural changes.

---

## Technical Definition

Growth is supported through scalable architecture, multi-tenancy, modular services and efficient database design.

---

## Business Context

ShiftOS is designed to scale from:

- A single small business

to

- Thousands of organizations
- Hundreds of thousands of employees
- Millions of shifts and attendance records

---

## Used By

- Product Team
- Engineering Team

---

## Related Specifications

- ARCH-009 Scalability Strategy

---

## Related Terms

- Scalability
- Multi-Tenancy
- Performance

---

## Notes

Every architectural decision should be evaluated based on its ability to support long-term growth without unnecessary redesign.