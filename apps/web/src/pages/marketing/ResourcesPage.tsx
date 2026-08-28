import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, Clock, HelpCircle, Users } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';

/**
 * Recreated from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s "isResources" branch — RESOURCE_CATEGORIES/RESOURCES/
 * CAT_META verbatim, with the working category filter (Browse cards + filter
 * chips drive the same state) and the honest "Case studies are coming" note.
 */

type Category = 'Getting Started' | 'Scheduling' | 'Workforce Management' | 'Operations' | 'Help & Documentation';

const CATEGORY_ORDER: Category[] = [
  'Getting Started',
  'Scheduling',
  'Workforce Management',
  'Operations',
  'Help & Documentation'
];

const CAT_META: Record<Category, { icon: typeof BookOpen; tone: string; body: string }> = {
  'Getting Started': {
    icon: BookOpen,
    tone: 'bg-brand-soft text-brand-deep',
    body: 'Set up your organization, branch, supervisors and departments.'
  },
  Scheduling: {
    icon: CalendarDays,
    tone: 'bg-info-50 text-info-600',
    body: 'Plan coverage, publish a week and handle changes.'
  },
  'Workforce Management': {
    icon: Users,
    tone: 'bg-[#F3EEFE] text-[#7C3AED]',
    body: 'Add people, structure branches and departments.'
  },
  Operations: {
    icon: Clock,
    tone: 'bg-success-soft text-success-600',
    body: 'Attendance, swaps and the daily running of a shift.'
  },
  'Help & Documentation': {
    icon: HelpCircle,
    tone: 'bg-warning-soft text-warning-600',
    body: 'Reference answers on roles, permissions and settings.'
  }
};

const RESOURCES: { title: string; category: Category; type: string; readTime: string; summary: string }[] = [
  {
    title: 'The ShiftOS setup checklist for your first branch',
    category: 'Getting Started',
    type: 'Guide',
    readTime: '6 min read',
    summary:
      'Everything you need before you invite your team: organization details, branch information, supervisors and departments.'
  },
  {
    title: 'How to build a weekly shift schedule that holds up',
    category: 'Scheduling',
    type: 'Guide',
    readTime: '8 min read',
    summary:
      'A practical approach to planning coverage, handling swaps and publishing a schedule your team can actually rely on.'
  },
  {
    title: 'Handling shift swaps without the group-chat chaos',
    category: 'Operations',
    type: 'Article',
    readTime: '5 min read',
    summary: 'Swap requests are unavoidable. A simple approval path keeps them from turning into missed coverage.'
  },
  {
    title: 'Onboarding new staff into an existing branch',
    category: 'Workforce Management',
    type: 'Guide',
    readTime: '7 min read',
    summary:
      'How to add people, assign departments and set expectations in the first week so new staff can pick up shifts quickly.'
  },
  {
    title: 'Making attendance data managers actually trust',
    category: 'Operations',
    type: 'Article',
    readTime: '6 min read',
    summary: 'Clean attendance data starts with clear shift definitions and a consistent way of marking exceptions.'
  },
  {
    title: 'Structuring multiple branches and departments',
    category: 'Workforce Management',
    type: 'Guide',
    readTime: '9 min read',
    summary: 'When to split a branch, when to use departments, and how the structure affects reporting later.'
  },
  {
    title: 'Asking Shifty the right questions',
    category: 'Getting Started',
    type: 'Template',
    readTime: '4 min read',
    summary: 'Example prompts for daily standups, coverage checks and weekly planning with the ShiftOS assistant.'
  },
  {
    title: 'Roles and permissions explained',
    category: 'Help & Documentation',
    type: 'Help Doc',
    readTime: '5 min read',
    summary: 'What managers, supervisors and staff can each see and do inside ShiftOS, and how to change it.'
  }
];

const FILTERS: ('All Resources' | Category)[] = ['All Resources', ...CATEGORY_ORDER];

export default function ResourcesPage(): React.ReactElement {
  const [cat, setCat] = React.useState<'All Resources' | Category>('All Resources');
  const visible = cat === 'All Resources' ? RESOURCES : RESOURCES.filter((r) => r.category === cat);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-[52px] sm:px-6">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">Resources</span>
        <h1 className="mt-3.5 font-display text-[2.75rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-neutral-900">
          Learn to run better shifts.
        </h1>
        <p className="mt-4 max-w-[600px] text-base text-neutral-500">
          Guides, templates and help articles for managers and supervisors. We publish only what we have actually
          written &mdash; nothing here is placeholder.
        </p>

        {/* Category cards */}
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CATEGORY_ORDER.map((name) => {
            const meta = CAT_META[name];
            const n = RESOURCES.filter((r) => r.category === name).length;
            return (
              <article key={name} className="rounded-lg border border-neutral-200 bg-white p-5">
                <span className={`flex size-10 items-center justify-center rounded-xl ${meta.tone}`}>
                  <meta.icon className="size-[19px]" aria-hidden="true" />
                </span>
                <h2 className="mt-3 text-base font-extrabold text-neutral-900">{name}</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{meta.body}</p>
                <p className={`mt-3 text-[11.5px] font-bold ${n === 0 ? 'text-neutral-400' : 'text-success-500'}`}>
                  {n === 0 ? 'Nothing published yet' : n === 1 ? '1 resource' : `${n} resources`}
                </p>
                <button
                  type="button"
                  onClick={() => setCat(name)}
                  className="mt-3 h-[34px] rounded-[10px] border border-neutral-200 bg-white px-[13px] text-xs font-bold text-neutral-700 transition-colors hover:border-brand-500"
                >
                  Browse
                </button>
              </article>
            );
          })}
        </div>

        {/* Article list */}
        <h2 className="mt-9.5 text-[22px] font-extrabold tracking-[-0.025em] text-neutral-900">
          {cat === 'All Resources' ? 'All resources' : cat}
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCat(f)}
              className={[
                'rounded-lg px-[15px] py-2 text-[12.5px] font-bold transition-colors',
                f === cat
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-200 bg-white text-neutral-500 hover:border-brand-300'
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="mt-3.5 flex flex-col gap-2.5">
            {visible.map((r) => (
              <article
                key={r.title}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4.5 py-4"
              >
                <div className="min-w-[240px] flex-1 basis-[320px]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-deep">{r.type}</p>
                  <h3 className="mt-1.5 text-[15px] font-extrabold text-neutral-900">{r.title}</h3>
                  <p className="mt-1 text-[12.5px] text-neutral-500">{r.summary}</p>
                </div>
                <span className="ml-auto text-xs text-neutral-400">{r.readTime}</span>
                <a href="#" className="text-[13px] font-bold text-neutral-900 hover:text-brand-deep">
                  Read &rarr;
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3.5 rounded-2xl border border-dashed border-neutral-300 bg-[#FDFCFB] px-5.5 py-[30px] text-center">
            <p className="text-[15px] font-extrabold text-neutral-900">Nothing published in this category yet</p>
            <p className="mx-auto mt-1.5 max-w-[400px] text-[13px] text-neutral-500">
              We're still writing for {cat === 'All Resources' ? 'the library' : cat}. Browse all resources in the
              meantime.
            </p>
          </div>
        )}

        {/* Case studies teaser */}
        <section className="mt-6.5 rounded-lg border border-dashed border-neutral-300 bg-[#FDFCFB] px-6 py-9 text-center">
          <span className="mx-auto flex size-[52px] items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
            <BookOpen className="size-[22px]" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-lg font-extrabold text-neutral-900">Case studies are coming</h3>
          <p className="mx-auto mt-2 max-w-[440px] text-[13.5px] text-neutral-500">
            We won't publish customer stories until we have real ones to tell. If you'd like your branch featured, tell
            us and we'll get in touch.
          </p>
          <Link
            to="/request-demo"
            className="mt-4.5 inline-flex h-[42px] items-center rounded-xl border border-neutral-200 bg-white px-5 text-[13.5px] font-bold text-neutral-900 transition-colors hover:border-brand-500"
          >
            Talk to us
          </Link>
        </section>
      </div>
    </MarketingLayout>
  );
}
