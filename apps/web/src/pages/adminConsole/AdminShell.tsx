import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoShiftOS from '../../assets/logo-shiftos.png';
import shiftyGuide from '../../assets/shifty-guide.png';
import { useSession } from '../../auth/SessionProvider.js';
import { RouteErrorBoundary } from '../../layout/RouteErrorBoundary.js';
import { AdminIcon, type AdminIconName } from './AdminIcon.js';
import { answerAdmin } from './adminModel.js';
import { useAdminOrg } from './useAdminOrg.js';

/*
 * The standalone Admin console, built to the design handoff
 * (`ShiftOS Admin.dc.html`, markup lines 24-112 and 955-1003): its own
 * 216px sidebar ("Admin · <organization>", Overview / Branches / Subscription /
 * Settings, the account card), a page header with help, notifications and the
 * avatar, and the read-only Ask ShiftOS bubble on every screen but Overview.
 * The prototype has no CSS reset: 13px base, line-height 1.55, and buttons at
 * the browser's own `line-height: normal`.
 */

const NAV: Array<{ to: string; label: string; icon: AdminIconName }> = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/branches', label: 'Branches', icon: 'store' },
  { to: '/subscription', label: 'Subscription', icon: 'card' },
  { to: '/settings', label: 'Settings', icon: 'gear' }
];

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'ME';

function useAdminName(): string {
  const { profile } = useSession();
  return profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : 'Admin';
}

function AdminSidebar({ orgName }: { orgName: string }): React.ReactElement {
  const name = useAdminName();
  const { pathname } = useLocation();
  const { signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    // 216px + its 1px border: the prototype's content-box aside.
    <aside className="flex w-[217px] flex-[0_0_217px] flex-col border-0 border-r border-solid border-[#EBE7E3] bg-white max-[859px]:hidden">
      <div className="flex items-center gap-[9px] px-5 pb-[18px] pt-[22px]">
        <img src={logoShiftOS} alt="ShiftOS" className="block h-8 w-auto max-w-none" />
      </div>
      <p className="m-0 px-5 pb-2.5 pt-0 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A79C93]">Admin · {orgName}</p>
      <nav className="flex flex-auto flex-col gap-0.5 px-3" aria-label="Admin">
        {NAV.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`flex w-full items-center rounded-[11px] px-3 py-[9px] text-left text-[13px] font-bold [line-height:normal] ${active ? 'bg-[#F04E17] text-white' : 'bg-transparent text-[#857A72]'}`}
            >
              <span className="mr-[9px] flex size-6 flex-none items-center justify-center rounded-[7px]" style={{ color: active ? '#fff' : '#A79C93' }}>
                <AdminIcon name={item.icon} size={15} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="relative border-0 border-t border-solid border-[#EBE7E3] p-3">
        {menuOpen ? (
          <div className="absolute inset-x-3 bottom-[70px] z-20 rounded-[12px] border border-solid border-[#EBE7E3] bg-white p-[5px] shadow-[0_18px_38px_-18px_rgba(56,49,43,.42)]">
            <button type="button" onClick={() => void signOut()} className="block w-full cursor-pointer rounded-[8px] border-0 bg-transparent px-[9px] py-2 text-left text-[12px] font-bold text-[#C93A22] [line-height:normal] hover:bg-[#F6F3F0]">
              Log out
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[11px] py-[9px] text-left [line-height:normal]"
        >
          <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-[#FDF0E9] text-[11px] font-extrabold text-[#C6420E]">{initials(name)}</span>
          <span className="min-w-0 flex-auto">
            <span className="block truncate text-[12.5px] font-bold text-[#38312B]">{name}</span>
            <span className="block text-[11px] text-[#A79C93]">Admin</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

/** The handoff header plus the page body — every Admin screen renders through this. */
export function AdminPage({ title, subtitle, attention = false, children }: { title: string; subtitle: string; attention?: boolean; children: React.ReactNode }): React.ReactElement {
  const name = useAdminName();
  const navigate = useNavigate();
  return (
    <>
      <header className="flex flex-wrap items-start gap-3.5 border-0 border-b border-solid border-[#F2EEEA] bg-white px-[26px] pb-[18px] pt-[22px] max-[859px]:px-4 max-[859px]:pb-3 max-[859px]:pt-3.5">
        <div className="min-w-0 flex-[1_1_280px]">
          <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.025em] max-[859px]:text-[19px] max-[859px]:tracking-[-0.02em]">{title}</h1>
          <p className="mb-0 mt-[5px] text-[13px] text-[#857A72] max-[859px]:mt-1 max-[859px]:text-[12px]">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Help"
            onClick={() => navigate('/resources')}
            className="size-[38px] cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white p-0 text-[14px] font-bold text-[#857A72] [line-height:normal]"
          >
            ?
          </button>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => navigate('/')}
            className="relative flex size-[38px] cursor-pointer items-center justify-center rounded-[11px] border border-solid border-[#EBE7E3] bg-white p-0 text-[#857A72]"
          >
            <AdminIcon name="bell" size={16} />
            {attention ? (
              // 8px + a 2px border each side: the prototype's content-box dot.
              <span className="absolute right-[7px] top-[7px] box-content size-2 rounded-full border-2 border-solid border-white bg-[#F04E17]" />
            ) : null}
          </button>
          <span className="flex size-[38px] items-center justify-center rounded-full bg-[#FDF0E9] text-[12px] font-extrabold text-[#C6420E]">{initials(name)}</span>
        </div>
      </header>
      <main className="flex-auto bg-[#FDFCFB] px-[26px] pb-10 pt-[22px] max-[859px]:px-4 max-[859px]:pb-[84px] max-[859px]:pt-4">{children}</main>
    </>
  );
}

/** Handoff showFloatingAssistant: the read-only Ask ShiftOS bubble, on every screen but Overview. */
function AdminAssistant(): React.ReactElement | null {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { branches } = useAdminOrg();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  useEffect(() => setOpen(false), [pathname]);
  if (pathname === '/') return null;

  const chips = [
    { label: `Open ${branches[0]?.name ?? 'a branch'}`, q: `Open ${branches[0]?.name ?? 'branches'}` },
    { label: 'Open Billing', q: 'Open billing' }
  ];
  const run = (raw: string): void => {
    if (!raw.trim()) return;
    const answer = answerAdmin(raw, branches);
    setResult(answer.text);
    setQuery('');
    if (answer.to) navigate(answer.to);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end max-[859px]:bottom-[84px]">
      {open ? (
        // 290px + 15px padding each side: the prototype's content-box panel.
        <div className="mb-2.5 w-[320px] max-w-[calc(100vw-32px)] rounded-[18px] bg-[#231E1A] px-[15px] pb-[13px] pt-3.5 text-white shadow-[0_26px_54px_-26px_rgba(35,30,26,.6)]">
          <div className="flex items-center gap-[9px]">
            <span className="flex size-[26px] flex-none items-end justify-center overflow-hidden rounded-full bg-white">
              <img src={shiftyGuide} alt="Shifty" className="block h-auto w-[110%] max-w-none" />
            </span>
            <p className="m-0 flex-auto text-[12.5px] font-extrabold">
              Ask ShiftOS <span className="font-semibold text-[#B4A8A0]">· Read-only</span>
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Minimize" className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-[14px] text-[#B4A8A0] [line-height:normal]">
              –
            </button>
          </div>
          {result ? (
            <div className="mt-[11px] rounded-[12px] bg-white px-3 py-2.5 text-[#38312B]">
              <p className="m-0 text-[12px] leading-[1.5]">{result}</p>
            </div>
          ) : null}
          <div className="relative mt-[11px] flex items-center gap-[7px] rounded-[12px] border border-solid border-[#3B322C] bg-[#1A1613] py-[5px] pl-3 pr-[5px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && run(query)}
              placeholder="Ask or command…"
              aria-label="Ask ShiftOS"
              className="h-8 min-w-0 flex-auto border-0 bg-transparent p-0 text-[12.5px] text-white outline-none placeholder:text-[#757575]"
            />
            <button type="button" onClick={() => run(query)} className="h-8 cursor-pointer rounded-[9px] border-0 bg-[#F04E17] px-[13px] text-[11.5px] font-bold text-white [line-height:normal]">
              Ask
            </button>
          </div>
          <div className="mt-[9px] flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => run(chip.q)}
                className="h-[27px] cursor-pointer rounded-full border border-solid border-[#3B322C] bg-transparent px-2.5 text-[10.5px] font-bold text-[#DED5CF] [line-height:normal]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ask ShiftOS"
        className="flex size-[52px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-0 bg-[#231E1A] p-0 shadow-[0_16px_30px_-14px_rgba(35,30,26,.6)]"
      >
        <img src={shiftyGuide} alt="Shifty" className="block h-auto w-[112%] max-w-none" />
      </button>
    </div>
  );
}

/** Handoff bottomNav: the four sections along the bottom below ~860px. */
function AdminBottomNav(): React.ReactElement {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-0 border-t border-solid border-[#EBE7E3] bg-white min-[860px]:hidden" aria-label="Admin">
      {NAV.map((item) => {
        const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
        const color = active ? '#F04E17' : '#A79C93';
        return (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="flex flex-[1_1_0] flex-col items-center px-1 pb-2 pt-2.5">
            <span className="flex" style={{ color }}>
              <AdminIcon name={item.icon} size={17} />
            </span>
            <span className="mt-[3px] text-[10px] font-bold [line-height:normal]" style={{ color }}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AdminShell(): React.ReactElement {
  const { orgName } = useAdminOrg();
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen overflow-hidden bg-white font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif] text-[13px] leading-[1.55] text-[#38312B]">
      <AdminSidebar orgName={orgName} />
      <div id="main-content" className="relative flex min-w-0 flex-auto flex-col overflow-y-auto">
        <RouteErrorBoundary key={pathname}>
          <Outlet />
        </RouteErrorBoundary>
      </div>
      <AdminAssistant />
      <AdminBottomNav />
    </div>
  );
}
