import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal, ModalConfirm } from '../../components/HandoffModal.js';
import { callRpc } from '../../lib/apiClient.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES } from '../scheduling/grid/scheduleFormat.js';
import {
  ActivityCard,
  AnnouncementsCard,
  AskShiftOSCard,
  card,
  linkButton,
  OverviewEmpty,
  OverviewHeader,
  OverviewLoading,
  PanelHead,
  Pill,
  StatsGrid
} from './manager/ManagerOverview.js';
import { answerSupervisorQuestion, ASK_CHIPS_SUP, ASK_HINTS_SUP } from './manager/askShiftOS.js';
import { longDay, type ManagerOverview } from './manager/overviewModel.js';
import { useManagerOverview } from './manager/useManagerOverview.js';
import { buildTodaysShift, type TodaysShift } from './supervisor/todaysShiftModel.js';

/*
 * The Supervisor's "Today's Shift" home, built to the design handoff
 * (`ShiftOS Dashboards.dc.html`, "OVERVIEW (role home)" markup with
 * HOME.Supervisor): Ask ShiftOS, Present / Late / Absent / Tasks done, Team
 * check-in, Today's tasks, Shift controls, Announcements and Recent Activity —
 * all from the supervisor's own branch. The prototype has no CSS reset, so the
 * values are what it renders (13px base, `line-height: normal`).
 */

function CheckInPanel({ shift, go, onMarkAll }: { shift: TodaysShift; go: (to: string) => void; onMarkAll: () => void }): React.ReactElement {
  const rows = shift.checkIns.slice(0, 5);
  return (
    <section className={card}>
      <PanelHead title="Team check-in">
        <button type="button" onClick={() => go('/attendance')} className={linkButton}>
          Open attendance
        </button>
      </PanelHead>
      <div className="flex flex-col">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-solid border-[#F7F4F1] px-[18px] py-[13px]">
            <div className="flex min-w-0 flex-[1_1_190px] items-center gap-[11px]">
              <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(row.name)}>
                {initialsOf(row.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold">{row.name}</span>
                <span className="block text-[11.5px] text-[#A79C93]">{row.sub}</span>
              </span>
            </div>
            <div className="min-w-20 flex-[0_1_110px] text-[12.5px] text-[#857A72]">{row.middle}</div>
            <div className="min-w-[110px] flex-[1_1_130px]">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#F2EEEA]">
                <div className="block h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.barColor }} />
              </div>
              <p className="mb-0 mt-1.5 text-[11px] text-[#A79C93]">{row.barLabel}</p>
            </div>
            <div className="ml-auto flex-none text-right">
              <Pill tone={row.tone}>{row.status}</Pill>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-[18px] py-3">
        <p className="m-0 text-[11.5px] text-[#A79C93]">
          Showing {rows.length} of {shift.scheduled} team member{shift.scheduled === 1 ? '' : 's'} on this shift.
        </p>
        <button
          type="button"
          onClick={onMarkAll}
          className="h-[34px] cursor-pointer rounded-[10px] border border-solid border-[#EBE7E3] bg-white px-3.5 text-[12.5px] font-bold text-black hover:border-[#DDD6D0]"
        >
          Mark all present
        </button>
      </div>
    </section>
  );
}

function TasksPanel({ shift }: { shift: TodaysShift }): React.ReactElement {
  const rows = shift.tasks.slice(0, 5);
  return (
    <section className={card}>
      <PanelHead title="Today's tasks">
        <span className="text-[11.5px] text-[#A79C93]">
          {shift.tasksDone} of {shift.tasksTotal} completed
        </span>
      </PanelHead>
      <ul className="m-0 list-none px-0 py-1.5">
        {rows.length === 0 ? (
          <li className="flex items-center gap-3 px-[18px] py-[11px]">
            <span className="min-w-0 flex-auto">
              <span className="block text-[13px] font-bold">No tasks due today</span>
              <span className="block text-[11.5px] text-[#A79C93]">Tasks due on this shift show up here.</span>
            </span>
          </li>
        ) : (
          rows.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-[18px] py-[11px]">
              {task.done ? (
                <span className="size-[18px] flex-none rounded-full bg-[#2E9E62] shadow-[inset_0_0_0_3px_#fff,inset_0_0_0_4px_#2E9E62]" />
              ) : (
                // 18px + a 2px border each side: the handoff's content-box circle renders 22px.
                <span className="size-[22px] flex-none rounded-full border-2 border-solid border-[#EBE7E3]" />
              )}
              <span className="min-w-0 flex-auto">
                <span className="block text-[13px] font-bold">{task.title}</span>
                <span className="block text-[11.5px] text-[#A79C93]">{task.meta}</span>
              </span>
              <Pill tone={task.tone}>{task.tag}</Pill>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function ShiftControls({ shift, go }: { shift: TodaysShift; go: (to: string) => void }): React.ReactElement {
  return (
    <section className={`${card} p-[18px]`}>
      <h2 className="mb-1 mt-0 text-[14.5px] font-extrabold tracking-normal">Shift controls</h2>
      <p className="mb-3.5 mt-0 text-[12px] text-[#A79C93]">Everything for the next eight hours</p>
      <div className="flex flex-col gap-[9px]">
        {shift.controls.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => go(item.to)}
            className="block w-full cursor-pointer rounded-[12px] border-0 px-[13px] py-[11px] text-left"
            style={{ color: TONES[item.tone][0], backgroundColor: TONES[item.tone][1] }}
          >
            <span className="block text-[12.5px] font-extrabold">{item.title}</span>
            <span className="mt-0.5 block text-[11.5px] font-medium text-[#857A72]">{item.body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TodaysShiftBody({ overview, shift, now }: { overview: ManagerOverview; shift: TodaysShift; now: Date }): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission, myContext } = useSession();
  const queryClient = useQueryClient();
  const { toast, show, dismiss } = useScheduleToast();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const abilities = { editSchedules: hasPermission('schedules.update'), createTasks: hasPermission('tasks.create') };
  const canMark = hasPermission('attendance.update');
  const exceptions = shift.scheduled - shift.unrecorded.length;

  // "Mark all present" fills in everyone on this shift with no record yet, one call each; late and absent entries are kept.
  const markAll = async (): Promise<void> => {
    setSaving(true);
    const results = await Promise.allSettled(
      shift.unrecorded.map((row) => callRpc('mark_attendance', myContext?.organizationId as string, { shiftAssignmentId: row.assignment.id, status: 'present' }))
    );
    setSaving(false);
    setConfirming(false);
    void queryClient.invalidateQueries({ queryKey: ['list_attendance_for_branch_and_range'] });
    const marked = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - marked;
    if (failed) show(`${marked} marked present · ${failed} couldn't be saved`, 'error');
    else show(`${marked} marked present · ${exceptions} exception${exceptions === 1 ? '' : 's'} kept`);
  };

  return (
    <>
      <AskShiftOSCard
        overview={overview}
        now={now}
        onToast={(text) => show(text)}
        chips={ASK_CHIPS_SUP}
        hints={ASK_HINTS_SUP}
        answer={(question, data, at) => answerSupervisorQuestion(question, data, at, abilities)}
      />
      <StatsGrid stats={shift.stats} />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
          <CheckInPanel shift={shift} go={navigate} onMarkAll={() => setConfirming(true)} />
          <TasksPanel shift={shift} />
        </div>
        <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-4">
          <ShiftControls shift={shift} go={navigate} />
          <AnnouncementsCard overview={overview} go={navigate} />
          <ActivityCard overview={overview} go={navigate} />
        </div>
      </div>

      <HandoffModal
        open={confirming}
        title="Mark everyone present?"
        subtitle={`${shift.scheduled} scheduled · ${shift.shiftTitle}`}
        primary={saving ? 'Saving…' : 'Mark all present'}
        primaryDisabled={saving || !canMark || shift.unrecorded.length === 0}
        onPrimary={() => void markAll()}
        onClose={() => setConfirming(false)}
      >
        <ModalConfirm>
          {!canMark
            ? "Your role can't mark attendance for others — ask your manager to turn on Mark attendance."
            : shift.unrecorded.length === 0
              ? 'Everyone on this shift already has a check-in or an absence recorded — there is nobody left to fill in.'
              : `Existing late and absent entries stay as they are — this only fills in the ${shift.unrecorded.length} ${shift.unrecorded.length === 1 ? 'person' : 'people'} with no record yet, checked in as of now (after the start time counts as late). Every change is logged against your name.`}
        </ModalConfirm>
      </HandoffModal>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </>
  );
}

export default function SupervisorDashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission, activeOrganization } = useSession();
  const { status, now, branch, overview } = useManagerOverview();
  const shift = overview ? buildTodaysShift(overview, now) : null;
  const branchName = branch?.name ?? activeOrganization?.name ?? 'Your branch';

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title={shift?.title ?? "Today's shift"} subtitle={shift?.subtitle ?? `${branchName} · ${longDay(now)}`} now={now} />

      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">
        {status === 'loading' ? (
          <OverviewLoading title="Today's shift" />
        ) : !overview || !shift ? (
          <OverviewEmpty
            title="No shift scheduled today"
            body={`${branchName} has nothing published for ${longDay(now)}. Create a shift or check next week's schedule.`}
            cta={hasPermission('schedules.update') ? { label: 'Create a shift', onClick: () => navigate('/schedules') } : null}
            secondary={{ label: 'Open schedules', onClick: () => navigate('/schedules') }}
          />
        ) : (
          <TodaysShiftBody overview={overview} shift={shift} now={now} />
        )}
      </div>
    </div>
  );
}
