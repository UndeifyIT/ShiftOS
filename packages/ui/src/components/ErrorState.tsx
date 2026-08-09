import React from 'react';
import { Button } from './Button.js';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * UI-009 §8/§15: server/network failures never masquerade as an empty state
 * and never expose raw driver/database details — this always renders a fixed,
 * safe, human message plus a retry affordance when one is meaningful.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete this action. Please try again.',
  onRetry,
  className = ''
}: ErrorStateProps): React.ReactElement {
  return (
    <div
      role="alert"
      className={['flex flex-col items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-6 py-10 text-center', className].join(
        ' '
      )}
    >
      <h3 className="text-base font-semibold text-error-text">{title}</h3>
      <p className="max-w-sm text-sm text-error-text/80">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps): React.ReactElement {
  return (
    <p role="alert" className={['text-sm font-medium text-error-600', className].join(' ')}>
      {message}
    </p>
  );
}

export interface PermissionDeniedProps {
  className?: string;
}

/** UI-008 §8: direct navigation to a screen the caller lacks permission for renders this, never a raw 403/blank page. */
export function PermissionDenied({ className = '' }: PermissionDeniedProps): React.ReactElement {
  return (
    <div className={['flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center', className].join(' ')}>
      <h3 className="text-base font-semibold text-neutral-900">You do not have access to this section</h3>
      <p className="max-w-sm text-sm text-neutral-500">Contact your administrator if you believe this is a mistake.</p>
    </div>
  );
}
