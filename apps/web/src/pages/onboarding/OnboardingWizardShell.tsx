import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Check, Folder, MessageSquare, Store, Users } from 'lucide-react';
import { Shifty } from '../../components/shifty/Shifty.js';
import { ShiftyMascot } from '../../components/shifty/mascot.js';
import { Logo } from '../../marketing/Logo.js';
import { useSession } from '../../auth/SessionProvider.js';
import illusBuilding from '../../assets/illus-building.png';
import illusStore from '../../assets/illus-store.png';
import illusTeam from '../../assets/illus-team.png';

/**
 * The 5-step onboarding flow (`Local file check/design_handoff_shiftos/ShiftOS
 * Onboarding.dc.html`). Two separate App.tsx route branches — `no-organization`
 * (Organization step) and `OnboardingGate` (Branch → Supervisor → Department →
 * Finish) — each mount this same shell so the experience reads as one
 * continuous wizard even though it's two mounts under the hood (spec decision 1).
 *
 * Chrome ported 1:1 from the design: left step sidebar (logo, "Setup progress",
 * step list with ✓/number badges, help card, "Step N of 5" progress bar), the
 * horizontal icon stepper + "? Need help" / user pills on the main pane, the
 * form card, and the right column with the dismissible Shifty guidance panel
 * (pose avatar, tips, animated "Pointing at" footer) over the per-step
 * illustration on its brand-soft circle. Sidebar and right panel hide below the
 * design's own 760px breakpoint.
 */
export type OnboardingStepId = 'Organization' | 'Branch' | 'Supervisor' | 'Department' | 'Finish';

export const ONBOARDING_STEPS: { id: OnboardingStepId; label: string; icon: React.ElementType }[] = [
  { id: 'Organization', label: 'Organization', icon: Building2 },
  { id: 'Branch', label: 'Branch', icon: Store },
  { id: 'Supervisor', label: 'Supervisor', icon: Users },
  { id: 'Department', label: 'Department', icon: Folder },
  { id: 'Finish', label: 'Finish', icon: Check }
];

/** Sidebar copy per step — mirrors the design's `CFG[step].sidebarTitle/sidebarBody`. */
const SIDEBAR_COPY: Record<OnboardingStepId, { title: string; body: string }> = {
  Organization: {
    title: 'Set up your organization',
    body: 'Your organization is the top level of ShiftOS — it holds your departments and people.'
  },
  Branch: {
    title: 'Set up your first branch',
    body: 'Configure your location — the address, hours and time zone your team works to.'
  },
  Supervisor: {
    title: 'Set up your supervisors',
    body: 'Add the supervisors who will manage operations, attendance, schedules and tasks in your branch.'
  },
  Department: {
    title: 'Set up your departments',
    body: 'Departments help you organize employees, schedules, attendance, tasks and reports.'
  },
  Finish: {
    title: "You're all set",
    body: 'Your ShiftOS workspace is ready. Create your first shift and invite the rest of your team.'
  }
};

/**
 * Shifty guidance per step — mirrors the design's `SCRIPT` array (pose,
 * message, pointer target, tips). `pointer` names the field the panel's
 * "Pointing at" footer nudges toward.
 */
const STEP_GUIDANCE: Record<
  OnboardingStepId,
  { variant: 'wave' | 'guide' | 'success'; message: string; pointer: string | null; tips: { label: string; hint: string }[] }
> = {
  Organization: {
    variant: 'wave',
    message: "Hi, I'm Shifty. Let's set up your organization first — this only takes a minute.",
    pointer: 'Organization Name',
    tips: [
      { label: 'Organization name', hint: 'the business this location belongs to.' },
      { label: 'Business type', hint: 'helps me suggest sensible departments later.' },
      { label: 'Workspace name', hint: 'what your team will see when they sign in.' }
    ]
  },
  Branch: {
    variant: 'guide',
    message: "Great! Now let's add your first branch — this is where your team will work.",
    pointer: 'Branch Name',
    tips: [
      { label: 'Branch name', hint: 'how your team refers to this location.' },
      { label: 'Location', hint: 'country, state and city for reporting.' },
      { label: 'Time zone', hint: 'keeps clock-ins and schedules accurate.' }
    ]
  },
  Supervisor: {
    variant: 'guide',
    message: 'Nice — this person will help run your branch. Add the supervisor who owns daily operations.',
    pointer: 'Full Name',
    tips: [
      { label: 'Supervisor details', hint: 'name, email and phone for shift handovers.' },
      { label: 'Role', hint: 'decides what they see when they sign in.' },
      { label: 'Permissions', hint: 'turn on only what they need to run a shift.' }
    ]
  },
  Department: {
    variant: 'guide',
    message: 'Almost there! Departments group your team so schedules and tasks land in the right place.',
    pointer: 'Department Name',
    tips: [
      { label: 'Departments', hint: 'e.g. Sales Floor, Warehouse, Bakery.' },
      { label: 'Assign supervisors', hint: 'each department needs someone accountable.' }
    ]
  },
  Finish: {
    variant: 'success',
    message: "You're ready! Your workspace is set up — let's create your first shift.",
    pointer: null,
    tips: [
      { label: 'Create your first schedule', hint: 'plan the week ahead.' },
      { label: 'Add your employees', hint: 'build your workforce directory.' }
    ]
  }
};

/** Per-step illustration, mirroring CFG[step].illustration. */
const STEP_ILLUSTRATION: Record<OnboardingStepId, { src: string; alt: string }> = {
  Organization: { src: illusBuilding, alt: '' },
  Branch: { src: illusStore, alt: '' },
  Supervisor: { src: illusTeam, alt: '' },
  Department: { src: illusStore, alt: '' },
  Finish: { src: illusTeam, alt: '' }
};

export interface OnboardingWizardShellProps {
  currentStep: OnboardingStepId;
  children: React.ReactNode;
}

export function OnboardingWizardShell({ currentStep, children }: OnboardingWizardShellProps): React.ReactElement {
  const { profile } = useSession();
  const [shiftyHidden, setShiftyHidden] = useState(false);

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);
  const sidebarCopy = SIDEBAR_COPY[currentStep];
  const guidance = STEP_GUIDANCE[currentStep];
  const illustration = STEP_ILLUSTRATION[currentStep];
  const total = ONBOARDING_STEPS.length;

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : '';
  const initials =
    profile
      ? `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase() || 'ME'
      : 'ME';

  const stepRowTone = (index: number): { badge: string; label: string; status: string; row: string } => {
    const current = index === stepIndex;
    const done = index < stepIndex;
    return {
      row: current ? 'bg-brand-soft' : '',
      badge: done
        ? 'bg-success-500 text-white'
        : current
          ? 'bg-brand-500 text-white'
          : 'border border-neutral-200 bg-transparent text-neutral-400',
      label: current ? 'text-brand-deep' : 'text-neutral-900',
      status: current ? 'text-brand-deep' : 'text-neutral-400'
    };
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-white text-neutral-900">
      {/* Step sidebar — design's so-ob-sidebar */}
      <aside className="hidden min-w-[240px] flex-col border-r border-neutral-200 bg-white px-[22px] pb-7 pt-6 min-[760px]:flex min-[760px]:flex-[0_1_268px]">
        <Logo size="sm" />

        <p className="mt-[26px] text-xs font-extrabold text-brand-deep">Setup progress</p>
        <h1 className="mt-2 font-display text-[26px] font-extrabold leading-[1.14] tracking-[-0.028em]">{sidebarCopy.title}</h1>
        <p className="mt-[11px] text-[13px] leading-relaxed text-neutral-500">{sidebarCopy.body}</p>

        <ol className="mt-[22px] flex list-none flex-col gap-[3px] border-t border-neutral-200 p-0 pt-5">
          {ONBOARDING_STEPS.map((s, index) => {
            const tone = stepRowTone(index);
            const status = index < stepIndex ? 'Completed' : index === stepIndex ? 'In progress' : 'Pending';
            return (
              <li key={s.id}>
                <div className={`flex items-center gap-[11px] rounded-xl px-2.5 py-2 ${tone.row}`}>
                  <span
                    className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${tone.badge}`}
                  >
                    {index < stepIndex ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className={`block text-[13px] font-extrabold ${tone.label}`}>{s.label}</span>
                    <span className={`block text-[11px] ${tone.status}`}>{status}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-[22px] rounded-2xl border border-[#F7DFD1] bg-[#FEF7F2] p-4 text-center">
          <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-brand-deep">
            ?
          </span>
          <p className="mt-2.5 text-[13px] font-extrabold">Need help with setup?</p>
          <p className="mt-1.5 text-[11.5px] text-neutral-500">Our support team is here to help you get started.</p>
          <a
            href="mailto:hello@shiftos.app"
            className="mt-[9px] inline-block text-[11.5px] font-extrabold text-brand-deep transition-colors hover:text-brand-500"
          >
            Contact support &rarr;
          </a>
        </div>

        <div className="mt-auto pt-6">
          <p className="text-[11.5px] font-extrabold text-neutral-500">
            Step {stepIndex + 1} of {total}
          </p>
          <div
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label="Onboarding progress"
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFEAE6]"
          >
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
          </div>
        </div>
      </aside>

      {/* Main pane — design's so-ob-main */}
      <div className="min-w-[320px] flex-1 bg-[#FDFCFB] px-3.5 pb-6 pt-4 min-[760px]:flex-[1_1_460px] min-[760px]:px-6 min-[760px]:pb-[30px] min-[760px]:pt-[22px]">
        <div className="mx-auto max-w-[1080px]">
          {/* Top row: horizontal icon stepper + help/user pills */}
          <div className="flex flex-wrap items-start gap-4">
            <ol aria-label="Setup progress" className="hidden min-w-[280px] list-none flex-1 basis-[420px] flex-row gap-1.5 p-0 min-[760px]:flex">
              {ONBOARDING_STEPS.map((s, index) => {
                const current = index === stepIndex;
                const done = index < stepIndex;
                return (
                  <li key={s.id} className="flex min-w-0 flex-1 items-start gap-1.5">
                    <div className="flex min-w-[64px] shrink-0 flex-col items-center gap-1.5">
                      <span
                        className={`flex size-[46px] items-center justify-center rounded-[15px] border ${
                          current
                            ? 'border-brand-500 bg-brand-soft text-brand-deep'
                            : done
                              ? 'border-neutral-200 bg-white text-success-500'
                              : 'border-neutral-200 bg-white text-neutral-400'
                        }`}
                      >
                        {done ? <Check className="size-[19px]" aria-hidden="true" /> : <s.icon className="size-[19px]" aria-hidden="true" />}
                      </span>
                      <span className={`text-[11.5px] font-bold ${current ? 'text-brand-deep' : 'text-neutral-500'}`}>{s.label}</span>
                      <span
                        className={`flex size-[19px] items-center justify-center rounded-full text-[10px] font-extrabold ${
                          current
                            ? 'bg-brand-500 text-white'
                            : done
                              ? 'bg-success-soft text-success-500'
                              : 'text-neutral-400'
                        }`}
                      >
                        {done ? '✓' : index + 1}
                      </span>
                    </div>
                    {index < ONBOARDING_STEPS.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={`mt-[22px] h-0.5 flex-1 rounded-full ${done ? 'bg-success-500' : 'bg-neutral-200'}`}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {/* Compact dot stepper below 760px */}
            <div className="flex w-full items-center justify-center gap-2 min-[760px]:hidden">
              {ONBOARDING_STEPS.map((s, index) => (
                <React.Fragment key={s.id}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      index < stepIndex
                        ? 'bg-success-500 text-white'
                        : index === stepIndex
                          ? 'bg-brand-500 text-white'
                          : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {index < stepIndex ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  {index < ONBOARDING_STEPS.length - 1 ? (
                    <span className={`h-0.5 w-6 ${index < stepIndex ? 'bg-success-500' : 'bg-neutral-200'}`} />
                  ) : null}
                </React.Fragment>
              ))}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2.5">
              <Link
                to="/"
                className="inline-flex items-center gap-[7px] rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-500 transition-colors hover:border-brand-300"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Back to home
              </Link>
              <a
                href="mailto:hello@shiftos.app"
                className="inline-flex items-center gap-[7px] rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-500 transition-colors hover:border-brand-300"
              >
                ? Need help
              </a>
              <div className="flex items-center gap-[9px] rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white">
                  {initials}
                </span>
                <span className="leading-tight">
                  <span className="block text-xs font-extrabold">{fullName || 'Your account'}</span>
                  <span className="block text-[10px] text-neutral-400">Manager</span>
                </span>
              </div>
            </div>
          </div>

          {/* Form card + Shifty side panel */}
          <div className="mt-[22px] flex flex-wrap items-start gap-[18px]">
            <section className="min-w-[300px] flex-1 basis-[520px] rounded-[18px] border border-neutral-200 bg-white p-[22px]">
              {children}
            </section>

            <div className="hidden min-w-[250px] flex-1 basis-[280px] flex-col gap-4 min-[760px]:flex">
              {!shiftyHidden ? (
                <section
                  className={`rounded-[18px] border p-[18px] ${
                    guidance.variant === 'success' ? 'border-[#BFE6CF] bg-[#F3FBF6]' : 'border-[#F7DFD1] bg-[#FEF7F2]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-[52px] shrink-0 items-end justify-center overflow-hidden rounded-full bg-white shadow-[0_6px_16px_-10px_rgba(56,49,43,0.5)]">
                      <ShiftyMascot variant={guidance.variant} className="h-[104%] w-full" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-[7px] text-[12.5px] font-extrabold">
                        Shifty <span className="text-[10px] font-bold text-neutral-400">setup guide</span>
                      </p>
                      <p className="mt-1.5 text-[13px] leading-normal text-neutral-600">{guidance.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShiftyHidden(true)}
                      aria-label="Dismiss Shifty"
                      className="shrink-0 cursor-pointer p-0.5 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
                    >
                      &#10005;
                    </button>
                  </div>
                  <ul className="mt-3.5 flex list-none flex-col gap-[9px] p-0">
                    {guidance.tips.map((tip) => (
                      <li key={tip.label} className="flex gap-[9px] text-xs leading-normal text-neutral-600">
                        <span className="shrink-0 font-extrabold text-brand-500">&rarr;</span>
                        <span>
                          <strong className="font-extrabold">{tip.label}</strong> &mdash; {tip.hint}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {guidance.pointer ? (
                    <p className="mt-3.5 flex items-center gap-2 border-t border-[#F7E3D6] pt-3 text-[11.5px] font-bold text-brand-deep">
                      <span aria-hidden="true" className="animate-shifty-nudge">
                        &#9664;
                      </span>{' '}
                      Pointing at: {guidance.pointer}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <div className="relative flex justify-center">
                <span aria-hidden="true" className="absolute inset-x-5 top-2.5 aspect-square rounded-full bg-brand-soft" />
                <img
                  src={illustration.src}
                  alt={illustration.alt}
                  loading="lazy"
                  className="relative block h-auto max-w-[240px] w-full object-contain"
                />
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-neutral-400">Your information is encrypted and secure.</p>
        </div>
      </div>

      <Shifty
        step={{ title: sidebarCopy.title, message: guidance.message }}
        suggestedPrompts={['What is a branch?', 'How do invitations work?']}
      />
    </div>
  );
}
