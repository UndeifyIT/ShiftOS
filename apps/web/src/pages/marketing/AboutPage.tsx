import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  MapPin,
  MessagesSquare,
  Quote,
  Store,
  Target,
  User,
  Users
} from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow, IconCircle, Section } from '../../marketing/components.js';
import illusAboutHero from '../../assets/illus-about-hero.png';

/**
 * Ported from shift-app-hero's routes/about.tsx — same editorial hero band,
 * stat strip, mission/vision cards, numbered story, beliefs grid, founders
 * and closing CTA, adapted from TanStack Router's <Link>/createFileRoute
 * onto react-router-dom and from the prototype's oklch design tokens onto
 * this app's brand, success and neutral Tailwind color scales (see
 * apps/web/tailwind.config.cjs). The dark hero/CTA bands use bg-neutral-900
 * + brand-400 accents, matching the pattern already established for dark
 * sections in LandingPage.tsx and PricingPage.tsx.
 */

const heroBadges = [
  { icon: MapPin, title: 'Built in Nigeria', body: 'For emerging markets' },
  { icon: Users, title: 'Shaped by operators', body: 'Managers and supervisors' }
];

const stats = [
  { value: '2024', label: 'Founded in Lagos' },
  { value: '40+', label: 'Retail teams interviewed' },
  { value: '6', label: 'Cities in the pilot' },
  { value: '0', label: 'Spreadsheets required' }
];

const missionVision = [
  {
    icon: Target,
    kicker: 'Our mission',
    title: 'Smoother operations, less overhead',
    body: 'Help retail businesses run their day without spreadsheets, paper schedules or fragmented communication.'
  },
  {
    icon: Eye,
    kicker: 'Our vision',
    title: 'The OS for shift work',
    body: 'Become the operating system for workforce management across emerging markets.'
  }
];

const storyChecklist = [
  'Schedules that make sense',
  "Communication that's clear",
  'Operations that run smoothly',
  'Teams that stay informed'
];

const story = [
  {
    step: '01',
    title: 'We listened first',
    body: 'We spoke with supermarket managers and supervisors across Nigeria and found the same pattern everywhere — schedules in Excel, shift swaps on WhatsApp, tasks on paper.'
  },
  {
    step: '02',
    title: "Existing tools didn't fit",
    body: 'Workforce software was either too complex, too expensive, or designed for offices where everyone has a laptop and a free hand.'
  },
  {
    step: '03',
    title: 'So we built ShiftOS',
    body: 'A practical platform where managers and supervisors run the day, and staff stay informed before and after shifts. No clutter. Just what works.'
  }
];

const beliefs = [
  { icon: User, title: 'Managers manage', body: 'They need visibility, control and clear insight into every branch.' },
  { icon: Users, title: 'Supervisors run operations', body: 'They need practical tools to build schedules and track what matters.' },
  { icon: MessagesSquare, title: 'Employees check updates', body: 'Before or after shifts — not throughout the working day.' },
  { icon: Store, title: 'Retail is its own world', body: 'ShiftOS is built around that reality instead of fighting it.' }
];

const founders = [
  {
    name: 'Lai-oke Toluwani',
    role: 'Founder',
    initials: 'LT',
    body: 'Focused on building practical technology that solves operational challenges for retail businesses in emerging markets.'
  },
  {
    name: 'Taiwo Isaac',
    role: 'Co-Founder & CEO',
    initials: 'TI',
    body: 'Focused on helping retail teams simplify scheduling, communication and workforce management through intuitive software.'
  }
];

export default function AboutPage(): React.ReactElement {
  return (
    <MarketingLayout>
      {/* Hero — dark editorial band */}
      <section className="relative overflow-hidden bg-neutral-900 text-white">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-32 size-[520px] rounded-full bg-brand-500/25 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-400">
              About us
            </span>
            <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
              Built for retail teams.
              <br />
              Rooted in <span className="text-brand-400">real problems.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70">
              ShiftOS helps retail businesses in emerging markets simplify scheduling, communication and workforce
              management — without complex systems or constant phone use on the floor.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/request-demo" className={buttonClasses({ variant: 'hero', size: 'lg' })}>
                Talk to our team <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-brand-400"
              >
                See what ShiftOS does <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-6">
              {heroBadges.map((b) => (
                <div key={b.title} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-400/40 text-brand-400">
                    <b.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-snug">
                    <span className="block font-bold">{b.title}</span>
                    <span className="block text-white/55">{b.body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.04] p-3 shadow-2xl backdrop-blur">
              <img
                src={illusAboutHero}
                alt="ShiftOS 3D brand mark on stacked platforms"
                width={1024}
                height={896}
                className="w-full rounded-[1.5rem] object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-lift">
              <IconCircle size={36}>
                <Store className="size-4" aria-hidden="true" />
              </IconCircle>
              <span className="text-xs leading-tight">
                <span className="block font-extrabold text-neutral-900">Retail-first</span>
                <span className="block text-neutral-500">Designed on the shop floor</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
            {stats.map((s) => (
              <div key={s.label} className="lg:px-8">
                <p className="text-3xl font-extrabold tracking-tight text-brand-400">{s.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <Section className="py-14 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          {missionVision.map((c) => (
            <article
              key={c.kicker}
              className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-card transition-shadow hover:shadow-lift"
            >
              <span
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-40 rounded-full bg-brand-soft transition-transform duration-500 group-hover:scale-125"
              />
              <span className="relative flex size-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-brand">
                <c.icon className="size-5" aria-hidden="true" />
              </span>
              <p className="relative mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-500">{c.kicker}</p>
              <h2 className="relative mt-2 text-2xl font-extrabold tracking-tight text-neutral-900">{c.title}</h2>
              <p className="relative mt-3 text-sm leading-relaxed text-neutral-500">{c.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Story — numbered editorial rows */}
      <Section wash className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Our story</Eyebrow>
            <h2 className="mt-4 text-3xl leading-[1.1] font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              We build what retail teams
              <br />
              <span className="text-brand-500">actually need.</span>
            </h2>
            <ul className="mt-8 space-y-3">
              {storyChecklist.map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 shrink-0 text-brand-500" aria-hidden="true" />
                  <span className="text-sm font-bold text-neutral-900">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <ol className="divide-y divide-neutral-200 border-y border-neutral-200">
            {story.map((s) => (
              <li key={s.step} className="grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:gap-8">
                <span className="text-2xl font-extrabold tracking-tight text-brand-500/40">{s.step}</span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-neutral-900">{s.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Beliefs */}
      <Section className="py-14 sm:py-20">
        <div className="max-w-2xl">
          <Eyebrow>Why ShiftOS exists</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight text-neutral-900 sm:text-4xl">
            Retail teams deserve <span className="text-brand-500">better tools</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            Most workforce software assumes employees are on their phones all day. Retail doesn&rsquo;t work that way — so we
            designed around the people who actually run the floor.
          </p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
          {beliefs.map((b) => (
            <div key={b.title} className="group bg-white p-7 transition-colors hover:bg-brand-soft/60">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-deep transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <b.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-base font-extrabold tracking-tight text-neutral-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{b.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Founders */}
      <Section wash className="py-14 sm:py-20">
        <Eyebrow>Meet the founding team</Eyebrow>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {founders.map((p) => (
            <article key={p.name} className="flex gap-5 rounded-3xl border border-neutral-200 bg-white p-7 shadow-card">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-lg font-extrabold text-white shadow-brand">
                {p.initials}
              </span>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-neutral-900">{p.name}</h3>
                <p className="mt-0.5 text-sm font-bold text-brand-500">{p.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{p.body}</p>
              </div>
            </article>
          ))}
        </div>

        <figure className="mx-auto mt-12 max-w-3xl text-center">
          <Quote className="mx-auto size-7 text-brand-500" aria-hidden="true" />
          <blockquote className="mt-4 text-lg font-bold leading-relaxed tracking-tight text-neutral-900 sm:text-xl">
            &ldquo;ShiftOS was founded with one goal: build workforce software that reflects how retail teams actually operate
            — not how enterprise software assumes they operate.&rdquo;
          </blockquote>
        </figure>
      </Section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-neutral-900 px-6 py-12 text-center text-white sm:px-12">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-brand-500/25 blur-3xl"
            />
            <h2 className="relative text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Ready to run your shifts the easy way?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
              Start your 30-day free trial, or let us walk you through ShiftOS with your own branch data.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/sign-up" className={buttonClasses({ variant: 'hero', size: 'xl' })}>
                Start Free Trial <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/request-demo"
                className={buttonClasses({
                  variant: 'heroOutline',
                  size: 'xl',
                  className: 'border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white'
                })}
              >
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
