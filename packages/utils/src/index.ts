import type { LogLevel, ApiResponse, ApiError } from '@shiftos/types';
import { ShiftOSError, ValidationError, AuthorizationError, NotFoundError, DatabaseError, ConfigError, HttpError } from '@shiftos/errors';

export function buildApiResponse<T>(data: T | null, error?: ApiError): ApiResponse<T> {
  return { success: error === undefined, data, error };
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function normalizeLogLevel(level: string | undefined): LogLevel {
  const normalized = (level ?? 'info').toLowerCase();
  if (normalized === 'debug' || normalized === 'info' || normalized === 'warn' || normalized === 'error') {
    return normalized;
  }
  return 'info';
}

export interface SafeApiError extends ApiError {
  statusCode: number;
}

/**
 * Maps any thrown value to a response-safe error shape. Only ValidationError
 * details and the messages already safe-by-construction on the other
 * ShiftOSError subclasses are ever forwarded — raw driver/database/config
 * error text never reaches this function's return value.
 */
export function toSafeApiError(error: unknown): SafeApiError {
  if (error instanceof ValidationError) {
    return { message: error.message, code: error.code, statusCode: 400, details: error.details };
  }
  if (error instanceof AuthorizationError) {
    return { message: error.message, code: error.code, statusCode: 403 };
  }
  if (error instanceof NotFoundError) {
    return { message: error.message, code: error.code, statusCode: 404 };
  }
  if (error instanceof HttpError) {
    return { message: error.message, code: error.code, statusCode: error.statusCode };
  }
  if (error instanceof DatabaseError) {
    // .message is a fixed, safe string by construction (see DatabaseError) —
    // the raw driver error lives on .cause for server-side logging only.
    return { message: error.message, code: error.code, statusCode: 500 };
  }
  if (error instanceof ConfigError) {
    // Never echo config error text externally: it can name internal env vars.
    return { message: 'A server configuration error occurred', code: error.code, statusCode: 500 };
  }
  if (error instanceof ShiftOSError) {
    return { message: error.message, code: error.code, statusCode: 500 };
  }
  return { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR', statusCode: 500 };
}

/**
 * Builds a client-safe ApiResponse error envelope (success: false) directly
 * from a thrown value. Also logs the real error server-side first — several
 * error types (DatabaseError especially) intentionally strip the raw driver
 * message from what the client receives, and the `.cause` those types carry
 * was, until now, never actually read by anything, so a real connection or
 * query failure was completely invisible outside the client's generic
 * "A database operation failed" message. This is the single chokepoint every
 * RPC error already passes through, so logging here covers all of them
 * without needing to instrument every call site individually.
 */
export function buildErrorApiResponse<T>(error: unknown): ApiResponse<T> {
  const safe = toSafeApiError(error);
  const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
  // eslint-disable-next-line no-console
  console.error('[RPC error]', safe.code, safe.message, cause ?? error);
  return buildApiResponse<T>(null, { message: safe.message, code: safe.code, details: safe.details });
}
