import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './Logo.js';

/**
 * Recreated from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s shared footer (`footerCols`/`socialIcons`/the
 * newsletter form) — same columns, copy and "Stay updated" subscribe form,
 * not the previous "Get in Touch" mailto box. `Sign in`/`Create account` in
 * the prototype both pointed at the Demo screen (an authored prototype
 * shortcut); routed here to the real `/sign-in`/`/sign-up` screens instead.
 */

const SOCIAL_LINKS = [
  { label: 'LinkedIn', glyph: 'in' },
  { label: 'Instagram', glyph: 'ig' },
  { label: 'Facebook', glyph: 'fb' },
  { label: 'Email', glyph: '@' }
];

const FOOTER_COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
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
      { label: 'Sign in', to: '/sign-in' },
      { label: 'Create account', to: '/sign-up' }
    ]
  }
];

export function MarketingFooter(): React.ReactElement {
  const [subscribed, setSubscribed] = React.useState(false);

  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-7 px-4 py-9 sm:px-6">
        <div className="min-w-[220px] flex-1 basis-[260px]">
          <div className="flex items-center gap-2">
            <LogoMark className="h-[30px] w-[30px]" />
          </div>
          <p className="mt-3 max-w-[260px] text-[12.5px] text-neutral-600">
            Scheduling, communication and workforce management built for teams that run on shifts.
          </p>
          <div className="mt-3.5 flex gap-2">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-[11px] font-bold text-neutral-600 hover:border-brand-500 hover:text-brand-deep"
              >
                {s.glyph}
              </a>
            ))}
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="min-w-[140px] flex-none basis-[160px]">
            <p className="mb-2.5 text-[12.5px] font-extrabold text-neutral-900">{column.title}</p>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-[12.5px] text-neutral-600 hover:text-brand-deep">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="min-w-[210px] flex-1 basis-[230px]">
          <p className="mb-2.5 text-[12.5px] font-extrabold text-neutral-900">Stay Updated</p>
          <p className="mb-3 text-[12.5px] text-neutral-600">Product updates and shift-planning tips, straight to your inbox.</p>
          {subscribed ? (
            <p role="status" className="text-[12.5px] font-bold text-success-text">
              Thanks &mdash; you&rsquo;re on the list.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubscribed(true);
              }}
              className="flex gap-2"
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="h-[42px] w-full rounded-xl border border-neutral-200 px-3 text-[13px] text-neutral-900 outline-none focus:border-brand-500"
                />
              </label>
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-500 text-[15px] font-bold text-white hover:bg-brand-600"
              >
                &rarr;
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-neutral-100">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 py-4 text-xs text-neutral-600 sm:px-6">
          <span>&copy; {new Date().getFullYear()} ShiftOS. All rights reserved.</span>
          <span className="ml-auto flex gap-4">
            <Link to="/privacy" className="hover:text-brand-deep">
              Privacy policy
            </Link>
            <Link to="/terms" className="hover:text-brand-deep">
              Terms &amp; conditions
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
