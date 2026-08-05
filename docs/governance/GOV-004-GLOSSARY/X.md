# ShiftOS Dictionary — X

**Document ID:** GOV-DICT-X

**Title:** ShiftOS Dictionary – Terms Beginning with "X"

**Version:** 1.0.0

**Status:** Approved

**Classification:** Core Governance

**Owner:** ShiftOS Product Team

**Created:** 2026-07-10

**Last Updated:** 2026-07-10

---

# Introduction

This document defines official ShiftOS terminology beginning with the letter **X**.

The letter **X** contains relatively few terms that are relevant to workforce management software. Only terminology with practical value to the platform is included.

---

# XML (Extensible Markup Language)

## Business Definition

XML is a structured data format used for storing and exchanging information between computer systems.

---

## Technical Definition

Although JSON is the primary data interchange format used by ShiftOS, XML may be encountered when integrating with legacy enterprise systems or third-party software.

Potential future uses include:

- Payroll exports
- HR system integrations
- Legacy ERP integrations
- Data imports

XML is not used for internal application communication.

---

## Related Specifications

- INT-001 Integration Philosophy

---

## Related Terms

- JSON
- API
- Integration

---

# XSS (Cross-Site Scripting)

## Business Definition

Cross-Site Scripting (XSS) is a security vulnerability that allows malicious scripts to execute in a user's browser.

---

## Technical Definition

XSS attacks commonly occur when user-supplied content is displayed without proper validation or output encoding.

ShiftOS mitigates XSS through:

- Input validation
- Output encoding
- Secure frontend frameworks
- Content Security Policies (where applicable)

User-generated content must never be rendered as executable code.

---

## Business Context

Protecting against XSS is essential because managers, supervisors and employees interact with the application through web browsers and PWAs.

---

## Related Specifications

- SEC-001 Security Principles
- SEC-009 API Security

---

## Related Terms

- Security
- Validation
- Vulnerability

---

# Summary

The letter **X** contains only a small number of terms that are directly applicable to ShiftOS.

XML is included because it may be required for future enterprise integrations, while XSS is included because it represents a critical web security concern that must be considered throughout the platform's development lifecycle.