import React, { useMemo, useState } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import { AuthBanner } from '../auth/AuthInputs.js';
import { DashHeader, InitialsAvatar, StatusPill } from '../dashboard/dashboardWidgets.js';
import { ObSelect } from '../onboarding/OnboardingFields.js';
import type { Branch, Employee, LeaveRequest, Schedule, Shift, ShiftAssignment, ShiftSwap } from '../../types/domain.js';

/**
 * Requests, recreated from `ShiftOS Dashboards.dc.html`'s kindRequests
 * renderer: a Swaps/Leave segmented control over role-aware views.
 * - Swaps: staff see their own + open swap cards (respond accept/decline);
 *   managers/supervisors see the pending-approval queue (approve/reject).
 * - Leave: staff see "my leave" + a request form; approvers see the pending
 *   queue with approve/reject.
 * Swap cards show the design's "Gives up → arrow → Takes over" layout where
 * the backend returns the counterpart employee (open swaps have no target).
 */

const SWAP_TONES: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'primary' | 'violet' | 'neutral'> = {
  pending: 'warn',
  accepted: 'info',
  declined: 'neutral',
  approved: 'ok',
  rejected: 'bad',
  cancelled: 'neutral'
};

const LEAVE_TONES: Record<string, 'ok' | 'warn' | 'bad' | 'neutral'> = {
  pending: 'warn',
  approved: 'ok',
  rejected: 'bad',
  cancelled: 'neutral'
};

const LEAVE_TYPES = [
  { value: 'annual_leave', label: 'Annual leave' },
  { value: 'sick_leave', label: 'Sick leave' },
  { value: 'emergency_leave', label: 'Emergency leave' },
  { value: 'unpaid_leave', label: 'Unpaid leave' }
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};

export default function RequestsPage(): React.ReactElement {
  const { profile, myContext, hasPermission } = useSession();
  const canApproveSwaps = hasPermission('swaps.approve');
  const canRespondSwaps = hasPermission('swaps.respond');
  const canRequestSwaps = hasPermission('swaps.request');
  const canApproveLeave = hasPermission('leave.approve');
  const canCreateLeave = hasPermission('leave.create');
  const canReadEmployees = hasPermission('employees.read');

  const [tab, setTab] = useState<'swaps' | 'leave'>('swaps');

  const { data: myEmployeeRecord } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const myEmployee = useMemo(
    () =>
      (myEmployeeRecord ?? []).find(
        (e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase()
      ) ?? null,
    [myEmployeeRecord, profile]
  );

  return (
    <div className="px-4 pb-10 pt-[72px] sm:px-6 lg:px-8">
      <DashHeader title="Requests" subtitle="Swap requests and time off, in one approval path." />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex gap-0.5 rounded-xl bg-[#F6F3F0] p-1">
          {(
            [
              { id: 'swaps', label: 'Swap requests' },
              { id: 'leave', label: 'Time off' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'cursor-pointer rounded-lg px-[11px] py-1.5 text-[11.5px] font-bold transition-colors',
                tab === t.id ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(56,49,43,0.16)]' : 'text-neutral-400 hover:text-neutral-600'
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'swaps' ? <SwapsTab canApprove={canApproveSwaps} canRespond={canRespondSwaps} canRequest={canRequestSwaps} /> : <LeaveTab canApprove={canApproveLeave} canCreate={canCreateLeave} myEmployeeId={myEmployee?.id ?? null} contextKey={myContext?.organizationId ?? 'none'} />}
    </div>
  );
}

/* ---------------- Swaps ---------------- */

function SwapsTab({
  canApprove,
  canRespond,
  canRequest
}: {
  canApprove: boolean;
  canRespond: boolean;
  canRequest: boolean;
}): React.ReactElement {
  const [error, setError] = useState<string | null>(null);

  // Approvers work the pending queue; everyone else sees their own + open swaps.
  const approvalsQuery = useRpcQuery<ShiftSwap[]>('list_pending_shift_swap_approvals', undefined, { enabled: canApprove });
  const mineQuery = useRpcQuery<ShiftSwap[]>('list_my_shift_swaps', undefined, { enabled: !canApprove });
  const openQuery = useRpcQuery<ShiftSwap[]>('list_open_shift_swaps', undefined, { enabled: !canApprove });

  const approveMutation = useRpcMutation<unknown, { swapId: string; decisionNotes?: string }>('approve_shift_swap', {
    invalidates: ['list_pending_shift_swap_approvals', 'list_my_shift_swaps', 'list_open_shift_swaps'],
    onSuccess: () => setError(null),
    onError: (err) => setError(err.message)
  });
  const rejectMutation = useRpcMutation<unknown, { swapId: string; decisionNotes?: string }>('reject_shift_swap', {
    invalidates: ['list_pending_shift_swap_approvals', 'list_my_shift_swaps', 'list_open_shift_swaps'],
    onSuccess: () => setError(null),
    onError: (err) => setError(err.message)
  });
  const respondMutation = useRpcMutation<unknown, { swapId: string; accept: boolean }>('respond_to_shift_swap', {
    invalidates: ['list_my_shift_swaps', 'list_open_shift_swaps'],
    onSuccess: () => setError(null),
    onError: (err) => setError(err.message)
  });

  const queue = canApprove ? (approvalsQuery.data ?? []) : [...(mineQuery.data ?? []), ...(openQuery.data ?? [])];

  return (
    <div>
      {error ? <AuthBanner tone="bad" title={error} /> : null}
      {(canApprove ? approvalsQuery.isLoading : mineQuery.isLoading || openQuery.isLoading) ? (
        <p className="text-sm text-neutral-500">Loading swap requests…</p>
      ) : queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-extrabold text-neutral-900">No swap requests in this view</p>
          <p className="mx-auto mt-1.5 max-w-[400px] text-[12.5px] text-neutral-500">
            Swaps only exist against published shifts. When someone requests one, it lands here for approval.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((swap) => (
            <SwapCard
              key={swap.id}
              swap={swap}
              mode={canApprove ? 'approve' : swap.requested_by_employee_id ? 'respond' : 'view'}
              canRespond={canRespond}
              onApprove={() => approveMutation.mutate({ swapId: swap.id })}
              onReject={() => rejectMutation.mutate({ swapId: swap.id })}
              onRespond={(accept) => respondMutation.mutate({ swapId: swap.id, accept })}
              busy={approveMutation.isPending || rejectMutation.isPending || respondMutation.isPending}
            />
          ))}
        </div>
      )}
      {canRequest ? <RequestSwapComposer onError={setError} /> : null}
    </div>
  );
}

function SwapCard({
  swap,
  mode,
  canRespond,
  onApprove,
  onReject,
  onRespond,
  busy
}: {
  swap: ShiftSwap;
  mode: 'approve' | 'respond' | 'view';
  canRespond: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRespond: (accept: boolean) => void;
  busy: boolean;
}): React.ReactElement {
  const actionable =
    mode === 'approve'
      ? swap.status === 'pending' || swap.status === 'accepted'
      : canRespond && (swap.status === 'pending' || swap.status === 'accepted');
  const closed = !actionable;

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusPill tone={SWAP_TONES[swap.status] ?? 'neutral'}>{STATUS_LABEL[swap.status] ?? swap.status}</StatusPill>
        <span className="text-[11.5px] text-neutral-400">Swap request</span>
        <span className="ml-auto text-[11.5px] text-neutral-400">
          {new Date(swap.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-3.5">
        <div className="min-w-[200px] flex-[1_1_220px] rounded-[13px] border border-neutral-100 p-3.5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-neutral-400">Gives up</p>
          <div className="mt-[9px] flex items-center gap-2.5">
            <InitialsAvatar name={`Employee ${swap.requested_by_employee_id.slice(0, 4)}`} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-extrabold text-neutral-900">
                {swap.requested_by_employee_id === swap.target_employee_id ? '—' : 'Requesting employee'}
              </span>
              <span className="block text-[11px] text-neutral-400">Assignment {swap.shift_assignment_id.slice(0, 8)}…</span>
            </span>
          </div>
        </div>

        <span
          aria-hidden="true"
          className="flex size-[30px] shrink-0 items-center justify-center self-center rounded-full bg-brand-soft text-[13px] font-extrabold text-brand-deep"
        >
          →
        </span>

        <div className="min-w-[200px] flex-[1_1_220px] rounded-[13px] border border-neutral-100 p-3.5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-neutral-400">Takes over</p>
          <div className="mt-[9px] flex items-center gap-2.5">
            <InitialsAvatar name={swap.target_employee_id ? `Employee ${swap.target_employee_id.slice(0, 4)}` : 'Open shift'} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-extrabold text-neutral-900">
                {swap.target_employee_id ? 'Named counterpart' : 'Open — anyone can take it'}
              </span>
              <span className="block text-[11px] text-neutral-400">{swap.responded_at ? `Responded ${new Date(swap.responded_at).toLocaleDateString()}` : 'Awaiting response'}</span>
            </span>
          </div>
        </div>
      </div>

      {swap.notes ? (
        <p className="mt-3 text-[12.5px] text-neutral-600">
          <strong className="font-extrabold">Reason:</strong> {swap.notes}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-neutral-100 pt-[11px]">
        {actionable ? (
          <span className="ml-auto flex flex-wrap gap-[7px]">
            {mode === 'approve' ? (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={busy}
                  className="h-9 cursor-pointer rounded-[10px] bg-success-500 px-[15px] text-[12.5px] font-bold text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={busy}
                  className="h-9 cursor-pointer rounded-[10px] border border-[#F3C6BD] bg-white px-3.5 text-[12.5px] font-bold text-error-600 transition-colors hover:bg-error-50 disabled:opacity-60"
                >
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onRespond(true)}
                  disabled={busy}
                  className="h-9 cursor-pointer rounded-[10px] bg-success-500 px-[15px] text-[12.5px] font-bold text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onRespond(false)}
                  disabled={busy}
                  className="h-9 cursor-pointer rounded-[10px] border border-[#F3C6BD] bg-white px-3.5 text-[12.5px] font-bold text-error-600 transition-colors hover:bg-error-50 disabled:opacity-60"
                >
                  Decline
                </button>
              </>
            )}
          </span>
        ) : (
          <span className="ml-auto text-[11.5px] font-bold text-neutral-400">
            {swap.decision_at ? `Decided ${new Date(swap.decision_at).toLocaleDateString()}` : STATUS_LABEL[swap.status] ?? swap.status}
          </span>
        )}
      </div>
    </article>
  );
}

/** Minimal request-a-swap composer: pick one of your upcoming assigned shifts and add a note. */
function RequestSwapComposer({ onError }: { onError: (message: string) => void }): React.ReactElement | null {
  const { profile, hasPermission } = useSession();
  const canReadEmployees = hasPermission('employees.read');
  const canReadSchedules = hasPermission('schedules.read');
  const [open, setOpen] = useState(false);
  const [assignmentId, setAssignmentId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: employees } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canReadEmployees });
  const myEmployee = useMemo(
    () => (employees ?? []).find((e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase()) ?? null,
    [employees, profile]
  );
  const { data: schedules } = useRpcQuery<Schedule[]>('list_schedules', myEmployee ? { branchId: myEmployee.branch_id } : undefined, {
    enabled: Boolean(myEmployee) && canReadSchedules
  });
  const currentSchedule = [...(schedules ?? [])].filter((s) => s.status === 'published').sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
  const { data: myShifts } = useRpcQuery<Shift[]>(
    'list_shifts_for_employee_in_schedule',
    currentSchedule && myEmployee ? { scheduleId: currentSchedule.id, employeeId: myEmployee.id } : undefined,
    { enabled: Boolean(currentSchedule && myEmployee) }
  );
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (myShifts ?? []).filter((s) => s.shift_date >= today).slice(0, 8);

  // Resolve this employee's own assignment per shift (clock-in endpoints key
  // off the assignment id, and so does request_shift_swap).
  const { data: firstAssignments } = useRpcQuery<ShiftAssignment[]>(
    'list_assignments_for_shift',
    upcoming[0] ? { shiftId: upcoming[0].id } : undefined,
    { enabled: Boolean(upcoming[0]) }
  );

  const requestMutation = useRpcMutation<unknown, { shiftAssignmentId: string; targetEmployeeId?: string | null; notes?: string | null }>(
    'request_shift_swap',
    {
      invalidates: ['list_my_shift_swaps', 'list_open_shift_swaps'],
      onSuccess: () => {
        setOpen(false);
        setNotes('');
        setAssignmentId('');
      },
      onError: (err) => onError(err.message)
    }
  );

  if (!myEmployee || upcoming.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const resolved =
              assignmentId ||
              firstAssignments?.find((a) => a.employee_id === myEmployee.id)?.id ||
              '';
            if (!resolved) {
              onError("Couldn't resolve your assignment for that shift.");
              return;
            }
            requestMutation.mutate({ shiftAssignmentId: resolved, notes: notes.trim() || null });
          }}
          className="rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <h2 className="text-[14.5px] font-extrabold">Request a swap</h2>
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Your shift</span>
              <ObSelect
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
                placeholder="Select a shift"
                options={upcoming.map((shift) => ({
                  value: shift.id,
                  label: `${new Date(shift.shift_date).toLocaleDateString()} · ${shift.start_time}–${shift.end_time}`
                }))}
              />
            </label>
          </div>
          <label className="mt-3.5 block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Note to your supervisor (optional)</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why you need the swap…"
              className="w-full resize-y rounded-xl border border-neutral-300 px-[13px] py-2.5 text-[13.5px] outline-none transition-colors focus:border-brand-500"
            />
          </label>
          <div className="mt-3.5 flex gap-2.5">
            <button
              type="submit"
              disabled={requestMutation.isPending}
              className="h-10 cursor-pointer rounded-[11px] bg-brand-500 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-600 disabled:bg-[#F5A98A]"
            >
              {requestMutation.isPending ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 cursor-pointer rounded-[11px] border border-neutral-200 bg-white px-4 text-[13px] font-bold text-neutral-700 transition-colors hover:border-neutral-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 cursor-pointer rounded-[11px] border border-neutral-200 bg-white px-4 text-[13px] font-bold text-neutral-700 transition-colors hover:border-brand-300"
        >
          + Request a swap
        </button>
      )}
    </div>
  );
}

/* ---------------- Leave ---------------- */

function LeaveTab({
  canApprove,
  canCreate,
  myEmployeeId,
  contextKey
}: {
  canApprove: boolean;
  canCreate: boolean;
  myEmployeeId: string | null;
  contextKey: string;
}): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('annual_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const pendingQuery = useRpcQuery<LeaveRequest[]>('list_pending_leave', undefined, { enabled: canApprove });
  const mineQuery = useRpcQuery<LeaveRequest[]>('list_my_leave', undefined, { enabled: !canApprove && Boolean(myEmployeeId) });

  const approveMutation = useRpcMutation<unknown, { leaveRequestId: string }>('approve_leave_request', {
    invalidates: ['list_pending_leave', 'list_my_leave'],
    onSuccess: () => setError(null),
    onError: (err) => setError(err.message)
  });
  const rejectMutation = useRpcMutation<unknown, { leaveRequestId: string; reason: string }>('reject_leave_request', {
    invalidates: ['list_pending_leave', 'list_my_leave'],
    onSuccess: () => setError(null),
    onError: (err) => setError(err.message)
  });
  const createMutation = useRpcMutation<
    LeaveRequest,
    { employeeId: string; leaveType: string; startDate: string; endDate: string; reason: string }
  >('create_leave_request', {
    invalidates: ['list_my_leave', 'list_pending_leave'],
    onSuccess: () => {
      setFormOpen(false);
      setReason('');
      setError(null);
    },
    onError: (err) => setError(err.message)
  });

  const rows = canApprove ? (pendingQuery.data ?? []) : (mineQuery.data ?? []);
  void contextKey;

  return (
    <div>
      {error ? <AuthBanner tone="bad" title={error} /> : null}

      {canCreate && !canApprove ? (
        <div className="mb-4">
          {formOpen ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!myEmployeeId) {
                  setError('No employee record is linked to your account.');
                  return;
                }
                if (!startDate || !endDate || !reason.trim()) {
                  setError('Pick your dates and give a reason.');
                  return;
                }
                if (endDate < startDate) {
                  setError('The end date can’t be before the start date.');
                  return;
                }
                createMutation.mutate({ employeeId: myEmployeeId, leaveType, startDate, endDate, reason: reason.trim() });
              }}
              className="rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <h2 className="text-[14.5px] font-extrabold">Request time off</h2>
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Type</span>
                  <ObSelect value={leaveType} onChange={(e) => setLeaveType(e.target.value)} options={LEAVE_TYPES} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">First day</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-[44px] w-full rounded-xl border border-neutral-300 px-[13px] text-[13.5px] outline-none transition-colors focus:border-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Last day</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-[44px] w-full rounded-xl border border-neutral-300 px-[13px] text-[13.5px] outline-none transition-colors focus:border-brand-500"
                  />
                </label>
              </div>
              <label className="mt-3.5 block">
                <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Reason</span>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Graduation ceremony"
                  className="w-full resize-y rounded-xl border border-neutral-300 px-[13px] py-2.5 text-[13.5px] outline-none transition-colors focus:border-brand-500"
                />
              </label>
              <div className="mt-3.5 flex gap-2.5">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="h-10 cursor-pointer rounded-[11px] bg-brand-500 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-600 disabled:bg-[#F5A98A]"
                >
                  {createMutation.isPending ? 'Sending…' : 'Send request'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="h-10 cursor-pointer rounded-[11px] border border-neutral-200 bg-white px-4 text-[13px] font-bold text-neutral-700 transition-colors hover:border-neutral-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="h-10 cursor-pointer rounded-[11px] bg-brand-500 px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_-13px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600"
            >
              + Request time off
            </button>
          )}
        </div>
      ) : null}

      {(canApprove ? pendingQuery.isLoading : mineQuery.isLoading) ? (
        <p className="text-sm text-neutral-500">Loading leave requests…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-extrabold text-neutral-900">No leave requests here</p>
          <p className="mx-auto mt-1.5 max-w-[400px] text-[12.5px] text-neutral-500">
            {canApprove ? 'Nothing is waiting on your approval.' : 'Time off you request will show up here with its approval state.'}
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex gap-3 border-b border-neutral-100 px-[18px] py-[11px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-neutral-400">
            <span className="min-w-0 flex-[1_1_170px]">Employee</span>
            <span className="flex-[0_0_150px]">Dates</span>
            <span className="min-w-0 flex-[1_1_150px]">Type &amp; reason</span>
            <span className="flex-[0_0_96px]">Status</span>
            {canApprove ? <span className="flex-[0_0_104px] text-right">Action</span> : null}
          </div>
          {rows.map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-neutral-50 px-[18px] py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-[1_1_170px] items-center gap-[11px]">
                <InitialsAvatar name={`Employee ${request.employee_id.slice(0, 4)}`} size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold text-neutral-900">
                    {canApprove ? `Employee ${request.employee_id.slice(0, 8)}…` : 'You'}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-400">#{request.employee_id.slice(0, 8)}</span>
                </span>
              </span>
              <span className="flex-[0_0_150px]">
                <span className="block text-[12.5px] font-bold text-neutral-900">
                  {new Date(request.start_date).toLocaleDateString()} – {new Date(request.end_date).toLocaleDateString()}
                </span>
                <span className="block text-[11px] text-neutral-400">{request.total_days} day{request.total_days === 1 ? '' : 's'}</span>
              </span>
              <span className="min-w-0 flex-[1_1_150px]">
                <span className="block text-[12.5px] font-bold text-neutral-900">
                  {LEAVE_TYPES.find((t) => t.value === request.leave_type)?.label ?? request.leave_type}
                </span>
                <span className="block truncate text-[11px] text-neutral-500">{request.reason}</span>
              </span>
              <span className="flex-[0_0_96px]">
                <StatusPill tone={LEAVE_TONES[request.status] ?? 'neutral'}>{STATUS_LABEL[request.status] ?? request.status}</StatusPill>
              </span>
              {canApprove ? (
                <span className="ml-auto flex flex-[0_0_104px] justify-end gap-[7px]">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => approveMutation.mutate({ leaveRequestId: request.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="h-8 cursor-pointer rounded-[9px] bg-success-500 px-3 text-[11.5px] font-bold text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectMutation.mutate({ leaveRequestId: request.id, reason: 'Not approved this time' })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="h-8 cursor-pointer rounded-[9px] border border-[#F3C6BD] bg-white px-2.5 text-[11.5px] font-bold text-error-600 transition-colors hover:bg-error-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-neutral-400">—</span>
                  )}
                </span>
              ) : null}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
