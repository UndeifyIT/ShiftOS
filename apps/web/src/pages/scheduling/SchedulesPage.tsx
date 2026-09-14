import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PermissionDenied, Select } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { Branch, Schedule } from '../../types/domain.js';
import { AllSchedulesMenu } from './grid/AllSchedulesMenu.js';
import { ScheduleGrid } from './grid/ScheduleGrid.js';
import { ScheduleIcon } from './grid/ScheduleIcon.js';
import { ScheduleToast, useScheduleToast } from './grid/ScheduleToast.js';
import { addDays, isoWeekNumber, shortDate, todayDateString, weekStartOf } from './grid/scheduleFormat.js';
import { useScheduleCreation } from './grid/useScheduleCreation.js';

const MOBILE_BREAKPOINT = 860;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
  useEffect(() => {
    const onResize = (): void => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

/** The live (non-archived) schedule covering any part of a Mon–Sun week. */
function scheduleForWeek(schedules: Schedule[], weekStart: string): Schedule | undefined {
  const weekEnd = addDays(weekStart, 6);
  const covering = schedules.filter((s) => s.status !== 'archived' && !s.deleted_at && s.start_date <= weekEnd && s.end_date >= weekStart);
  return covering.find((s) => s.start_date === weekStart) ?? covering[0];
}

/**
 * WEB-011/012 — the Schedules screen, rebuilt to the design handoff
 * (`ShiftOS Dashboards.dc.html` "Manager/Schedules" / "Supervisor/Schedules"):
 * one page per Mon–Sun week (`/schedules?week=YYYY-MM-DD`, defaulting to this
 * week; `/schedules/:scheduleId` opens that schedule's week), the weekly grid
 * when a schedule exists, and the "Nothing scheduled" empty state when not.
 */
export default function SchedulesPage(): React.ReactElement {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission, myContext } = useSession();
  const isManager = myContext?.branchAccess.isOrgWide ?? false;
  const canRead = hasPermission('schedules.read');
  const isMobile = useIsMobile();
  const { toast, show: showToast, dismiss } = useScheduleToast();

  const singleBranchId = useDefaultBranchId();
  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead && singleBranchId === null });
  const { data: linkedSchedule, isLoading: linkedLoading } = useRpcQuery<Schedule>('get_schedule', scheduleId ? { scheduleId } : undefined, {
    enabled: canRead && Boolean(scheduleId)
  });

  // A Manager only ever works in their own branch (useDefaultBranchId), so `?branch=` and the picker below are for multi-branch supervisors alone.
  const branchId = isManager
    ? (singleBranchId ?? '')
    : (linkedSchedule?.branch_id ?? searchParams.get('branch') ?? singleBranchId ?? branches?.[0]?.id ?? '');
  const weekStart = weekStartOf(linkedSchedule?.start_date ?? searchParams.get('week') ?? todayDateString());

  const {
    data: schedules,
    isLoading: schedulesLoading,
    error,
    refetch
  } = useRpcQuery<Schedule[]>('list_schedules', branchId ? { branchId } : undefined, { enabled: canRead && Boolean(branchId) });

  const schedule = useMemo(() => scheduleForWeek(schedules ?? [], weekStart), [schedules, weekStart]);
  const { createWeek, creating } = useScheduleCreation(branchId);

  const goToWeek = (start: string): void => {
    const params = new URLSearchParams({ week: start });
    if (searchParams.get('branch')) params.set('branch', searchParams.get('branch') as string);
    navigate(`/schedules?${params.toString()}`);
  };

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const loading = linkedLoading || schedulesLoading || (!branchId && singleBranchId === null && !branches);
  const published = schedule?.status === 'published';
  const canEdit = Boolean(schedule) && hasPermission('shifts.create') && schedule?.status !== 'archived' && !isMobile && !(isManager && published);
  const weekLabel = `${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 6))}`;

  // The empty state's Import Schedule drafts the week first, then opens the import on the new grid.
  const [importWeek, setImportWeek] = useState<string | null>(null);

  const createThisWeek = async (copyLastWeek: boolean): Promise<boolean> => {
    const previous = copyLastWeek ? scheduleForWeek(schedules ?? [], addDays(weekStart, -7)) : undefined;
    if (copyLastWeek && !previous) {
      showToast("There's no schedule for last week to copy", 'error');
      return false;
    }
    try {
      await createWeek(weekStart, previous);
      showToast(copyLastWeek ? `Week ${isoWeekNumber(addDays(weekStart, -7))} copied into this week as a draft` : `Draft schedule created for Week ${isoWeekNumber(weekStart)}`);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create the schedule', 'error');
      return false;
    }
  };

  const createNextWeek = async (): Promise<void> => {
    if (!schedule) return;
    const nextStart = addDays(weekStart, 7);
    if (scheduleForWeek(schedules ?? [], nextStart)) {
      showToast(`Week ${isoWeekNumber(nextStart)} already has a schedule`);
      goToWeek(nextStart);
      return;
    }
    if (!hasPermission('schedules.create')) {
      showToast("You don't have permission to create schedules", 'error');
      return;
    }
    try {
      await createWeek(nextStart, schedule);
      showToast(`Week ${isoWeekNumber(nextStart)} drafted from this week`);
      goToWeek(nextStart);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create next week', 'error');
    }
  };

  return (
    // 13px base size and the browser's default line height are what the handoff renders with (it has no CSS reset); every size below is its rendered, not declared, value.
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <header className="flex flex-wrap items-start gap-4 border-b border-[#F2EEEA] bg-white px-7 pb-[18px] pt-[22px] max-[859px]:gap-2.5 max-[859px]:px-4 max-[859px]:pb-3 max-[859px]:pt-4">
        <div className="min-w-0 flex-[1_1_100%]">
          <h1 className="m-0 text-[25px] font-extrabold leading-[1.15] tracking-[-0.025em]">Schedules</h1>
          <p className="mb-0 mt-[5px] text-[13px] text-[#857A72]">Create, edit and manage employee schedules.</p>
        </div>
        <div className="flex min-w-0 flex-[1_1_100%] flex-wrap items-center justify-end gap-2.5">
          {singleBranchId === null && (branches ?? []).length > 1 ? (
            <div className="w-56">
              <Select
                aria-label="Branch"
                value={branchId}
                onChange={(event) => navigate(`/schedules?week=${weekStart}&branch=${event.target.value}`)}
                options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>
          ) : null}
          {branchId ? <AllSchedulesMenu schedules={schedules ?? []} weekStart={weekStart} onSelectWeek={goToWeek} /> : null}
        </div>
      </header>

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        {isMobile ? (
          <div className="flex items-center gap-3 rounded-[14px] border border-[#F7DFD1] bg-[#FEFAF7] px-4 py-[13px]">
            <span className="flex size-[34px] flex-none items-center justify-center rounded-[11px] bg-[#FDF0E9] text-[#C6420E]">
              <ScheduleIcon name="calendar" size={28} strokeWidth={1.7} />
            </span>
            <p className="m-0 text-[12.5px] text-[#8E5A2E]">
              <strong>View only on mobile.</strong> Open ShiftOS on desktop to edit, publish or move shifts.
            </p>
          </div>
        ) : null}

        {loading ? (
          <p className="m-0 text-[12px] text-[#A79C93]" aria-live="polite">
            Loading Schedules…
          </p>
        ) : error ? (
          <section className="flex flex-col items-center rounded-[20px] border border-[#EBE7E3] bg-white px-8 py-[54px] text-center">
            <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">Schedule information unavailable.</h2>
            <p className="mb-0 mt-2 max-w-[440px] text-[13px] text-[#857A72]">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 h-11 cursor-pointer rounded-[12px] border border-[#EBE7E3] bg-white px-[18px] text-[13px] font-bold"
            >
              Retry
            </button>
          </section>
        ) : schedule ? (
          <ScheduleGrid
            key={schedule.id}
            schedule={schedule}
            isManager={isManager}
            canEdit={canEdit}
            canPublish={hasPermission('schedules.publish')}
            canCreateDepartment={hasPermission('departments.create')}
            weekStart={weekStart}
            onNavigateWeek={(direction) => goToWeek(addDays(weekStart, 7 * direction))}
            onCreateNextWeek={() => void createNextWeek()}
            showToast={showToast}
            openImportOnMount={importWeek === weekStart}
          />
        ) : (
          <section className="flex flex-col items-center rounded-[20px] border border-[#EBE7E3] bg-white px-8 py-[54px] text-center">
            <span className="flex size-16 items-center justify-center rounded-[20px] bg-[#FDF0E9] text-[#C6420E]">
              <ScheduleIcon name="calendar" size={28} strokeWidth={1.7} />
            </span>
            <h2 className="mb-0 mt-[18px] text-[19px] font-extrabold tracking-[-0.02em]">
              {isManager ? `Nothing published for ${weekLabel}` : `No schedule for ${weekLabel}`}
            </h2>
            <p className="mb-0 mt-2 max-w-[440px] text-[13px] text-[#857A72] [text-wrap:pretty]">
              {isManager
                ? 'Published schedules from your supervisors land here to review, unpublish, edit and republish. Nothing has been published for this week — you can build it yourself instead.'
                : 'Create the draft, add the people working this week, then build their shifts. Nothing is visible to staff until you publish.'}
            </p>
            {hasPermission('schedules.create') && !isMobile ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void createThisWeek(false)}
                  className="h-11 cursor-pointer rounded-[12px] border-0 bg-[#F04E17] px-5 text-[13px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(240,78,23,.8)] disabled:opacity-60"
                >
                  {isManager ? 'Create New Schedule' : 'Create Schedule'}
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => {
                    setImportWeek(weekStart);
                    void createThisWeek(false).then((created) => {
                      if (!created) setImportWeek(null);
                    });
                  }}
                  className="h-11 cursor-pointer rounded-[12px] border border-[#EBE7E3] bg-white px-[18px] text-[13px] font-bold text-black disabled:opacity-60"
                >
                  Import Schedule
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void createThisWeek(true)}
                  className="h-11 cursor-pointer rounded-[12px] border border-[#EBE7E3] bg-white px-[18px] text-[13px] font-bold text-black disabled:opacity-60"
                >
                  Copy last week
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>

      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
