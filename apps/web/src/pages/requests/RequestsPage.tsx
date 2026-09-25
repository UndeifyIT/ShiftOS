import React, { useMemo, useState } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { HandoffModal, ModalField, ModalFields, modalControl } from '../../components/HandoffModal.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Department, Employee, LeaveRequest, Member, Schedule, Shift, ShiftAssignment, ShiftSwap } from '../../types/domain.js';
import { OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { LEAVE_TYPE_LABEL, weekdayDayMonth } from '../dashboard/manager/overviewModel.js';
import { useNow } from '../dashboard/manager/useManagerOverview.js';
import { DialogNote, HeaderCta } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, fullName, initialsOf, todayDateString, TONES, type Tone } from '../scheduling/grid/scheduleFormat.js';
import {
  applyFilter,
  buildLeaveViews,
  buildSwapViews,
  countLabel,
  REQUEST_FILTERS,
  REQUEST_TABS,
  requestsSubtitle,
  type LeaveView,
  type RequestFilter,
  type RequestTab,
  type SwapStep,
  type SwapView
} from './requestsModel.js';

/*
 * Requests, built to the design handoff (`ShiftOS Dashboards.dc.html`:
 * `PAGES["Manager/Requests"]`, "REQUESTS: SWAPS + TIME OFF" at lines
 * 1286-1405, renderVals 5055-5106, and the approveSwap / declineSwap /
 * reviewLeave / declineLeave / requestLeave dialogs). Approvers (swaps.approve /
 * leave.approve) see the branch's whole history — list_branch_shift_swaps and
 * list_branch_leave — and decide from here; everyone else sees their own
 * requests, answers swaps aimed at them and raises new ones. The prototype has
 * no CSS reset, so the values below are what it renders (13px base,
 * `line-height: normal`).
 */

const pill = (tone: Tone): React.CSSProperties => ({ color: TONES[tone][0], backgroundColor: TONES[tone][1] });
const pillClass = 'inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold';

function tabClass(selected: boolean): string {
  return [
    'cursor-pointer rounded-[9px] border-0 px-[11px] py-1.5 font-[inherit] text-[11.5px] font-bold',
    selected ? 'bg-white text-[#38312B] shadow-[0_1px_2px_rgba(56,49,43,.12)]' : 'bg-transparent text-[#A79C93]'
  ].join(' ');
}

function chipClass(selected: boolean): string {
  return [
    'h-[34px] cursor-pointer rounded-[9px] border border-solid px-[13px] font-[inherit] text-[11.5px] font-bold',
    selected ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
  ].join(' ');
}

function Avatar({ name }: { name: string }): React.ReactElement {
  const unmatched = name === 'Unmatched';
  return (
    <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(name)}>
      {unmatched ? '?' : initialsOf(name)}
    </span>
  );
}

function StepDot({ step, index }: { step: SwapStep; index: number }): React.ReactElement {
  const style =
    step.state === 'failed'
      ? 'bg-[#C93A22] text-white'
      : step.state === 'done'
        ? 'bg-[#2E9E62] text-white'
        : 'box-content border-[1.5px] border-solid border-[#EBE7E3] text-[#A79C93]'; // content-box, as in the handoff: its border sits outside the 16px
  return (
    <span className={`flex size-4 flex-none items-center justify-center rounded-full text-[9px] font-extrabold ${style}`}>
      {step.state === 'failed' ? '✕' : step.state === 'done' ? '✓' : String(index + 1)}
    </span>
  );
}

function SwapSide({ label, name, role, line, meta }: { label: string; name: string; role: string; line: string; meta: string }): React.ReactElement {
  return (
    // 238px: the handoff's 210px basis is content-box (no CSS reset), so its 13px padding and 1px border sit outside it.
    <div className="min-w-0 flex-[1_1_238px] rounded-[13px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] p-[13px]">
      <p className="m-0 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-[#A79C93]">{label}</p>
      <div className="mt-[9px] flex items-center gap-2.5">
        <Avatar name={name} />
        <span className="min-w-0">
          <span className="block text-[12.5px] font-extrabold">{name}</span>
          <span className="block text-[11px] text-[#A79C93]">{role}</span>
        </span>
      </div>
      <p className="mb-0 mt-2.5 text-[12.5px] font-bold">{line}</p>
      <p className="mb-0 mt-[3px] text-[11.5px] text-[#857A72]">{meta}</p>
    </div>
  );
}

/** `showPendingOutcome`: the requester's own view spells out who a pending swap is waiting on; the approver's (handoff) doesn't. */
function SwapCard({ view, actions, showPendingOutcome }: { view: SwapView; actions: React.ReactNode; showPendingOutcome: boolean }): React.ReactElement {
  const highlight = view.awaitingApproval && Boolean(actions);
  return (
    <article
      className="rounded-[16px] border border-solid px-[18px] py-[17px]"
      style={{ borderColor: highlight ? '#F3DFB8' : '#EBE7E3', backgroundColor: highlight ? '#FEFCF7' : '#fff' }}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={pillClass} style={pill(view.tone)}>
          {view.status}
        </span>
        <span className="text-[11.5px] text-[#A79C93]">{view.ref}</span>
        <span className="ml-auto text-[11.5px] text-[#A79C93]">{view.age}</span>
      </div>

      <div className="mt-[13px] flex flex-wrap items-stretch gap-2.5">
        <SwapSide label="Gives up" name={view.fromName} role={view.fromRole} line={view.shiftLine} meta={view.shiftMeta} />
        <span aria-hidden="true" className="flex size-[30px] flex-[0_0_30px] items-center justify-center self-center rounded-full bg-[#FDF0E9] text-[13px] font-extrabold text-[#C6420E]">
          ⇄
        </span>
        <SwapSide label="Takes over" name={view.toName} role={view.toRole} line={view.shiftLine} meta={view.shiftMeta} />
      </div>

      <p className="mb-0 mt-3 text-[12.5px] text-[#57504A] [text-wrap:pretty]">
        <strong className="font-extrabold">Reason:</strong> {view.reason}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-[9px] border-0 border-t border-solid border-[#F2EEEA] pt-[11px]">
        <ol className="m-0 flex flex-[1_1_260px] list-none flex-wrap gap-2 p-0">
          {view.steps.map((step, index) => (
            <li key={step.label} className="flex items-center gap-1.5 text-[11px] font-bold text-[#857A72]">
              <StepDot step={step} index={index} />
              {step.label}
            </li>
          ))}
        </ol>
        {actions ?? (view.outcome && (view.filter === 'Resolved' || showPendingOutcome) ? <span className="ml-auto text-[11.5px] font-bold text-[#A79C93]">{view.outcome}</span> : null)}
      </div>
    </article>
  );
}

const approveButton = 'h-9 cursor-pointer rounded-[10px] border-0 bg-[#2E9E62] px-[15px] font-[inherit] text-[12.5px] font-bold text-white disabled:opacity-60';
const declineButton = 'h-9 cursor-pointer rounded-[10px] border border-solid border-[#F3C6BD] bg-white px-3.5 font-[inherit] text-[12.5px] font-bold text-[#C93A22] disabled:opacity-60';

function LeaveTable({ rows, foot, action, footAction }: { rows: LeaveView[]; foot: string; action: (row: LeaveView) => React.ReactNode; footAction?: React.ReactNode }): React.ReactElement {
  return (
    <section className="overflow-hidden rounded-[16px] border border-solid border-[#EBE7E3] bg-white">
      <div className="flex gap-3 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[11px] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[#A79C93]">
        <span className="min-w-0 flex-[1_1_170px]">Employee</span>
        <span className="flex-[0_0_130px]">Dates</span>
        <span className="min-w-0 flex-[1_1_150px]">Type &amp; reason</span>
        <span className="flex-[0_0_96px]">Status</span>
        <span className="flex-[0_0_104px] text-right">Action</span>
      </div>
      {rows.length === 0 ? <p className="m-0 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-3.5 text-[12.5px] text-[#A79C93]">No leave requests in this filter.</p> : null}
      {rows.map((row) => (
        <div key={row.leave.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-0 border-b border-solid border-[#F7F4F1] px-[18px] py-3">
          <span className="flex min-w-0 flex-[1_1_170px] items-center gap-[11px]">
            <Avatar name={row.name} />
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-bold">{row.name}</span>
              <span className="block text-[11px] text-[#A79C93]">{row.dept}</span>
            </span>
          </span>
          <span className="min-w-0 flex-[0_0_130px]">
            <span className="block text-[12.5px] font-bold">{row.dates}</span>
            <span className="block text-[11px] text-[#A79C93]">{row.days}</span>
          </span>
          <span className="min-w-0 flex-[1_1_150px]">
            <span className="block text-[12.5px] font-bold">{row.type}</span>
            <span className="block text-[11px] text-[#857A72]">{row.reason}</span>
          </span>
          <span className="flex-[0_0_96px]">
            <span className={pillClass} style={pill(row.tone)}>
              {row.status}
            </span>
          </span>
          <span className="ml-auto flex-[0_0_104px] text-right">{action(row)}</span>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 px-[18px] py-3">
        <p className="m-0 flex-[1_1_260px] text-[11.5px] text-[#A79C93]">{foot}</p>
        {footAction}
      </div>
    </section>
  );
}

const rowButton = (primary: boolean): string =>
  [
    'h-8 cursor-pointer rounded-[9px] px-3 font-[inherit] text-[11.5px] font-bold',
    primary ? 'border-0 bg-[#F04E17] text-white' : 'border border-solid border-[#EBE7E3] bg-white text-[#38312B]'
  ].join(' ');

type Dialog =
  | { kind: 'approveSwap'; view: SwapView }
  | { kind: 'declineSwap'; view: SwapView }
  | { kind: 'reviewLeave'; view: LeaveView }
  | { kind: 'declineLeave'; view: LeaveView }
  | { kind: 'viewLeave'; view: LeaveView }
  | { kind: 'newRequest' };

interface NewRequestDraft {
  type: 'Time off' | 'Shift swap';
  employeeId: string;
  leaveType: LeaveRequest['leave_type'];
  startDate: string;
  endDate: string;
  assignmentId: string;
  targetId: string;
  reason: string;
}

export default function RequestsPage(): React.ReactElement {
  const now = useNow();
  const { profile, hasPermission } = useSession();
  const { toast, show, dismiss } = useScheduleToast();
  const canApproveSwaps = hasPermission('swaps.approve');
  const canApproveLeave = hasPermission('leave.approve');
  const isApprover = canApproveSwaps || canApproveLeave;
  const canRespond = hasPermission('swaps.respond');
  const canRequestSwap = hasPermission('swaps.request');
  const canCreateLeave = hasPermission('leave.create');

  const branchId = useDefaultBranchId() ?? '';
  const scoped = branchId ? { branchId } : undefined;
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', scoped, { enabled: hasPermission('employees.read') });
  const { data: departments } = useRpcQuery<Department[]>('list_departments', scoped, { enabled: Boolean(branchId) && hasPermission('departments.read') });
  const { data: members } = useRpcQuery<Member[]>('list_members', undefined, { enabled: hasPermission('org.members.manage') });

  const branchSwaps = useRpcQuery<ShiftSwap[]>('list_branch_shift_swaps', scoped, { enabled: canApproveSwaps });
  const mySwaps = useRpcQuery<ShiftSwap[]>('list_my_shift_swaps', undefined, { enabled: !canApproveSwaps && hasPermission('swaps.read') });
  const openSwaps = useRpcQuery<ShiftSwap[]>('list_open_shift_swaps', undefined, { enabled: !canApproveSwaps && hasPermission('swaps.read') });
  const branchLeave = useRpcQuery<LeaveRequest[]>('list_branch_leave', scoped, { enabled: canApproveLeave });
  const myLeave = useRpcQuery<LeaveRequest[]>('list_my_leave', undefined, { enabled: !canApproveLeave && hasPermission('leave.read') });

  const me = useMemo(
    () => (employees ?? []).find((e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase()) ?? null,
    [employees, profile]
  );
  const ctx = { employees: employees ?? [], departments: departments ?? [], members: members ?? [], now, meId: isApprover ? null : me?.id ?? null };
  const swapViews = buildSwapViews(canApproveSwaps ? branchSwaps.data ?? [] : [...(mySwaps.data ?? []), ...(openSwaps.data ?? [])], ctx);
  const leaveViews = buildLeaveViews(canApproveLeave ? branchLeave.data ?? [] : myLeave.data ?? [], ctx);

  const [tab, setTab] = useState<RequestTab>('Swap requests');
  const [filter, setFilter] = useState<RequestFilter>('Pending');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  const shownSwaps = applyFilter(swapViews, filter);
  const shownLeave = applyFilter(leaveViews, filter);

  const open = (next: Dialog): void => {
    setNote('');
    setDialogError(null);
    setDialog(next);
  };
  const close = (): void => setDialog(null);
  const fail = (error: Error): void => setDialogError(error.message);
  const done = (message: string, after?: () => void): void => {
    setDialog(null);
    show(message);
    after?.();
  };
  const swapInvalidates = ['list_branch_shift_swaps', 'list_my_shift_swaps', 'list_open_shift_swaps', 'list_pending_shift_swap_approvals'];
  const leaveInvalidates = ['list_branch_leave', 'list_my_leave', 'list_pending_leave'];

  const approveSwap = useRpcMutation<unknown, { swapId: string }>('approve_shift_swap', {
    invalidates: swapInvalidates,
    onSuccess: () => done('Swap approved · schedule updated'),
    onError: fail
  });
  const rejectSwap = useRpcMutation<unknown, { swapId: string; decisionNotes?: string }>('reject_shift_swap', {
    invalidates: swapInvalidates,
    onSuccess: () => done('Swap declined · requester notified'),
    onError: fail
  });
  const respondSwap = useRpcMutation<unknown, { swapId: string; accept: boolean }>('respond_to_shift_swap', {
    invalidates: swapInvalidates,
    onSuccess: (_result, input) => show(input.accept ? 'Swap accepted · waiting on your supervisor' : 'Swap declined · requester notified'),
    onError: (error) => show(error.message, 'error')
  });
  const approveLeave = useRpcMutation<unknown, { leaveRequestId: string }>('approve_leave_request', {
    invalidates: leaveInvalidates,
    onSuccess: () => done(`${dialog && dialog.kind === 'reviewLeave' ? `${dialog.view.name}'s leave approved · ${dialog.view.dates}` : 'Leave approved'}`, () => setFilter('Resolved')),
    onError: fail
  });
  const rejectLeave = useRpcMutation<unknown, { leaveRequestId: string; reason: string }>('reject_leave_request', {
    invalidates: leaveInvalidates,
    onSuccess: () => done(`${dialog && 'view' in dialog ? `${(dialog.view as LeaveView).name}'s leave declined` : 'Leave declined'} · requester notified`, () => setFilter('Resolved')),
    onError: fail
  });

  // ---- New request (approvers: time off for someone in the branch; everyone else: a swap or time off of their own)
  const emptyDraft = (): NewRequestDraft => ({
    type: isApprover || !canRequestSwap ? 'Time off' : 'Shift swap',
    employeeId: isApprover ? '' : me?.id ?? '',
    leaveType: 'annual_leave',
    startDate: '',
    endDate: '',
    assignmentId: '',
    targetId: '',
    reason: ''
  });
  const [draft, setDraft] = useState<NewRequestDraft>(emptyDraft);
  const createLeave = useRpcMutation<LeaveRequest, { employeeId: string; leaveType: string; startDate: string; endDate: string; reason: string }>('create_leave_request', {
    invalidates: leaveInvalidates,
    onSuccess: () =>
      done(isApprover ? 'Leave request recorded · pending approval' : 'Leave request sent · pending approval', () => {
        setTab('Time off');
        setFilter('Pending');
      }),
    onError: fail
  });
  const requestSwap = useRpcMutation<unknown, { shiftAssignmentId: string; targetEmployeeId?: string | null; notes?: string | null }>('request_shift_swap', {
    invalidates: swapInvalidates,
    onSuccess: () =>
      done('Request submitted to your supervisor', () => {
        setTab('Swap requests');
        setFilter('Pending');
      }),
    onError: fail
  });

  // My upcoming shifts, for a swap request of my own.
  const today = todayDateString(now);
  const { data: schedules } = useRpcQuery<Schedule[]>('list_schedules', scoped, { enabled: !isApprover && canRequestSwap && Boolean(me) && hasPermission('schedules.read') });
  const current = [...(schedules ?? [])].filter((s) => s.status === 'published' && s.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const { data: myShifts } = useRpcQuery<Shift[]>('list_shifts_for_employee_in_schedule', current && me ? { scheduleId: current.id, employeeId: me.id } : undefined, {
    enabled: Boolean(current && me)
  });
  const { data: myAssignments } = useRpcQuery<ShiftAssignment[]>('list_my_shift_assignments_in_schedule', current ? { scheduleId: current.id } : undefined, {
    enabled: Boolean(current && me)
  });
  const shiftChoices = (myShifts ?? [])
    .filter((shift) => shift.shift_date >= today)
    .flatMap((shift) => {
      const assignment = (myAssignments ?? []).find((a) => a.shift_id === shift.id);
      return assignment ? [{ id: assignment.id, label: `${weekdayDayMonth(shift.shift_date)} · ${shift.start_time.slice(0, 5)} – ${shift.end_time.slice(0, 5)}` }] : [];
    });
  const colleagues = (employees ?? []).filter((e) => e.is_active && !e.deleted_at && e.employment_status === 'active' && e.id !== me?.id);

  const submitNewRequest = (): void => {
    if (!draft.reason.trim()) return setDialogError('Add a reason — your supervisor sees it with the request.');
    if (draft.type === 'Shift swap') {
      if (!draft.assignmentId) return setDialogError('Pick the shift you want to give up.');
      requestSwap.mutate({ shiftAssignmentId: draft.assignmentId, targetEmployeeId: draft.targetId || null, notes: draft.reason.trim() });
      return;
    }
    if (!draft.employeeId) return setDialogError(isApprover ? 'Choose who the time off is for.' : 'No employee record is linked to your account.');
    if (!draft.startDate || !draft.endDate) return setDialogError('Pick the first and last day.');
    if (draft.endDate < draft.startDate) return setDialogError('The last day can’t be before the first day.');
    createLeave.mutate({ employeeId: draft.employeeId, leaveType: draft.leaveType, startDate: draft.startDate, endDate: draft.endDate, reason: draft.reason.trim() });
  };

  const busy = approveSwap.isPending || rejectSwap.isPending || approveLeave.isPending || rejectLeave.isPending || createLeave.isPending || requestSwap.isPending;
  const loading = tab === 'Swap requests' ? (canApproveSwaps ? branchSwaps.isLoading : mySwaps.isLoading) : canApproveLeave ? branchLeave.isLoading : myLeave.isLoading;
  const canNewRequest = canCreateLeave || (!isApprover && canRequestSwap);

  const swapActions = (view: SwapView): React.ReactNode => {
    if (canApproveSwaps && view.awaitingApproval) {
      return (
        <span className="ml-auto flex flex-wrap gap-[7px]">
          <button type="button" disabled={busy} onClick={() => open({ kind: 'approveSwap', view })} className={approveButton}>
            Approve swap
          </button>
          <button type="button" disabled={busy} onClick={() => open({ kind: 'declineSwap', view })} className={declineButton}>
            Decline
          </button>
        </span>
      );
    }
    const aimedAtMe = !canApproveSwaps && canRespond && view.swap.status === 'pending' && me && view.swap.requested_by_employee_id !== me.id && (view.swap.target_employee_id === me.id || !view.swap.target_employee_id);
    if (aimedAtMe) {
      return (
        <span className="ml-auto flex flex-wrap gap-[7px]">
          <button type="button" disabled={respondSwap.isPending} onClick={() => respondSwap.mutate({ swapId: view.swap.id, accept: true })} className={approveButton}>
            {view.swap.target_employee_id ? 'Accept swap' : 'Take this shift'}
          </button>
          {view.swap.target_employee_id ? (
            <button type="button" disabled={respondSwap.isPending} onClick={() => respondSwap.mutate({ swapId: view.swap.id, accept: false })} className={declineButton}>
              Decline
            </button>
          ) : null}
        </span>
      );
    }
    if (!canApproveSwaps && view.awaitingApproval) return <span className="ml-auto text-[11.5px] font-bold text-[#A79C93]">Waiting on your supervisor</span>;
    return null;
  };

  const body = (): React.ReactNode => {
    if (loading) return <OverviewLoading title="Requests" />;
    return (
      <>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex gap-0.5 rounded-[11px] bg-[#F6F3F0] p-[3px]">
            {REQUEST_TABS.map((name) => (
              <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)} className={tabClass(tab === name)}>
                {name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REQUEST_FILTERS.map((name) => (
              <button key={name} type="button" aria-pressed={filter === name} onClick={() => setFilter(name)} className={chipClass(filter === name)}>
                {name}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[12px] text-[#A79C93]">{countLabel(tab === 'Swap requests' ? shownSwaps.length : shownLeave.length, tab)}</span>
        </div>

        {tab === 'Swap requests' ? (
          <div className="flex flex-col gap-3">
            {shownSwaps.map((view) => (
              <SwapCard key={view.swap.id} view={view} actions={swapActions(view)} showPendingOutcome={!canApproveSwaps} />
            ))}
            {shownSwaps.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#E4DED9] bg-white px-6 py-10 text-center">
                <p className="m-0 text-[15px] font-extrabold">No swap requests in this filter</p>
                <p className="mx-auto mb-0 mt-[7px] max-w-[400px] text-[12.5px] text-[#857A72]">Swaps only exist against published shifts. When someone requests one, it lands here for approval.</p>
              </div>
            ) : null}
          </div>
        ) : (
          <LeaveTable
            rows={shownLeave}
            foot={
              canApproveLeave
                ? 'Approving a leave request records the decision and notifies the requester. Check the schedule for anyone rostered in that range.'
                : "Decisions come from your supervisor. You'll be notified as soon as one is made."
            }
            action={(row) =>
              canApproveLeave && row.filter === 'Pending' ? (
                <button type="button" onClick={() => open({ kind: 'reviewLeave', view: row })} className={rowButton(true)}>
                  Review
                </button>
              ) : (
                <button type="button" onClick={() => open({ kind: 'viewLeave', view: row })} className={rowButton(false)}>
                  View
                </button>
              )
            }
            footAction={
              !canApproveLeave && canCreateLeave ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ ...emptyDraft(), type: 'Time off' });
                    open({ kind: 'newRequest' });
                  }}
                  className="h-9 cursor-pointer rounded-[10px] border-0 bg-[#F04E17] px-[15px] font-[inherit] text-[12.5px] font-bold text-white hover:bg-[#DC4611]"
                >
                  Request time off
                </button>
              ) : null
            }
          />
        )}
      </>
    );
  };

  const leaveDialog = dialog && (dialog.kind === 'reviewLeave' || dialog.kind === 'declineLeave' || dialog.kind === 'viewLeave') ? dialog.view : null;
  const swapDialog = dialog && (dialog.kind === 'approveSwap' || dialog.kind === 'declineSwap') ? dialog.view : null;
  const errorLine = dialogError ? <p className="mx-[22px] mb-0 mt-3 text-[12.5px] font-bold text-[#C93A22]">{dialogError}</p> : null;

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader
        title={isApprover ? 'Swap & leave requests' : 'My requests'}
        subtitle={isApprover ? requestsSubtitle(swapViews, leaveViews) : `${swapViews.filter((v) => v.filter === 'Pending').length} swaps and ${leaveViews.filter((v) => v.filter === 'Pending').length} leave requests pending`}
        now={now}
        actions={
          canNewRequest ? (
            <HeaderCta
              label="New request"
              onClick={() => {
                setDraft(emptyDraft());
                open({ kind: 'newRequest' });
              }}
            />
          ) : null
        }
      />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>

      <HandoffModal
        open={dialog?.kind === 'approveSwap'}
        title="Approve this swap?"
        subtitle={swapDialog ? `${swapDialog.ref} · ${swapDialog.fromName} ⇄ ${swapDialog.toName}` : ''}
        primary={approveSwap.isPending ? 'Approving…' : 'Approve swap'}
        primaryDisabled={busy}
        onPrimary={() => swapDialog && approveSwap.mutate({ swapId: swapDialog.swap.id })}
        onClose={close}
      >
        <DialogNote>
          {swapDialog
            ? `The shift moves to ${swapDialog.toName} immediately and ${swapDialog.fromName} is notified. Attendance for ${swapDialog.shiftLine.split(' · ')[0]} will expect ${swapDialog.toName} instead of ${swapDialog.fromName}.`
            : ''}
        </DialogNote>
        {errorLine}
      </HandoffModal>

      <HandoffModal
        open={dialog?.kind === 'declineSwap'}
        title="Decline this swap?"
        subtitle={swapDialog ? `${swapDialog.ref} · ${swapDialog.fromName} ⇄ ${swapDialog.toName}` : ''}
        primary={rejectSwap.isPending ? 'Declining…' : 'Decline swap'}
        tone="danger"
        primaryDisabled={busy}
        onPrimary={() => {
          if (!swapDialog) return;
          if (!note.trim()) return setDialogError('Give the requester a reason.');
          rejectSwap.mutate({ swapId: swapDialog.swap.id, decisionNotes: note.trim() });
        }}
        onClose={close}
      >
        <ModalFields>
          <ModalField label="Reason for declining" required full>
            <textarea
              className={`${modalControl} h-auto min-h-[84px] resize-y py-2.5 leading-[1.5]`}
              value={note}
              placeholder="Coverage cannot move between departments"
              onChange={(event) => setNote(event.target.value)}
            />
          </ModalField>
        </ModalFields>
        {errorLine}
      </HandoffModal>

      <HandoffModal
        open={dialog?.kind === 'reviewLeave'}
        title="Review leave request"
        subtitle={leaveDialog ? `${leaveDialog.name} · ${leaveDialog.dates} · ${leaveDialog.type}` : ''}
        primary={approveLeave.isPending ? 'Approving…' : 'Approve leave'}
        primaryDisabled={busy}
        onPrimary={() => leaveDialog && approveLeave.mutate({ leaveRequestId: leaveDialog.leave.id })}
        secondary={{ label: 'Decline', disabled: busy, onClick: () => leaveDialog && open({ kind: 'declineLeave', view: leaveDialog }) }}
        onClose={close}
      >
        {leaveDialog ? (
          <ModalFields>
            <ModalField label="Employee" required>
              <input className={modalControl} value={`${leaveDialog.name} · ${leaveDialog.dept}`} readOnly />
            </ModalField>
            <ModalField label="Dates" required>
              <input className={modalControl} value={`${leaveDialog.dates} · ${leaveDialog.days}`} readOnly />
            </ModalField>
            <ModalField label="Type" required>
              <input className={modalControl} value={leaveDialog.type} readOnly />
            </ModalField>
            <ModalField label="Reason given">
              <input className={modalControl} value={leaveDialog.reason} readOnly />
            </ModalField>
          </ModalFields>
        ) : null}
        {errorLine}
      </HandoffModal>

      <HandoffModal
        open={dialog?.kind === 'declineLeave'}
        title="Decline this leave request?"
        subtitle="The requester is notified with your note."
        primary={rejectLeave.isPending ? 'Declining…' : 'Decline leave'}
        tone="danger"
        primaryDisabled={busy}
        onPrimary={() => {
          if (!leaveDialog) return;
          if (!note.trim()) return setDialogError('Give the requester a reason.');
          rejectLeave.mutate({ leaveRequestId: leaveDialog.leave.id, reason: note.trim() });
        }}
        onClose={close}
      >
        <ModalFields>
          <ModalField label="Reason for declining" required full>
            <textarea
              className={`${modalControl} h-auto min-h-[84px] resize-y py-2.5 leading-[1.5]`}
              value={note}
              placeholder="Coverage cannot be arranged for those days"
              onChange={(event) => setNote(event.target.value)}
            />
          </ModalField>
        </ModalFields>
        {errorLine}
      </HandoffModal>

      <HandoffModal
        open={dialog?.kind === 'viewLeave'}
        title="Leave request"
        subtitle={leaveDialog ? `${leaveDialog.name} · ${leaveDialog.dates} · ${leaveDialog.type}` : ''}
        primary="Done"
        onPrimary={close}
        onClose={close}
      >
        {leaveDialog ? (
          <ModalFields>
            <ModalField label="Status">
              <input className={modalControl} value={leaveDialog.status} readOnly />
            </ModalField>
            <ModalField label="Dates">
              <input className={modalControl} value={`${leaveDialog.dates} · ${leaveDialog.days}`} readOnly />
            </ModalField>
            <ModalField label="Reason given" full>
              <input className={modalControl} value={leaveDialog.reason} readOnly />
            </ModalField>
            {leaveDialog.leave.manager_notes ? (
              <ModalField label="Decision note" full>
                <input className={modalControl} value={leaveDialog.leave.manager_notes} readOnly />
              </ModalField>
            ) : null}
          </ModalFields>
        ) : null}
      </HandoffModal>

      <HandoffModal
        open={dialog?.kind === 'newRequest'}
        title={draft.type === 'Time off' && !isApprover ? 'Request time off' : 'New request'}
        subtitle={isApprover ? 'Record time off for someone in your branch — it waits for approval like any other request.' : 'Raise a swap or time-off request. It goes to your supervisor for approval.'}
        primary={createLeave.isPending || requestSwap.isPending ? 'Submitting…' : 'Submit request'}
        primaryDisabled={busy}
        onPrimary={submitNewRequest}
        onClose={close}
      >
        <ModalFields>
          {!isApprover && canRequestSwap && canCreateLeave ? (
            <ModalField label="Request type" required>
              <select className={modalControl} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as NewRequestDraft['type'] })}>
                <option>Shift swap</option>
                <option>Time off</option>
              </select>
            </ModalField>
          ) : null}
          {draft.type === 'Shift swap' ? (
            <>
              <ModalField label="Your shift" required>
                <select className={modalControl} value={draft.assignmentId} onChange={(event) => setDraft({ ...draft, assignmentId: event.target.value })}>
                  <option value="">{shiftChoices.length ? 'Choose a shift' : 'No upcoming shifts'}</option>
                  {shiftChoices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </ModalField>
              <ModalField label="Swap with">
                <select className={modalControl} value={draft.targetId} onChange={(event) => setDraft({ ...draft, targetId: event.target.value })}>
                  <option value="">Anyone in the branch</option>
                  {colleagues.map((person) => (
                    <option key={person.id} value={person.id}>
                      {fullName(person)}
                    </option>
                  ))}
                </select>
              </ModalField>
            </>
          ) : (
            <>
              {isApprover ? (
                <ModalField label="Employee" required>
                  <select className={modalControl} value={draft.employeeId} onChange={(event) => setDraft({ ...draft, employeeId: event.target.value })}>
                    <option value="">Choose a person</option>
                    {(employees ?? [])
                      .filter((e) => e.is_active && !e.deleted_at)
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {fullName(person)}
                        </option>
                      ))}
                  </select>
                </ModalField>
              ) : null}
              <ModalField label="Leave type" required>
                <select className={modalControl} value={draft.leaveType} onChange={(event) => setDraft({ ...draft, leaveType: event.target.value as LeaveRequest['leave_type'] })}>
                  {Object.entries(LEAVE_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </ModalField>
              <ModalField label="First day" required>
                <input type="date" className={modalControl} value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value, endDate: draft.endDate || event.target.value })} />
              </ModalField>
              <ModalField label="Last day" required>
                <input type="date" className={modalControl} value={draft.endDate} min={draft.startDate || undefined} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
              </ModalField>
            </>
          )}
          <ModalField label="Reason" required full>
            <textarea
              className={`${modalControl} h-auto min-h-[84px] resize-y py-2.5 leading-[1.5]`}
              value={draft.reason}
              placeholder={draft.type === 'Shift swap' ? 'Family commitment' : 'Your supervisor sees this with the request.'}
              onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
            />
          </ModalField>
        </ModalFields>
        {errorLine}
      </HandoffModal>

      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
