import React from 'react';
import { Button } from './Button.js';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/**
 * UI-008: an empty screen should never feel like a failure. Always paired
 * with a title + explanation, and a primary action where one exists — never
 * bare "No results" (UI-008 §6).
 */
export function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className = ''
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={['flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center', className].join(' ')}>
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-neutral-500">{description}</p> : null}
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex items-center gap-3">
          {primaryAction ? <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button> : null}
          {secondaryAction ? (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
