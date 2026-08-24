import React from 'react';
import { Check, X } from 'lucide-react';
import type { PasswordCheck, PasswordStrength } from '../../lib/password.js';

export function PasswordStrengthMeter({
  checks,
  strength
}: {
  checks: PasswordCheck[];
  strength: PasswordStrength;
}): React.ReactElement {
  return (
    <div className="rounded-xl bg-brand-50 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-700">Password strength</span>
        <span
          className={
            strength.label === 'Strong'
              ? 'font-semibold text-success-600'
              : strength.label === 'Fair'
                ? 'font-semibold text-warning-600'
                : 'font-semibold text-error-600'
          }
        >
          {strength.label}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={['h-full rounded-full transition-all', strength.color].join(' ')} style={{ width: `${strength.ratio * 100}%` }} />
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {checks.map((check) => (
          <li key={check.label} className={['flex items-center gap-1.5 text-xs', check.passed ? 'text-success-600' : 'text-neutral-400'].join(' ')}>
            {check.passed ? <Check size={13} /> : <X size={13} />}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
