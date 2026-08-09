import React from 'react';

export interface SpinnerProps {
  size?: number;
  className?: string;
  /** Visually-hidden text for screen readers; defaults to a generic "Loading" announcement. */
  label?: string;
}

export function Spinner({ size = 16, className = '', label = 'Loading' }: SpinnerProps): React.ReactElement {
  return (
    <span role="status" className={`inline-flex ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin text-current"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
