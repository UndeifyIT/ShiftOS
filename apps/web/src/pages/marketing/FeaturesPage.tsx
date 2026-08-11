import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  MessageCircle,
  Repeat2,
  Smartphone,
  Sparkles,
  Store,
  Users
} from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow, Section, SectionHeading } from '../../marketing/components.js';
import dashboardMock from '../../assets/dashboard-mock.png';
import illusTeam from '../../assets/illus-team.png';
import illusBuilding from '../../assets/illus-building.png';

/**
 * Ported from shift-app-hero's routes/features.tsx — same pillar structure,
 * capability grid, Shifty preview and closing CTA, adapted from TanStack
 * Router's <Link>/createFileRoute onto react-router-dom and from the
 * prototype's oklch design tokens onto this app's existing brand, success and
 * neutral Tailwind config (see apps/web/tailwind.config.cjs,
 * packages/ui/src/tokens.ts). Shifty's chat preview is static copy, matching
 * the prototype's own note that its responses are simulated on the frontend.
 */

const pillars = [
  {
    id: 'scheduling',
    eyebrow: 'Scheduling',
    title: 'Build a week that',
    accent: 'actually holds.',
    body: 'Plan coverage first, then assign people. Publish once and the whole branch sees the same schedule.',
    points: [
      'Weekly and daily shift views',
      'Recurring shift patterns',
      'Coverage gaps highlighted before publishing',
      'Swap and leave requests in one queue'
    ],
    image: dashboardMock,
    imageAlt: 'Weekly shift schedule in ShiftOS',
    framed: true,
    reverse: false
  },
  {
    id: 'workforce',
    eyebrow: 'Workforce management',
    title: 'Your people, organized',
    accent: 'by how you work.',
    body: 'Group staff by branch, department and role, and give supervisors exactly the permissions they need.',
    points: [
      'Departments and roles per branch',
      'Supervisor permission sets',
      'Invitations by work email',
      'Profile details kept in one place'
    ],
    image: illusTeam,
    imageAlt: 'Illustration of a shift team',
    framed: false,
    reverse: true
  },
  {
    id: 'branches',
    eyebrow: 'Branch management',
    title: 'One organization,',
    accent: 'many branches.',
    body: 'Each location keeps its own schedule, supervisors and reporting — while the organization keeps the overview.',
    points: [
      'Branch-level schedules and attendance',
      'Time zones set per branch',
      'Store type and operating details',
      'Compare branches from the organization view'
    ],
    image: illusBuilding,
    imageAlt: 'Illustration of an organization building',
    framed: false,
    reverse: false
  }
];

const capabilities = [
  {
    icon: Eye,
    title: 'Operational Visibility',
    body: "See what's covered, what's missing and what's pending across the day at a glance."
  },
  {
    icon: ClipboardList,
    title: 'Tasks & Handover',
    body: 'Assign shift tasks and pass context between the morning and evening team.'
  },
  {
    icon: BellRing,
    title: 'Notifications',
    body: 'Shift reminders, schedule changes and branch announcements reach the right people.'
  },
  {
    icon: Smartphone,
    title: 'Mobile Workforce Access',
    body: 'Staff check schedules and updates from their phones before and after shifts.'
  },
  {
    icon: Repeat2,
    title: 'Swaps & Leave',
    body: 'Requests follow one approval path so coverage is never guesswork.'
  },
  {
    icon: MessageCircle,
    title: 'Team Communication',
    body: 'Replace scattered group chats with announcements tied to a branch and shift.'
  }
];

export default function FeaturesPage(): React.ReactElement {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <Eyebrow>Features</Eyebrow>
            <h1 className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-neutral-900 sm:text-5xl">
              Everything a shift-based team needs, <span className="text-brand-500">nothing it doesn't.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
              ShiftOS is built around how branches really operate: a manager planning the week, a supervisor running the
              day, and staff who need to know when they're working.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
                Start Free Trial
              </Link>
              <Link to="/request-demo" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
                Book a Demo
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CalendarDays, label: 'Scheduling' },
              { icon: Users, label: 'Workforce' },
              { icon: Store, label: 'Branches' },
              { icon: Sparkles, label: 'Shifty assistant' }
            ].map((i) => (
              <div
                key={i.label}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3.5 shadow-card"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
                  <i.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-bold text-neutral-900">{i.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      {pillars.map((p, index) => (
        <Section key={p.id} wash={index % 2 === 1}>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className={p.reverse ? 'lg:order-2' : ''}>
              <Eyebrow>{p.eyebrow}</Eyebrow>
              <h2 className="mt-4 text-3xl leading-[1.1] text-neutral-900 sm:text-4xl">
                {p.title} <span className="text-brand-500">{p.accent}</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-500">{p.body}</p>
              <ul className="mt-6 space-y-2.5">
                {p.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
                    <span className="text-neutral-500">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={p.reverse ? 'lg:order-1' : ''}>
              {p.framed ? (
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-lift">
                  <img
                    src={p.image}
                    alt={p.imageAlt}
                    width={1440}
                    height={896}
                    loading="lazy"
                    className="w-full rounded-xl"
                  />
                </div>
              ) : (
                <div className="relative flex justify-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-12 top-6 aspect-square rounded-full bg-brand-soft/70"
                  />
                  <img
                    src={p.image}
                    alt={p.imageAlt}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="relative w-full max-w-[340px] object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </Section>
      ))}

      {/* Capabilities */}
      <Section>
        <SectionHeading
          eyebrow="Capabilities"
          title="Built around the"
          highlight="working day."
          description="Every capability exists because a manager or supervisor needed it to get through a shift."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card transition-shadow hover:shadow-lift"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                <c.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-extrabold text-neutral-900">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Shifty */}
      <Section wash>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" /> Shifty
            </span>
            <h2 className="mt-4 text-3xl leading-[1.1] text-neutral-900 sm:text-4xl">
              Ask your operations <span className="text-brand-500">a question.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-500">
              Shifty is the ShiftOS assistant. Instead of digging through screens, ask about coverage, open shifts or
              next week's plan and get a direct answer.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                'Suggested prompts for daily standups',
                'Conversation history within a session',
                'Available from every page in ShiftOS'
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="text-neutral-500">{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-neutral-500">Shifty responses shown here are illustrative.</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-lift">
            <div className="flex items-center gap-2.5 border-b border-neutral-200 pb-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-neutral-900">Shifty</p>
                <p className="text-xs text-neutral-500">Operational assistant</p>
              </div>
            </div>
            <div className="space-y-3 py-4">
              <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2.5 text-sm text-white">
                Which shifts are unassigned?
              </p>
              <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2.5 text-sm leading-relaxed text-neutral-900">
                2 shifts are unassigned this week: Saturday evening and Sunday morning. Want suggestions from the same
                department?
              </p>
            </div>
            <p className="border-t border-neutral-200 pt-3 text-xs text-neutral-500">
              Open Shifty from the button in the corner of any page.
            </p>
          </div>
        </div>
      </Section>

      {/* Closing CTA */}
      <section className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-1 size-6 shrink-0 text-brand-500" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Set up your organization in minutes</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Organization &rarr; Branch &rarr; Supervisor. Three steps to your first schedule.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
              Get Started <ArrowRight className="size-4" />
            </Link>
            <Link to="/pricing" className={buttonClasses({ variant: 'heroOutline', size: 'xl' })}>
              See Pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
