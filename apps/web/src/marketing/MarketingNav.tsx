import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { buttonClasses } from '@shiftos/ui';
import { Logo } from './Logo.js';

const NAV_LINKS = [
  { label: 'Features', to: '/features', caret: true },
  { label: 'Solutions', to: '/features', caret: true },
  { label: 'Pricing', to: '/pricing', caret: false },
  { label: 'Resources', to: '/resources', caret: true },
  { label: 'About Us', to: '/about', caret: false }
];

/**
 * Public marketing nav shared by every public route. Ported structurally
 * from shift-app-hero's components/site/site-header.tsx (SiteHeader) onto
 * react-router-dom, since this app doesn't use TanStack Router (see task
 * plan: Lovable is the visual source of truth, not the routing framework).
 */
export function MarketingNav(): React.ReactElement {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:py-4">
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
                      active ? 'text-brand-500' : 'text-neutral-500 hover:text-neutral-900'
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
            Sign In
          </Link>
          <Link to="/sign-up" className={['hidden sm:inline-flex', buttonClasses({ variant: 'hero', size: 'sm' })].join(' ')}>
            Start Free Trial <ArrowRight className="size-4" />
          </Link>
          <Link to="/sign-up" className={['sm:hidden', buttonClasses({ variant: 'hero', size: 'sm' })].join(' ')}>
            Start Free
          </Link>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-900 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-neutral-200 bg-white lg:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <ul className="divide-y divide-neutral-200">
              {NAV_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} onClick={() => setOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold">
                    {item.label}
                    <X className="size-3.5 rotate-45 text-neutral-400" aria-hidden="true" />
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
                Sign In
              </Link>
              <Link to="/sign-up" onClick={() => setOpen(false)} className={buttonClasses({ variant: 'hero', size: 'lg', fullWidth: true })}>
                Start Free Trial
              </Link>
              <Link to="/request-demo" onClick={() => setOpen(false)} className={buttonClasses({ variant: 'ghost', size: 'lg', fullWidth: true })}>
                Book a Demo
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
