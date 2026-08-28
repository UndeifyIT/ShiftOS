import React from 'react';
import type { PasswordCheck } from '../../lib/password.js';

const RULE_COLORS: Record<string, string> = {
  Weak: 'bg-warning-500',
  Fair: 'bg-warning-500',
  Good: 'bg-info-500',
  Strong: 'bg-success-500'
};

const LABEL_COLORS: Record<string, string> = {
  Weak: 'text-warning-600',
  Fair: 'text-warning-600',
  Good: 'text-info-600',
  Strong: 'text-success-600'
};

/**
 * Password strength box, restyled 1:1 from design_handoff_shiftos/ShiftOS
 * Auth.dc.html: bordered #FDFCFB card, four discrete segment bars (filled
 * per rule met — warn up to 2, info at 3, ok at 4) and a 2-column rule list
 * with ✓-circle dots. Rules mirror src/lib/password.ts.
 */
export function PasswordStrengthMeter({
  checks,
  strength
}: {
  checks: PasswordCheck[];
  strength: { label: string };
}): React.ReactElement {
  const passed = checks.filter((c) => c.passed).length;
  const barColor = RULE_COLORS[strength.label] ?? 'bg-success-500';

  return (
    <div className="rounded-[14px] border border-neutral-200 bg-[#FDFCFB] p-3.5">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-xs font-bold text-neutral-500">Password strength</span>
        <span className={`text-xs font-extrabold ${LABEL_COLORS[strength.label] ?? 'text-success-600'}`}>{strength.label}</span>
      </div>
      <div className="mt-[9px] flex gap-[5px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-[5px] flex-1 rounded-full ${i < passed ? barColor : 'bg-[#EFEAE6]'}`} />
        ))}
      </div>
      <ul className="mt-3 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-3.5 gap-y-[7px] p-0">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-[7px] text-xs text-neutral-600">
            <span
              className={
                check.passed
                  ? 'flex size-4 shrink-0 items-center justify-center rounded-full bg-success-500 text-[10px] font-extrabold text-white'
                  : 'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-neutral-200 text-transparent'
              }
            >
              &#10003;
            </span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
