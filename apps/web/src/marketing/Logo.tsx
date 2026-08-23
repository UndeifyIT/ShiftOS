import React from 'react';
import { Link } from 'react-router-dom';
import logoMarkSrc from '../assets/logo-mark.png';

/** The "S" swoosh mark from design_handoff_shiftos/assets/logo-mark.png. */
export function LogoMark({ className = '' }: { className?: string }): React.ReactElement {
  return <img src={logoMarkSrc} alt="" aria-hidden="true" className={['h-8 w-8 object-contain', className].join(' ')} />;
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
      <LogoMark className={mark} />
      <span className={['font-display font-semibold tracking-tight', text].join(' ')}>
        <span className={inverted ? 'text-white' : 'text-neutral-900'}>Shift</span>
        <span className="text-brand-600">OS</span>
      </span>
    </Link>
  );
}
