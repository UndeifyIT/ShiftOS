import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ContentSection, PageContainer, PageHeader, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Employee, Schedule } from '../../types/domain.js';

function StatCard({ label, value, loading }: { label: string; value: number | string; loading?: boolean }): React.ReactElement {
  return (
    <Card>
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      {loading ? <div className="mt-2 h-8 w-16 animate-pulse rounded bg-neutral-200" /> : <p className="mt-1 text-3xl font-bold text-neutral-900">{value}</p>}
    </Card>
  );
}

/**
 * WEB-017 (Manager, org-wide) / WEB-018 + WEB-026 (Supervisor, branch-scoped
 * "My Branch" hub) — one component with genuinely different queries per
 * §E of the frontend foundation doc, not just a display difference. Only
 * Tier-1 (schedule/employee/branch) widgets are shown; attendance/task
 * widgets are Tier 2 and intentionally deferred (§N), not faked.
 */
export default function DashboardPage(): React.ReactElement {
  const { profile, myContext, hasPermission } = useSession();
  const navigate = useNavigate();
  const isOrgWide = myContext?.branchAccess.isOrgWide ?? false;
  const canReadEmployees = hasPermission('employees.read');
  const canReadBranches = hasPermission('branches.read');
  const canReadSchedules = hasPermission('schedules.read');
  const canCreateSchedule = hasPermission('schedules.create');

  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, {
    enabled: canReadEmployees
  });
  const { data: branches, isLoading: branchesLoading } = useRpcQuery<Branch[]>('list_branches', undefined, {
    enabled: canReadBranches
  });
  const { data: schedules, isLoading: schedulesLoading } = useRpcQuery<Schedule[]>(
    'list_schedules',
    isOrgWide ? undefined : { branchId: myContext?.branchAccess.branchIds[0] },
    { enabled: canReadSchedules }
  );

  const upcomingSchedules = (schedules ?? []).filter((s) => s.status !== 'archived').slice(0, 5);

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back${profile ? `, ${profile.first_name}` : ''}`}
        description={isOrgWide ? 'Here is what is happening across your organization.' : 'Here is what is happening at your branch today.'}
        actions={canCreateSchedule ? <Button onClick={() => navigate('/schedules/new')}>Create Schedule</Button> : undefined}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {canReadEmployees ? <StatCard label="Active employees" value={(employees ?? []).filter((e) => e.is_active).length} loading={employeesLoading} /> : null}
        {isOrgWide && canReadBranches ? <StatCard label="Branches" value={(branches ?? []).length} loading={branchesLoading} /> : null}
        {canReadSchedules ? <StatCard label="Schedules" value={(schedules ?? []).length} loading={schedulesLoading} /> : null}
      </div>

      {canReadSchedules ? (
        <ContentSection title="Recent schedules" actions={<Button variant="ghost" onClick={() => navigate('/schedules')}>View all</Button>}>
          {schedulesLoading ? (
            <SkeletonRows rows={3} />
          ) : upcomingSchedules.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-500">No schedules created for this period.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => navigate(`/schedules/${schedule.id}`)}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-neutral-900">{schedule.name}</span>
                  <span className="text-xs text-neutral-500">
                    {schedule.start_date} – {schedule.end_date} · {schedule.status}
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
