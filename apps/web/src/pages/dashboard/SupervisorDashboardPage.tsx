import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import {
  CheckCircle,
  DashEmptyPanel,
  DashHeader,
  DashPanel,
  DashStat,
  InitialsAvatar,
  QuickActionCard,
  StatusPill
} from './dashboardWidgets.js';
import type { Branch, Employee, Schedule } from '../../types/domain.js';

function branchesDescription(branches: Branch[] | undefined): string {
  if (!branches || branches.length === 0) return 'Here is what is happening at your branch today.';
  if (branches.length === 1) return `Here's what's happening at ${branches[0]!.name} today.`;
  return `Here's what's happening across your ${branches.length} branches today.`;
}

/**
 * WEB-018/WEB-026 — Supervisor dashboard: branch-scoped "my branch" hub,
 * restyled 1:1 onto `ShiftOS Dashboards.dc.html`'s Supervisor Overview
 * renderer (stat cards, the team check-in panel with tone-cycled avatars,
 * the schedule-status checklist, quick-action tiles and recent-activity
 * aside). Every query omits branchId so the backend's resolveBranchScope()
 * returns the caller's full accessible set.
 */
export default function SupervisorDashboardPage(): React.ReactElement {
  const { hasPermission } = useSession();
  const navigate = useNavigate();
  const canReadEmployees = hasPermission('employees.read');
  const canReadSchedules = hasPermission('schedules.read');
  const canReadBranches = hasPermission('branches.read');
  const canCreateSchedule = hasPermission('schedules.create');
  const canCreateEmployee = hasPermission('employees.create');
  const canReadAttendance = hasPermission('attendance.read');
  const canReadTasks = hasPermission('tasks.read');

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canReadBranches });
  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const { data: schedules, isLoading: schedulesLoading } = useRpcQuery<Schedule[]>('list_schedules', undefined, { enabled: canReadSchedules });

  const branchEmployees = (employees ?? []).filter((e) => e.is_active);
  const publishedSchedules = (schedules ?? []).filter((s) => s.status === 'published');
  const draftSchedules = (schedules ?? []).filter((s) => s.status === 'draft');
  const recentSchedules = [...(schedules ?? [])].filter((s) => s.status !== 'archived').slice(0, 5);

  return (
    <div>
      <DashHeader title="Your branch today" subtitle={branchesDescription(branches)} />

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3.5">
        {canReadEmployees ? (
          <DashStat
            label="Team members"
            value={branchEmployees.length}
            meta="active on your branches"
            dotTone="primary"
            loading={employeesLoading}
            action={
              branchEmployees.length === 0 && canCreateEmployee
                ? { label: 'Add employee', to: '/employees/new' }
                : undefined
            }
          />
        ) : null}
        {canReadSchedules ? (
          <DashStat label="Published" value={publishedSchedules.length} meta="schedules the team sees" dotTone="ok" loading={schedulesLoading} />
        ) : null}
        {canReadSchedules ? (
          <DashStat label="Drafts" value={draftSchedules.length} meta="still being built" dotTone="warn" loading={schedulesLoading} />
        ) : null}
        {canReadBranches ? (
          <DashStat label="Branches" value={(branches ?? []).length} meta="in your scope" dotTone="info" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
          {canReadEmployees ? (
            <DashPanel
              title="Your team"
              linkLabel="Open employees"
              linkTo="/employees"
              footerNote={`Showing ${Math.min(5, branchEmployees.length)} of ${branchEmployees.length} team members.`}
              actionLabel="Open attendance"
              actionTo={canReadAttendance ? '/attendance' : undefined}
            >
              {employeesLoading ? (
                <div className="flex flex-col gap-3 px-[18px] py-4">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-9 animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </div>
              ) : branchEmployees.length === 0 ? (
                <DashEmptyPanel
                  title="No team members yet"
                  description="Add the people who work at your branch to start scheduling and tracking attendance."
                  actionLabel={canCreateEmployee ? 'Add employee' : undefined}
                  actionTo={canCreateEmployee ? '/employees/new' : undefined}
                />
              ) : (
                <div className="flex flex-col">
                  {branchEmployees.slice(0, 5).map((employee) => {
                    const name = `${employee.first_name} ${employee.last_name}`;
                    const branch = (branches ?? []).find((b) => b.id === employee.branch_id);
                    return (
                      <button
                        key={employee.id}
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="flex flex-wrap items-center gap-2.5 border-b border-neutral-50 px-[18px] py-[13px] text-left transition-colors last:border-b-0 hover:bg-neutral-50/60"
                      >
                        <div className="flex min-w-0 flex-[1_1_190px] items-center gap-[11px]">
                          <InitialsAvatar name={name} />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-bold text-neutral-900">{name}</span>
                            <span className="block truncate text-[11.5px] text-neutral-400">
                              {branch?.name ?? employee.employee_number}
                            </span>
                          </span>
                        </div>
                        <div className="min-w-[80px] flex-[0_1_110px] text-[12.5px] text-neutral-500">#{employee.employee_number}</div>
                        <div className="ml-auto flex shrink-0 justify-end">
                          <StatusPill tone={employee.is_active ? 'ok' : 'neutral'}>{employee.is_active ? 'Active' : 'Inactive'}</StatusPill>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </DashPanel>
          ) : null}

          {canReadSchedules ? (
            <DashPanel title="Schedule status" linkLabel="Open schedules" linkTo="/schedules">
              {schedulesLoading ? (
                <div className="flex flex-col gap-3 px-[18px] py-4">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-9 animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </div>
              ) : recentSchedules.length === 0 ? (
                <DashEmptyPanel
                  title="No schedules for this period"
                  description="Build a schedule so your team knows when they're working."
                  actionLabel={canCreateSchedule ? 'Build a schedule' : undefined}
                  actionTo={canCreateSchedule ? '/schedules/new' : undefined}
                />
              ) : (
                <ul className="m-0 list-none p-1.5">
                  {recentSchedules.map((schedule) => (
                    <li key={schedule.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/schedules/${schedule.id}`)}
                        className="flex w-full cursor-pointer items-center gap-3 px-[18px] py-[11px] text-left transition-colors hover:bg-neutral-50/60"
                      >
                        <CheckCircle done={schedule.status === 'published'} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-neutral-900">{schedule.name}</span>
                          <span className="block text-[11.5px] text-neutral-400">
                            {new Date(schedule.start_date).toLocaleDateString()} – {new Date(schedule.end_date).toLocaleDateString()}
                          </span>
                        </span>
                        <StatusPill tone={schedule.status === 'published' ? 'ok' : schedule.status === 'draft' ? 'warn' : 'neutral'}>
                          {schedule.status}
                        </StatusPill>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DashPanel>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4">
          <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
            <h2 className="text-[14.5px] font-extrabold text-neutral-900">Quick actions</h2>
            <p className="mb-3.5 mt-0.5 text-xs text-neutral-400">Run the shift day to day</p>
            <div className="flex flex-col gap-[9px]">
              {canCreateSchedule ? (
                <QuickActionCard title="Build a schedule" body="Plan this week's shifts" tone="primary" onClick={() => navigate('/schedules/new')} />
              ) : null}
              {canReadAttendance ? (
                <QuickActionCard title="Mark attendance" body="Against the published schedule" tone="ok" onClick={() => navigate('/attendance')} />
              ) : null}
              {canReadTasks ? (
                <QuickActionCard title="Assign tasks" body="The shift's operational checks" tone="info" onClick={() => navigate('/tasks')} />
              ) : null}
              {canCreateEmployee ? (
                <QuickActionCard title="Add an employee" body="Grow your branch team" tone="neutral" onClick={() => navigate('/employees/new')} />
              ) : null}
            </div>
          </section>

          {canReadEmployees ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[14.5px] font-extrabold text-neutral-900">Recent hires</h2>
                <button type="button" onClick={() => navigate('/employees')} className="cursor-pointer text-xs font-bold text-brand-deep transition-colors hover:text-brand-500">
                  View all
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {branchEmployees.length === 0 ? (
                  <div>
                    <p className="text-[12.5px] font-bold text-neutral-700">No hires yet</p>
                    {canCreateEmployee ? (
                      <button
                        type="button"
                        onClick={() => navigate('/employees/new')}
                        className="mt-1 cursor-pointer text-xs font-bold text-brand-deep transition-colors hover:text-brand-500"
                      >
                        Add employee →
                      </button>
                    ) : (
                      <p className="mt-0.5 text-xs text-neutral-400">Nobody's been added to your branch yet.</p>
                    )}
                  </div>
                ) : (
                  branchEmployees.slice(-3).map((employee) => {
                    const name = `${employee.first_name} ${employee.last_name}`;
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="flex cursor-pointer items-center gap-2.5 text-left"
                      >
                        <InitialsAvatar name={name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-bold text-neutral-900">{name}</span>
                          <span className="block text-[11px] text-neutral-400">#{employee.employee_number}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
