import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Linkedin, Mail } from 'lucide-react';
import { LogoMark } from './Logo.js';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Book a Demo', to: '/request-demo' },
      { label: 'Shifty Assistant', to: '/features' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Guides', to: '/resources' },
      { label: 'Help Center', to: '/resources' },
      { label: 'Getting Started', to: '/resources' },
      { label: 'Articles', to: '/resources' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/request-demo' },
      { label: 'Sign In', to: '/sign-in' },
      { label: 'Create Account', to: '/sign-up' }
    ]
  }
];

/** Ported from shift-app-hero's components/site/site-footer.tsx (SiteFooter). */
export function MarketingFooter(): React.ReactElement {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.4fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="text-xl font-extrabold tracking-tight text-neutral-900">ShiftOS</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Scheduling, communication and workforce management built for teams that run on shifts.
            </p>
            <div className="mt-4 flex gap-2">
              {[Linkedin, Instagram, Facebook, Mail].map((Icon, index) => (
                <span
                  key={index}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-sm font-extrabold text-neutral-900">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-neutral-500 transition-colors hover:text-brand-500">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-sm font-extrabold text-neutral-900">Stay Updated</h3>
            <p className="mt-4 text-sm text-neutral-500">Product updates and shift-planning tips, straight to your inbox.</p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                (event.currentTarget as HTMLFormElement).reset();
              }}
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                required
                placeholder="Enter your email"
                className="h-10 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600"
              >
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} ShiftOS. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-brand-500">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-brand-500">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
