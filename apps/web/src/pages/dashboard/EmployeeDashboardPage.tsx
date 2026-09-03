import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import { Badge, Button, EmptyState, InlineError, SkeletonRows } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { DashEmptyPanel, DashHeader, DashPanel, DashStat, StatusPill } from './dashboardWidgets.js';
import type { AttendanceRecord, AttendanceStatus, Employee, Schedule, Shift, ShiftAssignment } from '../../types/domain.js';

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

const ATTENDANCE_BADGE_TONE: Record<AttendanceStatus, 'neutral' | 'success' | 'warning' | 'error'> = {
  scheduled: 'neutral',
  present: 'success',
  late: 'warning',
  absent: 'error',
  no_show: 'error',
  left_early: 'warning',
  completed: 'success'
};

function formatAttendanceStatus(status: AttendanceStatus): string {
  const withSpaces = status.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Clock in/out control for today's own shift only (architecture decision 2
 * in the workforce-operations design spec: this is an action on today's own
 * shift row, not a separate nav item/page).
 *
 * `clock_in`/`clock_out` key off `shiftAssignmentId`, not the raw `shift.id`
 * that `list_shifts_for_employee_in_schedule` returns, so this resolves the
 * caller's own assignment for this shift via `list_assignments_for_shift`
 * first. Current state comes from `list_my_attendance` (not local
 * component state) so the button reflects reality after a page reload.
 */
function TodayShiftClockControl({ shift, employeeId }: { shift: Shift; employeeId: string }): React.ReactElement | null {
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsErrored
  } = useRpcQuery<ShiftAssignment[]>('list_assignments_for_shift', { shiftId: shift.id });
  const myAssignment = assignments?.find((a) => a.employee_id === employeeId);

  const {
    data: myAttendance,
    isLoading: attendanceLoading,
    isError: attendanceErrored
  } = useRpcQuery<AttendanceRecord[]>('list_my_attendance', undefined);
  const record = myAttendance?.find((r) => r.shift_assignment_id === myAssignment?.id);

  const clockInMutation = useRpcMutation<AttendanceRecord, { shiftAssignmentId: string }>('clock_in', {
    invalidates: ['list_my_attendance'],
    onSuccess: () => setActionError(null),
    onError: (err) => setActionError(err.message)
  });
  const clockOutMutation = useRpcMutation<AttendanceRecord, { shiftAssignmentId: string }>('clock_out', {
    invalidates: ['list_my_attendance'],
    onSuccess: () => setActionError(null),
    onError: (err) => setActionError(err.message)
  });

  if (assignmentsLoading || attendanceLoading) {
    return <span className="text-xs text-neutral-400">Checking attendance…</span>;
  }
  if (assignmentsErrored || attendanceErrored) {
    return <span className="text-xs text-error-600">Couldn't load attendance status.</span>;
  }
  if (!myAssignment) {
    // Shift shows up in "my shifts" but no assignment row resolved for it —
    // shouldn't normally happen, but there's nothing to clock in/out of.
    return null;
  }

  const status = record?.attendance_status ?? 'scheduled';
  const canClockOut = status === 'present' || status === 'late';
  const canClockIn = status === 'scheduled';
  const assignmentId = myAssignment.id;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {record ? <Badge tone={ATTENDANCE_BADGE_TONE[status]}>{formatAttendanceStatus(status)}</Badge> : null}
        {canClockOut ? (
          <Button
            size="sm"
            variant="secondary"
            loading={clockOutMutation.isPending}
            onClick={() => clockOutMutation.mutate({ shiftAssignmentId: assignmentId })}
          >
            Clock out
          </Button>
        ) : canClockIn ? (
          <Button
            size="sm"
            variant="primary"
            loading={clockInMutation.isPending}
            onClick={() => clockInMutation.mutate({ shiftAssignmentId: assignmentId })}
          >
            Clock in
          </Button>
        ) : null}
      </div>
      {actionError ? <InlineError message={actionError} className="text-right text-xs" /> : null}
    </div>
  );
}

export default function EmployeeDashboardPage(): React.ReactElement {
  const { profile, hasPermission } = useSession();
  const navigate = useNavigate();
  const canReadEmployees = hasPermission('employees.read');
  const canReadSchedules = hasPermission('schedules.read');
  const canClockIn = hasPermission('attendance.clockin');

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
  const nextShift = upcomingShifts[0];

  // Rough scheduled-hours total across the visible shifts (start/end are HH:MM strings).
  const scheduledHours = useMemo(() => {
    const toMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    return (
      upcomingShifts.reduce((total, shift) => {
        const delta = toMinutes(shift.end_time) - toMinutes(shift.start_time);
        return total + Math.max(0, delta) / 60;
      }, 0)
    );
  }, [upcomingShifts]);

  return (
    <div>
      <DashHeader title={`Welcome back${profile ? `, ${profile.first_name}` : ''}`} subtitle="Your schedule and profile." />

      {employeesLoading ? (
        <SkeletonRows rows={3} />
      ) : !myEmployeeRecord ? (
        <EmptyState
          title="No workforce profile yet"
          description="Your account isn't linked to an employee record, so there's no personal schedule to show. This is normal for administrators who manage ShiftOS without being scheduled themselves."
        />
      ) : (
        <>
          {/* Design's Staff "Next shift" hero card */}
          {nextShift ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-deep p-[15px] text-white shadow-[0_18px_44px_-22px_rgba(240,78,23,0.7)]">
              <div className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.11em] opacity-85">
                  Next shift · {nextShift.shift_date === today ? 'Today' : new Date(nextShift.shift_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <span className="mt-1 block text-[23px] font-extrabold tracking-[-0.03em]">
                  {nextShift.start_time} – {nextShift.end_time}
                </span>
                <span className="mt-1 block text-xs opacity-90">{nextShift.title}</span>
              </div>
              {nextShift.shift_date === today && canClockIn ? (
                <TodayShiftClockControl shift={nextShift} employeeId={myEmployeeRecord.id} />
              ) : null}
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3.5">
            <DashStat
              label="Upcoming shifts"
              value={upcomingShifts.length}
              meta={
                !currentSchedule
                  ? 'no schedule published yet'
                  : upcomingShifts.length === 0
                    ? 'nothing scheduled for you right now'
                    : 'in the current schedule'
              }
              dotTone="primary"
              loading={shiftsLoading || schedulesLoading}
            />
            <DashStat label="Scheduled hours" value={scheduledHours % 1 === 0 ? scheduledHours : scheduledHours.toFixed(1)} meta="across upcoming shifts" dotTone="info" loading={shiftsLoading || schedulesLoading} />
            {currentSchedule ? (
              <DashStat label="Current schedule" value={currentSchedule.name.length > 14 ? `${currentSchedule.name.slice(0, 12)}…` : currentSchedule.name} meta="published for your branch" dotTone="ok" />
            ) : null}
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-[2_1_460px]">
              <DashPanel title="My shifts" linkLabel={canReadSchedules ? 'Open schedules' : undefined} linkTo={canReadSchedules ? '/schedules' : undefined}>
                {shiftsLoading || schedulesLoading ? (
                  <SkeletonRows rows={3} />
                ) : !currentSchedule ? (
                  <DashEmptyPanel
                    title="No schedule published yet"
                    description="Your branch hasn't published a schedule for this period. Check back soon, or ask your manager when the next one is going up."
                  />
                ) : upcomingShifts.length === 0 ? (
                  <DashEmptyPanel
                    title="Nothing on your schedule right now"
                    description="You're not on the next few days in the published schedule — that's normal if it isn't your turn yet."
                  />
                ) : (
                  <div className="flex flex-col">
                    {upcomingShifts.map((shift) => {
                      const isToday = shift.shift_date === today;
                      return (
                        <div key={shift.id} className="flex flex-wrap items-center gap-2.5 border-b border-neutral-50 px-[18px] py-[13px] last:border-b-0">
                          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
                            <Calendar size={15} aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-neutral-900">{shift.title}</p>
                            <p className="text-[11.5px] text-neutral-400">
                              {new Date(shift.shift_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                              {shift.start_time}–{shift.end_time}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            {isToday ? <StatusPill tone="primary">Today</StatusPill> : null}
                            <Badge tone={shift.status === 'published' ? 'success' : 'neutral'}>{shift.status}</Badge>
                            {isToday && canClockIn ? <TodayShiftClockControl shift={shift} employeeId={myEmployeeRecord.id} /> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DashPanel>
            </div>

            <div className="min-w-0 flex-[1_1_270px]">
              <section className="rounded-2xl border border-neutral-200 bg-white p-[18px]">
                <h2 className="text-[14.5px] font-extrabold text-neutral-900">My profile</h2>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-[#FDFCFB] px-3 py-2.5 text-left transition-colors hover:border-brand-300"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-deep">
                    <User size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-bold text-neutral-900">
                      {myEmployeeRecord.first_name} {myEmployeeRecord.last_name}
                    </span>
                    <span className="block text-[11.5px] text-neutral-400">Employee #{myEmployeeRecord.employee_number}</span>
                  </span>
                </button>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
