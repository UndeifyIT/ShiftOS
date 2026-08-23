import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarDays, ClipboardList, MessageCircle, UserX } from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow, Section, SectionHeading } from '../../marketing/components.js';

/**
 * New page — no prior port exists (neither the old app nor shift-app-hero
 * had a Solutions route). Content follows design_handoff_shiftos/ShiftOS
 * Marketing.dc.html's PROBLEMS/INDUSTRIES data verbatim, restyled onto this
 * app's existing tokens/components rather than the file's inline styles.
 */

const problems = [
  {
    icon: CalendarDays,
    problem: "The schedule lives in one person's spreadsheet",
    pain: "If they're off, nobody can answer who's working tomorrow — and the last version is always in someone's inbox.",
    fix: 'One published schedule, visible to everyone it affects.',
    detail: 'Build the week, publish once. Staff see only their own shifts; supervisors see the branch.'
  },
  {
    icon: MessageCircle,
    problem: 'Shift changes happen in WhatsApp groups',
    pain: 'Swaps get agreed in a thread of 40 messages, then forgotten by the person who has to open the store.',
    fix: 'Swaps and time off become requests, not messages.',
    detail: 'Requests go to the supervisor responsible for coverage, and the schedule updates when approved.'
  },
  {
    icon: UserX,
    problem: 'You find out about no-shows after the rush',
    pain: 'Attendance on paper means lateness is invisible until payroll — and unarguable by then.',
    fix: 'Attendance is marked on the shift, as it happens.',
    detail: 'Present, late and absent against the published schedule, with corrections tracked on the record.'
  },
  {
    icon: ClipboardList,
    problem: 'Daily checks live on a clipboard',
    pain: 'Cold room temperature, floor checks, restocks — done or not, nobody can tell an hour later.',
    fix: 'Tasks with owners, due times and completion history.',
    detail: "Supervisors see what's outstanding before the shift closes; staff see only what's theirs."
  },
  {
    icon: Building2,
    problem: "Head office can't see across branches",
    pain: 'Four locations means four spreadsheets, four WhatsApp groups and no comparable picture.',
    fix: 'One organization view with per-branch coverage.',
    detail: 'Managers see staffing, gaps and unpublished schedules per branch, without opening four files.'
  }
];

const industries = [
  { name: 'Supermarkets', note: 'Departments, shelf checks, cold-chain routines' },
  { name: 'Restaurants', note: 'Split shifts, prep lists, front and back of house' },
  { name: 'Retail stores', note: 'Peak-hour cover and floor tasks' },
  { name: 'Pharmacies', note: 'Licensed cover on every shift' },
  { name: 'Hotels', note: 'Round-the-clock rotations and handovers' },
  { name: 'Warehouses', note: 'Shift-based picking and stock counts' },
  { name: 'Factories', note: 'Fixed rotations across production lines' },
  { name: 'Fuel & convenience', note: 'Small teams, long opening hours' }
];

export default function SolutionsPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <Eyebrow>Solutions</Eyebrow>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-neutral-900 sm:text-5xl">
              The five problems that cost <span className="text-brand-700">shift-based businesses</span> the most.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
              Not a feature list — the operational failures ShiftOS is designed to remove.
            </p>
          </div>
        </div>
      </section>

      <Section className="!pt-10">
        <div className="flex flex-col gap-4">
          {problems.map((p) => (
            <article
              key={p.problem}
              className="flex flex-wrap overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-card"
            >
              <div className="flex-1 basis-[300px] border-b border-neutral-200 bg-neutral-50 p-6 sm:border-b-0 sm:border-r">
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-error-600">The problem</p>
                <h2 className="mt-2.5 flex items-start gap-2.5 text-lg font-extrabold leading-tight text-neutral-900">
                  <p.icon className="mt-0.5 size-5 shrink-0 text-neutral-400" aria-hidden="true" />
                  <span>{p.problem}</span>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{p.pain}</p>
              </div>
              <div className="flex-1 basis-[320px] p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-success-600">In ShiftOS</p>
                <p className="mt-2.5 text-sm font-bold text-neutral-900">{p.fix}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{p.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section wash className="!pt-0">
        <SectionHeading
          align="left"
          title="Built for teams that"
          highlight="work in shifts."
          description="The same operating model fits any business where people rotate through a location."
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((i) => (
            <div key={i.name} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card">
              <p className="text-sm font-extrabold text-neutral-900">{i.name}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{i.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-neutral-900 sm:text-3xl">
              See which problems ShiftOS solves for you
            </h2>
            <p className="mt-2 text-sm text-neutral-500">Set up your organization and first branch in minutes.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
              Start Free Trial <ArrowRight className="size-4" />
            </Link>
            <Link to="/features" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
              See Features
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
