import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const baseClasses =
  'h-10 w-full rounded-md border bg-white px-3 text-[0.9375rem] text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={[baseClasses, invalid ? 'border-error-500' : 'border-neutral-300', className].join(' ')}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid = false, className = '', ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={[
          'min-h-[6rem] w-full rounded-md border bg-white px-3 py-2 text-[0.9375rem] text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400',
          invalid ? 'border-error-500' : 'border-neutral-300',
          className
        ].join(' ')}
        {...rest}
      />
    );
  }
);

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, invalid = false, className = '', ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={[baseClasses, 'appearance-none bg-white pr-8', invalid ? 'border-error-500' : 'border-neutral-300', className].join(
        ' '
      )}
      {...rest}
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
});

export const Checkbox = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Checkbox(
  { className = '', ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={[
        'h-4 w-4 rounded border-neutral-300 text-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        className
      ].join(' ')}
      {...rest}
    />
  );
});
