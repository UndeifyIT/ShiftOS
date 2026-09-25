import React, { useEffect, useState } from 'react';
import { useSession } from '../../auth/SessionProvider.js';
import { HandoffModal, ModalField, ModalFields, modalControl, modalSelect, modalTextarea } from '../../components/HandoffModal.js';
import { useRpcMutation } from '../../lib/useRpc.js';
import type { LeaveRequest } from '../../types/domain.js';
import { LEAVE_TYPE_LABEL, weekdayDayMonth } from '../dashboard/manager/overviewModel.js';
import { addDays, fullName, todayDateString } from '../scheduling/grid/scheduleFormat.js';
import { workingDays } from '../requests/requestsModel.js';
import { useStaffSchedule } from './useStaffSchedule.js';

/*
 * The handoff's two Staff dialogs, opened in place wherever they're asked for
 * (My Shift's actions, My Schedule's "Request swap"): `requestLeave` ("Request
 * time off · Goes to Sarah Johnson (Supervisor, Main Branch) for approval")
 * and `newRequest` ("New request · Raise a swap or time-off request"). Both
 * write the real request — create_leave_request / request_shift_swap — for
 * the signed-in person's own employee record.
 */

export type StaffRequestKind = 'swap' | 'leave';

interface Draft {
  type: 'Shift swap' | 'Time off';
  leaveType: LeaveRequest['leave_type'];
  startDate: string;
  endDate: string;
  assignmentId: string;
  targetId: string;
  reason: string;
}

export function StaffRequestDialog({
  open,
  kind,
  assignmentId,
  now,
  onClose,
  onDone
}: {
  open: boolean;
  kind: StaffRequestKind;
  /** Pre-selects the shift to swap. */
  assignmentId?: string;
  now: Date;
  onClose: () => void;
  onDone: (message: string) => void;
}): React.ReactElement | null {
  const { hasPermission } = useSession();
  const today = todayDateString(now);
  const { me, employees, branch, shifts, assignmentByShift } = useStaffSchedule(today, addDays(today, 27));
  const canSwap = hasPermission('swaps.request');
  const canLeave = hasPermission('leave.create');

  const fresh = (): Draft => ({
    type: kind === 'swap' && canSwap ? 'Shift swap' : 'Time off',
    leaveType: 'annual_leave',
    startDate: '',
    endDate: '',
    assignmentId: assignmentId ?? '',
    targetId: '',
    reason: ''
  });
  const [draft, setDraft] = useState<Draft>(fresh);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setDraft(fresh());
    setError(null);
    // Reset each time it opens, from what it was opened for.
  }, [open, kind, assignmentId]);

  const swapInvalidates = ['list_my_shift_swaps', 'list_open_shift_swaps', 'list_branch_shift_swaps', 'list_pending_shift_swap_approvals'];
  const leaveInvalidates = ['list_my_leave', 'list_branch_leave', 'list_pending_leave'];
  const createLeave = useRpcMutation<LeaveRequest, { employeeId: string; leaveType: string; startDate: string; endDate: string; reason: string }>('create_leave_request', {
    invalidates: leaveInvalidates,
    onSuccess: () => onDone('Leave request sent · pending approval'),
    onError: (err) => setError(err.message)
  });
  const requestSwap = useRpcMutation<unknown, { shiftAssignmentId: string; targetEmployeeId?: string | null; notes?: string | null }>('request_shift_swap', {
    invalidates: swapInvalidates,
    onSuccess: () => onDone('Request submitted to your supervisor'),
    onError: (err) => setError(err.message)
  });

  if (!open) return null;

  const supervisor = me?.reports_to_employee_id ? employees.find((e) => e.id === me.reports_to_employee_id) : undefined;
  const leaveSubtitle = supervisor
    ? `Goes to ${fullName(supervisor)} (Supervisor${branch ? `, ${branch.name}` : ''}) for approval.`
    : 'Goes to your supervisor for approval.';
  const shiftChoices = shifts
    .filter((shift) => shift.shift_date >= today)
    .sort((a, b) => (a.shift_date + a.start_time).localeCompare(b.shift_date + b.start_time))
    .flatMap((shift) => {
      const assignment = assignmentByShift.get(shift.id);
      return assignment ? [{ id: assignment.id, label: `${weekdayDayMonth(shift.shift_date)} · ${shift.title}` }] : [];
    });
  const colleagues = employees.filter((e) => e.is_active && !e.deleted_at && e.employment_status === 'active' && e.id !== me?.id);
  const busy = createLeave.isPending || requestSwap.isPending;

  const submit = (): void => {
    if (!me) return setError('No employee record is linked to your account yet — ask your supervisor to add you.');
    if (draft.type === 'Shift swap') {
      if (!draft.assignmentId) return setError('Pick the shift you want to give up.');
      if (!draft.reason.trim()) return setError('Add a reason — your supervisor sees it with the request.');
      requestSwap.mutate({ shiftAssignmentId: draft.assignmentId, targetEmployeeId: draft.targetId || null, notes: draft.reason.trim() });
      return;
    }
    if (!draft.startDate || !draft.endDate) return setError('Pick the first and last day.');
    if (draft.endDate < draft.startDate) return setError('The last day can’t be before the first day.');
    if (!draft.reason.trim()) return setError('Add a reason — your supervisor sees it with the request.');
    createLeave.mutate({ employeeId: me.id, leaveType: draft.leaveType, startDate: draft.startDate, endDate: draft.endDate, reason: draft.reason.trim() });
  };

  const isLeave = draft.type === 'Time off';
  return (
    <HandoffModal
      open
      title={isLeave && kind === 'leave' ? 'Request time off' : 'New request'}
      subtitle={isLeave && kind === 'leave' ? leaveSubtitle : 'Raise a swap or time-off request.'}
      primary={busy ? 'Submitting…' : 'Submit request'}
      primaryDisabled={busy}
      onPrimary={submit}
      onClose={onClose}
    >
      <ModalFields>
        {kind === 'swap' && canSwap && canLeave ? (
          <ModalField label="Request type" required>
            <select className={modalSelect} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Draft['type'] })}>
              <option>Shift swap</option>
              <option>Time off</option>
            </select>
          </ModalField>
        ) : null}
        {isLeave ? (
          <>
            <ModalField label="Leave type" required>
              <select className={modalSelect} value={draft.leaveType} onChange={(event) => setDraft({ ...draft, leaveType: event.target.value as Draft['leaveType'] })}>
                {Object.entries(LEAVE_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="First day" required>
              <input
                type="date"
                className={modalControl}
                value={draft.startDate}
                min={today}
                onChange={(event) => setDraft({ ...draft, startDate: event.target.value, endDate: draft.endDate && draft.endDate >= event.target.value ? draft.endDate : event.target.value })}
              />
            </ModalField>
            <ModalField label="Last day" required>
              <input type="date" className={modalControl} value={draft.endDate} min={draft.startDate || today} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
            </ModalField>
            <ModalField label="Working days">
              <input type="text" className={modalControl} value={draft.startDate && draft.endDate ? String(workingDays(draft.startDate, draft.endDate)) : ''} placeholder="—" readOnly />
            </ModalField>
          </>
        ) : (
          <>
            <ModalField label="Your shift" required>
              <select className={modalSelect} value={draft.assignmentId} onChange={(event) => setDraft({ ...draft, assignmentId: event.target.value })}>
                <option value="">{shiftChoices.length ? 'Choose a shift' : 'No upcoming shifts'}</option>
                {shiftChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Swap with">
              <select className={modalSelect} value={draft.targetId} onChange={(event) => setDraft({ ...draft, targetId: event.target.value })}>
                <option value="">Anyone in the branch</option>
                {colleagues.map((person) => (
                  <option key={person.id} value={person.id}>
                    {fullName(person)}
                  </option>
                ))}
              </select>
            </ModalField>
          </>
        )}
        <ModalField label="Reason" required full>
          <textarea
            rows={3}
            className={modalTextarea}
            value={draft.reason}
            placeholder={isLeave ? 'Your supervisor sees this with the request.' : 'Family commitment'}
            onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
          />
        </ModalField>
      </ModalFields>
      {error ? <p className="mx-[22px] mb-0 mt-3 text-[12.5px] font-bold text-[#C93A22]">{error}</p> : null}
    </HandoffModal>
  );
}
