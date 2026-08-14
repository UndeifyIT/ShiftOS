import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ShiftOS brand mark — "The Handoff": two interlocking forms mid-exchange,
 * symbolizing shift continuity (one shift ending as the next begins). Teal
 * half is always the brand accent; the graphite half switches to white via
 * `inverted` so the mark stays legible on the dark sidebar/graphite surfaces.
 */
export function LogoMark({ className = '', inverted = false }: { className?: string; inverted?: boolean }): React.ReactElement {
  const secondary = inverted ? '#ffffff' : '#111111';
  return (
    <svg viewBox="0 0 56 56" role="img" aria-hidden="true" focusable="false" className={['h-8 w-8', className].join(' ')}>
      <path d="M8 40 C8 22 20 12 28 12 L28 28 C22 28 18 33 18 40 Z" fill="#14b8a6" />
      <path d="M48 16 C48 34 36 44 28 44 L28 28 C34 28 38 23 38 16 Z" fill={secondary} />
    </svg>
  );
}

export function Logo({
  className = '',
  size = 'md',
  to = '/',
  inverted = false
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  inverted?: boolean;
}): React.ReactElement {
  const mark = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <Link to={to} className={['inline-flex items-center gap-2 rounded-md', className].join(' ')} aria-label="ShiftOS home">
      <LogoMark className={mark} inverted={inverted} />
      <span className={['font-display font-semibold tracking-tight', inverted ? 'text-white' : 'text-neutral-900', text].join(' ')}>
        ShiftOS
      </span>
    </Link>
  );
}
