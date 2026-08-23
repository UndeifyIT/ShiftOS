import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@shiftos/ui';

export type AuthStatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'primary';

const TONE_CLASSES: Record<AuthStatusTone, { bg: string; fg: string }> = {
  ok: { bg: 'bg-success-50', fg: 'text-success-600' },
  warn: { bg: 'bg-warning-50', fg: 'text-warning-600' },
  bad: { bg: 'bg-error-50', fg: 'text-error-600' },
  info: { bg: 'bg-info-50', fg: 'text-info-600' },
  primary: { bg: 'bg-brand-soft', fg: 'text-brand-deep' }
};

export interface AuthStatusPanelProps {
  icon: LucideIcon;
  tone: AuthStatusTone;
  title: string;
  body: string;
  meta?: string;
  ctaLabel: string;
  onCta: () => void;
  ctaLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Shared renderer for every screen's non-idle terminal views (Success,
 * Network error, Expired link, Used link) per design_handoff_shiftos's
 * STATES/TONES. Validation errors stay inline (InlineError); Loading stays
 * the submit button's own `loading` prop — neither goes through this panel.
 */
export function AuthStatusPanel({
  icon: Icon,
  tone,
  title,
  body,
  meta,
  ctaLabel,
  onCta,
  ctaLoading = false,
  secondaryLabel,
  onSecondary
}: AuthStatusPanelProps): React.ReactElement {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div className="py-6 text-center">
      <div className={['mx-auto flex h-14 w-14 items-center justify-center rounded-full', toneClasses.bg, toneClasses.fg].join(' ')}>
        <Icon size={26} />
      </div>
      <h2 className="mt-4 text-xl font-bold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-500">{body}</p>
      {meta ? <p className="mt-2 text-xs text-neutral-400">{meta}</p> : null}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Button type="button" size="lg" fullWidth onClick={onCta} loading={ctaLoading}>
          {ctaLabel}
        </Button>
        {secondaryLabel && onSecondary ? (
          <button type="button" onClick={onSecondary} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
