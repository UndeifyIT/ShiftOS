import React from 'react';

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error';

export interface PillProps {
  tone?: PillTone;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<PillTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  error: 'bg-error-50 text-error-text'
};

/** Filter chip / segmented-option control — distinct from Badge, which is a read-only status indicator, not something a user clicks (UI-001 §8, §12). */
export function Pill({ tone = 'neutral', active = false, onClick, children, className = '' }: PillProps): React.ReactElement {
  const classes = [
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active ? 'ring-1 ring-inset ring-brand-500' : '',
    toneClasses[tone],
    onClick ? 'cursor-pointer hover:brightness-95' : '',
    className
  ].join(' ');

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={classes}>
        {children}
      </button>
    );
  }
  return <span className={classes}>{children}</span>;
}
