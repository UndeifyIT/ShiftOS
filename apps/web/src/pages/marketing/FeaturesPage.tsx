import React from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
  PlayCircle,
  Repeat2,
  ShieldCheck,
  Users
} from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow } from '../../marketing/components.js';

/**
 * Recreated from `ShiftOS Marketing.dc.html`'s "isFeatures" branch and its
 * `CAPABILITIES` config — a single vertical list of nine capability cards
 * (icon/title/body/audience + a 4-point checklist), not the previous
 * invented pillars/Shifty-chat layout ported from a different prototype.
 */

const TONE_CLASSES: Record<string, string> = {
  primary: 'bg-brand-soft text-brand-deep',
  info: 'bg-info-50 text-info-600',
  ok: 'bg-success-soft text-success-600',
  warn: 'bg-warning-soft text-warning-600',
  violet: 'bg-[#F3EEFE] text-[#7C3AED]'
};

const CAPABILITIES = [
  {
    title: 'Workforce management',
    who: 'Manager · Supervisor',
    icon: Users,
    tone: 'primary',
    body: 'One record per person, scoped to the branch and department they actually work in.',
    points: ['Employee profiles with optional photo', 'Branch and department assignment', 'Employment type and status', 'Spreadsheet import with row validation']
  },
  {
    title: 'Scheduling',
    who: 'Manager publishes · Supervisor builds',
    icon: CalendarDays,
    tone: 'info',
    body: "Build a week from shift templates, assign people, publish when it's ready.",
    points: ['Week and day views', 'Reusable shift templates', 'Draft → published states', 'Versioned schedule history']
  },
  {
    title: 'Shift management',
    who: 'Supervisor',
    icon: PlayCircle,
    tone: 'ok',
    body: 'The live shift: who started it, what happened, and how it was handed over.',
    points: ['Start and end a shift', 'Live progress through the shift', 'Assignment-level status', 'Handover at close']
  },
  {
    title: 'Attendance',
    who: 'Supervisor marks · Manager reviews',
    icon: Clock,
    tone: 'warn',
    body: 'Present, late and absent against the published schedule — corrected on the record, not in secret.',
    points: ['Mark and adjust attendance', 'Late thresholds and grace periods', 'Correction requests with audit trail', 'Per-employee attendance history']
  },
  {
    title: 'Tasks',
    who: 'All roles',
    icon: CheckCircle2,
    tone: 'violet',
    body: 'The recurring operational checks that keep a location running.',
    points: ['Create, assign and prioritize', 'Due times inside a shift', 'Status and completion history', 'Staff see only their own tasks']
  },
  {
    title: 'Announcements',
    who: 'Manager · Supervisor post',
    icon: MessageCircle,
    tone: 'primary',
    body: 'Operational communication that replaces the branch WhatsApp group.',
    points: ['Organization or branch audience', 'Acknowledgement tracking', 'Pinned notices', 'Read state per recipient']
  },
  {
    title: 'Branch management',
    who: 'Manager',
    icon: Building2,
    tone: 'info',
    body: 'Every branch keeps its own team, schedule and attendance, so reporting stays clean.',
    points: ['Multiple branches per organization', 'Branch-level supervisors', 'Branch-scoped data isolation', 'Per-branch operating details']
  },
  {
    title: 'Role-based operations',
    who: 'Manager · Supervisor · Staff',
    icon: ShieldCheck,
    tone: 'ok',
    body: 'Permissions come from roles, never job titles — least privilege by default.',
    points: ['Manager, Supervisor and Staff roles', 'Per-permission grants', 'Branch access control', 'Invitations with scoped access']
  },
  {
    title: 'Leave & requests',
    who: 'Staff request · Supervisor approves',
    icon: Repeat2,
    tone: 'warn',
    body: 'Time-off requests flow to the person responsible for coverage.',
    points: ['Staff submit requests', 'Approval and decline states', 'Visible against the schedule', 'Request history']
  }
];

export default function FeaturesPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-13 sm:px-6">
        <Eyebrow>Features</Eyebrow>
        <h1 className="mt-3.5 max-w-[720px] font-display text-[2.75rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-neutral-900">
          Everything a shift-based business actually runs on.
        </h1>
        <p className="mt-4 max-w-[620px] text-base text-neutral-500">
          Nine capabilities, one operating model: Organization &rarr; Branch &rarr; Department &rarr; Manager, Supervisor and Staff.
        </p>

        <div className="mt-9 flex flex-col gap-3.5">
          {CAPABILITIES.map((c) => (
            <article key={c.title} className="flex flex-wrap gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="flex min-w-[240px] flex-1 basis-[260px] gap-3.5">
                <span className={`flex size-[42px] shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[c.tone]}`}>
                  <c.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-[-0.02em] text-neutral-900">{c.title}</h2>
                  <p className="mt-1.5 text-[13.5px] text-neutral-500">{c.body}</p>
                  <p className="mt-2 text-[11.5px] font-bold text-neutral-400">{c.who}</p>
                </div>
              </div>
              <ul className="grid min-w-[260px] flex-1 basis-[300px] grid-cols-1 gap-x-4.5 gap-y-2 sm:grid-cols-2">
                {c.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[13px] text-neutral-600">
                    <span className="font-extrabold text-success-600">&#10003;</span>
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}
