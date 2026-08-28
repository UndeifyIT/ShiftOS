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
  const mark = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-xl' : 'text-2xl';
  return (
    <Link to={to} className={['inline-flex items-center gap-2.5 rounded-md', className].join(' ')} aria-label="ShiftOS home">
      <LogoMark className={mark} />
      <span className={['font-display font-extrabold tracking-tight', text].join(' ')}>
        <span className={inverted ? 'text-white' : 'text-neutral-900'}>Shift</span>
        <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">OS</span>
      </span>
    </Link>
  );
}
