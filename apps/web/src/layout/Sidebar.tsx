import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider.js';
import { LogoMark } from '../marketing/Logo.js';

interface NavItem {
  to: string;
  label: string;
  /** Omit to show for every role; set to require a specific permission code (UI-002 §10 — hiding is UX only, the RPC layer re-checks). */
  requiresPermission?: string;
  /** Only render for an org-wide (Manager/Owner) role. */
  orgWideOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/schedules', label: 'Scheduling', requiresPermission: 'schedules.read' },
  { to: '/employees', label: 'Employees', requiresPermission: 'employees.read' },
  { to: '/branches', label: 'Branches', requiresPermission: 'branches.read', orgWideOnly: true },
  { to: '/members', label: 'Members & Roles', requiresPermission: 'org.members.manage', orgWideOnly: true },
  { to: '/invitations', label: 'Invitations', requiresPermission: 'org.members.manage', orgWideOnly: true },
  { to: '/organization', label: 'Organization', requiresPermission: 'organizations.read', orgWideOnly: true }
];

export function Sidebar(): React.ReactElement {
  const { myContext, hasPermission } = useSession();
  const isOrgWide = myContext?.branchAccess.isOrgWide ?? false;

  const items = NAV_ITEMS.filter((item) => {
    if (item.orgWideOnly && !isOrgWide) return false;
    if (item.requiresPermission && !hasPermission(item.requiresPermission)) return false;
    return true;
  });

  return (
    <nav aria-label="Primary" className="flex h-full w-60 shrink-0 flex-col gap-1 bg-neutral-900 p-4">
      <div className="mb-5 flex items-center gap-2 px-2">
        <LogoMark className="h-8 w-8" />
        <span className="font-display text-lg font-semibold tracking-tight text-white">ShiftOS</span>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-brand-400 bg-neutral-800 text-white'
                : 'border-transparent text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
