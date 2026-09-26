import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  Settings,
  UserRound,
  Users
} from 'lucide-react';
import { useSession } from '../auth/SessionProvider.js';
import { useDefaultBranchId } from '../auth/useDefaultBranchId.js';
import logoShiftOS from '../assets/logo-shiftos.png';
import { useRpcQuery } from '../lib/useRpc.js';
import { currentTime } from '../lib/clock.js';
import type { AttendanceRecord, Branch, Invitation, LeaveRequest, ShiftSwap } from '../types/domain.js';
import { isOpenSwap, useMyAnnouncements, useMyRequests } from '../pages/staff/useStaffSelf.js';

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
// The handoff's Manager nav (NAVS.Manager, in its order) plus Attendance, placed before Tasks as in the Supervisor nav.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/schedules', label: 'Schedules', icon: CalendarDays, requiresPermission: 'schedules.read' },
  { to: '/employees', label: 'Employees', icon: Users, requiresPermission: 'employees.read' },
  { to: '/supervisors', label: 'Supervisors', icon: UserRound, requiresPermission: 'org.members.manage' },
  { to: '/admins', label: 'Admins', icon: Building2, requiresPermission: 'org.members.manage' },
  { to: '/attendance', label: 'Attendance', icon: Clock, requiresPermission: 'attendance.read' },
  { to: '/tasks', label: 'Tasks', icon: CheckCircle2, requiresPermission: 'tasks.read' },
  { to: '/recent-activity', label: 'Recent Activity', icon: Activity, requiresPermission: 'attendance.read' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, requiresPermission: 'announcements.read' },
  { to: '/requests', label: 'Requests', icon: ArrowLeftRight, requiresPermission: 'swaps.read' },
  { to: '/reports', label: 'Reports', icon: BarChart3, requiresPermission: 'attendance.read' },
  { to: '/settings', label: 'Settings', icon: Settings }
];

// The handoff's Supervisor nav (NAVS.Supervisor, in its order): the shift they run, their team, and the tools they use on it.
export const SUPERVISOR_NAV_ITEMS: NavItem[] = [
  { to: '/', label: "Today's Shift", icon: LayoutDashboard },
  { to: '/schedules', label: 'Schedules', icon: CalendarDays, requiresPermission: 'schedules.read' },
  { to: '/team', label: 'Team', icon: Users, requiresPermission: 'employees.read' },
  { to: '/attendance', label: 'Attendance', icon: Clock, requiresPermission: 'attendance.read' },
  { to: '/tasks', label: 'Tasks', icon: CheckCircle2, requiresPermission: 'tasks.read' },
  { to: '/recent-activity', label: 'Recent Activity', icon: Activity, requiresPermission: 'attendance.read' },
  { to: '/requests', label: 'Requests', icon: ArrowLeftRight, requiresPermission: 'swaps.read' },
  { to: '/shift-notes', label: 'Shift Notes', icon: NotebookPen, requiresPermission: 'shiftnotes.read' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, requiresPermission: 'announcements.read' },
  { to: '/settings', label: 'Settings', icon: Settings }
];

// The handoff's Staff nav (NAVS.Staff, in its order): their own shift, week, requests, notices and profile.
export const STAFF_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'My Shift', icon: Clock },
  { to: '/my-schedule', label: 'My Schedule', icon: CalendarDays, requiresPermission: 'schedules.read' },
  { to: '/requests', label: 'My Requests', icon: ArrowLeftRight, requiresPermission: 'swaps.read' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, requiresPermission: 'announcements.read' },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

export type NavRole = 'Manager' | 'Supervisor' | 'Admin' | 'Staff';

const RUNS_OPERATIONS = ['employees.create', 'employees.update', 'schedules.create', 'schedules.update'];

/**
 * Which of the handoff's experiences a person gets, from what they can do:
 * org-wide access is the Manager; someone who manages members but runs no
 * schedules or employees is an Admin (the standalone Admin console — 048/072);
 * a branch role that runs the schedule or the team is a Supervisor; anyone
 * else is Staff.
 */
export function useNavRole(): NavRole {
  const { myContext } = useSession();
  if (myContext?.branchAccess.isOrgWide) return 'Manager';
  const permissions = myContext?.permissions ?? [];
  const runsOperations = RUNS_OPERATIONS.some((code) => permissions.includes(code));
  if (permissions.includes('org.members.manage') && !runsOperations) return 'Admin';
  if (runsOperations) return 'Supervisor';
  return 'Staff';
}

/** Resolves the permission-filtered nav — shared by the desktop sidebar and the mobile tab bar/More sheet (design's mobileTabs + moreItems). */
export function useNavItems(): NavItem[] {
  const { myContext, hasPermission } = useSession();
  const role = useNavRole();
  const isOrgWide = myContext?.branchAccess.isOrgWide ?? false;
  const items = role === 'Supervisor' ? SUPERVISOR_NAV_ITEMS : role === 'Staff' ? STAFF_NAV_ITEMS : NAV_ITEMS;
  return items.filter((item) => {
    if (item.orgWideOnly && !isOrgWide) return false;
    if (item.requiresPermission && !hasPermission(item.requiresPermission)) return false;
    return true;
  });
}

/** Handoff ICON.store — the branch scope card's glyph. */
function ScopeIcon(): React.ReactElement {
  const paths = ['M4 9.5 6 4h12l2 5.5', 'M4.5 9.5h15V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z', 'M9.5 20.5v-6h5v6'];
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="block">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Live counts for the nav badges (handoff BADGES.Manager): requests waiting on the viewer's approval, and supervisor invitations still outstanding. */
function useNavBadges(): Record<string, number> {
  const { hasPermission } = useSession();
  const { data: swaps } = useRpcQuery<ShiftSwap[]>('list_pending_shift_swap_approvals', undefined, { enabled: hasPermission('swaps.approve') });
  const { data: leave } = useRpcQuery<LeaveRequest[]>('list_pending_leave', undefined, { enabled: hasPermission('leave.approve') });
  const { data: invitations } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: hasPermission('org.members.manage') });
  const outstanding = (invitations ?? []).filter((i) => i.status === 'pending' && new Date(i.expires_at).getTime() > Date.now());
  // Supervisor: today's absences on the home branch (handoff BADGES.Supervisor.Attendance).
  const role = useNavRole();
  const branchId = useDefaultBranchId();
  const now = currentTime();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { data: today } = useRpcQuery<AttendanceRecord[]>(
    'list_attendance_for_branch_and_range',
    branchId ? { branchId, startIso: dayStart.toISOString(), endIso: new Date(dayStart.getTime() + 86_400_000).toISOString() } : undefined,
    { enabled: role === 'Supervisor' && Boolean(branchId) && hasPermission('attendance.read') }
  );
  // Staff: notices still waiting on my acknowledgement, and my own requests still open (handoff BADGES.Staff).
  const mine = useMyRequests(role === 'Staff');
  const notices = useMyAnnouncements(role === 'Staff');
  if (role === 'Staff') {
    return {
      '/announcements': notices.published.filter((a) => !notices.acknowledged.get(a.id)).length,
      '/requests': mine.swaps.filter(isOpenSwap).length + mine.leave.filter((l) => l.status === 'pending').length
    };
  }
  return {
    '/attendance': (today ?? []).filter((r) => !r.deleted_at && (r.attendance_status === 'absent' || r.attendance_status === 'no_show')).length,
    '/requests': (swaps?.length ?? 0) + (leave ?? []).filter((l) => l.status === 'pending').length,
    '/supervisors': outstanding.filter((i) => /supervisor/i.test(i.role_name)).length
  };
}

/**
 * Dashboard sidebar, rebuilt 1:1 from `ShiftOS Dashboards.dc.html`'s aside
 * (lines 27-65): the full logo, the uppercase role label, the handoff's nav
 * (plus Attendance) as icon-less buttons (current = solid brand pill with its
 * glow), count badges, and the bordered branch + account cards with Log out
 * pinned to the bottom. The branch card only names the person's branch —
 * nobody switches branches from here. Sizes are
 * the prototype's rendered ones (no CSS reset: `line-height: normal`, the
 * browser's 13.33px button text, a content-box presence dot).
 */
export function Sidebar(): React.ReactElement {
  const { profile, signOut, hasPermission } = useSession();
  const navigate = useNavigate();
  const roleLabel = useNavRole();

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Your account';
  const initials =
    profile
      ? `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase() || 'ME'
      : 'ME';

  const items = useNavItems();
  const badges = useNavBadges();
  // The branch this person works in. Managers never switch branches, so the card only names it.
  const homeBranchId = useDefaultBranchId();
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: hasPermission('branches.read') });
  const homeBranch = (branches ?? []).find((b) => b.id === homeBranchId);

  const card =
    'flex w-full items-center gap-2.5 rounded-[12px] border border-solid border-[#EBE7E3] bg-white px-[11px] py-[9px] text-left text-[13.3333px] text-black';

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-[221px] shrink-0 flex-col border-r border-solid border-[#EBE7E3] bg-white text-[13px] text-[#38312B] [line-height:normal]"
    >
      <div className="flex items-center gap-[9px] px-5 pb-[18px] pt-[22px]">
        <Link to="/" aria-label="ShiftOS home" className="block">
          <img src={logoShiftOS} alt="ShiftOS" className="block h-8 w-auto max-w-none" />
        </Link>
      </div>

      <div className="px-5 pb-2.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A79C93]">{roleLabel}</div>

      <div className="flex flex-auto flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3">
        {items.map((item) => {
          const badge = badges[item.to] ?? 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex w-full items-center gap-2 rounded-[11px] px-3 py-[9px] text-[13px] font-bold',
                  isActive ? 'bg-[#F04E17] text-white shadow-[0_8px_18px_-10px_rgba(240,78,23,.75)]' : 'bg-transparent text-[#857A72] hover:text-[#38312B]'
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="min-w-0 flex-auto truncate text-left">{item.label}</span>
                  {badge > 0 ? (
                    <span
                      className={[
                        'flex h-[19px] min-w-[19px] flex-none items-center justify-center rounded-full px-[5px] text-[10px] font-extrabold',
                        isActive ? 'bg-[rgba(255,255,255,.24)] text-white' : 'bg-[#FDF0E9] text-[#C6420E]'
                      ].join(' ')}
                    >
                      {badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-solid border-[#EBE7E3] p-3">
        {homeBranch ? (
          <div className={card}>
            <span aria-hidden="true" className="flex size-[26px] flex-none items-center justify-center rounded-[8px] bg-[#FDF0E9] text-[#C6420E]">
              <ScopeIcon />
            </span>
            <span className="min-w-0 flex-auto">
              <span className="block text-[10px] text-[#A79C93]">Branch</span>
              <span className="block truncate text-[12.5px] font-bold">{homeBranch.name}</span>
            </span>
            <span aria-hidden="true" className="text-[10px] text-[#A79C93]">
              ▾
            </span>
          </div>
        ) : null}
        <button type="button" onClick={() => navigate('/profile')} className={`${card} cursor-pointer hover:border-[#DDD6D0]`}>
          <span className="relative flex-none">
            <span className="flex size-[30px] items-center justify-center rounded-full bg-[#FDF0E9] text-[11px] font-extrabold text-[#C6420E]">{initials}</span>
            {/* 9px + a 2px border each side: the handoff's content-box dot renders 13px. */}
            <span aria-hidden="true" className="absolute -bottom-px -right-px size-[13px] rounded-full border-2 border-solid border-white bg-[#2E9E62]" />
          </span>
          <span className="min-w-0 flex-auto">
            <span className="block truncate text-[12.5px] font-bold">{fullName}</span>
            <span className="block text-[11px] text-[#A79C93]">{roleLabel}</span>
          </span>
          <span aria-hidden="true" className="text-[10px] text-[#A79C93]">
            ▾
          </span>
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex cursor-pointer items-center gap-2 border-0 bg-transparent px-[11px] py-2 text-[13px] font-bold text-[#C6420E] hover:text-[#F04E17]"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
