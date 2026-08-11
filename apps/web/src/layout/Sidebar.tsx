import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider.js';

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
    <nav aria-label="Primary" className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">S</span>
        <span className="text-lg font-bold text-neutral-900">ShiftOS</span>
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
