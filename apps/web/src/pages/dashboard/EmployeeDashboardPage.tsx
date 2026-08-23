import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import { Badge, ContentSection, EmptyState, PageContainer, PageHeader, Panel, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Employee, Schedule, Shift } from '../../types/domain.js';

/**
 * WEB-026-equivalent Staff dashboard: intentionally the simplest of the
 * three. Shows only the signed-in person's own shifts and profile — no
 * management widgets, regardless of what permissions this identity happens
 * to hold, because Staff never gets management screens in the nav either.
 *
 * Zero-employee-record handling (DEC-016/032): an authenticated identity has
 * no guaranteed employees row (e.g. an Owner who never added themselves as
 * staff). That is a normal, expected state here, not an error — the
 * workforce widgets simply don't render, with an explanatory empty state
 * instead of a blank page.
 */
export default function EmployeeDashboardPage(): React.ReactElement {
  const { profile, hasPermission } = useSession();
  const navigate = useNavigate();
  const canReadEmployees = hasPermission('employees.read');
  const canReadSchedules = hasPermission('schedules.read');

  const { data: employees, isLoading: employeesLoading } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const myEmployeeRecord = useMemo(
    () => employees?.find((e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase()),
    [employees, profile]
  );

  const { data: schedules, isLoading: schedulesLoading } = useRpcQuery<Schedule[]>(
    'list_schedules',
    myEmployeeRecord ? { branchId: myEmployeeRecord.branch_id } : undefined,
    { enabled: canReadSchedules && Boolean(myEmployeeRecord) }
  );
  const currentSchedule = [...(schedules ?? [])]
    .filter((s) => s.status === 'published')
    .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];

  const { data: myShifts, isLoading: shiftsLoading } = useRpcQuery<Shift[]>(
    'list_shifts_for_employee_in_schedule',
    currentSchedule && myEmployeeRecord ? { scheduleId: currentSchedule.id, employeeId: myEmployeeRecord.id } : undefined,
    { enabled: Boolean(currentSchedule && myEmployeeRecord) }
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcomingShifts = (myShifts ?? []).filter((s) => s.shift_date >= today).sort((a, b) => a.shift_date.localeCompare(b.shift_date));

  return (
    <PageContainer>
      <PageHeader title={`Welcome back${profile ? `, ${profile.first_name}` : ''}`} description="Your schedule and profile." />

      {employeesLoading ? (
        <SkeletonRows rows={3} />
      ) : !myEmployeeRecord ? (
        <EmptyState
          title="No workforce profile yet"
          description="Your account isn't linked to an employee record, so there's no personal schedule to show. This is normal for administrators who manage ShiftOS without being scheduled themselves."
        />
      ) : (
        <>
          <ContentSection title="Upcoming shifts">
            {shiftsLoading || schedulesLoading ? (
              <SkeletonRows rows={3} />
            ) : !currentSchedule ? (
              <Panel>
                <p className="text-sm text-neutral-500">No published schedule for your branch yet.</p>
              </Panel>
            ) : upcomingShifts.length === 0 ? (
              <Panel>
                <p className="text-sm text-neutral-500">No upcoming shifts assigned in the current schedule.</p>
              </Panel>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Calendar size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{shift.title}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(shift.shift_date).toLocaleDateString()} · {shift.start_time}–{shift.end_time}
                        </p>
                      </div>
                    </div>
                    <Badge tone={shift.status === 'published' ? 'success' : 'neutral'}>{shift.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </ContentSection>

          <ContentSection title="My profile">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:bg-neutral-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <User size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {myEmployeeRecord.first_name} {myEmployeeRecord.last_name}
                </p>
                <p className="text-xs text-neutral-500">Employee #{myEmployeeRecord.employee_number}</p>
              </div>
            </button>
          </ContentSection>
        </>
      )}
    </PageContainer>
  );
}
