import React, { useId } from 'react';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (fieldProps: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}

/**
 * Associates a label, optional hint and field-adjacent validation error with
 * a single form control (UI-005 §5/§8, UI-011 §10). The render-prop pattern
 * guarantees the id/aria-describedby wiring reaches the actual input instead
 * of relying on callers to copy it correctly each time.
 */
export function FormField({ label, htmlFor, hint, error, required, children }: FormFieldProps): React.ReactElement {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="text-error-500"> *</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-error-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
