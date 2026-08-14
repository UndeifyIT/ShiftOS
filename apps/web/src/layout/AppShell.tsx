import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';

/**
 * UI-003 §5 Application Shell + UI-010 §6 navigation adaptation: a
 * persistent sidebar on desktop, collapsed behind a slide-over panel below
 * `md` rather than a resized/cramped sidebar.
 *
 * Shifty deliberately does NOT render here. It previously floated on every
 * authenticated page for the lifetime of the account, which ran against the
 * product requirement that it appear "primarily where onboarding/help
 * actually benefits" — not as permanent chrome. Shifty now only appears in
 * OnboardingWizard, where its per-step guidance is genuinely contextual.
 */
export function AppShell(): React.ReactElement {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-neutral-900/40" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="relative z-10">
            <Sidebar />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
