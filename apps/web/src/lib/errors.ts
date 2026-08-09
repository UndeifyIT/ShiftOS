export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'SHIFTOS_ERROR';

/**
 * Thrown by apiClient.callRpc(). Carries the safe {@link ApiErrorCode} the
 * backend returned (packages/errors) so callers can render the right UI-009
 * pattern (inline validation vs. permission-denied vs. generic retryable
 * error) instead of a single undifferentiated failure message.
 */
export class ApiClientError extends Error {
  constructor(message: string, public readonly code: ApiErrorCode, public readonly details?: string[]) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** UI-009 §8: never surface the raw backend message for unexpected failures — only for validation, where the backend already writes user-safe text. */
export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return error.message;
      case 'AUTHORIZATION_ERROR':
        return 'You do not have permission to do that.';
      case 'NOT_FOUND':
        return 'That record could not be found. It may have been removed.';
      case 'NETWORK_ERROR':
        return 'Unable to connect. Check your internet connection and try again.';
      default:
        return 'We could not complete this action. Please try again.';
    }
  }
  return 'We could not complete this action. Please try again.';
}
