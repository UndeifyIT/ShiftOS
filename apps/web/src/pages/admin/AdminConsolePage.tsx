import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  Lock,
  Search,
  Settings,
  Users,
  X
} from 'lucide-react';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import { AssistantPanel } from '../../components/assistant/AssistantPanel.js';
import { DashStat, InitialsAvatar, StatusPill } from '../dashboard/dashboardWidgets.js';
import type { Branch, Department, Employee, Invitation, Member } from '../../types/domain.js';

/**
 * Standalone Admin console, recreated from `Local file check/
 * design_handoff_shiftos/ShiftOS Admin.dc.html` (Overview / Branches /
 * Branch Detail / Subscription / Settings). Org-level, read-only oversight:
 * Admins view branch health and subscription usage — day-to-day operations
 * stay with Managers and Supervisors (README §Admin).
 *
 * Every number is real (branches, employees, departments, invitations,
 * members via the live RPCs). Deliberate trims where the app has no backend:
 * billing is not wired (plan/capacity render with honest "not connected"
 * states, no invoices), and Branch Detail carries the Employees tab only —
 * members aren't branch-scoped, so a per-branch Leadership list isn't
 * derivable.
 */

type Screen = 'overview' | 'branches' | 'branch-detail' | 'subscription' | 'settings';

const SCREEN_TABS: { id: Screen; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'branches', label: 'Branches' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'settings', label: 'Settings' }
];

const SEAT_CAP = 400;

function SegTabs<T extends string>({
  tabs,
  current,
  onSelect,
  className = ''
}: {
  tabs: { id: T; label: string }[];
  current: T;
  onSelect: (id: T) => void;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`inline-flex gap-0.5 rounded-xl bg-[#F6F3F0] p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={[
            'cursor-pointer rounded-lg px-[11px] py-1.5 text-[11.5px] font-bold transition-colors',
            tab.id === current ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(56,49,43,0.16)]' : 'text-neutral-400 hover:text-neutral-600'
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ReadOnlyPill({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#F1EDEA] px-[11px] py-1.5 text-[11px] font-bold text-neutral-600 ${className}`}>
      <Lock className="size-3" aria-hidden="true" />
      Read-only for Admins
    </span>
  );
}

export default function AdminConsolePage(): React.ReactElement {
  const { profile, activeOrganization, myContext, hasPermission } = useSession();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('overview');
  const [detailBranchId, setDetailBranchId] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const canReadBranches = hasPermission('branches.read');
  const canReadEmployees = hasPermission('employees.read');
  const canManageMembers = hasPermission('org.members.manage');

  const { data: branches, isLoading: branchesLoading } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canReadBranches });
  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', undefined, { enabled: canReadBranches });
  const { data: invitations } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: canManageMembers });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: canManageMembers });

  const activeEmployees = (employees ?? []).filter((e) => e.is_active);
  const pendingInvitations = (invitations ?? []).filter((i) => i.status === 'pending');
  const seatCount = (members ?? []).filter((m) => m.is_active).length + activeEmployees.length;
  const seatPct = Math.min(100, Math.round((activeEmployees.length / SEAT_CAP) * 100));
  const orgName = activeOrganization?.name ?? 'Your organization';

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Admin';
  const initials =
    profile
      ? `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase() || 'AD'
      : 'AD';

  const detailBranch = (branches ?? []).find((b) => b.id === detailBranchId) ?? null;
  const detailEmployees = useMemo(
    () => (employees ?? []).filter((e) => e.branch_id === detailBranchId && e.is_active),
    [employees, detailBranchId]
  );
  const filteredDetailEmployees = detailEmployees.filter((e) => {
    if (!employeeSearch.trim()) return true;
    const haystack = `${e.first_name} ${e.last_name} ${e.employee_number}`.toLowerCase();
    return haystack.includes(employeeSearch.trim().toLowerCase());
  });

  const branchSummaries = useMemo(
    () =>
      (branches ?? []).map((branch) => ({
        branch,
        employeeCount: (employees ?? []).filter((e) => e.branch_id === branch.id && e.is_active).length,
        departmentCount: (departments ?? []).filter((d) => d.branch_id === branch.id && d.is_active).length
      })),
    [branches, employees, departments]
  );

  const filteredBranches = branchSummaries.filter(({ branch }) =>
    branchFilter === 'all' ? true : branchFilter === 'active' ? branch.is_active : !branch.is_active
  );

  const openBranch = (branchId: string) => {
    setDetailBranchId(branchId);
    setEmployeeSearch('');
    setScreen('branch-detail');
  };

  return (
    <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
      {/* Screen tabs — the design's top segmented control */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegTabs tabs={SCREEN_TABS} current={screen === 'branch-detail' ? 'branches' : screen} onSelect={(id) => setScreen(id)} />
        <ReadOnlyPill />
      </div>

      {/* ================= OVERVIEW ================= */}
      {screen === 'overview' ? (
        <div className="flex flex-col gap-[18px]">
          {/* Ask ShiftOS (read-only, answered from live org data) */}
          <section className="rounded-[20px] bg-[#231E1A] p-[20px_22px_17px] text-white shadow-[0_26px_54px_-32px_rgba(35,30,26,0.75)]">
            <div className="flex flex-wrap items-center gap-[11px]">
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-500 text-[13px] font-extrabold">
                S
              </span>
              <div className="min-w-0">
                <p className="text-[15.5px] font-extrabold tracking-[-0.015em]">Ask ShiftOS</p>
                <p className="mt-0.5 text-[11.5px] text-[#B4A8A0]">
                  Ask about your organization, or say "open branches" / "subscription usage".
                </p>
              </div>
              <span className="ml-auto inline-flex items-center rounded-full bg-brand-500/20 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[#FFB08C]">
                Read-only
              </span>
            </div>
            <div className="mt-[15px]">
              <AssistantPanel onClose={() => {}} />
            </div>
          </section>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <span className="flex size-[34px] items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                <Building2 className="size-[17px]" aria-hidden="true" />
              </span>
              <p className="mt-3.5 text-[26px] font-extrabold tracking-[-0.02em]">{(branches ?? []).length}</p>
              <p className="mt-1 text-xs text-neutral-500">Branches</p>
              {!branchesLoading && (branches ?? []).length === 0 ? (
                <p className="mt-1 text-[11px] text-neutral-400">None set up yet — check with your Manager.</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <span className="flex size-[34px] items-center justify-center rounded-xl bg-info-50 text-info-600">
                <Users className="size-[17px]" aria-hidden="true" />
              </span>
              <p className="mt-3.5 text-[26px] font-extrabold tracking-[-0.02em]">{activeEmployees.length}</p>
              <p className="mt-1 text-xs text-neutral-500">Employees</p>
              {!employeesLoading && activeEmployees.length === 0 ? (
                <p className="mt-1 text-[11px] text-neutral-400">
                  {(branches ?? []).length === 0 ? 'No branches to staff yet.' : 'None added yet.'}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <span className="flex size-[34px] items-center justify-center rounded-xl bg-success-soft text-success-600">
                <Check className="size-[17px]" aria-hidden="true" />
              </span>
              <p className="mt-3.5 text-[26px] font-extrabold tracking-[-0.02em]">{pendingInvitations.length}</p>
              <p className="mt-1 text-xs text-neutral-500">Pending invitations</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <span className="flex size-[34px] items-center justify-center rounded-xl bg-warning-soft text-warning-600">
                <CreditCard className="size-[17px]" aria-hidden="true" />
              </span>
              <p className="mt-3.5 text-[26px] font-extrabold tracking-[-0.02em]">{seatPct}%</p>
              <p className="mt-1 text-xs text-neutral-500">Capacity used</p>
            </div>
          </div>

          {/* Subscription card */}
          <section className="rounded-2xl border border-[#F7DFD1] bg-[#FEFAF7] p-5">
            <div className="flex flex-wrap items-start gap-3.5">
              <div className="min-w-0 flex-[1_1_220px]">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-neutral-400">Subscription</p>
                <p className="mt-2 text-[22px] font-extrabold tracking-[-0.02em]">
                  Free trial <span className="text-[13px] font-bold text-neutral-500">— no charge while you're trying ShiftOS</span>
                </p>
                <p className="mt-1.5 text-[12.5px] text-neutral-500">
                  {activeEmployees.length} of {SEAT_CAP} employee seats used — billing isn't connected yet
                </p>
              </div>
              <div className="min-w-[180px] flex-[1_1_220px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-500">Usage</span>
                  <span className="text-xs font-bold text-neutral-500">{seatPct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3EEE9]">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${seatPct}%` }} />
                </div>
                <p className="mt-2 text-[11.5px] text-neutral-400">No renewal date — billing isn't wired up yet</p>
              </div>
              <button
                type="button"
                onClick={() => setScreen('subscription')}
                className="h-10 cursor-pointer self-center rounded-[11px] bg-brand-500 px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-600"
              >
                Manage Subscription
              </button>
            </div>
          </section>

          {/* Needs attention */}
          {(pendingInvitations.length > 0 || branchSummaries.some((b) => !b.branch.is_active)) ? (
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <h2 className="m-0 border-b border-neutral-100 px-[18px] py-[15px] text-[14.5px] font-extrabold">Needs Attention</h2>
              {pendingInvitations.length > 0 ? (
                <div className="flex items-start gap-3 border-b border-neutral-50 px-[18px] py-[13px]">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] bg-warning-soft text-warning-600">
                    <Users className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold">
                      {pendingInvitations.length} invitation{pendingInvitations.length === 1 ? '' : 's'} still pending
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">Sent to teammates who haven't accepted yet.</span>
                  </span>
                  <Link
                    to="/invitations"
                    className="inline-flex h-8 shrink-0 items-center rounded-[9px] border border-neutral-200 bg-white px-3 text-[11.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
                  >
                    Review
                  </Link>
                </div>
              ) : null}
              {branchSummaries
                .filter((b) => !b.branch.is_active)
                .map(({ branch }) => (
                  <div key={branch.id} className="flex items-start gap-3 border-b border-neutral-50 px-[18px] py-[13px] last:border-b-0">
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] bg-warning-soft text-warning-600">
                      <Building2 className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-extrabold">{branch.name} is archived</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">This branch is inactive — its data stays available.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openBranch(branch.id)}
                      className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-[9px] border border-neutral-200 bg-white px-3 text-[11.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
                    >
                      View
                    </button>
                  </div>
                ))}
            </section>
          ) : null}

          {/* Branch previews */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-[18px_20px]">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[14.5px] font-extrabold">Your Branches</h2>
              <span className="text-[11.5px] text-neutral-400">
                {(branches ?? []).length} total · {branchSummaries.reduce((sum, b) => sum + b.employeeCount, 0)} employees
              </span>
              <button
                type="button"
                onClick={() => setScreen('branches')}
                className="ml-auto h-9 cursor-pointer rounded-[10px] border border-neutral-200 bg-white px-[15px] text-[12.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
              >
                View all branches →
              </button>
            </div>
            <div className="mt-3.5 flex flex-col gap-[9px]">
              {branchesLoading ? (
                <p className="text-sm text-neutral-500">Loading branches…</p>
              ) : (
                branchSummaries.slice(0, 3).map(({ branch, employeeCount }) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => openBranch(branch.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[13px] border border-neutral-100 bg-[#FDFCFB] px-[14px] py-3 text-left transition-colors hover:border-neutral-300"
                  >
                    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                      <Building2 className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-neutral-900">{branch.name}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-neutral-500">
                        {branch.address ?? 'No address'} · {employeeCount} employees
                      </span>
                    </span>
                    <StatusPill tone={branch.is_active ? 'ok' : 'neutral'}>{branch.is_active ? 'Healthy' : 'Archived'}</StatusPill>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {/* ================= BRANCHES ================= */}
      {screen === 'branches' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">Your Branches</h1>
            <span className="text-[12.5px] text-neutral-500">
              {filteredBranches.length} of {(branches ?? []).length}
            </span>
            <SegTabs
              className="ml-auto"
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'archived', label: 'Archived' }
              ]}
              current={branchFilter}
              onSelect={setBranchFilter}
            />
          </div>

          {branchesLoading ? (
            <p className="text-sm text-neutral-500">Loading branches…</p>
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center rounded-[20px] border border-neutral-200 bg-white px-8 py-[52px] text-center">
              <span className="flex size-16 items-center justify-center rounded-[20px] bg-brand-soft text-brand-deep">
                <Building2 className="size-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-[21px] font-extrabold tracking-[-0.02em]">No branches here</h2>
              <p className="mt-2 max-w-[420px] text-[13.5px] leading-normal text-neutral-500">
                Branches are created by your Manager and will appear here once set up.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
              {filteredBranches.map(({ branch, employeeCount, departmentCount }) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => openBranch(branch.id)}
                  className="cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-brand-300"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                      <Building2 className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-neutral-900">{branch.name}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-neutral-500">{branch.address ?? 'No address'}</span>
                    </span>
                    <StatusPill tone={branch.is_active ? 'ok' : 'neutral'}>{branch.is_active ? 'Active' : 'Archived'}</StatusPill>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-left">
                    <span>
                      <span className="block text-[15px] font-extrabold">{employeeCount}</span>
                      <span className="block text-[10.5px] text-neutral-400">Employees</span>
                    </span>
                    <span>
                      <span className="block text-[15px] font-extrabold">{departmentCount}</span>
                      <span className="block text-[10.5px] text-neutral-400">Departments</span>
                    </span>
                    <span>
                      <span className="block text-[15px] font-extrabold">{new Date(branch.created_at).getFullYear()}</span>
                      <span className="block text-[10.5px] text-neutral-400">Since</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ================= BRANCH DETAIL ================= */}
      {screen === 'branch-detail' && detailBranch ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setScreen('branches')}
            className="flex cursor-pointer items-center gap-1.5 self-start text-[12.5px] font-bold text-neutral-500 transition-colors hover:text-neutral-800"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to branches
          </button>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start gap-3.5">
              <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[15px] bg-brand-soft text-brand-deep">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-[1_1_260px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[21px] font-extrabold tracking-[-0.02em]">{detailBranch.name}</h1>
                  <StatusPill tone={detailBranch.is_active ? 'ok' : 'neutral'}>{detailBranch.is_active ? 'Active' : 'Archived'}</StatusPill>
                </div>
                <p className="mt-1.5 text-[12.5px] text-neutral-500">{detailBranch.address ?? 'No address on file'}</p>
                <p className="mt-1 text-[12.5px] text-neutral-400">{orgName}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 border-t border-neutral-100 pt-3.5">
              <div>
                <p className="text-[10.5px] text-neutral-400">Workforce</p>
                <p className="mt-1 text-sm font-extrabold">{detailEmployees.length} employees</p>
              </div>
              <div>
                <p className="text-[10.5px] text-neutral-400">Departments</p>
                <p className="mt-1 text-sm font-extrabold">
                  {(departments ?? []).filter((d) => d.branch_id === detailBranch.id && d.is_active).length} active
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-neutral-400">Store type</p>
                <p className="mt-1 text-sm font-extrabold">
                  {typeof detailBranch.settings?.storeType === 'string' ? (detailBranch.settings.storeType as string) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-neutral-400">Branch since</p>
                <p className="mt-1 text-sm font-extrabold">{new Date(detailBranch.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </section>

          {/* Employees tab (read-only) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[15px] font-extrabold">Employees</h2>
            <span className="text-xs text-neutral-400">{detailEmployees.length} active</span>
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                type="search"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employees…"
                className="h-[38px] w-[220px] rounded-[10px] border border-neutral-300 bg-white pl-9 pr-3 text-[12.5px] outline-none transition-colors focus:border-brand-500"
              />
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="grid grid-cols-[minmax(0,1.3fr)_120px_minmax(0,1fr)_110px] gap-2.5 border-b border-neutral-100 px-[18px] py-[11px] text-[10px] font-extrabold uppercase tracking-[0.08em] text-neutral-400">
              <span>Employee</span>
              <span>Status</span>
              <span>Employee #</span>
              <span className="text-right">Added</span>
            </div>
            {employeesLoading ? (
              <p className="px-[18px] py-5 text-sm text-neutral-500">Loading employees…</p>
            ) : filteredDetailEmployees.length === 0 ? (
              <div className="px-[18px] py-6 text-center">
                <p className="text-sm font-bold text-neutral-700">
                  {employeeSearch.trim() ? `No employees match "${employeeSearch.trim()}"` : 'No employees at this branch yet'}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {employeeSearch.trim() ? 'Try another search term.' : 'Employees appear here once your Manager adds them.'}
                </p>
              </div>
            ) : (
              filteredDetailEmployees.map((employee) => {
                const name = `${employee.first_name} ${employee.last_name}`;
                return (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[minmax(0,1.3fr)_120px_minmax(0,1fr)_110px] items-center gap-2.5 border-b border-neutral-50 px-[18px] py-[11px] last:border-b-0"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <InitialsAvatar name={name} size={28} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-bold text-neutral-900">{name}</span>
                        <span className="block truncate text-[11px] text-neutral-400">{employee.email}</span>
                      </span>
                    </span>
                    <StatusPill tone={employee.is_active ? 'ok' : 'neutral'}>{employee.is_active ? 'Active' : 'Inactive'}</StatusPill>
                    <span className="truncate text-[12.5px] text-neutral-600">#{employee.employee_number}</span>
                    <span className="text-right text-xs text-neutral-500">{new Date(employee.created_at).toLocaleDateString()}</span>
                  </div>
                );
              })
            )}
          </section>
        </div>
      ) : null}

      {/* ================= SUBSCRIPTION ================= */}
      {screen === 'subscription' ? (
        <div className="flex max-w-[820px] flex-col gap-4">
          <section className="rounded-2xl border border-[#F7DFD1] bg-[#FEFAF7] p-5">
            <div className="flex flex-wrap items-start gap-3.5">
              <div className="min-w-0 flex-[1_1_260px]">
                <span className="inline-flex items-center rounded-full bg-brand-500 px-[11px] py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white">
                  Trial
                </span>
                <h2 className="mt-3 text-[22px] font-extrabold tracking-[-0.025em]">
                  Free <span className="text-[13px] font-semibold text-neutral-500">while you're trialing</span>
                </h2>
                <p className="mt-1.5 text-[12.5px] text-neutral-500">
                  {activeEmployees.length} of {SEAT_CAP} employee seats used — no renewal date (billing isn't connected)
                </p>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  title="Billing isn't connected yet"
                  className="h-10 cursor-not-allowed rounded-[11px] bg-neutral-200 px-4 text-[12.5px] font-bold text-neutral-400"
                >
                  Change plan
                </button>
                <button
                  type="button"
                  disabled
                  title="Billing isn't connected yet"
                  className="h-10 cursor-not-allowed rounded-[11px] border border-neutral-200 bg-white px-[15px] text-[12.5px] font-bold text-neutral-400"
                >
                  Update payment method
                </button>
              </div>
            </div>
            <div className="mt-4 border-t border-[#F7E3D6] pt-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-neutral-500">Employee capacity used</span>
                <span className="text-xs font-bold text-neutral-500">{seatPct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3EEE9]">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${seatPct}%` }} />
              </div>
            </div>
            {seatPct >= 80 ? (
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <p className="text-[12.5px] font-bold text-brand-deep">You're using {seatPct}% of your employee capacity.</p>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <h2 className="m-0 border-b border-neutral-100 px-[18px] py-[15px] text-[14.5px] font-extrabold">Invoices</h2>
            <p className="px-[18px] py-6 text-sm text-neutral-500">
              No invoices yet — billing isn't connected for this organization. Once a paid plan is active, invoices appear here.
            </p>
          </section>
        </div>
      ) : null}

      {/* ================= SETTINGS ================= */}
      {screen === 'settings' ? (
        <div className="flex max-w-[900px] flex-col gap-4">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-[15px] font-extrabold">Profile photo</h2>
            <p className="mt-1.5 text-[12.5px] text-neutral-500">
              Optional. Without a photo, ShiftOS shows your initials everywhere your name appears.
            </p>
            <div className="mt-3.5 flex items-center gap-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-xl font-extrabold text-brand-deep">
                {initials}
              </span>
              <div>
                <p className="text-sm font-extrabold">{fullName}</p>
                <p className="mt-1 text-[12.5px] text-neutral-500">
                  {profile?.email ?? ''} — Admin
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-[15px] font-extrabold">Your role and access</h2>
            <p className="mb-3.5 mt-1.5 text-[12.5px] text-neutral-500">
              Admins oversee the organization and subscription — day-to-day operations stay with Managers and Supervisors.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'View branches', ok: canReadBranches },
                { label: 'View employees (read-only)', ok: canReadEmployees },
                { label: 'View invitations', ok: canManageMembers },
                { label: 'View organization', ok: hasPermission('organizations.read') }
              ]
                .filter((p) => p.ok)
                .map((p) => (
                  <span
                    key={p.label}
                    className="inline-flex items-center gap-2 rounded-full border border-[#BFE6CF] bg-success-50 px-[13px] py-2 text-xs font-bold text-[#1E6B45]"
                  >
                    <span className="flex size-4 items-center justify-center rounded-full bg-success-500 text-white">
                      <Check className="size-2.5" aria-hidden="true" />
                    </span>
                    {p.label}
                  </span>
                ))}
            </div>
            <p className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[0.06em] text-neutral-400">Not included</p>
            <div className="flex flex-wrap gap-2">
              {['Manage schedules', 'Manage employees', 'Mark attendance', 'Assign tasks'].map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-2 rounded-full border border-[#F3C6BD] bg-error-50 px-[13px] py-2 text-xs font-bold text-[#8E2A17]"
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-error-500 text-white">
                    <X className="size-2.5" aria-hidden="true" />
                  </span>
                  {p}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-[15px] font-extrabold">Organization details</h2>
            <p className="mt-1.5 text-[12.5px] text-neutral-500">
              {orgName} — {myContext?.branchAccess.isOrgWide ? 'org-wide access' : 'branch-scoped access'}. Organization details are
              managed by your Manager.
            </p>
            <Link
              to="/organization"
              className="mt-3 inline-flex h-10 items-center rounded-[11px] border border-neutral-200 bg-white px-4 text-[12.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
            >
              <Settings className="mr-2 size-4" aria-hidden="true" /> Open organization settings
            </Link>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-[15px] font-extrabold">Security & sessions</h2>
            <p className="mt-1.5 text-[12.5px] text-neutral-500">
              Change your password and review active sessions from your account security page.
            </p>
            <Link
              to="/security"
              className="mt-3 inline-flex h-10 items-center rounded-[11px] bg-brand-500 px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-600"
            >
              Open security settings
            </Link>
          </section>

          <section className="rounded-2xl border border-[#F7DFD1] bg-[#FEFAF7] p-5">
            <h2 className="text-[15px] font-extrabold">Billing</h2>
            <p className="mt-1.5 text-[12.5px] text-neutral-500">
              Trial plan — {activeEmployees.length} of {SEAT_CAP} seats used. Billing isn't connected yet.
            </p>
            <button
              type="button"
              onClick={() => setScreen('subscription')}
              className="mt-3 inline-flex h-10 items-center rounded-[11px] border border-neutral-200 bg-white px-4 text-[12.5px] font-bold text-neutral-900 transition-colors hover:border-neutral-300"
            >
              <CreditCard className="mr-2 size-4" aria-hidden="true" /> Go to subscription
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
