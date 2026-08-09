import type { ValidationResult } from '@shiftos/types';
import { ValidationError } from '@shiftos/errors';

export interface Validator<T> {
  validate(value: T): ValidationResult;
}

export function buildValidationResult(isValid: boolean, errors: string[] = []): ValidationResult {
  return { isValid, errors };
}

export abstract class BaseValidator<T> implements Validator<T> {
  abstract validate(value: T): ValidationResult;

  protected requireField(value: unknown, fieldName: string): string | null {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  }

  protected throwIfInvalid(result: ValidationResult): void {
    if (!result.isValid) {
      throw new ValidationError('Validation failed', result.errors ?? []);
    }
  }
}
