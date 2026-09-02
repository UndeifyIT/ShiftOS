import React from 'react';
import { Spinner } from '@shiftos/ui';

/**
 * Auth-screen form primitives, restyled 1:1 from `Local file check/
 * design_handoff_shiftos/ShiftOS Auth.dc.html` (its inline input/submit/
 * Google/banner styles): 46px rounded-xl inputs, brand-500 submit with the
 * #F5A98A busy state, the outlined Google button with the round "G" tile,
 * 17px accent checkbox, and the validation/network alert banner with the
 * "!" circle. Kept local to auth so the shared @shiftos/ui kit (dashboards,
 * onboarding) is untouched.
 */

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function AuthInput({ invalid = false, className = '', ...rest }: AuthInputProps): React.ReactElement {
  return (
    <input
      {...rest}
      className={[
        'h-[46px] w-full rounded-xl border bg-white px-[13px] text-[13.5px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500',
        invalid ? 'border-error-500 bg-[#FEF7F5]' : 'border-neutral-300',
        rest.disabled ? 'cursor-not-allowed border-neutral-200 bg-[#F7F4F1] text-neutral-500' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

export interface AuthSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function AuthSelect({ invalid = false, className = '', children, ...rest }: AuthSelectProps): React.ReactElement {
  return (
    <select
      {...rest}
      className={[
        'h-[46px] w-full rounded-xl border bg-white px-[13px] text-[13.5px] text-neutral-900 outline-none transition-colors focus:border-brand-500',
        !rest.value ? 'text-neutral-400' : '',
        invalid ? 'border-error-500 bg-[#FEF7F5]' : 'border-neutral-300',
        rest.disabled ? 'cursor-not-allowed border-neutral-200 bg-[#F7F4F1] text-neutral-500' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </select>
  );
}

export function AuthSubmit({
  loading = false,
  loadingLabel,
  children
}: {
  loading?: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="submit"
      disabled={loading}
      className={
        loading
          ? 'h-12 w-full cursor-progress rounded-[13px] bg-[#F5A98A] text-[14.5px] font-bold text-white'
          : 'h-12 w-full cursor-pointer rounded-[13px] bg-brand-500 text-[14.5px] font-bold text-white shadow-[0_14px_30px_-16px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600'
      }
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

export function AuthGoogleButton({
  onClick,
  loading = false
}: {
  onClick: () => void;
  loading?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-[9px] rounded-xl border border-neutral-300 bg-white text-[13.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-400 disabled:opacity-60"
    >
      {loading ? (
        <Spinner size={16} label="Connecting to Google" />
      ) : (
        <>
          <span className="flex size-5 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-extrabold text-neutral-600">
            G
          </span>
          Continue with Google
        </>
      )}
    </button>
  );
}

export function AuthCheckbox({
  checked,
  onChange,
  label,
  body
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  body: string;
}): React.ReactElement {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-[17px] w-[17px] cursor-pointer rounded accent-brand-500"
      />
      <span>
        <span className="block text-[12.5px] font-bold text-neutral-900">{label}</span>
        <span className="block text-[11.5px] text-neutral-500">{body}</span>
      </span>
    </label>
  );
}

export function AuthBanner({
  tone,
  title,
  body
}: {
  tone: 'bad' | 'warn';
  title: string;
  body?: string;
}): React.ReactElement {
  const bad = tone === 'bad';
  return (
    <div
      role="alert"
      className={[
        'mt-4.5 flex gap-[11px] rounded-[14px] p-[13px_14px]',
        bad ? 'border border-[#F3C6BD] bg-error-50 text-[#8E2A17]' : 'border border-[#F3D9AE] bg-warning-50 text-[#7A4F10]'
      ].join(' ')}
    >
      <span
        className={[
          'flex size-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white',
          bad ? 'bg-error-500' : 'bg-warning-500'
        ].join(' ')}
      >
        !
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold">{title}</span>
        {body ? <span className="mt-0.5 block text-[12.5px] leading-relaxed">{body}</span> : null}
      </span>
    </div>
  );
}
