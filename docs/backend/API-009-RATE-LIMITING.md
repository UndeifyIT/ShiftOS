# ShiftOS API Rate Limiting

**Document ID:** API-009

**Document Title:** Rate Limiting Strategy

**Version:** 1.0.0

**Status:** Approved

**Classification:** Backend

**Owner:** ShiftOS Product Team

**Created:** 2026-08-04

**Last Updated:** 2026-08-04

---

# 1. Purpose

This document defines the rate limiting strategy used within the ShiftOS backend.

Rate limiting protects system availability, prevents abuse and ensures fair resource usage across tenants.

---

# 2. Rate Limiting Philosophy

Rate limits should:

- Protect platform stability.
- Prevent abuse.
- Preserve fair usage.
- Support normal workforce operations.

Rate limits should not unnecessarily restrict legitimate business activity.

---

# 3. Rate Limiting Principles

ShiftOS rate limiting follows these principles:

- Apply limits based on risk.
- Consider tenant context.
- Protect expensive operations.
- Provide clear responses.
- Monitor limit usage.

---

# 4. Rate Limiting Layers

ShiftOS may apply limits at multiple levels:

```
Client

↓

API Gateway

↓

Backend Services

↓

Database Protection
```

---

# 5. Authentication Rate Limits

Authentication endpoints require stricter protection.

Examples:

Login:

- Limit repeated attempts.
- Detect suspicious patterns.
- Prevent brute force attacks.

Password reset:

- Limit request frequency.
- Prevent abuse.

---

# 6. Read Operations

Read requests generally require higher limits.

Examples:

- Employee lists.
- Schedules.
- Notifications.

Limits should consider:

- User role.
- Organization size.
- Query complexity.

---

# 7. Write Operations

Write operations require stronger controls.

Examples:

- Creating employees.
- Publishing schedules.
- Sending announcements.

Reasons:

- Prevent accidental duplication.
- Protect database load.
- Prevent abuse.

---

# 8. Expensive Operations

Some operations require specialized limits.

Examples:

Reports:

```
Generate monthly attendance report
```

AI features:

```
Generate recommendation
```

Bulk operations:

```
Import employees
```

These should use controlled execution.

---

# 9. Tenant-Based Limits

Because ShiftOS is multi-tenant:

Limits may consider:

- Organization size.
- Subscription level.
- Usage patterns.

One organization should not negatively impact others.

---

# 10. Rate Limit Response

When limits are exceeded:

Return:

```
429 Too Many Requests
```

Response should include:

- Error code.
- Retry information.
- User-friendly message.

Example:

```
REQUEST_LIMIT_EXCEEDED

"Please wait before trying again."
```

---

# 11. Background Job Limits

Background workers should also have limits.

Examples:

- Notification processing.
- Report generation.
- Integration calls.

Controls:

- Queue limits.
- Worker limits.
- Retry limits.

---

# 12. Monitoring

Track:

- Rate limit events.
- Heavy users.
- Failed requests.
- Resource consumption.

Rate limits should be adjusted based on real usage.

---

# 13. Security Considerations

Rate limiting helps protect against:

- Brute force attempts.
- Denial-of-service patterns.
- Automated scraping.
- Resource exhaustion.

It does not replace:

- Authentication.
- Authorization.
- Input validation.

---

# 14. MVP Strategy

Initial implementation may use:

- Supabase/API gateway controls.
- Application-level limits.
- Database protection.

Avoid unnecessary distributed rate limiting infrastructure early.

---

# 15. Future Enhancements

Future versions may introduce:

- Adaptive rate limits.
- Usage-based limits.
- Enterprise quotas.
- Advanced abuse detection.

---

# 16. Related Specifications

- API-001 Backend Architecture
- API-006 Error Handling
- SEC-002 Authentication
- SEC-009 API Security
- ARCH-009 Scalability Strategy

---

# 17. Summary

ShiftOS rate limiting protects platform reliability while maintaining a smooth experience for legitimate users.

By applying limits based on risk, workload and tenant usage, ShiftOS can scale safely while preventing abuse and accidental overload.
