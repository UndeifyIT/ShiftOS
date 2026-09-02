import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  MessageCircle,
  Repeat2,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users
} from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Section } from '../../marketing/components.js';

/**
 * Recreated directly from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s Home screen (the "isHome" branch + its HERO_ROWS/
 * INDUSTRIES/roleCards/etc config) — same section order, copy, layout and
 * live coded mockups (schedule grid, attendance panel, phone), not a static
 * screenshot. Colors/type map onto this app's existing brand, neutral,
 * success and info Tailwind tokens (packages/ui/src/tokens.ts), which were
 * themselves sourced from this same handoff. The hero/phone motion (entrance
 * fade-ups, grid sweep, Live-dot pulse, floating attendance chip, published
 * toast, 15s phone scroll + requests sheet + touch ripple) ports the file's
 * so-* keyframes 1:1 via the .animate-so-* utilities in styles/global.css;
 * all of it is disabled under prefers-reduced-motion, as the design requires.
 */

const HERO_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SHIFT_STYLE: Record<string, { top: string; bottom: string; fg: string; bg: string }> = {
  A: { top: '7:30a', bottom: '5:00p', fg: 'text-success-text', bg: 'bg-success-soft' },
  B: { top: '11:30a', bottom: '10:30p', fg: 'text-[#7C3AED]', bg: 'bg-[#F3EEFE]' },
  C: { top: '2:30p', bottom: '10:30p', fg: 'text-info-600', bg: 'bg-info-50' }
};

const HERO_ROWS = [
  { name: 'Christian Chikwelu', role: 'Manager', pattern: 'AAAAAAA', fg: 'text-brand-800', bg: 'bg-brand-soft' },
  { name: 'Sado Courage Joel', role: 'Supervisor', pattern: 'ACOCACC', fg: 'text-info-600', bg: 'bg-info-50' },
  { name: 'Victoria Odibenua', role: 'Cashier', pattern: 'ACDBACA', fg: 'text-success-text', bg: 'bg-success-soft' },
  { name: 'Michael Chiamaka', role: 'Cashier', pattern: 'CAOCCBA', fg: 'text-[#7C3AED]', bg: 'bg-[#F3EEFE]' }
];

const HERO_FOOT_STATS = [
  { label: '23 employees scheduled', dot: 'bg-success-500' },
  { label: '920h 30m planned', dot: 'bg-info-500' },
  { label: '0 conflicts left', dot: 'bg-brand-500' }
];

const INDUSTRIES = [
  'Supermarkets',
  'Restaurants',
  'Retail stores',
  'Pharmacies',
  'Hotels',
  'Warehouses',
  'Factories',
  'Fuel & convenience'
];

const HERO_POINTS = [
  'Supervisors create and publish schedules in minutes',
  'Managers see coverage across every branch',
  'Staff stay updated before and after their shift',
  'No spreadsheets, no missed shift changes'
];

const ROLE_CARDS = [
  {
    title: 'Manager',
    role: 'Organization-wide authority',
    icon: Building2,
    tile: 'bg-brand-deep text-white',
    points: ['Oversee every branch', 'Assign supervisors and permissions', 'Review coverage and reports']
  },
  {
    title: 'Supervisor',
    role: 'Runs a branch day to day',
    icon: Users,
    tile: 'bg-info-500 text-white',
    points: ['Build and run today’s shift', 'Mark attendance and assign tasks', 'Record handover notes']
  },
  {
    title: 'Staff',
    role: 'Works the shift',
    icon: User,
    tile: 'bg-success-500 text-white',
    points: ['See the next shift and schedule', 'Complete assigned tasks', 'Read notices and request time off']
  }
];

const VISIBILITY_POINTS = [
  'Live attendance against the published schedule',
  'Task status before the shift closes',
  'Handover notes recorded by the outgoing supervisor',
  'Branch announcements and acknowledgements'
];

const DASH_NAV = ["Today's Shift", 'Schedules', 'Employees', 'Attendance', 'Tasks', 'Reports'];

const DASH_STATS = [
  { value: '17', label: 'Present', className: 'text-success-text' },
  { value: '2', label: 'Late', className: 'text-warning-600' },
  { value: '1', label: 'Absent', className: 'text-error-600' },
  { value: '20', label: 'Scheduled', className: 'text-neutral-900' }
];

const DASH_ATTENDANCE_ROWS = [
  { name: 'John Doe', role: 'Sales Associate', status: 'Present', time: '08:04', tone: 'success', avatarFg: 'text-brand-800', avatarBg: 'bg-brand-soft' },
  { name: 'Mary Johnson', role: 'Cashier', status: 'Late', time: '08:15', tone: 'warning', avatarFg: 'text-info-600', avatarBg: 'bg-info-50' },
  { name: 'Michael Brown', role: 'Stock Clerk', status: 'Present', time: '08:02', tone: 'success', avatarFg: 'text-success-text', avatarBg: 'bg-success-soft' },
  { name: 'James Carter', role: 'Baker', status: 'Absent', time: '—', tone: 'error', avatarFg: 'text-[#7C3AED]', avatarBg: 'bg-[#F3EEFE]' }
];

const STATUS_PILL_CLASSES: Record<string, string> = {
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-600',
  error: 'bg-error-50 text-error-600'
};

const STAFF_POINTS = [
  { title: 'Next shift, front and centre', body: 'Date, time, branch and department.' },
  { title: 'Only their own tasks', body: 'No management surfaces, no noise.' },
  { title: 'Notices that need reading', body: 'Acknowledge once, tracked for the supervisor.' },
  { title: 'Requests, not messages', body: 'Time off and swaps go to the right person.' }
];

const PHONE_CARDS = [
  { title: '3 tasks for today', body: 'Shelf check · price labels · returns', icon: CheckCircle2, fg: 'text-success-text', bg: 'bg-success-soft' },
  { title: '1 notice to read', body: 'Stocktake weekend — closes 6 PM Sat', icon: Bell, fg: 'text-warning-600', bg: 'bg-warning-soft' },
  { title: 'Swap request pending', body: 'Mon 20 · with Michael Brown', icon: Repeat2, fg: 'text-[#7C3AED]', bg: 'bg-[#F3EEFE]' }
];

const PHONE_UPCOMING = [
  { date: 'Tue, 21 May', time: '08:00 – 16:00', tag: 'Morning', where: 'Sales Floor · Main Branch', tone: 'info' as const },
  { date: 'Wed, 22 May', time: '08:00 – 16:00', tag: 'Morning', where: 'Sales Floor · Main Branch', tone: 'info' as const },
  { date: 'Thu, 23 May', time: '14:00 – 22:00', tag: 'Evening', where: 'Front End · Main Branch', tone: 'violet' as const }
];

const PHONE_TABS = [
  { label: 'Home', icon: Building2, on: true },
  { label: 'Schedule', icon: CalendarDays, on: false },
  { label: 'Tasks', icon: CheckCircle2, on: false },
  { label: 'Team', icon: Users, on: false },
  { label: 'More', icon: SlidersHorizontal, on: false }
];

/** Content of the "My requests" bottom sheet the phone demo slides up mid-loop. */
const PHONE_REQUESTS = [
  {
    title: 'Swap Mon 20 May → Evening Shift',
    meta: 'With Michael Brown · awaiting supervisor',
    tag: 'Swap',
    icon: Repeat2,
    fg: 'text-[#7C3AED]',
    bg: 'bg-[#F3EEFE]'
  },
  {
    title: 'Time off · 09 June',
    meta: 'Graduation ceremony · pending',
    tag: 'Leave',
    icon: CalendarDays,
    fg: 'text-warning-600',
    bg: 'bg-warning-soft'
  },
  {
    title: 'Swap Fri 16 May → Night Shift',
    meta: 'Approved 12 May by Sarah Johnson',
    tag: 'Approved',
    icon: CheckCircle2,
    fg: 'text-success-text',
    bg: 'bg-success-soft'
  }
];

const FEATURE_GRID = [
  { icon: CalendarDays, title: 'Smart Scheduling', body: 'Build a week from templates and publish once.' },
  { icon: Repeat2, title: 'Shift Swaps', body: 'Swap requests routed to the supervisor on cover.' },
  { icon: MessageCircle, title: 'Team Communication', body: 'Branch announcements with acknowledgements.' },
  { icon: Users, title: 'Employee Management', body: 'Profiles, departments and optional photos.' },
  { icon: FileSpreadsheet, title: 'CSV Import & Export', body: 'Bring employees in from Excel or CSV.' },
  { icon: ShieldCheck, title: 'Role-Based Access', body: 'Manager, Supervisor and Staff permissions.' }
];

export default function LandingPage(): React.ReactElement {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-neutral-100 bg-gradient-to-b from-[#FEFBF9] to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 size-[680px] rounded-full bg-brand-100/60 blur-[140px]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-11 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="max-w-xl">
            <span
              className="animate-so-in inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.11em] text-brand-deep"
            >
              <span className="animate-so-pulse-dot size-[7px] rounded-full bg-brand-500" />
              Built for retail &middot; made for people
            </span>
            <h1
              className="animate-so-in mt-5 font-display text-[2.5rem] font-extrabold leading-[1.03] tracking-[-0.04em] text-neutral-900 sm:text-[3.4rem]"
              style={{ animationDelay: '.06s' }}
            >
              Run every shift
              <br />
              from{' '}
              <span className="text-brand-500 [background:linear-gradient(180deg,transparent_66%,#FBD9C7_66%,#FBD9C7_92%,transparent_92%)]">
                one screen
              </span>
              .
            </h1>
            <p className="animate-so-in mt-5 max-w-[490px] text-[16.5px] leading-relaxed text-neutral-600" style={{ animationDelay: '.12s' }}>
              Scheduling, attendance, tasks and announcements for shift-based teams. Supervisors publish the week in
              minutes, managers see every branch, staff always know where they stand.
            </p>

            <div className="animate-so-in mt-6 flex flex-wrap gap-2.5" style={{ animationDelay: '.18s' }}>
              <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
                Start free trial <ArrowRight className="size-4" />
              </Link>
              <Link to="/request-demo" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
                Book a demo
              </Link>
            </div>
            <p className="animate-so-in mt-3.5 text-sm text-neutral-600" style={{ animationDelay: '.24s' }}>
              30-day trial &middot; no credit card required &middot; cancel anytime
            </p>

            <ul className="animate-so-in mt-6 flex flex-col gap-2" style={{ animationDelay: '.3s' }}>
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2 text-base font-semibold text-neutral-600">
                  <span className="flex size-[17px] shrink-0 items-center justify-center rounded-full bg-success-soft text-[10px] font-extrabold text-success-text">
                    &#10003;
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Live schedule mockup */}
          <div className="animate-so-in relative min-w-[300px] flex-1" style={{ animationDelay: '.16s' }}>
            <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_40px_80px_-46px_rgba(56,49,43,0.45)]">
              <div className="flex items-center gap-2 border-b border-neutral-100 bg-[#FDFCFB] px-3.5 py-2.5">
                <span className="flex gap-1">
                  <span className="size-[9px] rounded-full bg-[#F3C6BD]" />
                  <span className="size-[9px] rounded-full bg-[#F5DFC0]" />
                  <span className="size-[9px] rounded-full bg-[#CDE9D8]" />
                </span>
                <span className="flex h-6 flex-1 items-center justify-center rounded-lg bg-neutral-100 text-[10px] font-bold text-neutral-600">
                  app.shiftos.com/schedules
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3.5 pb-2.5 pt-3">
                <span className="text-[12.5px] font-extrabold text-neutral-900">May 12 &ndash; May 18</span>
                <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[9.5px] font-extrabold text-success-text">
                  <span className="animate-so-pulse-dot size-1.5 rounded-full bg-success-500" />
                  Live
                </span>
                <span className="ml-auto flex gap-1.5">
                  <span className="inline-flex h-6 items-center rounded-lg border border-neutral-200 px-2.5 text-[9.5px] font-bold text-neutral-600">
                    AI Assist
                  </span>
                  <span className="inline-flex h-6 items-center rounded-lg bg-brand-500 px-2.5 text-[9.5px] font-bold text-white">
                    Publish
                  </span>
                </span>
              </div>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="animate-so-sweep pointer-events-none absolute inset-y-0 left-0 z-10 w-[70px] bg-gradient-to-r from-transparent via-[rgba(253,240,233,0.75)] to-transparent"
                />
                <div className="overflow-x-auto">
                <div className="grid min-w-[520px] grid-cols-[86px_repeat(7,minmax(0,1fr))] border-b border-neutral-100">
                  <span className="px-2.5 py-2 text-[9px] font-extrabold uppercase tracking-[0.08em] text-neutral-600">Employee</span>
                  {HERO_DAYS.map((d) => (
                    <span key={d} className="px-0.5 py-2 text-center text-[9.5px] font-extrabold text-neutral-600">
                      {d}
                    </span>
                  ))}
                </div>
                {HERO_ROWS.map((row) => (
                  <div key={row.name} className="grid min-w-[520px] grid-cols-[86px_repeat(7,minmax(0,1fr))] border-b border-neutral-50">
                    <span className="flex min-w-0 items-center gap-1.5 py-1.5 pl-2.5 pr-1">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold ${row.fg} ${row.bg}`}
                      >
                        {row.name
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[9.5px] font-bold text-neutral-900">{row.name}</span>
                        <span className="block text-[8.5px] text-neutral-600">{row.role}</span>
                      </span>
                    </span>
                    {row.pattern.split('').map((ch, i) => {
                      if (ch === 'O') {
                        return (
                          <span key={i} className="flex items-center px-0.5 py-1">
                            <span className="block w-full rounded-md border border-dashed border-neutral-200 bg-neutral-50 py-1 text-center text-[8px] font-extrabold text-neutral-600">
                              OFF
                            </span>
                          </span>
                        );
                      }
                      const isDrop = ch === 'D';
                      const shift = SHIFT_STYLE[isDrop ? 'C' : ch] ?? SHIFT_STYLE.A!;
                      return (
                        <span key={i} className="flex items-center px-0.5 py-1">
                          <span
                            className={`block w-full rounded-md py-1 text-center text-[8px] font-extrabold ${shift.fg} ${shift.bg} ${isDrop ? 'ring-1 ring-brand-500' : ''}`}
                          >
                            <span className="block">{shift.top}</span>
                            <span className="block opacity-80">{shift.bottom}</span>
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 border-t border-neutral-100 bg-[#FDFCFB] px-3.5 py-2.5">
                {HERO_FOOT_STATS.map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5">
                    <span className={`size-[7px] rounded-full ${s.dot}`} />
                    <span className="text-[9.5px] font-bold text-neutral-600">{s.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-so-float absolute -left-4 bottom-10 hidden items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-lift sm:flex">
              <span className="flex size-[30px] items-center justify-center rounded-lg bg-success-soft text-success-text">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[11px] font-extrabold text-neutral-900">Attendance 100%</span>
                <span className="block text-[9.5px] text-neutral-600">Morning shift &middot; 20 of 20 marked</span>
              </span>
            </div>

            <div className="animate-so-toast absolute -right-2 -top-3 hidden items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2.5 shadow-lift sm:flex">
              <span className="flex size-[26px] items-center justify-center rounded-full bg-brand-soft text-brand-800">
                <Bell className="size-3.5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[11px] font-extrabold text-neutral-900">Schedule published</span>
                <span className="block text-[9.5px] text-neutral-600">23 people notified</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 bg-white/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 sm:px-6">
            <span className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-neutral-600">Built for</span>
            {INDUSTRIES.map((i) => (
              <span key={i} className="text-sm font-bold text-neutral-600">
                {i}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <Section wash className="py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <span className="eyebrow">One platform, every role</span>
            <h2 className="mt-3 font-display text-[2.2rem] font-extrabold leading-[1.1] tracking-[-0.032em] text-neutral-900">
              One platform.
              <br />
              Everyone in sync.
            </h2>
            <p className="mt-3.5 max-w-[400px] text-base leading-relaxed text-neutral-600">
              ShiftOS gives managers, supervisors and staff the view each of them actually needs &mdash; nothing more.
            </p>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-3">
            {ROLE_CARDS.map((r) => (
              <article key={r.title} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-lift">
                <span className={`flex size-11 items-center justify-center rounded-xl ${r.tile}`}>
                  <r.icon className="size-[19px]" aria-hidden="true" />
                </span>
                <h3 className="mt-3.5 text-base font-extrabold text-neutral-900">{r.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{r.role}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-2 text-base text-neutral-600">
                      <span className="text-brand-500">&middot;</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* Visibility / laptop */}
      <Section className="py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <span className="eyebrow">Complete visibility</span>
            <h2 className="mt-3 font-display text-[2.1rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-neutral-900">
              See everything.
              <br />
              Manage anything.
            </h2>
            <p className="mt-3.5 text-base leading-relaxed text-neutral-600">
              From one dashboard a supervisor runs the whole day: attendance against the published schedule, tasks,
              handover notes and announcements.
            </p>
            <ul className="mt-4.5 flex flex-col gap-2.5">
              {VISIBILITY_POINTS.map((p) => (
                <li key={p} className="flex gap-2.5 text-base text-neutral-600">
                  <span className="font-extrabold text-brand-500">&rarr;</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="overflow-hidden rounded-t-2xl rounded-b-lg border border-neutral-200 bg-white shadow-[0_40px_80px_-50px_rgba(56,49,43,0.5)]">
              <div className="flex items-center gap-2 border-b border-neutral-100 bg-[#FDFCFB] px-3 py-2">
                <span className="flex gap-1">
                  <span className="size-2 rounded-full bg-[#F3C6BD]" />
                  <span className="size-2 rounded-full bg-[#F5DFC0]" />
                  <span className="size-2 rounded-full bg-[#CDE9D8]" />
                </span>
                <span className="flex h-[22px] flex-1 items-center justify-center rounded-md bg-neutral-100 text-[9.5px] font-bold text-neutral-600">
                  app.shiftos.com/attendance
                </span>
              </div>
              <div className="flex min-h-[270px]">
                <div className="hidden w-24 shrink-0 flex-col gap-1 border-r border-neutral-100 bg-white p-2 sm:flex">
                  {DASH_NAV.map((label) => (
                    <span
                      key={label}
                      className={`truncate rounded-md px-1.5 py-1 text-[8.5px] font-bold ${
                        label === 'Attendance' ? 'bg-brand-500 text-white' : 'text-neutral-600'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1 bg-[#FDFCFB] p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-extrabold text-neutral-900">Attendance</span>
                    <span className="text-[9.5px] text-neutral-600">Morning shift &middot; May 16</span>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    {DASH_STATS.map((s) => (
                      <span key={s.label} className="flex-1 rounded-lg border border-neutral-100 bg-white px-2 py-1.5">
                        <span className={`block text-[15px] font-extrabold leading-tight ${s.className}`}>{s.value}</span>
                        <span className="block text-[8.5px] text-neutral-600">{s.label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-neutral-100 bg-white">
                    {DASH_ATTENDANCE_ROWS.map((r) => (
                      <div key={r.name} className="flex items-center gap-2 border-b border-neutral-50 px-2.5 py-2 last:border-0">
                        <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[8px] font-extrabold ${r.avatarFg} ${r.avatarBg}`}>
                          {r.name
                            .split(' ')
                            .map((x) => x[0])
                            .join('')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[9.5px] font-bold text-neutral-900">{r.name}</span>
                          <span className="block text-[8.5px] text-neutral-600">{r.role}</span>
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-extrabold ${STATUS_PILL_CLASSES[r.tone]}`}>{r.status}</span>
                        <span className="w-11 text-right text-[9px] font-bold text-neutral-600">{r.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-auto h-[9px] w-[72%] rounded-b-xl bg-gradient-to-b from-neutral-200 to-neutral-100" />
          </div>
        </div>
      </Section>

      {/* Staff / phone */}
      <Section className="py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex justify-center">
            <div className="animate-so-float-slow relative w-[260px] rounded-[36px] border-[10px] border-[#221F1C] bg-[#221F1C] shadow-[0_48px_90px_-46px_rgba(56,49,43,0.6)]">
              <div className="relative flex h-[480px] flex-col overflow-hidden rounded-[26px] bg-white">
                <div className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-3">
                  <span className="text-[11px] font-extrabold text-neutral-900">9:41</span>
                </div>
                <span className="absolute left-1/2 top-2 h-[18px] w-[78px] -translate-x-1/2 rounded-full bg-[#221F1C]" />
                <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 px-3.5 pb-2.5 pt-1.5">
                  <span className="text-[13px] font-extrabold text-neutral-900">ShiftOS</span>
                  <span className="relative ml-auto flex size-6 items-center justify-center text-neutral-900">
                    <Bell className="size-4" aria-hidden="true" />
                    <span className="absolute -right-0.5 -top-0.5 flex size-[13px] items-center justify-center rounded-full bg-brand-500 text-[8px] font-extrabold text-white">
                      1
                    </span>
                  </span>
                </div>
                {/* Fixed viewport between header and tab bar; the inner column
                    auto-scrolls on the shared 15s loop while the requests
                    sheet slides over it and a touch ripple "taps". */}
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <div className="animate-so-phone-scroll h-full px-3 pb-5 pt-3">
                  <p className="text-[15px] font-extrabold tracking-[-0.025em] text-neutral-900">Good morning, John</p>
                  <p className="mt-0.5 text-[10.5px] text-neutral-600">Morning shift starts in 2 minutes</p>

                  <div className="mt-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-deep p-3.5 text-white">
                    <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.1em] opacity-85">Next shift</span>
                    <span className="mt-1 block text-xl font-extrabold tracking-[-0.03em]">08:00 &ndash; 16:00</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10.5px] opacity-90">Sales Floor &middot; Main Branch</span>
                  </div>

                  <div className="mt-2.5 flex flex-col gap-2">
                    {PHONE_CARDS.map((p) => (
                      <span key={p.title} className="flex items-center gap-2.5 rounded-xl border border-neutral-100 bg-white px-2.5 py-2.5">
                        <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-lg ${p.fg} ${p.bg}`}>
                          <p.icon className="size-[13px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10.5px] font-bold text-neutral-900">{p.title}</span>
                          <span className="block text-[9.5px] text-neutral-600">{p.body}</span>
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-baseline gap-2">
                    <span className="text-[12.5px] font-extrabold text-neutral-900">Upcoming shifts</span>
                    <span className="ml-auto text-[10.5px] font-bold text-brand-deep">View all</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {PHONE_UPCOMING.map((u) => (
                      <span key={u.date} className="flex items-center gap-2.5 rounded-xl border border-neutral-100 bg-white px-2.5 py-2.5">
                        <span className="w-[52px] shrink-0 text-[9.5px] font-bold leading-tight text-neutral-600">{u.date}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[11.5px] font-extrabold text-neutral-900">{u.time}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8.5px] font-extrabold ${
                                u.tone === 'violet' ? 'bg-[#F3EEFE] text-[#7C3AED]' : 'bg-info-50 text-info-600'
                              }`}
                            >
                              {u.tag}
                            </span>
                          </span>
                          <span className="block text-[9.5px] text-neutral-600">{u.where}</span>
                        </span>
                      </span>
                    ))}
                  </div>
                  </div>

                  {/* "My requests" sheet that slides up over the home content
                      mid-loop (so-phone-sheet), per the design's phone demo. */}
                  <div
                    aria-hidden="true"
                    className="animate-so-phone-sheet pointer-events-none absolute inset-0 border-t border-neutral-100 bg-[#FDFCFB]"
                  >
                    <div className="flex items-center gap-2 border-b border-neutral-100 bg-white px-3 py-2.5">
                      <span className="text-[11px] font-bold text-brand-deep">&larr; Home</span>
                      <span className="ml-auto text-[12.5px] font-extrabold text-neutral-900">My requests</span>
                      <span className="ml-auto text-[10px] text-neutral-600">2 open</span>
                    </div>
                    <div className="flex flex-col gap-2 px-3 pt-3">
                      {PHONE_REQUESTS.map((q) => (
                        <span key={q.title} className="flex items-start gap-2.5 rounded-xl border border-neutral-100 bg-white px-2.5 py-2.5">
                          <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-lg ${q.fg} ${q.bg}`}>
                            <q.icon className="size-[13px]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10.5px] font-extrabold leading-snug text-neutral-900">{q.title}</span>
                            <span className="mt-0.5 block text-[9.5px] text-neutral-600">{q.meta}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-extrabold ${q.fg} ${q.bg}`}>{q.tag}</span>
                        </span>
                      ))}
                      <span className="flex h-9 items-center justify-center rounded-xl bg-brand-500 text-[11px] font-extrabold text-white">
                        Request a swap
                      </span>
                    </div>
                  </div>

                  {/* Touch ripple that "taps" down the screen on the same loop. */}
                  <span
                    aria-hidden="true"
                    className="animate-so-phone-touch absolute left-1/2 top-[120px] z-10 size-[26px] rounded-full bg-neutral-900/25 shadow-[0_0_0_6px_rgba(56,49,43,0.1)]"
                    style={{ marginLeft: '-13px' }}
                  />
                </div>
                <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 bg-white/95 px-3.5 pb-3 pt-2">
                  {PHONE_TABS.map((t) => (
                    <span key={t.label} className={`flex-1 text-center ${t.on ? 'text-brand-500' : 'text-neutral-300'}`}>
                      <t.icon className="mx-auto size-[15px]" aria-hidden="true" />
                      <span className="mt-0.5 block text-[8.5px] font-bold">{t.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="eyebrow">Staff stay updated</span>
            <h2 className="mt-3 font-display text-[2.1rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-neutral-900">
              Staff stay updated, anytime, anywhere.
            </h2>
            <p className="mt-3.5 max-w-[520px] text-base leading-relaxed text-neutral-600">
              Staff open ShiftOS before and after a shift &mdash; not during it. Their next shift, tasks, notices and
              requests are ready when they check.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STAFF_POINTS.map((s) => (
                <div key={s.title} className="rounded-xl border border-neutral-200 bg-white p-3.5">
                  <p className="text-base font-extrabold text-neutral-900">{s.title}</p>
                  <p className="mt-1 text-sm text-neutral-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section wash className="py-16">
        <h2 className="text-center font-display text-[2rem] font-extrabold tracking-[-0.03em] text-neutral-900">
          Everything you need to run your store
        </h2>
        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {FEATURE_GRID.map((f) => (
            <div key={f.title} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-lift">
              <f.icon className="size-[18px] text-brand-deep" aria-hidden="true" />
              <h3 className="mt-3 text-base font-extrabold text-neutral-900">{f.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6.5 text-center">
          <Link to="/features" className={buttonClasses({ variant: 'heroOutline', size: 'lg' })}>
            Explore all features <ArrowRight className="size-4" />
          </Link>
        </div>
      </Section>

      {/* Closing CTA */}
      <section className="px-4 py-16 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[26px] bg-gradient-to-br from-brand-500 to-brand-deep px-8 py-11 text-center text-white">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-[70px] size-[220px] rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-[90px] -left-8 size-[240px] rounded-full bg-white/[0.07]" />
          <h2 className="relative font-display text-[2.1rem] font-extrabold leading-[1.12] tracking-[-0.03em]">
            Publish next week before you close tonight.
          </h2>
          <p className="relative mx-auto mt-3 max-w-[520px] text-base opacity-90">
            Set up your branch, import your team and build the first schedule in one sitting. No card, no contract.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              to="/sign-up"
              className="inline-flex h-[50px] items-center gap-2 rounded-2xl bg-white px-6 text-base font-extrabold text-brand-deep hover:bg-brand-50"
            >
              Start free trial <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex h-[50px] items-center rounded-2xl border border-white/55 bg-transparent px-5 text-base font-bold text-white hover:bg-white/10"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
