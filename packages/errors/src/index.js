export class ShiftOSError extends Error {
    code;
    constructor(message, code = 'SHIFTOS_ERROR') {
        super(message);
        this.code = code;
        this.name = 'ShiftOSError';
    }
}
export class ConfigError extends ShiftOSError {
    constructor(message) {
        super(message, 'CONFIGURATION_ERROR');
        this.name = 'ConfigError';
    }
}
export class ValidationError extends ShiftOSError {
    details;
    constructor(message, details = []) {
        super(message, 'VALIDATION_ERROR');
        this.details = details;
        this.name = 'ValidationError';
    }
}
export class AuthorizationError extends ShiftOSError {
    constructor(message) {
        super(message, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
export class DatabaseError extends ShiftOSError {
    constructor(message) {
        super(message, 'DATABASE_ERROR');
        this.name = 'DatabaseError';
    }
}
export class NotFoundError extends ShiftOSError {
    constructor(message) {
        super(message, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
export class HttpError extends ShiftOSError {
    statusCode;
    constructor(message, statusCode, code) {
        super(message, code ?? 'HTTP_ERROR');
        this.statusCode = statusCode;
        this.name = 'HttpError';
    }
}
