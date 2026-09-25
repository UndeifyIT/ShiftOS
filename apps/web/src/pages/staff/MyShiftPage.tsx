import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcQuery } from '../../lib/useRpc.js';
import type { AttendanceRecord } from '../../types/domain.js';
import { AnnouncementsCard, card, linkButton, OverviewEmpty, OverviewHeader, OverviewLoading, PanelHead, Pill, StatsGrid } from '../dashboard/manager/ManagerOverview.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { addDays, TONES, todayDateString, weekStartOf } from '../scheduling/grid/scheduleFormat.js';
import { buildMyShift, type MyShift, type ShiftAction } from './myShiftModel.js';
import { StaffRequestDialog, type StaffRequestKind } from './StaffRequestDialog.js';
import { useMyAnnouncements, useMyRequests } from './useStaffSelf.js';
import { useStaffSchedule } from './useStaffSchedule.js';

/*
 * The Staff home, "My Shift", built to the design handoff (`ShiftOS
 * Dashboards.dc.html`, "OVERVIEW (role home)" markup with HOME.Staff): the
 * greeting, four stats, My week, My requests, Shift actions and the
 * branch's announcements — no Ask ShiftOS and no Recent Activity, as in the
 * handoff. Everything is the signed-in person's own: their published shifts,
 * their requests, the notices they still owe an acknowledgement. Staff don't
 * clock themselves in or out — their supervisor marks attendance. The
 * prototype has no CSS reset, so the values are what it renders (13px base,
 * `line-height: normal`).
 */

/** The handoff's "day" row: a two-line date chip instead of an avatar, no progress bar. */
function WeekPanel({ view, onSchedule, onSwap }: { view: MyShift; onSchedule: () => void; onSwap: () => void }): React.ReactElement {
  return (
    <section className={card}>
      <PanelHead title="My week">
        <button type="button" onClick={onSchedule} className={linkButton}>
          Full schedule
        </button>
      </PanelHead>
      <div className="flex flex-col">
        {view.week.map((row) => (
          <div key={row.date} className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
            <div className="flex min-w-0 flex-[1_1_190px] items-center gap-[11px]">
              <span
                className="flex h-10 w-11 flex-none flex-col items-center justify-center whitespace-pre-line rounded-[11px] text-center text-[10px] font-extrabold leading-[1.25] tracking-[.04em]"
                style={row.tone === 'primary' ? { color: '#C6420E', backgroundColor: '#FDF0E9' } : { color: '#857A72', backgroundColor: '#F4F1EE' }}
              >
                {row.chip}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold">{row.name}</span>
                <span className="block text-[11.5px] text-[#A79C93]">{row.sub}</span>
              </span>
            </div>
            <div className="min-w-20 flex-[0_1_110px] text-[12.5px] text-[#857A72]">{row.middle}</div>
            <div className="min-w-[100px] flex-[1_1_120px]">
              <p className="mb-0 mt-1.5 text-[11px] text-[#A79C93]">{row.barLabel}</p>
            </div>
            <div className="ml-auto flex-none text-right">
              <Pill tone={row.tone}>{row.status}</Pill>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-[18px] py-3">
        <p className="m-0 text-[11.5px] text-[#A79C93]">{view.foot}</p>
        <button
          type="button"
          onClick={onSwap}
          className="h-[34px] cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white px-3.5 text-[12.5px] font-bold text-black hover:border-[#DDD6D0]"
        >
          Request swap
        </button>
      </div>
    </section>
  );
}

function RequestsPanel({ view }: { view: MyShift }): React.ReactElement {
  return (
    <section className={card}>
      <PanelHead title="My requests">
        <span className="text-[11.5px] text-[#A79C93]">{view.openRequests} open</span>
      </PanelHead>
      <ul className="m-0 list-none px-0 py-1.5">
        {view.requests.length === 0 ? (
          <li className="flex items-center gap-3 px-[18px] py-[11px]">
            <span className="min-w-0 flex-auto">
              <span className="block text-[13px] font-bold">No requests yet</span>
              <span className="block text-[11.5px] text-[#A79C93]">Ask for a shift swap or time off, and track the decision here.</span>
            </span>
          </li>
        ) : (
          view.requests.map((row) => (
            <li key={row.key} className="flex items-center gap-3 px-[18px] py-[11px]">
              {row.done ? (
                <span className="size-[18px] flex-none rounded-full bg-[#2E9E62] shadow-[inset_0_0_0_3px_#fff,inset_0_0_0_4px_#2E9E62]" />
              ) : (
                // 18px + a 2px border each side: the handoff's content-box circle renders 22px.
                <span className="size-[22px] flex-none rounded-full border-2 border-solid border-[#EBE7E3]" />
              )}
              <span className="min-w-0 flex-auto">
                <span className="block text-[13px] font-bold">{row.title}</span>
                <span className="block text-[11.5px] text-[#A79C93]">{row.meta}</span>
              </span>
              <Pill tone={row.tone}>{row.tag}</Pill>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function ShiftActions({ actions, onAction }: { actions: ShiftAction[]; onAction: (action: ShiftAction['action']) => void }): React.ReactElement {
  const item = 'block w-full cursor-pointer rounded-[12px] border-0 px-[13px] py-[11px] text-left';
  return (
    <section className={`${card} p-[18px]`}>
      <h2 className="mb-1 mt-0 text-[14.5px] font-extrabold tracking-normal">Shift actions</h2>
      <p className="mb-3.5 mt-0 text-[12px] text-[#A79C93]">Your shift, requests and schedule</p>
      <div className="flex flex-col gap-[9px]">
        {actions.map((action) => (
          <button key={action.title} type="button" onClick={() => onAction(action.action)} className={item} style={{ color: TONES[action.tone][0], backgroundColor: TONES[action.tone][1] }}>
            <span className="block text-[12.5px] font-extrabold">{action.title}</span>
            <span className="mt-0.5 block text-[11.5px] font-medium text-[#857A72]">{action.body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function MyShiftPage(): React.ReactElement {
  const navigate = useNavigate();
  const now = useNow();
  const { hasPermission } = useSession();
  const { toast, show, dismiss } = useScheduleToast();
  const today = todayDateString(now);
  const weekStart = weekStartOf(today);
  // This week and next: the stats read this week, My week can run into the next one.
  const staff = useStaffSchedule(weekStart, addDays(weekStart, 13));
  const requests = useMyRequests();
  const notices = useMyAnnouncements();
  const attendance = useRpcQuery<AttendanceRecord[]>('list_my_attendance', undefined, { enabled: hasPermission('attendance.read') });
  const [dialog, setDialog] = useState<{ kind: StaffRequestKind; assignmentId?: string } | null>(null);

  const view = useMemo(
    () =>
      staff.me
        ? buildMyShift(
            {
              now,
              shifts: staff.shifts,
              publishedDates: staff.publishedDates,
              swaps: requests.swaps,
              leave: requests.leave,
              announcements: notices.published,
              acknowledged: notices.acknowledged,
              attendance: attendance.data ?? [],
              employees: staff.employees,
              departments: staff.departments,
              timeZone: staff.timeZone
            },
            staff.me
          )
        : null,
    [staff.me, staff.shifts, staff.publishedDates, staff.employees, staff.departments, staff.timeZone, requests.swaps, requests.leave, notices.published, notices.acknowledged, attendance.data, now]
  );

  const openSwap = (): void => {
    const upcoming = staff.shifts
      .filter((s) => s.shift_date >= today)
      .sort((a, b) => (a.shift_date + a.start_time).localeCompare(b.shift_date + b.start_time))
      .find((s) => !requests.swaps.some((w) => (w.status === 'pending' || w.status === 'accepted') && w.shift_date === s.shift_date));
    setDialog({ kind: 'swap', assignmentId: upcoming ? staff.assignmentByShift.get(upcoming.id)?.id : undefined });
  };
  const onAction = (action: ShiftAction['action']): void => {
    if (action === 'leave') setDialog({ kind: 'leave' });
    else if (action === 'swap') openSwap();
    else navigate('/my-schedule');
  };

  const loading = staff.loading || requests.loading;
  const title = view?.title ?? 'My shift';
  const subtitle = view?.subtitle ?? 'Your shift, requests and schedule';

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title={title} subtitle={subtitle} now={now} />

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        {loading ? (
          <OverviewLoading title="My shift" />
        ) : !staff.me || !view ? (
          <OverviewEmpty
            title="No workforce profile yet"
            body="Your login isn't linked to an employee record, so there's no schedule to show yet. Ask your supervisor to add you as an employee with this email address."
            cta={null}
            secondary={null}
          />
        ) : !view.next && !view.hasSchedule ? (
          <OverviewEmpty
            title="No shift today"
            body="Nothing is published for you this week or next yet. You'll be notified as soon as your supervisor publishes the schedule."
            cta={{ label: 'View my schedule', onClick: () => navigate('/my-schedule') }}
            secondary={hasPermission('leave.create') ? { label: 'Request time off', onClick: () => setDialog({ kind: 'leave' }) } : null}
          />
        ) : (
          <>
            <StatsGrid stats={view.stats} />
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
                <WeekPanel view={view} onSchedule={() => navigate('/my-schedule')} onSwap={openSwap} />
                <RequestsPanel view={view} />
              </div>
              <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4">
                <ShiftActions actions={view.actions} onAction={onAction} />
                <AnnouncementsCard previews={view.announcementPreviews} go={navigate} />
              </div>
            </div>
          </>
        )}
      </div>

      <StaffRequestDialog
        open={Boolean(dialog)}
        kind={dialog?.kind ?? 'leave'}
        assignmentId={dialog?.assignmentId}
        now={now}
        onClose={() => setDialog(null)}
        onDone={(message) => {
          setDialog(null);
          show(message);
        }}
      />
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
