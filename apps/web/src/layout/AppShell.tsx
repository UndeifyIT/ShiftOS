import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MoreHorizontal, UserCircle } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Sidebar, useNavItems } from './Sidebar.js';
import { TopBar } from './TopBar.js';
import { useSession } from '../auth/SessionProvider.js';

/**
 * UI-003 §5 Application Shell + UI-010 §6 navigation adaptation: a
 * persistent sidebar on desktop, and below the design's ~860px breakpoint a
 * fixed bottom tab bar with the role's primary sections plus a "More" bottom
 * sheet for the overflow (ported from `ShiftOS Dashboards.dc.html`'s
 * isMobile nav + moreSheet), rather than a resized/cramped sidebar.
 *
 * Shifty deliberately does NOT render here. It previously floated on every
 * authenticated page for the lifetime of the account, which ran against the
 * product requirement that it appear "primarily where onboarding/help
 * actually benefits" — not as permanent chrome. Shifty now only appears in
 * OnboardingWizard, where its per-step guidance is genuinely contextual.
 */

const PRIMARY_TAB_COUNT = 4;

function MobileTabBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }): React.ReactElement {
  const items = useNavItems();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useSession();

  const primary = items.slice(0, PRIMARY_TAB_COUNT);
  const overflow = items.slice(PRIMARY_TAB_COUNT);

  return (
    <>
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-[60] flex border-t border-neutral-200 bg-white px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 min-[860px]:hidden"
      >
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5',
                isActive ? 'text-brand-deep' : 'text-neutral-400 hover:text-neutral-600'
              ].join(' ')
            }
          >
            <item.icon className="size-[18px]" aria-hidden="true" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-neutral-400 transition-colors hover:text-neutral-600"
        >
          <MoreHorizontal className="size-[18px]" aria-hidden="true" />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>

      {moreOpen ? (
        <>
          <div className="fixed inset-0 z-[65] bg-[#1E1814]/40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="More pages"
            className="fixed inset-x-0 bottom-0 z-[66] flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto rounded-t-[20px] bg-white px-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-2.5 min-[860px]:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-neutral-200" aria-hidden="true" />
            {overflow.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate(item.to);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left text-sm font-bold text-neutral-900 transition-colors hover:bg-neutral-50"
              >
                <item.icon className="size-[17px] shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-neutral-100" />
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                navigate('/profile');
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left text-sm font-bold text-neutral-900 transition-colors hover:bg-neutral-50"
            >
              <UserCircle className="size-[17px] shrink-0 text-neutral-500" aria-hidden="true" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void signOut();
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left text-sm font-bold text-error-600 transition-colors hover:bg-error-50"
            >
              Log out
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}

export function AppShell(): React.ReactElement {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="hidden min-[860px]:block">
        <Sidebar />
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 flex min-[860px]:hidden">
          <div className="absolute inset-0 bg-neutral-900/40" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="relative z-10">
            <Sidebar />
          </div>
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Floating glass top bar: overlays the scroll area so page content
            passes behind it (the blur reads against real content). */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
          <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        </div>
        <main id="main-content" className="flex-1 overflow-y-auto pb-[72px] pt-[68px] min-[860px]:pb-0 sm:pt-[72px]">
          <Outlet />
        </main>
        <MobileTabBar onOpenMobileNav={() => setMobileNavOpen(true)} />
      </div>
    </div>
  );
}
