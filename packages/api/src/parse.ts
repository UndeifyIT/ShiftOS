import { ValidationError } from '@shiftos/errors';

/**
 * Narrow, runtime input parsing for RPC operations. Every RPC handler's
 * `input` arrives as `unknown` (it came over the wire) — these helpers are
 * the one place that gets narrowed from `unknown`, always via an explicit
 * runtime check immediately before the type assertion, never a bare `as`.
 */

export function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ValidationError('Request input must be an object');
  }
  return input as Record<string, unknown>;
}

export function stringField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === 'string' ? value : undefined;
}

export function requiredStringField(record: Record<string, unknown>, field: string): string {
  const value = stringField(record, field);
  if (value === undefined) {
    throw new ValidationError(`${field} is required`, [`${field} must be a string`]);
  }
  return value;
}

export function numberField(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];
  return typeof value === 'number' ? value : undefined;
}

export function booleanField(record: Record<string, unknown>, field: string): boolean | undefined {
  const value = record[field];
  return typeof value === 'boolean' ? value : undefined;
}

export function recordField(record: Record<string, unknown>, field: string): Record<string, unknown> | undefined {
  const value = record[field];
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

/** Defaults to an empty array when absent — most callers treat "no branches selected" and "field omitted" the same way. */
export function stringArrayField(record: Record<string, unknown>, field: string): string[] {
  const value = record[field];
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new ValidationError(`${field} must be an array of strings`);
  }
  return value;
}
