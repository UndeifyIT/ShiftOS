import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { Logo } from './Logo.js';

const NAV_LINKS = [
  { label: 'Features', to: '/features', caret: true },
  { label: 'Solutions', to: '/solutions', caret: true },
  { label: 'Pricing', to: '/pricing', caret: false },
  { label: 'Resources', to: '/resources', caret: true },
  { label: 'About Us', to: '/about', caret: false }
];

/**
 * Public marketing nav shared by every public route — a floating glass bar:
 * detached from the viewport edges, fully rounded, translucent white with a
 * backdrop blur so page content reads through it while it sticks.
 */
export function MarketingNav(): React.ReactElement {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="pointer-events-none sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="pointer-events-auto mx-auto max-w-7xl">
        <div className="rounded-2xl border border-white/40 bg-transparent shadow-[0_4px_20px_-14px_rgba(56,49,43,0.18)] backdrop-blur-[2px]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5 sm:px-5 lg:grid-cols-[auto_1fr_auto]">
            <Logo />

            <nav aria-label="Main" className="hidden justify-center lg:flex">
              <ul className="flex items-center gap-7">
                {NAV_LINKS.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        className={[
                          'inline-flex items-center gap-1 rounded-md text-sm font-semibold transition-colors',
                          active ? 'text-brand-700' : 'text-neutral-600 hover:text-neutral-900'
                        ].join(' ')}
                      >
                        {item.label}
                        {item.caret ? <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2 justify-self-end">
              <Link to="/sign-in" className={['hidden sm:inline-flex', buttonClasses({ variant: 'ghost', size: 'sm' })].join(' ')}>
                Sign in
              </Link>
              <Link to="/sign-up" className={['hidden sm:inline-flex', buttonClasses({ variant: 'hero', size: 'sm' })].join(' ')}>
                Start free trial <ArrowRight className="size-4" />
              </Link>
              <Link to="/sign-up" className={['sm:hidden', buttonClasses({ variant: 'hero', size: 'sm' })].join(' ')}>
                Start free
              </Link>

              <button
                type="button"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-neutral-200/70 bg-white/50 text-neutral-900 lg:hidden"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>

        {open ? (
          <div className="mt-2 rounded-2xl border border-white/40 bg-white/10 shadow-[0_16px_40px_-20px_rgba(56,49,43,0.3)] backdrop-blur-md lg:hidden">
            <nav aria-label="Mobile" className="px-4 py-3 sm:px-5">
              <ul className="divide-y divide-neutral-200/70">
                {NAV_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} onClick={() => setOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold">
                      {item.label}
                      <X className="size-3.5 rotate-45 text-neutral-600" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 pt-4">
                <Link
                  to="/sign-in"
                  onClick={() => setOpen(false)}
                  className={buttonClasses({ variant: 'heroOutline', size: 'lg', fullWidth: true })}
                >
                  Sign in
                </Link>
                <Link to="/sign-up" onClick={() => setOpen(false)} className={buttonClasses({ variant: 'hero', size: 'lg', fullWidth: true })}>
                  Start free trial
                </Link>
                <Link to="/request-demo" onClick={() => setOpen(false)} className={buttonClasses({ variant: 'ghost', size: 'lg', fullWidth: true })}>
                  Book a demo
                </Link>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
