import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SelectOption } from './Input.js';

/**
 * Shared filter-as-you-type combobox (WAI-ARIA 1.2 combobox pattern), built
 * for Task 2's country/state geography selects: no combobox/searchable-select
 * component existed anywhere in this codebase before this (checked
 * apps/web/src/components and packages/ui — both `Select` here and the
 * onboarding-only `ObSelect` are plain native `<select>` elements with no
 * filtering), so this is a genuinely new, minimal, reusable primitive rather
 * than a duplicate of something already available.
 *
 * Two `variant`s cover the two visual languages already in this app: the
 * shared app chrome (`Select`'s look — used by `BranchDetailPage`) and the
 * onboarding wizard's bespoke design-handoff chrome (`ObSelect`'s look —
 * used by `OrganizationStep`/`OnboardingWizard`). A single `className`
 * override wasn't used for this because these two styles disagree on the
 * same CSS properties (height, radius, font size) — concatenating both class
 * strings would leave the result to Tailwind's stylesheet-order tie-breaking
 * instead of the caller's intent.
 */

export type SearchableSelectVariant = 'default' | 'onboarding';

interface VariantClasses {
  base: string;
  normal: string;
  invalid: string;
  disabled: string;
  listbox: string;
  option: string;
  optionActive: string;
  optionSelected: string;
}

const VARIANTS: Record<SearchableSelectVariant, VariantClasses> = {
  default: {
    base: 'h-10 w-full appearance-none rounded-md border bg-white pl-3 pr-8 text-[0.9375rem] text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
    normal: 'border-neutral-300',
    invalid: 'border-error-500',
    disabled: 'cursor-not-allowed bg-neutral-50 text-neutral-400',
    listbox:
      'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 text-[0.9375rem] shadow-lg',
    option: 'cursor-pointer px-3 py-2 text-neutral-900',
    optionActive: 'bg-brand-50 text-brand-700',
    optionSelected: 'font-semibold'
  },
  onboarding: {
    base: 'h-[44px] w-full appearance-none rounded-xl border bg-white pl-[13px] pr-9 text-[13.5px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500',
    normal: 'border-neutral-300',
    invalid: 'border-error-500 bg-[#FEF7F5]',
    disabled: 'cursor-not-allowed border-neutral-200 bg-[#F7F4F1] text-neutral-500',
    listbox:
      'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 text-[13.5px] shadow-lg',
    option: 'cursor-pointer px-[13px] py-2 text-neutral-900',
    optionActive: 'bg-brand-50 text-brand-700',
    optionSelected: 'font-semibold'
  }
};

/** Same down-chevron used by `Select`/`ObSelect`'s native `<select>` background image, reused here so the two look identical despite this no longer being a real `<select>`. */
const CHEVRON_BG =
  'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23857A72%27 stroke-width=%272.4%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[position:right_12px_center] bg-no-repeat';

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  variant?: SearchableSelectVariant;
  noResultsLabel?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export function SearchableSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = 'Search…',
  disabled = false,
  invalid = false,
  variant = 'default',
  noResultsLabel = 'No matches',
  ...aria
}: SearchableSelectProps): React.ReactElement {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const listboxId = `${baseId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedOption?.label ?? '');
  const [activeIndex, setActiveIndex] = useState(-1);

  // Keep the displayed text in sync with the current selection whenever it
  // changes from outside (e.g. a country change resetting the state field)
  // or the dropdown closes without picking something new.
  useEffect(() => {
    if (!open) setQuery(selectedOption?.label ?? '');
  }, [selectedOption, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === (selectedOption?.label ?? '').toLowerCase()) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query, selectedOption]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const commit = (option: SelectOption | null): void => {
    if (option) onChange(option.value);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      if (open) {
        event.preventDefault();
        commit(filtered[activeIndex] ?? filtered[0] ?? null);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery(selectedOption?.label ?? '');
        setActiveIndex(-1);
      }
    }
  };

  const classes = VARIANTS[variant];
  const inputClassName = [classes.base, CHEVRON_BG, disabled ? classes.disabled : invalid ? classes.invalid : classes.normal]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className="relative">
      <input
        {...aria}
        id={baseId}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Deferred so a click on an option (which fires mousedown, then
          // this blur, then click) still gets to run its onClick handler
          // before we snap the input's text back to the current selection.
          window.setTimeout(() => {
            setOpen(false);
            setQuery(selectedOption?.label ?? '');
          }, 0);
        }}
        className={inputClassName}
      />
      {open && !disabled ? (
        <ul id={listboxId} role="listbox" className={classes.listbox}>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-neutral-400">{noResultsLabel}</li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(option)}
                className={[
                  classes.option,
                  index === activeIndex ? classes.optionActive : '',
                  option.value === value ? classes.optionSelected : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
