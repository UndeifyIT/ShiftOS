import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, LifeBuoy, Search, SearchX } from 'lucide-react';
import { buttonClasses, Input } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow, IconCircle, Section, SectionHeading } from '../../marketing/components.js';

/**
 * Ported from shift-app-hero's routes/resources.index.tsx — same hero,
 * search + category filter, featured resource and card-grid structure and
 * copy, adapted from TanStack Router onto react-router-dom/Tailwind v3.
 *
 * Deviation from the Lovable source: resources.index.tsx links every card
 * (and the featured resource) to `/resources/$slug`, which is handled by a
 * separate detail route (routes/resources.$slug.tsx) that renders the full
 * article body. apps/web has no CMS/backend for individual articles and no
 * `/resources/:slug` route registered in App.tsx today, so wiring these
 * cards to that path would be a dead link. Cards here are rendered as
 * static, non-interactive teasers (no <Link>, no hover/click affordance)
 * instead. Porting resources.$slug.tsx into a real `/resources/:slug` route
 * + detail page is a natural follow-up — see this file's report for the
 * coordination note (App.tsx changes are out of scope for this file).
 *
 * The search box and category pills are honest pure-client-side filtering
 * over the static list below (mirroring the mock content in
 * shift-app-hero/src/lib/resources.ts) — no fake search API is implied.
 */

type ResourceType = 'Guide' | 'Article' | 'Template' | 'Help Doc';

type Resource = {
  title: string;
  category: string;
  type: ResourceType;
  readTime: string;
  summary: string;
};

const RESOURCE_CATEGORIES = [
  'All Resources',
  'Getting Started',
  'Scheduling',
  'Workforce Management',
  'Operations',
  'Help & Documentation'
] as const;

const RESOURCES: Resource[] = [
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

const TYPE_ICON: Record<ResourceType, typeof BookOpen> = {
  Guide: BookOpen,
  Article: FileText,
  Template: FileText,
  'Help Doc': LifeBuoy
};

export default function ResourcesPage(): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string>('All Resources');

  const filtered = RESOURCES.filter((r) => {
    const matchesCategory = category === 'All Resources' || r.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const featured = RESOURCES[0]!;

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>Resources</Eyebrow>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-neutral-900 sm:text-5xl">
              Learn to <span className="text-brand-700">run better shifts.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-500">
              Setup checklists, scheduling guides and help documentation written for managers and supervisors — not
              for IT departments.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:max-w-sm lg:flex-1">
              <label htmlFor="resource-search" className="sr-only">
                Search resources
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <Input
                id="resource-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides and articles"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
              {RESOURCE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={[
                    'shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors',
                    category === c
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:border-brand-500 hover:text-brand-700'
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured — static teaser, not a link: see file-level note on the missing /resources/:slug detail route */}
      <Section className="py-12">
        <div className="grid gap-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-card sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Featured &middot; {featured.category}</Eyebrow>
            <h2 className="mt-4 text-2xl leading-tight text-neutral-900 sm:text-3xl">{featured.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">{featured.summary}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-6">
            <div className="rounded-xl bg-brand-soft/70 p-5">
              <IconCircle size={48}>
                <BookOpen size={22} />
              </IconCircle>
              <p className="mt-4 text-sm font-extrabold text-neutral-900">{featured.type}</p>
              <p className="text-xs text-neutral-500">{featured.readTime}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Grid */}
      <Section wash className="pt-4">
        <SectionHeading
          eyebrow="Library"
          title="Browse the"
          highlight="resource library"
          description="Guides and articles written by the ShiftOS team, in one place."
        />

        {filtered.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-lg bg-brand-soft text-brand-700">
              <SearchX className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">No resources found</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Nothing matches that search yet. Try another term or clear your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All Resources');
              }}
              className={buttonClasses({ variant: 'heroOutline', size: 'lg', className: 'mt-5' })}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => {
              const Icon = TYPE_ICON[r.type];
              return (
                <div key={r.title} className="flex flex-col rounded-lg border border-neutral-200 bg-white p-6 shadow-card">
                  <IconCircle size={44}>
                    <Icon size={20} />
                  </IconCircle>
                  <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-brand-700">
                    {r.category}
                  </p>
                  <h3 className="mt-2 text-base font-extrabold leading-snug text-neutral-900">{r.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{r.summary}</p>
                  <span className="mt-4 border-t border-neutral-200 pt-3 text-xs font-semibold text-neutral-500">
                    {r.type} &middot; {r.readTime}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Final CTA */}
      <section className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-neutral-900 sm:text-3xl">Can&apos;t find what you need?</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Book a walkthrough and we&apos;ll answer your questions directly.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/request-demo" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
              Book a Demo
            </Link>
            <Link to="/sign-up" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
