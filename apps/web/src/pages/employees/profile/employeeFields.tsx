import React, { useRef, useState } from 'react';
import { useDismiss } from '../../../lib/useDismiss.js';

/*
 * The handoff's employee form controls (`ShiftOS Dashboards.dc.html`, Add
 * Employee lines 2311-2327 and Employee Profile lines 1758-1773): a 12px
 * bold label with a brand asterisk, 44px inputs, select-looking buttons with
 * a ⌄ (or ▤ for dates), and the +234 country-code button beside the phone.
 */

export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' }
];

export const COUNTRY_CODES = [
  { code: '+234', label: '🇳🇬 +234' },
  { code: '+233', label: '🇬🇭 +233' },
  { code: '+254', label: '🇰🇪 +254' },
  { code: '+27', label: '🇿🇦 +27' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+1', label: '🇺🇸 +1' }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → 'Apr 12, 2025' */
export function formatDay(date: string | null | undefined): string {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return year && month && day ? `${MONTHS[month - 1]} ${day}, ${year}` : '';
}

/** '+234 801 234 5678' → { code: '+234', number: '801 234 5678' }; unknown codes keep the whole number. */
export function splitPhone(phone: string | null | undefined): { code: string; number: string } {
  const value = (phone ?? '').trim();
  const known = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length).find((c) => value.startsWith(c.code));
  if (known) return { code: known.code, number: value.slice(known.code.length).trim() };
  return { code: '+234', number: value };
}

export function joinPhone(code: string, number: string): string | null {
  const digits = number.trim();
  if (!digits) return null;
  return digits.startsWith('+') ? digits : `${code} ${digits}`;
}

const control = 'box-border h-11 rounded-[11px] border border-solid border-[#E4DED9] bg-white text-[13px] text-[#38312B]';

/** A field: bold label (brand asterisk when required), the control row, then the faint note — or the error in its place once one is shown. */
export function FieldLabel({
  label,
  required,
  children,
  note,
  error,
  className = ''
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  note?: string;
  error?: string;
  className?: string;
}): React.ReactElement {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[12px] font-bold">
        {label}
        {required ? <span className="text-[#F04E17]"> *</span> : null}
      </span>
      <span className="flex items-stretch gap-2">{children}</span>
      {error ? <span className="mt-1.5 block text-[10.5px] font-semibold text-[#C93A22]">{error}</span> : note ? <span className="mt-1.5 block text-[10.5px] text-[#A79C93]">{note}</span> : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  invalid,
  ariaLabel
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
  ariaLabel?: string;
}): React.ReactElement {
  return (
    <input
      type={type}
      value={value}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${control} min-w-0 flex-auto px-[13px] outline-none focus:border-[#F04E17] ${invalid ? 'border-[#C93A22]' : ''}`}
    />
  );
}

export function SelectButton({
  value,
  options,
  placeholder,
  onChange,
  invalid,
  disabled,
  note,
  ariaLabel
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** Shown at the foot of the open menu. */
  note?: React.ReactNode;
  ariaLabel?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLSpanElement>(open, () => setOpen(false));
  const current = options.find((option) => option.value === value);
  return (
    <span ref={ref} className="relative flex min-w-0 flex-auto">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`${control} flex w-full min-w-0 cursor-pointer items-center gap-2 px-[13px] disabled:cursor-default ${current ? 'font-semibold' : 'font-medium text-[#A79C93]'} ${invalid ? 'border-[#C93A22]' : ''}`}
      >
        <span className="flex-auto truncate text-left">{current ? current.label : placeholder}</span>
        <span className="text-[#A79C93]">⌄</span>
      </button>
      {open ? (
        <span role="listbox" className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(56,49,43,.35)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={[
                'flex w-full cursor-pointer rounded-[8px] border-0 px-2.5 py-2 text-left text-[12.5px]',
                option.value === value ? 'bg-[#FDF0E9] font-bold text-[#C6420E]' : 'bg-transparent font-semibold text-[#38312B] hover:bg-[#F7F4F1]'
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
          {options.length === 0 && !note ? <span className="block px-2.5 py-2 text-[12px] text-[#A79C93]">Nothing to choose from yet</span> : null}
          {note ? <span className="block px-2.5 pb-1.5 pt-1 text-[11px] leading-[1.45] text-[#A79C93]">{note}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/** A select-looking date button (▤) that opens the browser's own date picker. */
export function DateButton({ value, onChange, placeholder, invalid, ariaLabel }: { value: string; onChange: (value: string) => void; placeholder: string; invalid?: boolean; ariaLabel?: string }): React.ReactElement {
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className="relative flex min-w-0 flex-auto">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          const el = input.current;
          if (!el) return;
          if (typeof el.showPicker === 'function') el.showPicker();
          else el.focus();
        }}
        className={`${control} flex w-full min-w-0 cursor-pointer items-center gap-2 px-[13px] ${value ? 'font-semibold' : 'font-medium text-[#A79C93]'} ${invalid ? 'border-[#C93A22]' : ''}`}
      >
        <span className="flex-auto truncate text-left">{value ? formatDay(value) : placeholder}</span>
        <span className="text-[#A79C93]">▤</span>
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
      />
    </span>
  );
}

export function PhoneFields({ code, number, onCode, onNumber, placeholder, invalid }: { code: string; number: string; onCode: (code: string) => void; onNumber: (number: string) => void; placeholder?: string; invalid?: boolean }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLSpanElement>(open, () => setOpen(false));
  const current = COUNTRY_CODES.find((c) => c.code === code) ?? COUNTRY_CODES[0];
  return (
    <>
      <span ref={ref} className="relative flex flex-none">
        <button
          type="button"
          aria-label="Country code"
          aria-expanded={open}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex h-11 flex-none cursor-pointer items-center gap-1.5 rounded-[11px] border border-solid border-[#E4DED9] bg-white px-[11px] text-[12.5px] font-semibold text-black"
        >
          {current.label} <span className="text-[#A79C93]">⌄</span>
        </button>
        {open ? (
          <span role="listbox" className="absolute left-0 top-[calc(100%+4px)] z-30 w-[132px] rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-1 shadow-[0_18px_40px_-20px_rgba(56,49,43,.35)]">
            {COUNTRY_CODES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={c.code === code}
                onClick={() => {
                  onCode(c.code);
                  setOpen(false);
                }}
                className={[
                  'flex w-full cursor-pointer rounded-[8px] border-0 px-2.5 py-2 text-left text-[12.5px]',
                  c.code === code ? 'bg-[#FDF0E9] font-bold text-[#C6420E]' : 'bg-transparent font-semibold text-[#38312B] hover:bg-[#F7F4F1]'
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </span>
        ) : null}
      </span>
      <TextInput value={number} onChange={onNumber} placeholder={placeholder} type="tel" invalid={invalid} ariaLabel="Phone number" />
    </>
  );
}
