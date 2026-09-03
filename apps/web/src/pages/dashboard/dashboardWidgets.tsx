import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

/**
 * Shared dashboard section widgets, ported 1:1 from `Local file check/
 * design_handoff_shiftos/ShiftOS Dashboards.dc.html`'s renderers: the stat
 * card (colored square dot + 30px value + faint meta), the tone-cycled
 * initials avatar, status pills, the primary panel with header link and
 * footer action, progress tracks, checklist circles and the tone-tinted
 * quick-action buttons. Fed by real RPC data from each page.
 */

export type DashTone = 'ok' | 'warn' | 'bad' | 'info' | 'primary' | 'violet' | 'neutral';

const TONE_PILL: Record<DashTone, string> = {
  ok: 'bg-success-50 text-success-600',
  warn: 'bg-warning-50 text-warning-600',
  bad: 'bg-error-50 text-error-600',
  info: 'bg-info-50 text-info-600',
  primary: 'bg-brand-soft text-brand-deep',
  violet: 'bg-[#F3EEFE] text-[#7C3AED]',
  neutral: 'bg-[#F4F1EE] text-neutral-500'
};

const TONE_BAR: Record<DashTone, string> = {
  ok: 'bg-success-500',
  warn: 'bg-warning-500',
  bad: 'bg-error-500',
  info: 'bg-info-500',
  primary: 'bg-brand-500',
  violet: 'bg-[#7C3AED]',
  neutral: 'bg-neutral-400'
};

/** Design's toneFor(): cycles [deep, info, ok, violet, warn] by the name's first char code. */
const AVATAR_TONES: { fg: string; bg: string }[] = [
  { fg: 'text-brand-deep', bg: 'bg-brand-soft' },
  { fg: 'text-info-600', bg: 'bg-info-50' },
  { fg: 'text-success-600', bg: 'bg-success-soft' },
  { fg: 'text-[#7C3AED]', bg: 'bg-[#F3EEFE]' },
  { fg: 'text-warning-600', bg: 'bg-warning-soft' }
];

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function InitialsAvatar({ name, size = 30 }: { name: string; size?: number }): React.ReactElement {
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${tone.fg} ${tone.bg}`}
      style={{ width: size, height: size, fontSize: size >= 40 ? 13 : 10.5 }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export function StatusPill({ tone, children }: { tone: DashTone; children: React.ReactNode }): React.ReactElement {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_PILL[tone]}`}>
      {children}
    </span>
  );
}

export interface DashStatAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

export function DashStat({
  label,
  value,
  meta,
  dotTone = 'primary',
  loading = false,
  action
}: {
  label: string;
  value: string | number;
  meta: string;
  dotTone?: DashTone;
  loading?: boolean;
  /** Optional near-empty CTA (e.g. "Add employee") shown under the meta line — additive, no visual change when omitted. */
  action?: DashStatAction;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-[18px] py-4">
      <div className="flex items-center gap-2.5">
        <span className={`size-[9px] shrink-0 rounded-[3px] ${TONE_BAR[dotTone]}`} aria-hidden="true" />
        <p className="text-[12.5px] font-bold text-neutral-500">{label}</p>
      </div>
      {loading ? (
        <span className="mt-3 block h-[26px] w-14 animate-pulse rounded-md bg-neutral-100" />
      ) : (
        <p className="mt-3 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-neutral-900">{value}</p>
      )}
      <p className="mt-1.5 text-[11.5px] text-neutral-400">{meta}</p>
      {action ? (
        action.to ? (
          <Link to={action.to} className="mt-1.5 inline-block text-[11.5px] font-bold text-brand-deep transition-colors hover:text-brand-500">
            {action.label} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-1.5 block cursor-pointer text-[11.5px] font-bold text-brand-deep transition-colors hover:text-brand-500"
          >
            {action.label} →
          </button>
        )
      ) : null}
    </div>
  );
}

/**
 * Compact empty-state block for a `DashPanel`'s body — the dashboard
 * equivalent of the list pages' `EmptyState`, sized to sit inside an
 * existing panel rather than replacing a whole page. Deliberately lighter
 * than the boxed `@shiftos/ui` `EmptyState` (no dashed border/icon circle),
 * since nothing else in this dashboard visual language uses that treatment.
 */
export function DashEmptyPanel({
  title,
  description,
  actionLabel,
  actionTo,
  onAction
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-1 px-[18px] py-8 text-center">
      <p className="text-[13px] font-bold text-neutral-700">{title}</p>
      {description ? <p className="max-w-[320px] text-[12px] text-neutral-400">{description}</p> : null}
      {actionLabel && (actionTo || onAction) ? (
        actionTo ? (
          <Link to={actionTo} className="mt-2 text-[12px] font-bold text-brand-deep transition-colors hover:text-brand-500">
            {actionLabel} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 cursor-pointer text-[12px] font-bold text-brand-deep transition-colors hover:text-brand-500"
          >
            {actionLabel} →
          </button>
        )
      ) : null}
    </div>
  );
}

export interface DashNextStepAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

/**
 * Task 8 — one role-agnostic "what's next" banner per dashboard, rendered
 * once near the top of the page. Unlike `DashEmptyPanel` (Task 7), which
 * treats an individual zero tile/panel in place, this reflects the
 * dashboard's *overall* state: each page works out its own single most
 * relevant next action (or nothing, in a healthy steady state) from data it
 * already fetches, and passes the result in here — this component only
 * renders the shell, it holds no dashboard-specific logic itself. Render
 * nothing at the call site (don't pass an empty title) when there's no next
 * step to suggest.
 */
export function DashNextStepBanner({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  /** Optional CTA — omit when the viewer's permissions don't support any action here. */
  action?: DashNextStepAction;
}): React.ReactElement {
  return (
    <section className="mb-4 flex flex-wrap items-center gap-3.5 rounded-2xl border border-brand-200 bg-brand-soft px-[18px] py-[15px]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-deep">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-[12px] text-neutral-600">{description}</p>
      </div>
      {action ? (
        action.to ? (
          <Link
            to={action.to}
            className="inline-flex h-9 shrink-0 items-center rounded-[10px] bg-brand-500 px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-[10px] bg-brand-500 px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            {action.label}
          </button>
        )
      ) : null}
    </section>
  );
}

export function DashPanel({
  title,
  linkLabel,
  linkTo,
  children,
  footerNote,
  actionLabel,
  actionTo
}: {
  title: string;
  linkLabel?: string;
  linkTo?: string;
  children: React.ReactNode;
  footerNote?: string;
  actionLabel?: string;
  actionTo?: string;
}): React.ReactElement {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-[18px] py-[15px]">
        <h2 className="text-[14.5px] font-extrabold text-neutral-900">{title}</h2>
        {linkLabel && linkTo ? (
          <Link to={linkTo} className="text-xs font-bold text-brand-deep transition-colors hover:text-brand-500">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
      {footerNote || (actionLabel && actionTo) ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-[18px] py-3">
          {footerNote ? <p className="text-[11.5px] text-neutral-400">{footerNote}</p> : <span />}
          {actionLabel && actionTo ? (
            <Link
              to={actionTo}
              className="inline-flex h-[34px] items-center rounded-[10px] border border-neutral-200 bg-white px-3.5 text-[12.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ProgressTrack({ pct, tone = 'ok', label }: { pct: number; tone?: DashTone; label: string }): React.ReactElement {
  return (
    <div className="w-[110px] shrink-0">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}

export function CheckCircle({ done }: { done: boolean }): React.ReactElement {
  return done ? (
    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
      <Check className="size-2.5" aria-hidden="true" />
    </span>
  ) : (
    <span className="size-[18px] shrink-0 rounded-full border-2 border-neutral-200" aria-hidden="true" />
  );
}

const QUICK_TONES: Record<DashTone, string> = {
  ok: 'bg-success-soft text-success-600',
  warn: 'bg-warning-soft text-warning-600',
  bad: 'bg-error-50 text-error-600',
  info: 'bg-info-50 text-info-600',
  primary: 'bg-brand-soft text-brand-deep',
  violet: 'bg-[#F3EEFE] text-[#7C3AED]',
  neutral: 'bg-[#F4F1EE] text-neutral-600'
};

export function QuickActionCard({
  title,
  body,
  tone = 'primary',
  onClick
}: {
  title: string;
  body: string;
  tone?: DashTone;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer rounded-xl px-[13px] py-[11px] text-left transition-[filter] hover:brightness-[0.97] ${QUICK_TONES[tone]}`}
    >
      <span className="block text-[12.5px] font-extrabold">{title}</span>
      <span className="mt-0.5 block text-[11.5px] font-medium opacity-80">{body}</span>
    </button>
  );
}

/** The design's page header: 25px extrabold title + mute subtitle, with the live date/time chip on the right. */
export function DashHeader({ title, subtitle }: { title: string; subtitle: string }): React.ReactElement {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[25px] font-extrabold leading-[1.15] tracking-[-0.025em] text-neutral-900">{title}</h1>
        <p className="mt-[5px] text-[13px] text-neutral-500">{subtitle}</p>
      </div>
      <div className="hidden items-center gap-2.5 rounded-xl border border-neutral-200 px-3 py-[7px] sm:flex">
        <span className="leading-tight">
          <span className="block text-[10.5px] text-neutral-400">
            {now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="block text-sm font-extrabold text-neutral-900">
            {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </span>
        </span>
      </div>
    </div>
  );
}
