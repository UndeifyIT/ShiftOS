import React from 'react';
import { Eye, Target } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import illusAboutHero from '../../assets/illus-about-hero.png';

/**
 * Recreated from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s "isAbout" branch — hero + fact chips, mission/vision
 * cards, the "Our story" section with beliefs list, and FOUNDERS verbatim.
 */

const MISSION_CARDS = [
  {
    title: 'Our mission',
    body: 'To help shift-based businesses run smoother operations without spreadsheets, paper schedules or fragmented communication.',
    icon: Target,
    tile: 'bg-brand-soft text-brand-800'
  },
  {
    title: 'Our vision',
    body: 'To become the operating system for workforce management across emerging markets.',
    icon: Eye,
    tile: 'bg-info-50 text-info-600'
  }
];

const BELIEFS = [
  'Schedules that make sense',
  "Communication that's clear",
  'Operations that run smoothly',
  'Teams that stay informed'
];

const FOUNDERS = [
  {
    name: 'Lai-oke Toluwani',
    role: 'Founder',
    body: 'Focused on building practical technology that solves operational challenges for retail businesses in emerging markets.'
  },
  {
    name: 'Taiwo Isaac',
    role: 'Co-Founder & CEO',
    body: 'Focused on helping retail teams simplify scheduling, communication and workforce management through intuitive software.'
  }
];

export default function AboutPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-[52px] sm:px-6">
        {/* Hero */}
        <div className="flex flex-wrap items-center gap-9">
          <div className="min-w-[280px] flex-1 basis-[400px]">
            <span className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">About us</span>
            <h1 className="mt-3.5 font-display text-[2.625rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-neutral-900">
              Built for retail teams. Rooted in <span className="text-brand-500">real problems</span>.
            </h1>
            <p className="mt-4 max-w-[520px] text-base leading-relaxed text-neutral-600">
              ShiftOS was created to help retail businesses in emerging markets simplify scheduling, communication and
              workforce management &mdash; without complex systems or constant phone use during work.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-neutral-200 px-4 py-3">
                <p className="text-sm font-extrabold text-neutral-900">Built in Nigeria</p>
                <p className="mt-0.5 text-sm text-neutral-600">For emerging markets</p>
              </div>
              <div className="rounded-2xl border border-neutral-200 px-4 py-3">
                <p className="text-sm font-extrabold text-neutral-900">Shaped by operators</p>
                <p className="mt-0.5 text-sm text-neutral-600">Retail managers and supervisors</p>
              </div>
            </div>
          </div>
          <div className="flex min-w-[260px] flex-1 basis-[320px] justify-center">
            <img
              src={illusAboutHero}
              alt="ShiftOS brand illustration"
              width={1024}
              height={1024}
              loading="lazy"
              className="w-full max-w-[420px]"
            />
          </div>
        </div>

        {/* Mission / vision */}
        <div className="mt-9 grid gap-3.5 sm:grid-cols-2">
          {MISSION_CARDS.map((m) => (
            <article key={m.title} className="rounded-lg border border-neutral-200 bg-white p-5.5">
              <span className={`flex size-[42px] items-center justify-center rounded-xl ${m.tile}`}>
                <m.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3.5 text-lg font-extrabold text-neutral-900">{m.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-neutral-600">{m.body}</p>
            </article>
          ))}
        </div>

        {/* Story + beliefs */}
        <section className="mt-9 flex flex-wrap gap-6">
          <div className="min-w-[280px] flex-1 basis-[400px]">
            <span className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">Our story</span>
            <h2 className="mt-3 text-[28px] font-extrabold tracking-[-0.03em] text-neutral-900">
              We build what retail teams actually need.
            </h2>
            <p className="mt-3.5 text-base leading-relaxed text-neutral-600">
              We spoke with supermarket managers and supervisors and heard one problem repeatedly: schedules in Excel,
              shift changes over WhatsApp, tasks on paper, and staff who rarely use phones during work.
            </p>
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              Existing software was either too complex, too expensive, or built for environments that don't reflect how
              retail teams operate.
            </p>
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              So we built ShiftOS &mdash; a practical platform that lets managers and supervisors run daily operations
              while keeping staff informed before and after shifts. No clutter. No complexity.
            </p>
          </div>
          <ul className="flex min-w-[260px] flex-1 basis-[300px] flex-col gap-3.5 rounded-lg border border-[#F7DFD1] bg-[#FDF7F3] p-5.5">
            {BELIEFS.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2.5 border-b border-[#F7E3D6] pb-3 text-base font-bold text-neutral-900 last:border-b-0 last:pb-0"
              >
                <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-extrabold text-white">
                  &#10003;
                </span>
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* Founders */}
        <section className="mt-9">
          <span className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">
            Meet the founding team
          </span>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
            {FOUNDERS.map((f) => (
              <article key={f.name} className="rounded-2xl border border-l-[3px] border-neutral-200 border-l-brand-500 bg-white px-5.5 py-5">
                <h3 className="text-[19px] font-extrabold text-neutral-900">{f.name}</h3>
                <p className="mt-1 text-sm font-bold text-brand-deep">{f.role}</p>
                <p className="mt-2.5 text-base leading-relaxed text-neutral-600">{f.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
