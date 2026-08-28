import React from 'react';

/**
 * Onboarding-only form chrome, styled 1:1 from `Local file check/
 * design_handoff_shiftos/ShiftOS Onboarding.dc.html`: the 44px rounded-xl
 * select (its inline `input` style, as a native select with a placeholder
 * option) and the step footer row (Back outline / Skip text link / brand
 * Continue with the #F5A98A saving state). Text inputs reuse the auth
 * design's AuthInput (same 46px/rounded-xl language).
 */

export interface ObSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'defaultValue'> {
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}

export function ObSelect({ options, placeholder, invalid = false, className = '', disabled, ...rest }: ObSelectProps): React.ReactElement {
  return (
    <select
      {...rest}
      disabled={disabled}
      className={[
        'h-[44px] w-full appearance-none rounded-xl border bg-white px-[13px] text-[13.5px] text-neutral-900 outline-none transition-colors focus:border-brand-500',
        invalid ? 'border-error-500 bg-[#FEF7F5]' : 'border-neutral-300',
        disabled ? 'cursor-not-allowed border-neutral-200 bg-[#F7F4F1] text-neutral-500' : '',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23857A72%27 stroke-width=%272.4%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[position:right_12px_center] bg-no-repeat pr-9',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export interface WizardFooterProps {
  onBack?: () => void;
  backDisabled?: boolean;
  onSkip?: () => void;
  onNext: () => void;
  nextLabel: string;
  /** 'submit' when the Next button should post the surrounding form. */
  nextType?: 'button' | 'submit';
  saving?: boolean;
}

export function WizardFooter({
  onBack,
  backDisabled = false,
  onSkip,
  onNext,
  nextLabel,
  nextType = 'button',
  saving = false
}: WizardFooterProps): React.ReactElement {
  return (
    <div className="mt-[22px] flex flex-wrap items-center gap-2.5 border-t border-neutral-100 pt-[18px]">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          className={
            backDisabled
              ? 'h-11 cursor-not-allowed rounded-xl border border-neutral-200 bg-white px-[18px] text-[13.5px] font-bold text-neutral-400'
              : 'h-11 cursor-pointer rounded-xl border border-neutral-200 bg-white px-[18px] text-[13.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300'
          }
        >
          &larr; Back
        </button>
      ) : null}
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="h-11 cursor-pointer bg-transparent px-4 text-[13px] font-bold text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-700"
        >
          Skip for now
        </button>
      ) : null}
      <button
        type={nextType}
        onClick={nextType === 'button' ? onNext : undefined}
        disabled={saving}
        className={
          saving
            ? 'ml-auto flex h-[46px] cursor-progress items-center rounded-xl bg-[#F5A98A] px-6 text-sm font-bold text-white'
            : 'ml-auto flex h-[46px] cursor-pointer items-center rounded-xl bg-brand-500 px-6 text-sm font-bold text-white shadow-[0_12px_26px_-14px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600'
        }
      >
        {saving ? 'Saving…' : nextLabel}
      </button>
    </div>
  );
}
