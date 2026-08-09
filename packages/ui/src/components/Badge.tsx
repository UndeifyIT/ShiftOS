import React from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'pending';

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  /** Decorative leading dot; purely visual, the label text always carries the meaning (UI-011 §5 — never color-only). */
  dot?: boolean;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-50 text-success-text',
  warning: 'bg-warning-50 text-warning-text',
  error: 'bg-error-50 text-error-text',
  info: 'bg-info-50 text-info-text',
  pending: 'bg-brand-50 text-brand-700'
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  pending: 'bg-brand-500'
};

/** Status indicator used consistently for attendance/shift/task/employment states (UI-001 §8, UI-006 §12). */
export function Badge({ tone = 'neutral', children, className = '', dot = false }: BadgeProps): React.ReactElement {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className
      ].join(' ')}
    >
      {dot ? <span className={['h-1.5 w-1.5 rounded-full', dotClasses[tone]].join(' ')} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
