export class ShiftOSError extends Error {
  constructor(message: string, public readonly code: string = 'SHIFTOS_ERROR') {
    super(message);
    this.name = 'ShiftOSError';
  }
}

export class ConfigError extends ShiftOSError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigError';
  }
}

export class ValidationError extends ShiftOSError {
  constructor(message: string, public readonly details: string[] = []) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends ShiftOSError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class DatabaseError extends ShiftOSError {
  /**
   * `message` must always be safe to show outside the server process (logs,
   * error responses). Raw driver/database errors should be passed as `cause`,
   * never interpolated into `message` — see packages/database/src/postgresClient.ts.
   */
  constructor(message: string = 'A database error occurred', public readonly cause?: unknown) {
    super(message, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends ShiftOSError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class HttpError extends ShiftOSError {
  constructor(message: string, public readonly statusCode: number, code?: string) {
    super(message, code ?? 'HTTP_ERROR');
    this.name = 'HttpError';
  }
}
