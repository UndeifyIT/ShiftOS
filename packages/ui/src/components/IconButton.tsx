import React, { forwardRef } from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required, not optional: an icon-only control with no accessible name is a UI-011 §7 violation. */
  'aria-label': string;
  variant?: 'default' | 'ghost' | 'destructive';
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100',
  destructive: 'bg-transparent text-error-500 hover:bg-error-50'
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'default', className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});
