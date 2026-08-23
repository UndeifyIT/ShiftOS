import { describe, it, expect } from 'vitest';
import { assertUuid, assertNonEmptyString, assertValidDateRange, assertOneOf } from '@shiftos/services';
import { ValidationError } from '@shiftos/errors';

describe('assertUuid', () => {
  it('accepts a well-formed UUID', () => {
    expect(() => assertUuid('a21b9394-e73c-4464-aa69-3fbb1c696e69', 'id')).not.toThrow();
  });

  it('rejects undefined, null, empty, and malformed values', () => {
    for (const bad of [undefined, null, '', 'not-a-uuid', '12345', 'a21b9394-e73c-4464-aa69']) {
      expect(() => assertUuid(bad as string | undefined | null, 'id')).toThrow(ValidationError);
    }
  });

  it('includes the field name in the error message', () => {
    try {
      assertUuid('bad', 'employeeId');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).message).toContain('employeeId');
    }
  });
});

describe('assertNonEmptyString', () => {
  it('accepts a non-empty string', () => {
    expect(() => assertNonEmptyString('hello', 'title')).not.toThrow();
  });

  it('rejects undefined, null, empty, and whitespace-only strings', () => {
    for (const bad of [undefined, null, '', '   ', '\t\n']) {
      expect(() => assertNonEmptyString(bad as string | undefined | null, 'title')).toThrow(ValidationError);
    }
  });
});

describe('assertValidDateRange', () => {
  it('accepts a valid, non-inverted range', () => {
    expect(() => assertValidDateRange('2026-01-01', '2026-01-05')).not.toThrow();
  });

  it('accepts a same-day range (start === end)', () => {
    expect(() => assertValidDateRange('2026-01-01', '2026-01-01')).not.toThrow();
  });

  it('rejects an inverted range (end before start)', () => {
    expect(() => assertValidDateRange('2026-01-05', '2026-01-01')).toThrow(ValidationError);
  });

  it('rejects unparseable dates', () => {
    expect(() => assertValidDateRange('not-a-date', '2026-01-01')).toThrow(ValidationError);
    expect(() => assertValidDateRange('2026-01-01', 'not-a-date')).toThrow(ValidationError);
  });
});

describe('assertOneOf', () => {
  const PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

  it('accepts a value from the allowed set', () => {
    expect(() => assertOneOf('high', PRIORITIES, 'priority')).not.toThrow();
  });

  it('rejects a value outside the allowed set', () => {
    expect(() => assertOneOf('urgent', PRIORITIES, 'priority')).toThrow(ValidationError);
  });

  it('lists the allowed values in the error message', () => {
    try {
      assertOneOf('urgent', PRIORITIES, 'priority');
      expect.unreachable();
    } catch (err) {
      expect((err as ValidationError).message).toContain('priority');
      for (const value of PRIORITIES) {
        expect((err as ValidationError).details.join(' ')).toContain(value);
      }
    }
  });
});
