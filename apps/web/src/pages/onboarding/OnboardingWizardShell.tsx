import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '@shiftos/ui';
import { Shifty } from '../../components/shifty/Shifty.js';
import { ShiftyPanel, type ShiftyVariant } from '../../components/shifty/mascot.js';
import { LogoMark } from '../../marketing/Logo.js';

/**
 * The 5-step onboarding flow (`Local file check/design_handoff_shiftos/ShiftOS
 * Onboarding.dc.html`, STEPS around line 344). Two separate App.tsx route
 * branches — `no-organization` (Organization step) and `OnboardingGate`
 * (Branch → Supervisor → Department → Finish) — each mount this same shell so
 * the experience reads as one continuous wizard even though it's two mounts
 * under the hood (spec decision 1).
 */
export type OnboardingStepId = 'Organization' | 'Branch' | 'Supervisor' | 'Department' | 'Finish';

export const ONBOARDING_STEPS: { id: OnboardingStepId; label: string }[] = [
  { id: 'Organization', label: 'Organization' },
  { id: 'Branch', label: 'Branch' },
  { id: 'Supervisor', label: 'Supervisor' },
  { id: 'Department', label: 'Department' },
  { id: 'Finish', label: 'Finish' }
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
 * Shifty guidance per step — mirrors the design's `SCRIPT` array (lines
 * 353-387 of the design file) exactly, including the new Organization-step
 * entry. `pointing`: true when Shifty should visually point at the form
 * immediately below the panel (a directional cue, not a new mascot pose).
 */
const STEP_GUIDANCE: Record<OnboardingStepId, { variant: ShiftyVariant; message: string; pointing?: boolean; tips: { label: string; hint: string }[] }> = {
  Organization: {
    variant: 'wave',
    message: "Hi, I'm Shifty. Let's set up your organization first — this only takes a minute.",
    pointing: true,
    tips: [
      { label: 'Organization name', hint: 'the business this location belongs to.' },
      { label: 'Business type', hint: 'helps me suggest sensible departments later.' },
      { label: 'Workspace name', hint: 'what your team will see when they sign in.' }
    ]
  },
  Branch: {
    variant: 'guide',
    message: "Great! Now let's add your first branch — this is where your team will work.",
    pointing: true,
    tips: [
      { label: 'Branch name', hint: 'how your team refers to this location.' },
      { label: 'Location', hint: 'country, state and city for reporting.' },
      { label: 'Time zone', hint: 'keeps clock-ins and schedules accurate.' }
    ]
  },
  Supervisor: {
    variant: 'guide',
    message: 'Nice — this person will help run your branch. Add the supervisor who owns daily operations.',
    pointing: true,
    tips: [
      { label: 'Supervisor details', hint: 'name, email and phone for shift handovers.' },
      { label: 'Role', hint: 'decides what they see when they sign in.' },
      { label: 'Permissions', hint: 'turn on only what they need to run a shift.' }
    ]
  },
  Department: {
    variant: 'guide',
    message: 'Almost there! Departments group your team so schedules and tasks land in the right place.',
    pointing: true,
    tips: [
      { label: 'Departments', hint: 'e.g. Sales Floor, Warehouse, Bakery.' },
      { label: 'Assign supervisors', hint: 'each department needs someone accountable.' }
    ]
  },
  Finish: {
    variant: 'success',
    message: "You're ready! Your workspace is set up — let's create your first shift.",
    pointing: false,
    tips: [
      { label: 'Create your first schedule', hint: 'plan the week ahead.' },
      { label: 'Add your employees', hint: 'build your workforce directory.' }
    ]
  }
};

export interface OnboardingWizardShellProps {
  currentStep: OnboardingStepId;
  children: React.ReactNode;
}

/**
 * Shared outer chrome for the onboarding wizard: logo + step sidebar on
 * desktop, a compact step-dot row on narrow screens, the Shifty guidance
 * panel, the card that hosts the active step's form, and the floating Shifty
 * chat widget. Matches the design's sidebar/stepper structure (structure and
 * spacing rhythm, not literal CSS) using existing `@shiftos/ui` primitives.
 */
export function OnboardingWizardShell({ currentStep, children }: OnboardingWizardShellProps): React.ReactElement {
  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);
  const sidebarCopy = SIDEBAR_COPY[currentStep];
  const guidance = STEP_GUIDANCE[currentStep];
  const total = ONBOARDING_STEPS.length;

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <aside className="hidden shrink-0 flex-col border-r border-neutral-200 bg-white px-6 py-7 lg:flex lg:w-72">
        <div className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight text-neutral-900">ShiftOS</span>
        </div>

        <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-700">Setup progress</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-neutral-900">{sidebarCopy.title}</h1>
        <p className="mt-2.5 text-[13px] text-neutral-500">{sidebarCopy.body}</p>

        <ol className="mt-5 flex flex-col gap-1 border-t border-neutral-200 pt-5">
          {ONBOARDING_STEPS.map((s, index) => {
            const status = index < stepIndex ? 'Completed' : index === stepIndex ? 'In progress' : 'Pending';
            const current = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={s.id}>
                <div className={['flex items-center gap-3 rounded-xl px-2.5 py-2', current ? 'bg-brand-50' : ''].join(' ')}>
                  <span
                    className={[
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      done ? 'bg-success-500 text-white' : current ? 'bg-brand-700 text-white' : 'bg-neutral-200 text-neutral-500'
                    ].join(' ')}
                  >
                    {done ? <Check size={14} /> : index + 1}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className={['block text-sm font-semibold', current ? 'text-neutral-900' : 'text-neutral-600'].join(' ')}>{s.label}</span>
                    <span className="block text-[11px] text-neutral-500">{status}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-center">
          <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-brand-700">?</span>
          <p className="mt-2.5 text-[13px] font-extrabold text-neutral-900">Need help with setup?</p>
          <p className="mt-1.5 text-[11.5px] text-neutral-500">Our support team is here to help you get started.</p>
          <a href="#" className="mt-2 inline-block text-[11.5px] font-extrabold text-brand-700">
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
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"
          >
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
          </div>
        </div>
      </aside>

      <div className="flex-1 px-4 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            {ONBOARDING_STEPS.map((s, index) => (
              <React.Fragment key={s.id}>
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                    index < stepIndex ? 'bg-success-500 text-white' : index === stepIndex ? 'bg-brand-700 text-white' : 'bg-neutral-200 text-neutral-500'
                  ].join(' ')}
                >
                  {index < stepIndex ? <Check size={14} /> : index + 1}
                </div>
                {index < ONBOARDING_STEPS.length - 1 ? (
                  <div className={['h-0.5 w-6', index < stepIndex ? 'bg-success-500' : 'bg-neutral-200'].join(' ')} />
                ) : null}
              </React.Fragment>
            ))}
          </div>

          <Card className="p-8">
            <ShiftyPanel variant={guidance.variant} message={guidance.message} tips={guidance.tips} pointing={guidance.pointing} className="mb-6" />
            {children}
          </Card>
        </div>
      </div>

      <Shifty
        step={{ title: sidebarCopy.title, message: guidance.message }}
        suggestedPrompts={['What is a branch?', 'How do invitations work?']}
      />
    </div>
  );
}
