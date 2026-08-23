import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../marketing/Logo.js';

export interface AuthBenefit {
  icon: React.ElementType;
  title: string;
  body: string;
}

export interface AuthHighlight {
  icon: React.ElementType;
  title: string;
  body: string;
}

export interface AuthShellProps {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  highlight?: AuthHighlight;
  benefits: AuthBenefit[];
  topRightPrompt: string;
  topRightLinkLabel: string;
  topRightLinkTo?: string;
  children: React.ReactNode;
}

/**
 * Shared two-column shell for every auth screen, matching
 * design_handoff_shiftos/ShiftOS Auth.dc.html: dark left brand panel
 * (eyebrow, title+accent, body, optional highlight callout, 4-item benefits
 * list) + a max-width-462px white form card on the right. Below ~720px the
 * brand panel hides and the form goes full width (design's own breakpoint —
 * approximated here at Tailwind's `lg` (1024px) since this app has no
 * existing 720px breakpoint token).
 */
export function AuthShell({
  eyebrow,
  title,
  accent,
  body,
  highlight,
  benefits,
  topRightPrompt,
  topRightLinkLabel,
  topRightLinkTo,
  children
}: AuthShellProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="hidden shrink-0 flex-col justify-between bg-neutral-900 px-10 py-12 text-white lg:flex lg:w-[420px] xl:w-[460px]">
        <div>
          <Logo inverted />
          <p className="mt-10 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight">
            {title} <span className="text-brand-300">{accent}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-neutral-300">{body}</p>

          {highlight ? (
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
                <highlight.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{highlight.title}</p>
                <p className="mt-0.5 text-sm text-neutral-300">{highlight.body}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-5">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-300">
                  <benefit.icon size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{benefit.title}</p>
                  <p className="text-sm text-neutral-400">{benefit.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-6 sm:px-6 lg:justify-end lg:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="text-sm text-neutral-500">
            {topRightPrompt}{' '}
            {topRightLinkTo ? (
              <Link to={topRightLinkTo} className="font-semibold text-brand-600 hover:text-brand-700">
                {topRightLinkLabel}
              </Link>
            ) : (
              <span className="font-semibold text-neutral-700">{topRightLinkLabel}</span>
            )}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-[462px] rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
