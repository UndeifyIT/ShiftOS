import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '../../marketing/Logo.js';

export interface AuthFeatureItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

export interface AuthStepItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

export interface AuthTrustItem {
  icon: React.ElementType;
  label: string;
}

export interface AuthMarketingLayoutProps {
  eyebrow: string;
  heading: React.ReactNode;
  description: string;
  features: AuthFeatureItem[];
  callout?: { icon: React.ElementType; title: string; description: string };
  steps?: { heading: string; items: AuthStepItem[] };
  trustItems?: AuthTrustItem[];
  topRightPrompt: string;
  topRightLinkLabel: string;
  topRightLinkTo: string;
  children: React.ReactNode;
}

/**
 * Shared two-column shell for the Sign In / Sign Up screens (pixel reference
 * supplied by the user): branded left panel + form card on the right, plus
 * an optional full-width "how it works" strip and trust bar underneath.
 */
export function AuthMarketingLayout({
  eyebrow,
  heading,
  description,
  features,
  callout,
  steps,
  trustItems,
  topRightPrompt,
  topRightLinkLabel,
  topRightLinkTo,
  children
}: AuthMarketingLayoutProps): React.ReactElement {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-50" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-brand-100 opacity-70" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/" aria-label="ShiftOS home">
          <Logo />
        </Link>
        <p className="text-sm text-neutral-500">
          {topRightPrompt}{' '}
          <Link to={topRightLinkTo} className="font-semibold text-brand-600 hover:text-brand-700">
            {topRightLinkLabel}
          </Link>
        </p>
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative">
          <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-neutral-900">{heading}</h1>
          <p className="mt-4 max-w-md text-sm text-neutral-500">{description}</p>

          {callout ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-500 shadow-sm">
                <callout.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{callout.title}</p>
                <p className="text-sm text-neutral-500">{callout.description}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <feature.icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{feature.title}</p>
                  <p className="text-sm text-neutral-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-10 hidden justify-center lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle,_theme(colors.neutral.300)_1px,_transparent_1px)] bg-[length:16px_16px] opacity-40" aria-hidden="true" />
            <div className="relative flex h-32 w-32 rotate-12 items-center justify-center rounded-3xl bg-brand-500 text-4xl font-black text-white shadow-xl">
              S
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">{children}</div>
      </div>

      {steps ? (
        <div className="relative border-t border-neutral-200 bg-neutral-50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-xl font-bold text-neutral-900">{steps.heading}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.items.map((step, index) => (
                <div key={step.title} className="relative text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white">
                    <step.icon size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-neutral-900">{step.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{step.description}</p>
                  {index < steps.items.length - 1 ? (
                    <span className="pointer-events-none absolute right-[-1.5rem] top-6 hidden text-neutral-300 sm:block" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {trustItems ? (
        <div className="relative border-t border-brand-100 bg-brand-50 py-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-sm font-medium text-neutral-700 sm:px-6 lg:px-8">
            {trustItems.map((item) => (
              <span key={item.label} className="flex items-center gap-2">
                <item.icon size={16} className="text-brand-500" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const DEFAULT_TRUST_ITEMS: AuthTrustItem[] = [
  { icon: ShieldCheck, label: 'Trusted by retail leaders across Nigeria' }
];
