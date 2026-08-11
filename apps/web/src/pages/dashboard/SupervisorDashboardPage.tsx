import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, PlusCircle, UserPlus, Users } from 'lucide-react';
import { Avatar, Button, ContentSection, PageContainer, PageHeader, Panel, QuickAction, SkeletonRows, StatCard } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import { useSignedAvatarUrl } from '../../lib/avatars.js';
import type { Branch, Employee, Schedule } from '../../types/domain.js';

function EmployeeRow({ employee, onClick }: { employee: Employee; onClick: () => void }): React.ReactElement {
  const name = `${employee.first_name} ${employee.last_name}`;
  const signedUrl = useSignedAvatarUrl(employee.avatar_url);
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left hover:bg-neutral-50">
      <Avatar name={name} src={signedUrl} size={32} />
      <div>
        <p className="text-sm font-medium text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-500">{employee.employee_number}</p>
      </div>
    </button>
  );
}

/**
 * WEB-018/WEB-026 — Supervisor dashboard: branch-scoped "my branch" hub.
 * Queries only the caller's accessible branch, not the organization.
 */
export default function SupervisorDashboardPage(): React.ReactElement {
  const { profile, myContext, hasPermission } = useSession();
  const navigate = useNavigate();
  const branchId = myContext?.branchAccess.branchIds[0];
  const canReadEmployees = hasPermission('employees.read');
  const canReadSchedules = hasPermission('schedules.read');
  const canCreateSchedule = hasPermission('schedules.create');
  const canCreateEmployee = hasPermission('employees.create');

  const { data: branch } = useRpcQuery<Branch>('get_branch', branchId ? { branchId } : undefined, { enabled: Boolean(branchId) });
  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const { data: schedules, isLoading: schedulesLoading } = useRpcQuery<Schedule[]>('list_schedules', branchId ? { branchId } : undefined, {
    enabled: canReadSchedules
  });

  const branchEmployees = (employees ?? []).filter((e) => e.is_active);
  const upcomingSchedules = (schedules ?? []).filter((s) => s.status !== 'archived').slice(0, 5);

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back${profile ? `, ${profile.first_name}` : ''}`}
        description={branch ? `Here's what's happening at ${branch.name} today.` : 'Here is what is happening at your branch today.'}
        actions={canCreateSchedule ? <Button onClick={() => navigate('/schedules/new')}>Create Schedule</Button> : undefined}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {canReadEmployees ? <StatCard label="Team Members" value={branchEmployees.length} icon={Users} tone="brand" loading={employeesLoading} /> : null}
        {canReadSchedules ? <StatCard label="Schedules" value={(schedules ?? []).length} icon={Calendar} loading={schedulesLoading} /> : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {canCreateSchedule ? (
          <QuickAction icon={PlusCircle} label="Create Schedule" description="Build this week's schedule" onClick={() => navigate('/schedules/new')} />
        ) : null}
        {canCreateEmployee ? (
          <QuickAction icon={UserPlus} label="Add Employee" description="Add someone to your branch" onClick={() => navigate('/employees/new')} />
        ) : null}
      </div>

      {canReadEmployees ? (
        <ContentSection title="Your team" actions={<Button variant="ghost" onClick={() => navigate('/employees')}>View all</Button>}>
          {employeesLoading ? (
            <SkeletonRows rows={3} />
          ) : branchEmployees.length === 0 ? (
            <Panel>
              <p className="text-sm text-neutral-500">No team members yet.</p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {branchEmployees.slice(0, 6).map((employee) => (
                <EmployeeRow key={employee.id} employee={employee} onClick={() => navigate(`/employees/${employee.id}`)} />
              ))}
            </div>
          )}
        </ContentSection>
      ) : null}

      {canReadSchedules ? (
        <ContentSection title="Recent schedules" actions={<Button variant="ghost" onClick={() => navigate('/schedules')}>View all</Button>}>
          {schedulesLoading ? (
            <SkeletonRows rows={3} />
          ) : upcomingSchedules.length === 0 ? (
            <Panel>
              <p className="text-sm text-neutral-500">No schedules created for this period.</p>
            </Panel>
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
