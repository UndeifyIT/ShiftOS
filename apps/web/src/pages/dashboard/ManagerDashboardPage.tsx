import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import {
  CheckCircle,
  DashEmptyPanel,
  DashHeader,
  DashNextStepAction,
  DashNextStepBanner,
  DashPanel,
  DashStat,
  InitialsAvatar,
  ProgressTrack,
  QuickActionCard,
  StatusPill
} from './dashboardWidgets.js';
import type { Branch, Employee, Invitation, Schedule } from '../../types/domain.js';

/**
 * Task 8 — the manager's single "what's next" banner. Priority-ordered over
 * data this page already fetches: no branches yet (nothing else can exist
 * without one) → no employees yet → no schedule at all yet → a draft exists
 * but nothing is published yet. Falls through to `null` (no banner) once the
 * basics are in place, and also falls through — rather than suggesting a
 * step this viewer's permissions don't support — at any stage where the
 * relevant `create` permission is missing.
 */
function computeManagerNextStep(args: {
  canReadBranches: boolean;
  branchCount: number;
  canCreateBranch: boolean;
  canReadEmployees: boolean;
  employeeCount: number;
  canCreateEmployee: boolean;
  canReadSchedules: boolean;
  scheduleCount: number;
  draftCount: number;
  publishedCount: number;
  canCreateSchedule: boolean;
}): { title: string; description: string; action?: DashNextStepAction } | null {
  const {
    canReadBranches,
    branchCount,
    canCreateBranch,
    canReadEmployees,
    employeeCount,
    canCreateEmployee,
    canReadSchedules,
    scheduleCount,
    draftCount,
    publishedCount,
    canCreateSchedule
  } = args;

  if (canReadBranches && branchCount === 0) {
    if (!canCreateBranch) return null;
    return {
      title: 'Set up your first branch',
      description: 'Branches are the foundation for staffing and scheduling — open one to get started.',
      action: { label: 'Open a branch', to: '/branches/new' }
    };
  }
  if (canReadEmployees && employeeCount === 0) {
    if (!canCreateEmployee) return null;
    return {
      title: 'Add your first employee',
      description: 'Bring your team into ShiftOS so you can start building schedules around them.',
      action: { label: 'Add employee', to: '/employees/new' }
    };
  }
  if (canReadSchedules && scheduleCount === 0) {
    if (!canCreateSchedule) return null;
    return {
      title: 'Create your first schedule',
      description: "Build a schedule for your team so everyone knows when they're working.",
      action: { label: 'Create a schedule', to: '/schedules/new' }
    };
  }
  if (canReadSchedules && draftCount > 0 && publishedCount === 0) {
    if (!canCreateSchedule) return null;
    return {
      title: 'Your schedule is ready for review',
      description: `${draftCount} draft schedule${draftCount === 1 ? '' : 's'} waiting — publish it so the team can see their shifts.`,
      action: { label: 'Publish it', to: '/schedules' }
    };
  }
  return null;
}

/**
 * WEB-017 — Manager dashboard: organization-wide scope. Restyled 1:1 onto
 * `ShiftOS Dashboards.dc.html`'s Manager Overview renderer (stat cards with
 * square tone dots, the branch-coverage panel with progress tracks and
 * status pills, the "Needs your attention" checklist, quick-action tiles and
 * the recent-activity aside) while every number stays real: employees,
 * branches, schedules and pending invitations from the live RPCs.
 */
export default function ManagerDashboardPage(): React.ReactElement {
  const { profile, activeOrganization, hasPermission } = useSession();
  const navigate = useNavigate();
  const canReadEmployees = hasPermission('employees.read');
  const canReadBranches = hasPermission('branches.read');
  const canReadSchedules = hasPermission('schedules.read');
  const canCreateSchedule = hasPermission('schedules.create');
  const canCreateBranch = hasPermission('branches.create');
  const canCreateEmployee = hasPermission('employees.create');
  const canManageMembers = hasPermission('org.members.manage');

  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const { data: branches, isLoading: branchesLoading } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canReadBranches });
  const { data: schedules, isLoading: schedulesLoading } = useRpcQuery<Schedule[]>('list_schedules', undefined, { enabled: canReadSchedules });
  const { data: invitations } = useRpcQuery<Invitation[]>('list_invitations', undefined, { enabled: canManageMembers });

  const activeEmployees = (employees ?? []).filter((e) => e.is_active);
  const publishedSchedules = (schedules ?? []).filter((s) => s.status === 'published');
  const draftSchedules = (schedules ?? []).filter((s) => s.status === 'draft');
  const pendingInvitations = (invitations ?? []).filter((i) => i.status === 'pending');
  const recentlyPublished = [...publishedSchedules].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4);

  const branchSummaries = useMemo(() => {
    const maxEmployees = Math.max(
      1,
      ...(branches ?? []).map((branch) => (employees ?? []).filter((e) => e.branch_id === branch.id && e.is_active).length)
    );
    return (branches ?? []).map((branch) => {
      const employeeCount = (employees ?? []).filter((e) => e.branch_id === branch.id && e.is_active).length;
      const scheduleCount = (schedules ?? []).filter((s) => s.branch_id === branch.id).length;
      return { branch, employeeCount, scheduleCount, pct: Math.round((employeeCount / maxEmployees) * 100) };
    });
  }, [branches, employees, schedules]);

  const attentionItems: { title: string; meta: string; tag: string; tone: 'warn' | 'info' | 'bad' }[] = [
    ...draftSchedules.slice(0, 2).map((schedule) => ({
      title: `“${schedule.name}” is still a draft`,
      meta: `Covers ${new Date(schedule.start_date).toLocaleDateString()} – ${new Date(schedule.end_date).toLocaleDateString()} — publish it so the team sees their shifts.`,
      tag: 'Scheduling',
      tone: 'warn' as const
    })),
    ...(pendingInvitations.length > 0
      ? [
          {
            title: `${pendingInvitations.length} invitation${pendingInvitations.length === 1 ? '' : 's'} still pending`,
            meta: 'Sent to teammates who haven’t accepted yet — resend or wait them out.',
            tag: 'Invitations',
            tone: 'info' as const
          }
        ]
      : []),
    ...((branches ?? []).length === 0
      ? [{ title: 'No branches yet', meta: 'Open your first location to start scheduling.', tag: 'Setup', tone: 'bad' as const }]
      : [])
  ];

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // Wait for every readable dataset to settle before judging "empty" — an
  // in-flight query reads as `undefined` → `[]`, which would otherwise flash
  // the "no branches"/"no employees" banner for a moment even when data exists.
  const nextStepDataReady =
    (!canReadBranches || !branchesLoading) && (!canReadEmployees || !employeesLoading) && (!canReadSchedules || !schedulesLoading);
  const nextStep = nextStepDataReady
    ? computeManagerNextStep({
        canReadBranches,
        branchCount: (branches ?? []).length,
        canCreateBranch,
        canReadEmployees,
        employeeCount: activeEmployees.length,
        canCreateEmployee,
        canReadSchedules,
        scheduleCount: (schedules ?? []).length,
        draftCount: draftSchedules.length,
        publishedCount: publishedSchedules.length,
        canCreateSchedule
      })
    : null;

  return (
    <div>
      <DashHeader
        title="Branch overview"
        subtitle={`${activeOrganization?.name ?? 'Your organization'} — ${today}`}
      />

      {nextStep ? <DashNextStepBanner {...nextStep} /> : null}

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3.5">
        {canReadEmployees ? (
          <DashStat
            label="Employees"
            value={activeEmployees.length}
            meta={
              (branches ?? []).length === 0
                ? 'no branches yet to assign them to'
                : `across ${(branches ?? []).length} branch${(branches ?? []).length === 1 ? '' : 'es'}`
            }
            dotTone="primary"
            loading={employeesLoading}
            action={
              activeEmployees.length === 0 && canCreateEmployee && (branches ?? []).length > 0
                ? { label: 'Add employee', to: '/employees/new' }
                : undefined
            }
          />
        ) : null}
        {canReadSchedules ? (
          <DashStat label="Published schedules" value={publishedSchedules.length} meta="visible to the team" dotTone="info" loading={schedulesLoading} />
        ) : null}
        {canReadSchedules ? (
          <DashStat label="Draft schedules" value={draftSchedules.length} meta="awaiting publish" dotTone="bad" loading={schedulesLoading} />
        ) : null}
        {canManageMembers ? (
          <DashStat label="Open invitations" value={pendingInvitations.length} meta="waiting on accept" dotTone="ok" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
          {canReadBranches ? (
            <DashPanel
              title="Branch coverage"
              linkLabel="Open schedules"
              linkTo="/schedules"
              footerNote="Coverage compares each branch's active team against the largest branch."
              actionLabel="Open scheduling"
              actionTo="/schedules"
            >
              {branchesLoading ? (
                <div className="flex flex-col gap-3 px-[18px] py-4">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-9 animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </div>
              ) : branchSummaries.length === 0 ? (
                <DashEmptyPanel
                  title="No branches yet"
                  description="Open your first location to start assigning employees and building schedules."
                  actionLabel={canCreateBranch ? 'Open a branch' : undefined}
                  actionTo={canCreateBranch ? '/branches/new' : undefined}
                />
              ) : (
                <div className="flex flex-col">
                  {branchSummaries.map(({ branch, employeeCount, scheduleCount, pct }) => (
                    <button
                      key={branch.id}
                      onClick={() => navigate(`/branches/${branch.id}`)}
                      className="flex flex-wrap items-center gap-2.5 border-b border-neutral-50 px-[18px] py-[13px] text-left transition-colors last:border-b-0 hover:bg-neutral-50/60"
                    >
                      <div className="flex min-w-0 flex-[1_1_190px] items-center gap-[11px]">
                        <InitialsAvatar name={branch.name} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-bold text-neutral-900">{branch.name}</span>
                          <span className="block truncate text-[11.5px] text-neutral-400">
                            {scheduleCount} schedule{scheduleCount === 1 ? '' : 's'}
                          </span>
                        </span>
                      </div>
                      <div className="min-w-[80px] flex-[0_1_110px] text-[12.5px] text-neutral-500">
                        {employeeCount} employee{employeeCount === 1 ? '' : 's'}
                      </div>
                      <ProgressTrack pct={pct} tone={pct >= 66 ? 'ok' : pct >= 33 ? 'warn' : 'bad'} label={`${pct}% of largest team`} />
                      <div className="ml-auto flex shrink-0 justify-end">
                        <StatusPill tone={branch.is_active ? 'ok' : 'neutral'}>{branch.is_active ? 'Active' : 'Archived'}</StatusPill>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </DashPanel>
          ) : null}

          {attentionItems.length > 0 ? (
            <DashPanel title="Needs your attention" linkLabel={undefined}>
              <ul className="m-0 list-none p-1.5">
                {attentionItems.map((item) => (
                  <li key={item.title} className="flex items-center gap-3 px-[18px] py-[11px]">
                    <CheckCircle done={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-neutral-900">{item.title}</span>
                      <span className="block text-[11.5px] text-neutral-400">{item.meta}</span>
                    </span>
                    <StatusPill tone={item.tone}>{item.tag}</StatusPill>
                  </li>
                ))}
              </ul>
            </DashPanel>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4">
          <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
            <h2 className="text-[14.5px] font-extrabold text-neutral-900">Quick actions</h2>
            <p className="mb-3.5 mt-0.5 text-xs text-neutral-400">Everything you run day to day</p>
            <div className="flex flex-col gap-[9px]">
              {canCreateSchedule ? (
                <QuickActionCard title="Publish schedules" body="Review and release the week" tone="primary" onClick={() => navigate('/schedules')} />
              ) : null}
              {canManageMembers ? (
                <QuickActionCard title="Invite a teammate" body="Assign role and branch access" tone="info" onClick={() => navigate('/invitations')} />
              ) : null}
              {canCreateEmployee ? (
                <QuickActionCard title="Add an employee" body="One person, or import a file" tone="ok" onClick={() => navigate('/employees/new')} />
              ) : null}
              {canCreateBranch ? (
                <QuickActionCard title="Open a branch" body="Spin up the next location" tone="neutral" onClick={() => navigate('/branches/new')} />
              ) : null}
            </div>
          </section>

          {canReadSchedules ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[14.5px] font-extrabold text-neutral-900">Recent activity</h2>
                <button type="button" onClick={() => navigate('/schedules')} className="cursor-pointer text-xs font-bold text-brand-deep transition-colors hover:text-brand-500">
                  View all
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {recentlyPublished.length === 0 ? (
                  <div>
                    <p className="text-[12.5px] font-bold text-neutral-700">Nothing published yet</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {draftSchedules.length > 0
                        ? `${draftSchedules.length} draft${draftSchedules.length === 1 ? '' : 's'} ready to review.`
                        : 'Publish a schedule so the team can see their shifts.'}
                    </p>
                    {canCreateSchedule ? (
                      <button
                        type="button"
                        onClick={() => navigate('/schedules')}
                        className="mt-2 cursor-pointer text-xs font-bold text-brand-deep transition-colors hover:text-brand-500"
                      >
                        Open scheduling →
                      </button>
                    ) : null}
                  </div>
                ) : (
                  recentlyPublished.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => navigate(`/schedules/${schedule.id}`)}
                      className="flex cursor-pointer items-center gap-2.5 text-left"
                    >
                      <InitialsAvatar name={schedule.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-neutral-900">{schedule.name}</span>
                        <span className="block text-[11px] text-neutral-400">
                          Published {new Date(schedule.updated_at).toLocaleDateString()}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
