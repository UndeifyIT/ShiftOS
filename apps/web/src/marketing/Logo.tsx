import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ShiftOS brand mark, ported from shift-app-hero's components/site/logo.tsx
 * (LogoMark/Logo): a hexagonal "S" ribbon drawn as a single mitered stroke so
 * it stays crisp at any size and inherits the brand color via currentColor.
 */
export function LogoMark({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false" className={['h-8 w-8 text-brand-500', className].join(' ')}>
      <path
        d="M78 30 L50 14 L22 30 L22 44 L78 57 L78 70 L50 86 L22 70"
        fill="none"
        stroke="currentColor"
        strokeWidth={15}
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
    </svg>
  );
}

export function Logo({
  className = '',
  size = 'md',
  to = '/'
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  to?: string;
}): React.ReactElement {
  const mark = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <Link to={to} className={['inline-flex items-center gap-2 rounded-md', className].join(' ')} aria-label="ShiftOS home">
      <LogoMark className={mark} />
      <span className={['font-extrabold tracking-tight text-neutral-900', text].join(' ')}>ShiftOS</span>
    </Link>
  );
}
