# ShiftOS Non-Goals

**Document ID:** GOV-007

**Title:** Non-Goals

**Version:** 1.0.0

**Status:** Approved

**Classification:** Governance

**Owner:** ShiftOS Product Team

---

# Purpose

This document defines the capabilities that ShiftOS intentionally does **not** aim to provide.

Every successful product is defined as much by what it excludes as by what it includes.

The purpose of this document is to maintain strategic focus, prevent feature creep, simplify decision-making, and preserve the product's identity as a workforce operations platform.

Unless this document is formally revised, the items listed here should not be considered part of the product roadmap.

---

# Guiding Principle

ShiftOS is designed to be the best platform for managing shift-based workforce operations.

It is **not** designed to become an all-in-one business management platform.

Where specialist software already exists and performs a function well, ShiftOS should integrate with that software instead of attempting to replace it.

---

# Core Non-Goals

## NG-001 — ShiftOS Is Not a Payroll System

ShiftOS prepares accurate workforce data that can be used for payroll processing.

ShiftOS does **not**:

- Calculate salaries
- Process employee payments
- Manage tax deductions
- Manage pension contributions
- Generate payslips
- Transfer money to employees
- Act as payroll software

Instead, ShiftOS focuses on producing accurate attendance, hours-worked and payroll-ready reports for export or integration.

---

## NG-002 — ShiftOS Is Not an Accounting Platform

ShiftOS will not provide:

- General ledger
- Accounts payable
- Accounts receivable
- Profit and loss statements
- Balance sheets
- Expense accounting
- Financial bookkeeping

Financial reporting should be handled by dedicated accounting software.

---

## NG-003 — ShiftOS Is Not a Full HRIS

ShiftOS manages operational employee information only.

It will not become a complete Human Resources Information System.

Examples outside scope include:

- Recruitment
- Applicant tracking
- Performance reviews
- Promotions
- Compensation planning
- Benefits administration
- Leave management beyond shift scheduling
- Disciplinary case management

Future integrations with HR platforms are preferred over rebuilding HR functionality.

---

## NG-004 — ShiftOS Is Not an ERP

ShiftOS will not attempt to manage:

- Inventory
- Procurement
- Supply chain
- Manufacturing
- Customer orders
- Finance
- Warehousing operations beyond workforce scheduling

Enterprise Resource Planning systems serve a different purpose.

---

## NG-005 — ShiftOS Is Not a CRM

ShiftOS is not intended to manage customer relationships.

It will not include:

- Customer databases
- Sales pipelines
- Lead tracking
- Marketing automation
- Customer support ticketing

---

## NG-006 — ShiftOS Is Not a Messaging Platform

Communication within ShiftOS is operational.

Announcements and notifications exist to support workforce coordination.

ShiftOS will not replace:

- Email
- Instant messaging platforms
- Team chat applications
- Video conferencing tools

Communication features should remain focused on work-related operational information.

---

## NG-007 — ShiftOS Is Not a Document Management System

ShiftOS is not designed for storing large document libraries.

Only documents required to support workforce operations may be stored.

Examples include:

- Employee profile attachments (future)
- Operational records
- Generated reports

General file storage is outside the scope of the platform.

---

## NG-008 — ShiftOS Is Not a Time Tracking Consultancy Tool

ShiftOS records attendance and scheduled working time.

It does not aim to become a consultancy-style time billing platform.

It will not support:

- Client billing
- Billable hours
- Project invoicing
- Professional services accounting

---

## NG-009 — ShiftOS Is Not a Project Management Platform

Task management exists to coordinate operational work.

ShiftOS will not include:

- Project roadmaps
- Sprint planning
- Backlog management
- Software development workflows
- Gantt charts
- Portfolio management

Operational tasks are intentionally lightweight.

---

## NG-010 — ShiftOS Is Not an Employee Social Network

ShiftOS is not intended to function as a social platform.

It will not include:

- Public employee profiles
- Social feeds
- Likes or reactions
- Friend systems
- Private messaging
- Community forums

Workplace communication should remain purposeful and operational.

---

## NG-011 — ShiftOS Is Not an E-Learning Platform

ShiftOS will not provide:

- Online courses
- Learning management
- Certification tracking
- Training content libraries
- Assessments
- Exams

Training systems should integrate with ShiftOS where appropriate.

---

## NG-012 — ShiftOS Is Not a Business Intelligence Platform

ShiftOS provides operational reporting and workforce analytics.

It is not intended to replace enterprise BI platforms.

Complex analytics should be exported to specialist reporting tools when necessary.

---

## NG-013 — ShiftOS Is Not an Offline-First Platform

ShiftOS supports limited offline functionality where practical.

However, it is designed primarily as a connected cloud application.

Offline support should improve resilience, not replace real-time synchronization.

---

## NG-014 — ShiftOS Is Not Built for Every Industry

ShiftOS is designed specifically for organizations that rely on shift workers.

Primary industries include:

- Restaurants
- Cafés
- Hotels
- Retail
- Supermarkets
- Pharmacies
- Warehouses
- Manufacturing
- Healthcare
- Logistics

Industries with fundamentally different operational models are outside the primary target market.

---

## NG-015 — ShiftOS Is Not Feature Complete

The MVP intentionally excludes many potential features.

A feature should not be added simply because it is technically possible.

New capabilities must satisfy all of the following:

- Solve a validated customer problem
- Align with the product vision
- Fit the platform architecture
- Preserve product simplicity
- Deliver measurable business value

---

# Decision Framework

When evaluating a proposed feature, ask:

1. Does this strengthen workforce operations?
2. Does this align with the product vision?
3. Does specialist software already solve this problem better?
4. Would adding this feature increase unnecessary complexity?
5. Can this problem be solved through integration instead?

If the answer suggests the feature lies outside ShiftOS's core purpose, it should not be added.

---

# Exceptions

Features listed as non-goals may only be reconsidered if:

- The product vision changes.
- Customer research demonstrates overwhelming demand.
- The feature strengthens the core workforce operations experience.
- The change is formally documented in the Decision Log.
- The Product Bible is updated accordingly.

Exceptions should be rare and carefully justified.

---

# Summary

ShiftOS succeeds by maintaining focus.

Rather than becoming a platform that attempts to solve every business problem, ShiftOS aims to become the most trusted and effective platform for managing shift-based workforce operations.

Every non-goal in this document protects that focus and helps ensure that engineering effort is invested where it delivers the greatest value.