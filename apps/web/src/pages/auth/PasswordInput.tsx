import React, { useState } from 'react';
import { AuthInput, type AuthInputProps } from './AuthInputs.js';

/**
 * Password field with the design's "Show"/"Hide" text toggle (34px hit area
 * inside the input's right edge) — ShiftOS Auth.dc.html's togglePassword
 * control. Wraps AuthInput so the 46px auth input styling applies.
 */
export function PasswordInput({ className = '', ...rest }: AuthInputProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <AuthInput {...rest} type={visible ? 'text' : 'password'} className={["pr-[46px]", className].join(' ')} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 h-[34px] w-[34px] -translate-y-1/2 cursor-pointer rounded-lg bg-transparent text-[11px] font-bold text-neutral-500 transition-colors hover:text-neutral-700"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
