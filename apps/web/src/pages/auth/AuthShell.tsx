import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../marketing/Logo.js';
import illusBrand from '../../assets/illus-brand.png';

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

const TRUST_POINTS = ['30-day free trial', 'No credit card', 'Cancel anytime'];

/**
 * Shared two-column shell for every auth screen, ported 1:1 from
 * design_handoff_shiftos/ShiftOS Auth.dc.html: dark #231E1A brand panel
 * (blurred orange glows, light logo + "Secure workspace" badge, eyebrow
 * pill, 38px title with brand accent, highlight callout, 2-column benefits
 * grid, "Built with retail operators in Nigeria" footer with the brand
 * illustration) + a max-width-462px white form card (24px radius, long soft
 * shadow) on a #FBFAF9 right pane with the security line, trust points and
 * help link underneath. The brand panel hides below the design's own 720px
 * breakpoint (arbitrary Tailwind variant) and the form goes full width.
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
    <div className="flex min-h-screen flex-wrap bg-[#FBFAF9] text-neutral-900">
      {/* Brand panel */}
      <aside className="relative hidden min-w-[300px] flex-col gap-[26px] overflow-hidden bg-[#231E1A] px-9 py-10 text-[#FBF7F4] min-[720px]:flex min-[720px]:flex-[1_1_460px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-[120px] top-[32%] size-[420px] rounded-full bg-brand-500/[0.22] blur-[70px]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[140px] -top-[100px] size-[360px] rounded-full bg-brand-500/[0.14] blur-[70px]"
        />

        <div className="relative flex items-center justify-between gap-3.5">
          <Logo size="sm" inverted />
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/90">
            Secure workspace
          </span>
        </div>

        <div className="relative mt-auto max-w-[460px]">
          <span className="inline-flex items-center rounded-full bg-brand-500/[0.18] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF8B58]">
            {eyebrow}
          </span>
          <h1 className="mt-[18px] font-display text-[38px] font-extrabold leading-[1.07] tracking-[-0.03em]">
            {title} <span className="text-brand-500">{accent}</span>
          </h1>
          <p className="mt-3.5 max-w-[420px] text-sm leading-relaxed text-white/70">{body}</p>

          {highlight ? (
            <div className="mt-6 flex gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-[15px]">
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-brand-500/[0.18] text-[#FF8B58]">
                <highlight.icon size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13.5px] font-extrabold">{highlight.title}</span>
                <span className="mt-0.5 block text-xs text-white/60">{highlight.body}</span>
              </span>
            </div>
          ) : null}

          <ul className="mt-6.5 grid list-none grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-[18px] p-0">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-brand-500/[0.16] text-[#FF8B58]">
                  <b.icon size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-extrabold leading-[1.25]">{b.title}</span>
                  <span className="mt-1 block text-xs leading-[1.45] text-white/60">{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-[26px] flex items-end justify-between gap-5 border-t border-white/10 pt-5">
          <div>
            <p className="text-[12.5px] font-extrabold text-[#FF8B58]">Built with retail operators in Nigeria</p>
            <p className="mt-[7px] max-w-[290px] text-xs leading-normal text-white/60">
              Shaped by supermarket managers and supervisors who run shifts every day &mdash; not by assumptions about
              how they work.
            </p>
          </div>
          <img src={illusBrand} alt="" aria-hidden="true" className="w-24 shrink-0 object-contain" />
        </div>
      </aside>

      {/* Form pane */}
      <div className="flex min-w-[320px] flex-1 flex-col px-6 pb-[34px] pt-[26px] min-[720px]:flex-[1.05_1_480px]">
        <div className="flex flex-wrap items-center justify-between gap-2 min-[720px]:justify-end">
          <div className="min-[720px]:hidden">
            <Logo size="sm" />
          </div>
          <p className="text-[13px] text-neutral-500">
            {topRightPrompt}{' '}
            {topRightLinkTo ? (
              <Link to={topRightLinkTo} className="font-bold text-brand-deep transition-colors hover:text-brand-500">
                {topRightLinkLabel}
              </Link>
            ) : (
              <span className="font-bold text-neutral-700">{topRightLinkLabel}</span>
            )}
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-[26px]">
          <div className="w-full max-w-[462px]">
            <div className="rounded-[24px] border border-neutral-200 bg-white p-7 shadow-[0_24px_60px_-34px_rgba(56,49,43,0.4)]">
              {children}
            </div>

            <p className="mt-4 flex items-center justify-center gap-[7px] text-xs text-neutral-500">
              Your data is secure and protected.
            </p>

            <div className="mt-[18px] flex flex-wrap items-center justify-center gap-x-[18px] gap-y-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-neutral-400">
              {TRUST_POINTS.map((t) => (
                <span key={t} className="flex items-center gap-[7px]">
                  <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                  {t}
                </span>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-neutral-500">
              Need help getting started?{' '}
              <Link to="/request-demo" className="font-bold text-brand-deep transition-colors hover:text-brand-500">
                Talk to our team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
