import React, { useState } from 'react';
import { ScheduleIcon, type ScheduleIconName } from '../../scheduling/grid/ScheduleIcon.js';
import { TONES, type Tone } from '../../scheduling/grid/scheduleFormat.js';
import { OPTIONAL_COLUMNS, REQUIRED_COLUMNS } from './importModel.js';

/*
 * Building blocks of the handoff's Import Employees wizard
 * (`ShiftOS Dashboards.dc.html` lines 1902-2293), at the prototype's
 * rendered sizes (no CSS reset: 13px base, `line-height: normal`).
 */

export const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';
export const outlineButton =
  'h-11 cursor-pointer rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[18px] text-[13px] font-bold text-black hover:border-[#DDD6D0] disabled:cursor-default disabled:opacity-60';
export const primaryButton =
  'h-[46px] cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-[22px] text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,.75)] disabled:cursor-default disabled:opacity-70';
export const softOrangeButton =
  'inline-flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-solid border-[#F0C7AF] bg-white px-4 text-[12.5px] font-bold text-[#C6420E] hover:bg-[#FDF0E9]';

export function IconTile({ icon, tone, size, radius, iconSize }: { icon: ScheduleIconName; tone: Tone; size: number; radius: number; iconSize: number }): React.ReactElement {
  return (
    <span className="flex flex-none items-center justify-center" style={{ width: size, height: size, borderRadius: radius, color: TONES[tone][0], backgroundColor: TONES[tone][1] }}>
      <ScheduleIcon name={icon} size={iconSize} />
    </span>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: TONES[tone][0], backgroundColor: TONES[tone][1] }}>
      {children}
    </span>
  );
}

const STEPS = [
  { label: 'Upload File', sub: 'Upload your file' },
  { label: 'Validate Data', sub: 'Review and fix errors' },
  { label: 'Import', sub: 'Confirm and import' }
];

/** Handoff importStepper: green ✓ once a step is behind you, orange for the current one; step 4 is "done". */
export function Stepper({ step, doneSubs, framed = true }: { step: number; doneSubs: [string, string, string]; framed?: boolean }): React.ReactElement {
  const list = (
    <ol className={`m-0 flex list-none flex-wrap items-center gap-2.5 p-0 ${framed ? '' : 'mb-1.5'}`}>
      {STEPS.map((s, index) => {
        const n = index + 1;
        const done = step > n || (step === 4 && n === 3);
        const active = step === n;
        return (
          <li key={s.label} className="flex min-w-0 flex-[1_1_180px] items-center gap-2.5">
            <span
              className="flex size-[26px] flex-none items-center justify-center rounded-full text-[11.5px] font-extrabold"
              style={done ? { background: '#2E9E62', color: '#fff' } : active ? { background: '#F04E17', color: '#fff' } : { background: '#F2EEEA', color: '#A79C93' }}
            >
              {done ? '✓' : n}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-extrabold" style={{ color: done || active ? '#38312B' : '#A79C93' }}>
                {s.label}
              </span>
              <span className="block truncate text-[11px] text-[#A79C93]">{done ? doneSubs[index] : s.sub}</span>
            </span>
            {n < STEPS.length ? <span aria-hidden="true" className="h-[1.5px] min-w-5 flex-auto" style={{ background: step > n ? '#2E9E62' : '#EBE7E3' }} /> : null}
          </li>
        );
      })}
    </ol>
  );
  return framed ? <section className={`${card} px-5 py-[18px]`}>{list}</section> : list;
}

const HOW_IT_WORKS: Array<{ title: string; body: string; icon: ScheduleIconName; tone: Tone }> = [
  { title: 'Upload your file', body: 'Upload your Excel or CSV file with employee details.', icon: 'upload', tone: 'info' },
  { title: 'Validate your data', body: "We'll check for errors and missing information.", icon: 'shield', tone: 'violet' },
  { title: 'Review and confirm', body: 'Fix any issues and confirm the data to import.', icon: 'edit', tone: 'primary' },
  { title: 'Import complete', body: 'Your employees will be added to the system and invited.', icon: 'checkCircle', tone: 'ok' }
];

export function HowItWorksCard(): React.ReactElement {
  return (
    <section className={`${card} p-4`}>
      <h2 className="mb-3.5 mt-0 text-[14px] font-extrabold tracking-normal">How it works</h2>
      <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
        {HOW_IT_WORKS.map((w) => (
          <li key={w.title} className="flex gap-[11px]">
            <IconTile icon={w.icon} tone={w.tone} size={30} radius={10} iconSize={15} />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-extrabold">{w.title}</span>
              <span className="mt-[3px] block text-[11px] leading-[1.5] text-[#857A72]">{w.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OptionalLine(): React.ReactElement {
  return (
    <p className="mb-0 mt-3 text-[11px] text-[#857A72]">
      <strong className="font-extrabold text-[#38312B]">Optional:</strong> {OPTIONAL_COLUMNS.join(', ')}
    </p>
  );
}

export function RequiredColumnsCard(): React.ReactElement {
  return (
    <section className={`${card} p-4`}>
      <h2 className="m-0 text-[14px] font-extrabold tracking-normal">Required Columns</h2>
      <p className="mb-3 mt-[5px] text-[11.5px] text-[#857A72]">Your file must include these columns.</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {REQUIRED_COLUMNS.map((column) => (
          <li key={column} className="flex items-center gap-[9px] text-[12px] text-[#57504A]">
            <span className="size-1.5 flex-none rounded-full bg-[#F04E17]" />
            {column}
          </li>
        ))}
      </ul>
      <OptionalLine />
    </section>
  );
}

const TIPS = [
  'Fix the errors in the rows listed.',
  'Required fields: Full Name, Email, Phone Number, Department, Role, Date of Joining.',
  'Date format should be MM/DD/YYYY.',
  'Departments and Roles must exist in the system.'
];

export function TipsCard(): React.ReactElement {
  const [showColumns, setShowColumns] = useState(false);
  return (
    <section className={`${card} p-4`}>
      <h2 className="mb-3 mt-0 flex items-center gap-2 text-[14px] font-extrabold tracking-normal">
        <span className="text-[#B77714]">
          <ScheduleIcon name="bulb" size={15} />
        </span>
        Tips
      </h2>
      <ul className="m-0 flex list-none flex-col gap-[9px] py-0 pl-1 pr-0">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-[9px] text-[11.5px] leading-[1.5] text-[#57504A]">
            <span className="text-[#A79C93]">•</span>
            {tip}
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-expanded={showColumns}
        onClick={() => setShowColumns((open) => !open)}
        className="mt-[13px] flex h-[38px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-solid border-[#E4DED9] bg-white text-[12px] font-bold text-[#57504A]"
      >
        <ScheduleIcon name="eye" size={14} /> View Template Columns
      </button>
      {showColumns ? (
        <p className="mb-0 mt-2.5 text-[11px] leading-[1.5] text-[#857A72]">
          {[...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(' · ')}
        </p>
      ) : null}
    </section>
  );
}

const linkButton = 'mt-[9px] cursor-pointer border-0 bg-transparent p-0 text-left text-[11.5px] font-bold text-[#F04E17]';

export function WhatGetsImportedCards({ onLearnSecurity }: { onLearnSecurity: () => void }): React.ReactElement {
  return (
    <>
      <section className={`${card} p-4`}>
        <h2 className="mb-3 mt-0 text-[14px] font-extrabold tracking-normal">What gets imported?</h2>
        <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
          {REQUIRED_COLUMNS.map((column) => (
            <li key={column} className="flex items-center gap-[9px] text-[12px] text-[#57504A]">
              <span className="text-[#2E9E62]">
                <ScheduleIcon name="checkCircle" size={13} />
              </span>
              {column}
            </li>
          ))}
        </ul>
        <OptionalLine />
      </section>
      <section className={`${card} p-4`}>
        <div className="flex gap-[11px]">
          <IconTile icon="shield" tone="ok" size={32} radius={10} iconSize={16} />
          <span className="min-w-0">
            <span className="block text-[13px] font-extrabold">Your data is secure</span>
            <span className="mt-1 block text-[11.5px] leading-[1.5] text-[#857A72]">We use industry-standard encryption to keep your data safe and secure.</span>
            <button type="button" onClick={onLearnSecurity} className={linkButton}>
              Learn more about security →
            </button>
          </span>
        </div>
      </section>
    </>
  );
}

const HELP = [
  'Contact our support team if you need assistance importing your data.',
  "If you're unsure about any column or error, contact our support team.",
  'If you need help getting started, our support team is here for you.'
];

export function HelpCard({ step, onContactSupport }: { step: number; onContactSupport: () => void }): React.ReactElement {
  return (
    <section className={`${card} p-4`}>
      <div className="flex gap-[11px]">
        <span className="flex-none text-[#57504A]">
          <ScheduleIcon name="headset" size={17} />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-extrabold">Need help?</span>
          <span className="mt-1 block text-[11.5px] leading-[1.5] text-[#857A72]">{HELP[Math.min(step, 3) - 1]}</span>
          <button type="button" onClick={onContactSupport} className={linkButton}>
            Contact Support →
          </button>
        </span>
      </div>
    </section>
  );
}

export function ImportSummaryCard({
  fileName,
  meta,
  rows,
  footer
}: {
  fileName: string;
  meta: string;
  rows: Array<[label: string, value: string, color: string]>;
  footer?: React.ReactNode;
}): React.ReactElement {
  return (
    <section className={`${card} p-4`}>
      <div className="flex items-start gap-[11px]">
        <IconTile icon="file" tone="violet" size={34} radius={11} iconSize={16} />
        <span className="min-w-0">
          <span className="block text-[14px] font-extrabold">Import Summary</span>
          <span className="mt-1.5 block break-all text-[11.5px] font-bold">{fileName}</span>
          <span className="mt-0.5 block text-[11px] text-[#A79C93]">{meta}</span>
        </span>
      </div>
      <dl className="m-0 mt-3.5 flex flex-col gap-[9px]">
        {rows.map(([label, value, color]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="text-[11.5px] text-[#857A72]">{label}</dt>
            <dd className="mb-0 ml-auto mr-0 mt-0 text-[12.5px] font-extrabold" style={{ color }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {footer}
    </section>
  );
}

/** Handoff modal shell (lines 2697-2706). */
export function ImportModal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(35,30,26,.46)] p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-[20px] bg-white pb-[22px] text-[13px] text-[#38312B] shadow-[0_40px_90px_-40px_rgba(35,30,26,.6)] [line-height:normal]"
      >
        <div className="flex items-start gap-3 px-[22px] pt-5">
          <div className="min-w-0 flex-auto">
            <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] [text-wrap:pretty]">{title}</h2>
            <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-8 flex-none cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white text-[14px] text-[#857A72]"
          >
            ✕
          </button>
        </div>
        <div className="px-[22px]">{children}</div>
      </div>
    </div>
  );
}
