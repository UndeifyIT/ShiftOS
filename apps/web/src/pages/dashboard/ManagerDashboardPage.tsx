import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, PlusCircle, UserPlus, Users } from 'lucide-react';
import { Badge, Button, ContentSection, PageContainer, PageHeader, Panel, QuickAction, SkeletonRows, StatCard } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Employee, Schedule } from '../../types/domain.js';

/**
 * WEB-017 — Manager dashboard: organization-wide scope. Distinct from the
 * Supervisor dashboard in what it queries and shows (every branch, org-wide
 * schedule activity, a per-branch breakdown), not just a retitled copy.
 */
export default function ManagerDashboardPage(): React.ReactElement {
  const { profile, hasPermission } = useSession();
  const navigate = useNavigate();
  const canReadEmployees = hasPermission('employees.read');
  const canReadBranches = hasPermission('branches.read');
  const canReadSchedules = hasPermission('schedules.read');
  const canCreateSchedule = hasPermission('schedules.create');
  const canCreateBranch = hasPermission('branches.create');
  const canCreateEmployee = hasPermission('employees.create');

  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const { data: branches, isLoading: branchesLoading } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canReadBranches });
  const { data: schedules, isLoading: schedulesLoading } = useRpcQuery<Schedule[]>('list_schedules', undefined, { enabled: canReadSchedules });

  const activeEmployeeCount = (employees ?? []).filter((e) => e.is_active).length;
  const publishedSchedules = (schedules ?? []).filter((s) => s.status === 'published');
  const recentlyPublished = [...publishedSchedules].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  const branchSummaries = useMemo(() => {
    return (branches ?? []).map((branch) => ({
      branch,
      employeeCount: (employees ?? []).filter((e) => e.branch_id === branch.id && e.is_active).length,
      scheduleCount: (schedules ?? []).filter((s) => s.branch_id === branch.id).length
    }));
  }, [branches, employees, schedules]);

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back${profile ? `, ${profile.first_name}` : ''}`}
        description="Organization-wide overview across every branch."
        actions={canCreateSchedule ? <Button onClick={() => navigate('/schedules/new')}>Create Schedule</Button> : undefined}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {canReadEmployees ? <StatCard label="Active Employees" value={activeEmployeeCount} icon={Users} tone="brand" loading={employeesLoading} /> : null}
        {canReadBranches ? <StatCard label="Branches" value={(branches ?? []).length} icon={Building2} loading={branchesLoading} /> : null}
        {canReadSchedules ? <StatCard label="Published Schedules" value={publishedSchedules.length} icon={Calendar} loading={schedulesLoading} /> : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {canCreateSchedule ? (
          <QuickAction icon={PlusCircle} label="Create Schedule" description="Build a new shift schedule" onClick={() => navigate('/schedules/new')} />
        ) : null}
        {canCreateBranch ? (
          <QuickAction icon={Building2} label="Add Branch" description="Open a new location" onClick={() => navigate('/branches/new')} />
        ) : null}
        {canCreateEmployee ? (
          <QuickAction icon={UserPlus} label="Add Employee" description="Grow a branch's team" onClick={() => navigate('/employees/new')} />
        ) : null}
      </div>

      {canReadBranches ? (
        <ContentSection title="Branch overview">
          {branchesLoading ? (
            <SkeletonRows rows={3} />
          ) : branchSummaries.length === 0 ? (
            <Panel>
              <p className="text-sm text-neutral-500">No branches yet.</p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {branchSummaries.map(({ branch, employeeCount, scheduleCount }) => (
                <button
                  key={branch.id}
                  onClick={() => navigate(`/branches/${branch.id}`)}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{branch.name}</p>
                    <p className="text-xs text-neutral-500">
                      {employeeCount} employee{employeeCount === 1 ? '' : 's'} · {scheduleCount} schedule{scheduleCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Badge tone={branch.is_active ? 'success' : 'neutral'}>{branch.is_active ? 'Active' : 'Archived'}</Badge>
                </button>
              ))}
            </div>
          )}
        </ContentSection>
      ) : null}

      {canReadSchedules ? (
        <ContentSection title="Recently published schedules" actions={<Button variant="ghost" onClick={() => navigate('/schedules')}>View all</Button>}>
          {schedulesLoading ? (
            <SkeletonRows rows={3} />
          ) : recentlyPublished.length === 0 ? (
            <Panel>
              <p className="text-sm text-neutral-500">Nothing published across the organization yet.</p>
            </Panel>
          ) : (
            <div className="flex flex-col gap-2">
              {recentlyPublished.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => navigate(`/schedules/${schedule.id}`)}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-900">{schedule.name}</span>
                  <span className="text-xs text-neutral-500">
                    {new Date(schedule.start_date).toLocaleDateString()} – {new Date(schedule.end_date).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ContentSection>
      ) : null}
    </PageContainer>
  );
}
