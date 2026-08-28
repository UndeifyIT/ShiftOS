import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type AuthStatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'primary';

const TONE_CLASSES: Record<AuthStatusTone, { bg: string; fg: string }> = {
  ok: { bg: 'bg-success-soft', fg: 'text-success-600' },
  warn: { bg: 'bg-warning-soft', fg: 'text-warning-600' },
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
 * Network error, Expired link, Used link), restyled 1:1 from
 * design_handoff_shiftos/ShiftOS Auth.dc.html's terminal branch: 60px round
 * tone tile, 21px title, optional boxed meta note, full-width primary CTA
 * and a full-width outlined secondary button. Validation errors stay inline
 * (AuthBanner); Loading stays the submit button's busy state.
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
    <div className="py-1.5 text-center" role="status">
      <span
        className={['mx-auto flex size-[60px] items-center justify-center rounded-full', toneClasses.bg, toneClasses.fg].join(' ')}
      >
        <Icon size={28} aria-hidden="true" />
      </span>
      <h2 className="mt-[18px] text-[21px] font-extrabold tracking-[-0.02em] text-neutral-900">{title}</h2>
      <p className="mx-auto mt-[9px] max-w-[340px] text-[13.5px] leading-relaxed text-neutral-500">{body}</p>
      {meta ? (
        <p className="mx-auto mt-3.5 max-w-[340px] rounded-xl border border-neutral-200 bg-[#FDFCFB] px-[13px] py-[11px] text-[12.5px] leading-relaxed text-neutral-600">
          {meta}
        </p>
      ) : null}
      <div className="mt-[18px] flex flex-col">
        <button
          type="button"
          onClick={onCta}
          disabled={ctaLoading}
          className={
            ctaLoading
              ? 'flex h-[46px] w-full cursor-progress items-center justify-center rounded-xl bg-[#F5A98A] text-sm font-bold text-white'
              : 'flex h-[46px] w-full cursor-pointer items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white transition-colors hover:bg-brand-600'
          }
        >
          {ctaLabel}
        </button>
        {secondaryLabel && onSecondary ? (
          <button
            type="button"
            onClick={onSecondary}
            className="mt-2.5 flex h-[42px] w-full cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-white text-[13px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
