import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';

/**
 * Recreated from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s "isPricing" branch — PLANS/COMPARISON/FAQS data
 * verbatim, including the Monthly/Yearly cycle toggle (Professional becomes
 * ₦115,200/year under yearly) and the native <details> FAQ accordion.
 */

const CYCLES = ['Monthly', 'Yearly · save 20%'] as const;

const PLANS = [
  {
    name: 'Starter',
    blurb: 'For one branch getting started.',
    priceMonthly: '₦0',
    perMonthly: '/month',
    popular: false,
    ctaLabel: 'Start free',
    ctaTo: '/sign-up' as const,
    primary: false,
    features: ['1 branch', 'Up to 15 employees', 'Scheduling', 'Attendance tracking', 'Tasks', 'Email support']
  },
  {
    name: 'Professional',
    blurb: 'For growing businesses that need more power.',
    priceMonthly: '₦12,000',
    perMonthly: '/month',
    popular: true,
    ctaLabel: 'Start 30-day trial',
    ctaTo: '/sign-up' as const,
    primary: true,
    features: [
      'Unlimited employees',
      'Multiple branches',
      'Announcements & acknowledgements',
      'Leave requests',
      'Attendance corrections',
      'Priority support'
    ]
  },
  {
    name: 'Enterprise',
    blurb: 'For large organizations with complex requirements.',
    priceMonthly: 'Custom',
    perMonthly: '',
    popular: false,
    ctaLabel: 'Contact sales',
    ctaTo: '/request-demo' as const,
    primary: false,
    features: [
      'Everything in Professional',
      'Dedicated success manager',
      'Custom onboarding & training',
      'Advanced role configuration',
      'Uptime commitment',
      'Security review support'
    ]
  }
];

const COMPARISON = [
  { label: 'Scheduling', starter: 'Included', pro: '✓', ent: '✓' },
  { label: 'Attendance tracking', starter: 'Included', pro: '✓', ent: '✓' },
  { label: 'Tasks', starter: 'Included', pro: '✓', ent: '✓' },
  { label: 'Announcements', starter: '—', pro: '✓', ent: '✓' },
  { label: 'Leave requests', starter: '—', pro: '✓', ent: '✓' },
  { label: 'Multiple branches', starter: '—', pro: '✓', ent: '✓' },
  { label: 'Attendance corrections', starter: '—', pro: '✓', ent: '✓' },
  { label: 'Priority support', starter: '—', pro: '✓', ent: '✓' }
];

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are monthly and you can cancel from organization settings — your data stays available for export.'
  },
  {
    q: 'Do staff need to use their phones during work?',
    a: 'No. ShiftOS is designed so staff check schedules, tasks and notices before and after a shift, not during it.'
  },
  {
    q: 'Can I manage multiple branches?',
    a: 'Yes, on Professional and above. Each branch keeps its own team, schedule and attendance.'
  },
  {
    q: 'Can I move my existing schedule over?',
    a: 'Employees import from Excel or CSV with row-level validation before anything is saved.'
  },
  {
    q: 'What can supervisors do?',
    a: 'Whatever you grant them: attendance, tasks, notes and announcements for their branch. Organization settings stay with managers.'
  },
  {
    q: "Is my organization's data isolated?",
    a: 'Yes. Data is scoped per organization and per branch, and access is enforced by role, not by job title.'
  }
];

function SegButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-[15px] py-2 text-[12.5px] font-bold transition-colors',
        active ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(56,49,43,0.14)]' : 'text-neutral-600 hover:text-neutral-700'
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function PricingPage(): React.ReactElement {
  const [yearly, setYearly] = React.useState(false);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-[52px] sm:px-6">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">Simple pricing</span>
        <h1 className="mt-3.5 max-w-[720px] font-display text-[2.75rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-neutral-900">
          Simple pricing for every <span className="text-brand-500">retail business</span>
        </h1>
        <p className="mt-4 text-base text-neutral-600">
          No hidden charges. Start free today and upgrade only when your business grows.
        </p>

        {/* Billing cycle toggle */}
        <div className="mt-6.5 inline-flex gap-[3px] rounded-xl bg-neutral-100 p-1">
          <SegButton active={!yearly} onClick={() => setYearly(false)}>
            Monthly
          </SegButton>
          <SegButton active={yearly} onClick={() => setYearly(true)}>
            Yearly · save 20%
          </SegButton>
        </div>

        {/* Plans */}
        <div className="mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p) => {
            const isProYearly = yearly && p.name === 'Professional';
            return (
              <article
                key={p.name}
                className={
                  p.popular
                    ? 'rounded-[20px] border border-brand-200 bg-white p-6 shadow-[0_22px_50px_-30px_rgba(240,78,23,0.55)]'
                    : 'rounded-[20px] border border-neutral-200 bg-white p-6'
                }
              >
                {p.popular ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white">
                    Most popular
                  </span>
                ) : null}
                <h2 className="mt-3.5 text-[22px] font-extrabold text-neutral-900">{p.name}</h2>
                <p className="mt-1.5 min-h-[38px] text-[13px] text-neutral-600">{p.blurb}</p>
                <p className="mt-3.5 text-[34px] font-extrabold tracking-[-0.03em] text-neutral-900">
                  {isProYearly ? '₦115,200' : p.priceMonthly}
                  <span className="text-[13px] font-semibold text-neutral-600">{isProYearly ? '/year' : p.perMonthly}</span>
                </p>
                <Link
                  to={p.ctaTo}
                  className={
                    p.primary
                      ? 'mt-4.5 flex h-11 w-full items-center justify-center rounded-xl bg-brand-500 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600'
                      : 'mt-4.5 flex h-11 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white text-[13.5px] font-bold text-neutral-900 transition-colors hover:border-brand-300'
                  }
                >
                  {p.ctaLabel}
                </Link>
                <ul className="mt-4.5 flex flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13px] text-neutral-600">
                      <span className="font-extrabold text-success-500">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Comparison table */}
        <section className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <h2 className="m-0 border-b border-neutral-100 px-5.5 py-4.5 text-[17px] font-extrabold text-neutral-900">Compare plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-5.5 py-3 text-left text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-neutral-600"
                  >
                    Capability
                  </th>
                  <th scope="col" className="px-3.5 py-3 text-center font-extrabold text-neutral-900">
                    Starter
                  </th>
                  <th scope="col" className="px-3.5 py-3 text-center font-extrabold text-brand-deep">
                    Professional
                  </th>
                  <th scope="col" className="px-3.5 py-3 text-center font-extrabold text-neutral-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="border-t border-neutral-100 px-5.5 py-3 text-left font-bold text-neutral-900">
                      {row.label}
                    </th>
                    <td className="border-t border-neutral-100 px-3.5 py-3 text-center text-neutral-600">{row.starter}</td>
                    <td className="border-t border-neutral-100 px-3.5 py-3 text-center font-bold text-success-500">{row.pro}</td>
                    <td className="border-t border-neutral-100 px-3.5 py-3 text-center font-bold text-success-500">{row.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.025em] text-neutral-900">Frequently asked questions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5">
                <summary className="cursor-pointer list-none text-[13.5px] font-bold text-neutral-900">{f.q}</summary>
                <p className="mt-2.5 text-[13px] text-neutral-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
