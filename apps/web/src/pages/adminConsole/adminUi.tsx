import React from 'react';
import { TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { AdminIcon } from './AdminIcon.js';
import type { BranchSummary } from './adminModel.js';

/** Handoff pill(): 10.5px bold capsule in a tone's colours. */
export function Pill({ tone, className = '', children }: { tone: Tone; className?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold ${className}`} style={{ color: TONES[tone][0], backgroundColor: TONES[tone][1] }}>
      {children}
    </span>
  );
}

/** Handoff branchTile(): the store glyph on brand tint, or on amber when the branch needs attention. */
export function BranchTile({ branch, size, radius, icon }: { branch: BranchSummary; size: number; radius: number; icon: number }): React.ReactElement {
  const attention = Boolean(branch.attentionNote);
  return (
    <span
      className="flex flex-none items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: attention ? '#FDF4E6' : '#FDF0E9', color: attention ? '#B77714' : '#C6420E' }}
    >
      <AdminIcon name="store" size={icon} />
    </span>
  );
}

/** Handoff seg(): the grey segmented control's buttons. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (value: T) => void; label?: (option: T) => string }): React.ReactElement {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-[11px] bg-[#F6F3F0] p-[3px]">
      {options.map((option) => {
        const on = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option)}
            className={`cursor-pointer rounded-[9px] border-0 px-[11px] py-1.5 text-[11.5px] font-bold [line-height:normal] ${on ? 'bg-white text-[#38312B] shadow-[0_1px_3px_rgba(56,49,43,.15)]' : 'bg-transparent text-[#A79C93]'}`}
          >
            {label ? label(option) : option}
          </button>
        );
      })}
    </div>
  );
}

export const card = 'rounded-[16px] border border-solid border-[#EBE7E3] bg-white';

/** Handoff isLoading: four pulsing stat cards and a list card. */
export function AdminLoading(): React.ReactElement {
  const pulse = 'animate-shiftos-pulse';
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className={`${card} p-[18px]`}>
            <div className={`size-[34px] rounded-[11px] bg-[#F2EEEA] ${pulse}`} />
            <div className={`mt-3.5 h-[26px] w-[60%] rounded-[7px] bg-[#F2EEEA] ${pulse}`} />
            <div className={`mt-[9px] h-[11px] w-[80%] rounded-[6px] bg-[#F5F2EF] ${pulse}`} />
          </div>
        ))}
      </div>
      <div className={`${card} mt-[18px] p-5`}>
        <div className={`h-3.5 w-40 rounded-[6px] bg-[#F2EEEA] ${pulse}`} />
        <div className="mt-[18px] flex flex-col gap-3.5">
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex items-center gap-3.5">
              <div className={`size-[34px] rounded-[12px] bg-[#F5F2EF] ${pulse}`} />
              <div className={`h-[11px] flex-auto rounded-[6px] bg-[#F5F2EF] ${pulse}`} />
              <div className={`h-[11px] w-16 rounded-[6px] bg-[#F5F2EF] ${pulse}`} />
            </div>
          ))}
        </div>
      </div>
      <p className="mb-0 mt-3.5 text-[12px] text-[#A79C93]" aria-live="polite">
        Loading your organization…
      </p>
    </>
  );
}
