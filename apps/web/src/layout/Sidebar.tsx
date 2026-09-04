import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Mail,
  Megaphone,
  Settings,
  Shield,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useSession } from '../auth/SessionProvider.js';
import { Logo } from '../marketing/Logo.js';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  /** Omit to show for every role; set to require a specific permission code (UI-002 §10 — hiding is UX only, the RPC layer re-checks). */
  requiresPermission?: string;
  /** Only render for an org-wide (Manager/Owner) role. */
  orgWideOnly?: boolean;
}

// If you add or remove a route here, also update APP_ROUTES in packages/constants/src/index.ts — the AI assistant's navigate tool checks paths against that list, not this one (a frontend file can't be imported from the backend).
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedules', label: 'Scheduling', icon: CalendarDays, requiresPermission: 'schedules.read' },
  { to: '/employees', label: 'Employees', icon: Users, requiresPermission: 'employees.read' },
  { to: '/tasks', label: 'Tasks', icon: CheckCircle2, requiresPermission: 'tasks.read' },
  { to: '/attendance', label: 'Attendance', icon: Clock, requiresPermission: 'attendance.read' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, requiresPermission: 'announcements.read' },
  { to: '/requests', label: 'Requests', icon: ArrowLeftRight, requiresPermission: 'swaps.read' },
  { to: '/branches', label: 'Branches', icon: Building2, requiresPermission: 'branches.read' },
  { to: '/members', label: 'Members & Roles', icon: Shield, requiresPermission: 'org.members.manage' },
  { to: '/invitations', label: 'Invitations', icon: Mail, requiresPermission: 'org.members.manage' },
  { to: '/organization', label: 'Organization', icon: Settings, requiresPermission: 'organizations.read' },
  { to: '/admin', label: 'Admin Console', icon: ShieldCheck, requiresPermission: 'organizations.read' }
];

/** Resolves the permission-filtered nav — shared by the desktop sidebar and the mobile tab bar/More sheet (design's mobileTabs + moreItems). */
export function useNavItems(): NavItem[] {
  const { myContext, hasPermission } = useSession();
  const isOrgWide = myContext?.branchAccess.isOrgWide ?? false;
  return NAV_ITEMS.filter((item) => {
    if (item.orgWideOnly && !isOrgWide) return false;
    if (item.requiresPermission && !hasPermission(item.requiresPermission)) return false;
    return true;
  });
}

/**
 * Dashboard sidebar, restyled 1:1 from `ShiftOS Dashboards.dc.html`'s aside:
 * white surface with the full logo, the uppercase role label, quiet nav
 * buttons (current = brand-soft pill with deep text), and the bordered
 * account card (initials avatar with presence dot) + Log out link pinned to
 * the bottom.
 */
export function Sidebar(): React.ReactElement {
  const { profile, myContext, signOut } = useSession();
  const navigate = useNavigate();
  const isOrgWide = myContext?.branchAccess.isOrgWide ?? false;
  const hasSupervisorSignal = ['employees.create', 'employees.update', 'schedules.create', 'branches.update'].some((permission) =>
    myContext?.permissions.includes(permission)
  );
  const hasAdminSignal = myContext?.permissions.includes('org.members.manage') ?? false;
  const roleLabel = isOrgWide ? 'Manager' : hasSupervisorSignal ? 'Supervisor' : hasAdminSignal ? 'Admin' : 'Staff';

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Your account';
  const initials =
    profile
      ? `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase() || 'ME'
      : 'ME';

  const items = useNavItems();

  return (
    <nav aria-label="Primary" className="flex h-full w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-5 pb-[18px] pt-[22px]">
        <Logo size="sm" />
      </div>

      <div className="px-5 pb-2.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-neutral-400">{roleLabel}</div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors',
                isActive ? 'bg-brand-soft text-brand-deep' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              ].join(' ')
            }
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-200 p-3">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-[11px] py-[9px] text-left transition-colors hover:border-neutral-300"
        >
          <span className="relative shrink-0">
            <span className="flex size-[30px] items-center justify-center rounded-full bg-brand-soft text-[11px] font-extrabold text-brand-deep">
              {initials}
            </span>
            <span aria-hidden="true" className="absolute -bottom-px -right-px size-[9px] rounded-full border-2 border-white bg-success-500" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-bold text-neutral-900">{fullName}</span>
            <span className="block text-[11px] text-neutral-400">{roleLabel}</span>
          </span>
          <span aria-hidden="true" className="text-[10px] text-neutral-400">
            ▾
          </span>
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex cursor-pointer items-center gap-2 px-[11px] py-2 text-[13px] font-bold text-brand-deep transition-colors hover:text-brand-500"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
