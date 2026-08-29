import { describe, it, expect } from 'vitest';
import { ASSISTANT_TOOLS, isAllowedRoute, toSafeToolErrorMessage } from '@shiftos/api';
import { AuthorizationError, ValidationError } from '@shiftos/errors';

describe('ASSISTANT_TOOLS', () => {
  it('includes the expected read-only tool names', () => {
    const names = ASSISTANT_TOOLS.map((t) => t.function.name);
    for (const expected of [
      'navigate', 'list_branches', 'list_employees', 'list_tasks',
      'list_attendance_for_branch_and_range', 'get_attendance_summary_report'
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('never includes a mutating operation', () => {
    const names = ASSISTANT_TOOLS.map((t) => t.function.name);
    for (const name of names) {
      expect(name).not.toMatch(/^(create|update|delete|archive|approve|reject|assign|complete|verify|publish|acknowledge|clock|record|revoke|invite)_/);
    }
  });

  it('every tool has a non-empty description and an object-typed parameters schema', () => {
    for (const tool of ASSISTANT_TOOLS) {
      expect(tool.function.description.length).toBeGreaterThan(0);
      expect(tool.function.parameters.type).toBe('object');
    }
  });
});

describe('isAllowedRoute', () => {
  it('allows a known app route', () => {
    expect(isAllowedRoute('/attendance')).toBe(true);
  });

  it('rejects an external URL', () => {
    expect(isAllowedRoute('https://evil.example.com')).toBe(false);
  });

  it('rejects an unknown path', () => {
    expect(isAllowedRoute('/not-a-real-route')).toBe(false);
  });
});

describe('toSafeToolErrorMessage', () => {
  it('returns a safe message for AuthorizationError', () => {
    const message = toSafeToolErrorMessage(new AuthorizationError('You lack schedules.read'));
    expect(message).toBe('not permitted');
  });

  it('returns a safe message for ValidationError', () => {
    const message = toSafeToolErrorMessage(new ValidationError('branchId is required'));
    expect(message).toBe('invalid request: branchId is required');
  });

  it('returns null for an unexpected error, signaling it should be rethrown', () => {
    expect(toSafeToolErrorMessage(new Error('boom'))).toBeNull();
  });
});
