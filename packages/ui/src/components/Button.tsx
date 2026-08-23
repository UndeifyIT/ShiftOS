import React, { forwardRef } from 'react';
import { Spinner } from './Spinner.js';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'hero' | 'heroOutline' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'iconSm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/*
 * Contrast note: brand-500 (#F04E17, the approved logo/accent orange) only
 * reaches ~3.6:1 against white — under WCAG AA's 4.5:1 for normal text.
 * brand-500 stays the literal accent everywhere it isn't load-bearing text
 * (logo, active-nav border, icons, links on white); solid fills carrying
 * white button label text use brand-700 (#C6420E, ~5:1) instead so every
 * primary CTA in the app is actually readable.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-neutral-200 disabled:text-neutral-400',
  secondary:
    'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-400 disabled:bg-neutral-50',
  destructive: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-600 disabled:bg-neutral-200 disabled:text-neutral-400',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-400',
  /* Ported from shift-app-hero's components/ui/button.tsx `hero`/`heroOutline`/`soft`
     variants (Lovable design system) — used for marketing/auth CTAs. */
  hero: 'bg-brand-700 text-white shadow-brand hover:bg-brand-800 hover:-translate-y-0.5 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none disabled:translate-y-0',
  heroOutline:
    'border border-brand-500/40 bg-white text-brand-700 hover:bg-brand-soft hover:border-brand-500 disabled:border-neutral-200 disabled:text-neutral-400',
  soft: 'bg-brand-soft text-brand-deep hover:bg-brand-100 disabled:bg-neutral-100 disabled:text-neutral-400'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-[0.9375rem] gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  xl: 'h-14 px-7 text-base gap-2',
  icon: 'h-10 w-10',
  iconSm: 'h-8 w-8'
};

/**
 * Shared class-string builder behind `Button` below. Exported so link-based
 * CTAs (e.g. react-router-dom `<Link>`) can render with the exact same
 * variant/size styling as `<Button>` without needing a `<button>` element —
 * mirrors shadcn's `buttonVariants()` export pattern used in the Lovable
 * source (shift-app-hero/src/components/ui/button.tsx), minus the Radix
 * `asChild`/`cva` dependency this repo doesn't otherwise use.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = ''
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return [
    'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
    'disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');
}

/** Primary interactive control (UI-001 §8). Always renders visible text — icon-only usage should go through IconButton, which requires aria-label. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' || size === 'xl' ? 18 : 14} /> : null}
      {children}
    </button>
  );
});
