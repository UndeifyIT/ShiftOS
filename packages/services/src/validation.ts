import { ValidationError } from '@shiftos/errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Small assertion helpers shared across services. Deliberately not a class-
 * based framework (packages/validation's BaseValidator already covers that
 * shape for structured multi-field DTOs) — these are the simple, repeated
 * single-value checks a service method needs before calling a repository.
 * Database constraints remain the final integrity layer; these exist to
 * reject obviously-bad input with a clear ValidationError before it reaches
 * SQL, not to replace what the schema already enforces.
 */

export function assertUuid(value: string | undefined | null, fieldName: string): asserts value is string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid identifier`, [`${fieldName} is invalid`]);
  }
}

export function assertNonEmptyString(value: string | undefined | null, fieldName: string): asserts value is string {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`, [`${fieldName} is required`]);
  }
}

export function assertValidDateRange(startDate: string, endDate: string, context = 'date range'): void {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new ValidationError(`Invalid ${context}`, ['start/end date must be valid dates']);
  }
  if (end < start) {
    throw new ValidationError(`Invalid ${context}`, ['end date must not be before start date']);
  }
}

export function assertOneOf<T extends string>(value: string, allowed: readonly T[], fieldName: string): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(`Invalid ${fieldName}`, [`${fieldName} must be one of: ${allowed.join(', ')}`]);
  }
}
