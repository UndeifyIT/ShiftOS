import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Minus, Sparkles } from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow, Section } from '../../marketing/components.js';
import dashboardMock from '../../assets/dashboard-mock.png';

/**
 * Ported from shift-app-hero's routes/pricing.tsx — same structure, copy,
 * pricing tiers, comparison table and FAQ. The prototype's Radix Accordion
 * is reimplemented here with plain useState (single-open, matching its
 * `type="single" collapsible` behaviour) rather than adding a dependency.
 * Adapted from TanStack Router's <Link>/createFileRoute onto
 * react-router-dom and from the prototype's oklch design tokens onto this
 * app's existing brand-*, success-*, neutral-* Tailwind config (see
 * apps/web/tailwind.config.cjs, packages/ui/src/tokens.ts). Lovable's
 * `/signup` and `/demo` routes map onto this app's `/sign-up` and
 * `/request-demo`.
 */

interface Plan {
  name: string;
  tagline: string;
  monthly: string;
  yearly: string;
  note: string;
  cta: string;
  to: string;
  featured: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    tagline: 'Perfect for one branch getting started.',
    monthly: '₦0',
    yearly: '₦0',
    note: '/month',
    cta: 'Start Free',
    to: '/sign-up',
    featured: false,
    features: ['1 Branch', 'Up to 15 Employees', 'Scheduling', 'Attendance Tracking', 'Task Management', 'Email Support']
  },
  {
    name: 'Professional',
    tagline: 'For growing businesses that need more power.',
    monthly: '₦12,000',
    yearly: '₦9,600',
    note: '/month',
    cta: 'Start 30-Day Trial',
    to: '/sign-up',
    featured: true,
    features: [
      'Unlimited Employees',
      'Multiple Branches',
      'Advanced Reports',
      'Task Management',
      'Leave Requests',
      'Notifications & Alerts',
      'Priority Support'
    ]
  },
  {
    name: 'Enterprise',
    tagline: 'For large organizations with complex requirements.',
    monthly: 'Custom',
    yearly: 'Custom',
    note: 'pricing',
    cta: 'Contact Sales',
    to: '/request-demo',
    featured: false,
    features: [
      'Unlimited Everything',
      'Dedicated Success Manager',
      'API Access',
      'Custom Integrations',
      'Training & Onboarding',
      'SLA & Uptime Guarantee',
      'Priority Support'
    ]
  }
];

const COMPARISON: { label: string; values: boolean[] }[] = [
  { label: 'Scheduling', values: [true, true, true] },
  { label: 'Attendance Tracking', values: [true, true, true] },
  { label: 'Task Management', values: [true, true, true] },
  { label: 'Leave Requests', values: [false, true, true] },
  { label: 'Reports & Analytics', values: [false, true, true] },
  { label: 'Multiple Branches', values: [false, true, true] },
  { label: 'Shifty Assistant', values: [false, true, true] },
  { label: 'Priority Support', values: [false, true, true] }
];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are month to month and you can cancel from your organization settings at any time.'
  },
  {
    q: 'Do employees need to use their phones during work?',
    a: 'No. ShiftOS is designed so staff check schedules and updates before and after shifts, not throughout the day.'
  },
  {
    q: 'Can I manage multiple branches?',
    a: 'Multiple branches are included from the Professional plan upwards, each with its own schedule and supervisors.'
  },
  {
    q: 'What happens after the 30-day trial?',
    a: 'You can stay on the Starter plan with one branch, or move to Professional to keep unlimited employees and branches.'
  },
  {
    q: 'Can supervisors use ShiftOS?',
    a: 'Yes. Supervisors get their own permissions covering schedules, attendance, tasks and approvals.'
  }
];

export default function PricingPage(): React.ReactElement {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-neutral-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-16">
          <div className="max-w-xl">
            <Eyebrow>Simple pricing</Eyebrow>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-neutral-900 sm:text-5xl">
              Simple pricing for every <span className="text-brand-700">retail business</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-500">
              No hidden charges. Start free today and upgrade only when your business grows.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
                Start Free Trial
              </Link>
              <Link to="/request-demo" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
                Book a Demo
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-neutral-500">
              {['30-Day Free Trial', 'No Credit Card', 'Cancel Anytime'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-brand-700" aria-hidden="true" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-2 shadow-lift">
            <img
              src={dashboardMock}
              alt="ShiftOS dashboard overview"
              width={1440}
              height={896}
              className="w-full rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* Billing toggle + plan cards + comparison */}
      <Section className="py-14 sm:py-16">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-neutral-500">Choose your billing cycle</p>
          <div role="group" aria-label="Billing cycle" className="inline-flex rounded-full border border-neutral-200 bg-white p-1">
            {[
              { label: 'Monthly', value: false },
              { label: 'Yearly', value: true }
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                aria-pressed={yearly === opt.value}
                onClick={() => setYearly(opt.value)}
                className={[
                  'rounded-full px-5 py-2 text-sm font-bold transition-colors',
                  yearly === opt.value ? 'bg-brand-700 text-white' : 'text-neutral-500 hover:text-neutral-900'
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold text-brand-700">Save 20% with yearly billing</p>
        </div>

        {/* Plan cards */}
        <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                'relative rounded-lg border bg-white p-6 shadow-card',
                plan.featured ? 'border-brand-500 shadow-lift lg:-mt-4 lg:pb-8 lg:pt-9' : 'border-neutral-200'
              ].join(' ')}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-700 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                  ★ Most Popular
                </span>
              ) : null}
              <h2 className="text-xl font-bold text-neutral-900">{plan.name}</h2>
              <p className="mt-2 min-h-10 text-sm text-neutral-500">{plan.tagline}</p>
              <p className="mt-5 flex items-end gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                  {yearly ? plan.yearly : plan.monthly}
                </span>
                <span className="pb-1 text-sm text-neutral-500">{plan.note}</span>
              </p>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={16}
                      className={['mt-0.5 shrink-0', plan.featured ? 'text-brand-700' : 'text-success-600'].join(' ')}
                      aria-hidden="true"
                    />
                    <span className="text-neutral-500">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={plan.to}
                className={buttonClasses({ variant: plan.featured ? 'hero' : 'heroOutline', size: 'lg', fullWidth: true, className: 'mt-7' })}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="mt-14 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="px-6 pt-6 text-left text-lg font-extrabold text-neutral-900">Compare Plans</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th scope="col" className="px-6 py-4 font-extrabold text-neutral-900">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th key={p.name} scope="col" className="px-4 py-4 text-center font-extrabold text-neutral-900">
                      {p.name}
                      <span className="block text-xs font-semibold text-neutral-500">
                        {yearly ? p.yearly : p.monthly} {p.note}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-neutral-100 last:border-0">
                    <th scope="row" className="px-6 py-3.5 text-left font-semibold text-neutral-700">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-3.5 text-center">
                        {v ? (
                          <Check size={16} className="mx-auto text-success-600" aria-label="Included" />
                        ) : (
                          <Minus size={16} className="mx-auto text-neutral-300" aria-label="Not included" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section wash className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>
              <Sparkles size={14} aria-hidden="true" /> Questions
            </Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-neutral-900 sm:text-4xl">
              Frequently Asked <span className="text-brand-700">Questions</span>
            </h2>
            <p className="mt-4 text-sm text-neutral-500">
              Still unsure which plan fits?{' '}
              <Link to="/request-demo" className="font-semibold text-brand-700 hover:underline">
                Book a demo
              </Link>{' '}
              and we&rsquo;ll walk through it with you.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white px-5">
            {FAQS.map((f, index) => (
              <div key={f.q} className={index > 0 ? 'border-t border-neutral-200' : ''}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-bold text-neutral-900"
                >
                  {f.q}
                  <ChevronDown
                    size={16}
                    className={['shrink-0 text-neutral-400 transition-transform', openFaq === index ? 'rotate-180' : ''].join(' ')}
                    aria-hidden="true"
                  />
                </button>
                {openFaq === index ? <p className="pb-4 text-sm leading-relaxed text-neutral-500">{f.a}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-display text-2xl font-semibold text-neutral-900 sm:text-3xl">Ready to get your shifts organized?</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link to="/request-demo" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
