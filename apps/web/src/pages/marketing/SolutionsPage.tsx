import React from 'react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow } from '../../marketing/components.js';

/**
 * Recreated from `ShiftOS Marketing.dc.html`'s "isSolutions" branch — five
 * problem/fix cards (`PROBLEMS`) plus an industries grid with a short note
 * per industry (`INDUSTRIES`), not a generic solutions-by-audience layout.
 */

const PROBLEMS = [
  {
    problem: "The schedule lives in one person's spreadsheet",
    pain: "If they're off, nobody can answer who's working tomorrow — and the last version is always in someone's inbox.",
    fix: 'One published schedule, visible to everyone it affects.',
    detail: 'Build the week, publish once. Staff see only their own shifts; supervisors see the branch.'
  },
  {
    problem: 'Shift changes happen in WhatsApp groups',
    pain: 'Swaps get agreed in a thread of 40 messages, then forgotten by the person who has to open the store.',
    fix: 'Swaps and time off become requests, not messages.',
    detail: 'Requests go to the supervisor responsible for coverage, and the schedule updates when approved.'
  },
  {
    problem: 'You find out about no-shows after the rush',
    pain: 'Attendance on paper means lateness is invisible until payroll — and unarguable by then.',
    fix: 'Attendance is marked on the shift, as it happens.',
    detail: 'Present, late and absent against the published schedule, with corrections tracked on the record.'
  },
  {
    problem: 'Daily checks live on a clipboard',
    pain: 'Cold room temperature, floor checks, restocks — done or not, nobody can tell an hour later.',
    fix: 'Tasks with owners, due times and completion history.',
    detail: "Supervisors see what's outstanding before the shift closes; staff see only what's theirs."
  },
  {
    problem: "Head office can't see across branches",
    pain: 'Four locations means four spreadsheets, four WhatsApp groups and no comparable picture.',
    fix: 'One organization view with per-branch coverage.',
    detail: 'Managers see staffing, gaps and unpublished schedules per branch, without opening four files.'
  }
];

const INDUSTRIES = [
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
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-13 sm:px-6">
        <Eyebrow>Solutions</Eyebrow>
        <h1 className="mt-3.5 max-w-[700px] font-display text-[2.75rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-neutral-900">
          The five problems that cost shift-based businesses the most.
        </h1>
        <p className="mt-4 max-w-[620px] text-base text-neutral-500">
          Not a feature list &mdash; the operational failures ShiftOS is designed to remove.
        </p>

        <div className="mt-8.5 flex flex-col gap-3.5">
          {PROBLEMS.map((p) => (
            <article key={p.problem} className="flex flex-wrap overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="min-w-[260px] flex-1 basis-[300px] border-b border-neutral-100 bg-[#FDFCFB] p-5.5 sm:border-b-0 sm:border-r">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-error-600">The problem</p>
                <h2 className="mt-2 text-lg font-extrabold tracking-[-0.02em] text-neutral-900">{p.problem}</h2>
                <p className="mt-2 text-[13.5px] text-neutral-500">{p.pain}</p>
              </div>
              <div className="min-w-[260px] flex-1 basis-[320px] p-5.5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-success-600">In ShiftOS</p>
                <p className="mt-2 text-sm font-bold text-neutral-900">{p.fix}</p>
                <p className="mt-2 text-[13px] text-neutral-500">{p.detail}</p>
              </div>
            </article>
          ))}
        </div>

        <h2 className="mt-11 font-display text-[1.6rem] font-extrabold tracking-[-0.025em] text-neutral-900">
          Built for teams that work in shifts
        </h2>
        <p className="mt-2 text-sm text-neutral-500">The same operating model fits any business where people rotate through a location.</p>
        <div className="mt-4.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((i) => (
            <div key={i.name} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-extrabold text-neutral-900">{i.name}</p>
              <p className="mt-1 text-[12.5px] text-neutral-500">{i.note}</p>
            </div>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}
