import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { LogoMark } from './Logo.js';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Solutions', to: '/solutions' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Book a Demo', to: '/request-demo' }
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
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-sm font-extrabold text-neutral-900">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-neutral-500 transition-colors hover:text-brand-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-sm font-extrabold text-neutral-900">Get in Touch</h3>
            <p className="mt-4 text-sm text-neutral-500">Questions about ShiftOS for your team? We reply directly, no ticket queue.</p>
            <a
              href="mailto:hello@shiftos.app"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Mail className="size-4" aria-hidden="true" /> hello@shiftos.app
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} ShiftOS. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-brand-700">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-brand-700">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
