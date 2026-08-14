import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  Mail,
  MessageCircle,
  Repeat2,
  ShieldCheck,
  Store,
  Users,
  UserCog,
  FileSpreadsheet
} from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Section } from '../../marketing/components.js';
import dashboardMock from '../../assets/dashboard-mock.png';
import heroSculpture from '../../assets/hero-sculpture.png';
import phoneMock from '../../assets/phone-mock.png';

/**
 * Ported from shift-app-hero's routes/index.tsx (Landing) — same structure,
 * copy, imagery and section order, adapted from TanStack Router's <Link>/
 * createFileRoute onto react-router-dom and from the prototype's oklch
 * design tokens onto this app's existing brand-* / success-* / neutral-*
 * Tailwind config (see apps/web/tailwind.config.cjs, packages/ui/src/tokens.ts).
 */

const roles = [
  {
    role: 'Manager',
    icon: UserCog,
    tone: 'primary' as const,
    points: ['Oversee every branch', 'Review branch performance', 'Monitor daily operations']
  },
  {
    role: 'Supervisor',
    icon: Users,
    tone: 'graphite' as const,
    points: ['Create schedules', 'Approve swaps and leave', 'Assign daily operations']
  },
  {
    role: 'Staff',
    icon: Store,
    tone: 'graphiteSoft' as const,
    points: ['View schedules anywhere', 'Receive announcements', 'Request swaps and leave']
  }
];

const features = [
  { icon: CalendarDays, title: 'Smart Scheduling', body: 'Create weekly rosters and publish schedules in minutes.' },
  { icon: Repeat2, title: 'Shift Swaps', body: 'Let employees request swaps with supervisor approval.' },
  { icon: MessageCircle, title: 'Team Communication', body: 'Send announcements that reach every team member.' },
  { icon: Users, title: 'Employee Management', body: 'Organize your team by branch, department and role.' },
  { icon: FileSpreadsheet, title: 'CSV Import & Export', body: 'Move your existing staff lists into ShiftOS in one step.' },
  { icon: ShieldCheck, title: 'Role-Based Access', body: 'Set permissions so every role sees only what it needs.' }
];

export default function LandingPage(): React.ReactElement {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-neutral-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-52 size-[680px] rounded-full bg-brand-500/25 blur-[140px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-56 -left-40 size-[520px] rounded-full bg-neutral-900/10 blur-[130px]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 bottom-4 select-none text-[26vw] font-extrabold leading-none tracking-tighter text-neutral-900/[0.035] lg:text-[15vw]"
        >
          SHIFT
        </span>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-deep shadow-card backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand-500" />
              Built for retail &middot; Made for people
            </span>
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.02em] text-neutral-900 sm:text-6xl lg:text-[4.25rem]">
              Run every shift
              <br />
              like clockwork
              <span className="text-brand-700">.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-neutral-500 sm:text-lg">
              ShiftOS replaces the spreadsheets and WhatsApp groups your store runs on &mdash; schedules, attendance, tasks and
              announcements in one place your whole team actually opens.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
                Start Free Trial <ArrowRight className="size-4" />
              </Link>
              <Link to="/request-demo" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
                Book a Demo
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
              <ul className="grid gap-2">
                {['No spreadsheets', 'No missed updates', 'Built for retail teams in Nigeria'].map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
                    <span className="text-neutral-500">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Visual */}
          <div className="relative flex min-h-[420px] items-center justify-center lg:min-h-[560px]">
            <div
              aria-hidden="true"
              className="absolute inset-6 rounded-[3rem] bg-gradient-to-br from-brand-500/15 via-transparent to-warning-500/20"
            />
            <img
              src={heroSculpture}
              alt="Abstract sculpture representing shifts stacking into one rhythm"
              width={1024}
              height={1024}
              className="relative w-full max-w-[540px] object-contain drop-shadow-2xl lg:max-w-[620px]"
            />

            <div className="absolute left-0 top-6 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 py-3 shadow-lift backdrop-blur sm:left-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success-600">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-neutral-900">6 of 9 clocked in</p>
                <p className="text-[11px] text-neutral-500">Morning shift &middot; live</p>
              </div>
            </div>

            <div className="absolute right-0 top-1/3 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                <CalendarDays className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-neutral-900">Week published</p>
                <p className="text-[11px] text-neutral-500">10 &ndash; 16 August &middot; 24 staff</p>
              </div>
            </div>

            <div className="absolute bottom-6 left-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 py-3 shadow-lift backdrop-blur sm:left-10">
              <span className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                <MessageCircle className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-neutral-900">Shift alert sent</p>
                <p className="text-[11px] text-neutral-500">Email + WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Roles */}
      <Section wash className="py-14 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <span className="eyebrow">One platform &middot; Every role</span>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-neutral-900 sm:text-4xl">
              One Platform. <span className="text-brand-700">Everyone In Sync.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              ShiftOS brings your team, schedules and communication together &mdash; so your store runs smoother every day.
            </p>
          </div>
          <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {roles.map((r, i) => (
              <div key={r.role} className="contents">
                <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
                  <span
                    className={
                      r.tone === 'primary'
                        ? 'flex size-10 items-center justify-center rounded-xl bg-brand-700 text-white'
                        : r.tone === 'graphite'
                          ? 'flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-white'
                          : 'flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700'
                    }
                  >
                    <r.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-neutral-900">{r.role}</h3>
                  <ul className="mt-2.5 space-y-1.5">
                    {r.points.map((p) => (
                      <li key={p} className="flex items-start gap-1.5 text-xs text-neutral-500">
                        <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-brand-700" aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                {i < roles.length - 1 ? (
                  <span aria-hidden="true" className="hidden items-center justify-center text-neutral-400 sm:flex">
                    <ArrowRight className="size-4" />
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Visibility */}
      <Section className="py-14 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="eyebrow">Complete visibility</span>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-neutral-900 sm:text-4xl">
              See Everything. <span className="text-brand-700">Manage Anything.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              From schedules to attendance and tasks, everything your branch runs on lives in one place &mdash; not across four
              different apps.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: Eye, label: 'Live schedule overview' },
                { icon: ClipboardList, label: 'Task attendance at a glance' },
                { icon: BellRing, label: 'Instant team updates and announcements' },
                { icon: CalendarDays, label: 'Gaps in coverage before the day starts' }
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-700">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-neutral-500">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-2 shadow-lift">
            <img
              src={dashboardMock}
              alt="Weekly shift schedule with attendance summary in ShiftOS"
              width={1440}
              height={896}
              loading="lazy"
              className="w-full rounded-xl"
            />
          </div>
        </div>
      </Section>

      {/* Staff stay updated */}
      <Section className="py-14 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="flex justify-center">
            <img
              src={phoneMock}
              alt="ShiftOS mobile app showing a weekly shift schedule"
              width={1024}
              height={1280}
              loading="lazy"
              className="w-full max-w-[360px] object-contain"
            />
          </div>
          <div>
            <span className="eyebrow">Staff stay updated</span>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-neutral-900 sm:text-4xl">
              Staff Stay Updated, <span className="text-brand-700">Anytime, Anywhere.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              Schedules, announcements and important updates &mdash; delivered to Email and WhatsApp.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                'View upcoming shifts',
                'Get shift reminders instantly',
                'Request shift swaps and leave',
                'Stay informed on branch announcements'
              ].map((label) => (
                <li key={label} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span className="text-neutral-500">{label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-900">
                <Mail className="size-4 text-brand-700" aria-hidden="true" /> Email
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-900">
                <MessageCircle className="size-4 text-success-600" aria-hidden="true" /> WhatsApp
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Feature grid */}
      <Section wash className="py-14 sm:py-16">
        <h2 className="text-center font-display text-3xl font-semibold leading-[1.1] text-neutral-900 sm:text-4xl">
          Everything You Need to <span className="text-brand-700">Run Your Store</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
              <f.icon className="size-6 text-brand-700" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-extrabold text-neutral-900">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-9 text-center">
          <Link to="/features" className={buttonClasses({ variant: 'heroOutline', size: 'lg' })}>
            Explore All Features <ArrowRight className="size-4" />
          </Link>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start gap-8 rounded-xl bg-neutral-900 px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30 sm:flex">
                <Store className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold leading-[1.15] sm:text-[1.75rem]">
                  Stop juggling spreadsheets,
                  <br />
                  WhatsApp and paper schedules.
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  Run your store from <span className="font-bold text-brand-400">one platform</span>.
                </p>
              </div>
            </div>
            <div className="flex w-full max-w-[280px] flex-col gap-3">
              <p className="text-xs font-semibold leading-snug text-white/70">
                30-day free trial. Set up your organization and first branch in minutes.
              </p>
              <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'lg', fullWidth: true })}>
                Start Your Free Trial <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/request-demo"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/30 bg-transparent px-5 text-base font-semibold text-white hover:bg-white/10"
              >
                Book a Demo
              </Link>
              <p className="text-[11px] text-white/50">30-day free trial &middot; No credit card required &middot; Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
