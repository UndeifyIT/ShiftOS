export declare class ShiftOSError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare class ConfigError extends ShiftOSError {
    constructor(message: string);
}
export declare class ValidationError extends ShiftOSError {
    readonly details: string[];
    constructor(message: string, details?: string[]);
}
export declare class AuthorizationError extends ShiftOSError {
    constructor(message: string);
}
export declare class DatabaseError extends ShiftOSError {
    constructor(message: string);
}
export declare class NotFoundError extends ShiftOSError {
    constructor(message: string);
}
export declare class HttpError extends ShiftOSError {
    readonly statusCode: number;
    constructor(message: string, statusCode: number, code?: string);
}
//# sourceMappingURL=index.d.ts.map