import React, { useEffect, useState } from 'react';
import { Badge, Button, Checkbox, FormField, InlineError, Input, Modal, Select, Textarea } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { Employee, Shift, ShiftAssignment } from '../../types/domain.js';

export interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
  shift: Shift | null;
  employees: Employee[];
}

const ASSIGNMENT_TONE: Record<ShiftAssignment['assignment_status'], 'success' | 'warning' | 'error' | 'neutral'> = {
  assigned: 'warning',
  confirmed: 'success',
  declined: 'error',
  completed: 'success',
  cancelled: 'neutral'
};

/** WEB-015 (Shift Detail / Edit) + WEB-016 (Shift Assignment Panel) combined, contextual to the schedule builder (frontend foundation §D.5). */
export function ShiftModal({ open, onClose, scheduleId, shift, employees }: ShiftModalProps): React.ReactElement {
  const { hasPermission } = useSession();
  const canUpdate = hasPermission('shifts.update');
  const canAssign = hasPermission('assignments.create');
  const canRemoveAssignment = hasPermission('assignments.delete');
  const isEditing = Boolean(shift);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');

  useEffect(() => {
    if (shift) {
      setTitle(shift.title);
      setDescription(shift.description ?? '');
      setShiftDate(shift.shift_date);
      setStartTime(shift.start_time.slice(0, 5));
      setEndTime(shift.end_time.slice(0, 5));
      setCrossesMidnight(shift.crosses_midnight);
      setBreakMinutes(shift.break_minutes);
    } else {
      setTitle('');
      setDescription('');
      setShiftDate('');
      setStartTime('');
      setEndTime('');
      setCrossesMidnight(false);
      setBreakMinutes(0);
    }
    setError(null);
  }, [shift, open]);

  const createMutation = useRpcMutation<Shift, Record<string, unknown>>('create_shift', {
    invalidates: ['list_shifts_for_schedule'],
    onSuccess: onClose,
    onError: (err) => setError(err.message)
  });
  const updateMutation = useRpcMutation<Shift, Record<string, unknown>>('update_shift', {
    invalidates: ['list_shifts_for_schedule'],
    onSuccess: onClose,
    onError: (err) => setError(err.message)
  });
  const cancelMutation = useRpcMutation<Shift, { shiftId: string }>('cancel_shift', {
    invalidates: ['list_shifts_for_schedule'],
    onSuccess: onClose
  });

  const { data: assignments, refetch: refetchAssignments } = useRpcQuery<ShiftAssignment[]>(
    'list_assignments_for_shift',
    shift ? { shiftId: shift.id } : undefined,
    { enabled: isEditing }
  );

  const assignMutation = useRpcMutation<ShiftAssignment, { shiftId: string; employeeId: string }>('assign_employee', {
    onSuccess: () => {
      setAssignEmployeeId('');
      void refetchAssignments();
    },
    onError: (err) => setError(err.message)
  });
  const removeAssignmentMutation = useRpcMutation<void, { assignmentId: string }>('remove_assignment', {
    onSuccess: () => void refetchAssignments()
  });
  const confirmAssignmentMutation = useRpcMutation<ShiftAssignment, { assignmentId: string; status: string }>(
    'update_assignment_status',
    { onSuccess: () => void refetchAssignments() }
  );

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!title.trim() || !shiftDate || !startTime || !endTime) {
      setError('Title, date, start and end time are required.');
      return;
    }
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startTime,
      endTime,
      crossesMidnight,
      breakMinutes
    };
    if (isEditing) {
      updateMutation.mutate({ shiftId: shift!.id, ...payload });
    } else {
      createMutation.mutate({ scheduleId, shiftDate, ...payload });
    }
  };

  const assignedEmployeeIds = new Set((assignments ?? []).map((a) => a.employee_id));
  const assignableEmployees = employees.filter((e) => !assignedEmployeeIds.has(e.id));

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Shift' : 'Add Shift'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Title" htmlFor="shiftTitle" required>
          {(fieldProps) => <Input {...fieldProps} value={title} onChange={(e) => setTitle(e.target.value)} disabled={isEditing && !canUpdate} />}
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date" htmlFor="shiftDate" required>
            {(fieldProps) => (
              <Input {...fieldProps} type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} disabled={isEditing} />
            )}
          </FormField>
          <FormField label="Break (minutes)" htmlFor="breakMinutes">
            {(fieldProps) => (
              <Input {...fieldProps} type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
            )}
          </FormField>
          <FormField label="Start time" htmlFor="startTime" required>
            {(fieldProps) => <Input {...fieldProps} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
          </FormField>
          <FormField label="End time" htmlFor="endTime" required>
            {(fieldProps) => <Input {...fieldProps} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <Checkbox checked={crossesMidnight} onChange={(e) => setCrossesMidnight(e.target.checked)} />
          Crosses midnight
        </label>
        <FormField label="Description" htmlFor="shiftDescription">
          {(fieldProps) => <Textarea {...fieldProps} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </FormField>
        {error ? <InlineError message={error} /> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {isEditing ? 'Save changes' : 'Add shift'}
          </Button>
          {isEditing && shift?.status !== 'cancelled' && canUpdate ? (
            <Button type="button" variant="secondary" onClick={() => cancelMutation.mutate({ shiftId: shift!.id })} loading={cancelMutation.isPending}>
              Cancel shift
            </Button>
          ) : null}
        </div>
      </form>

      {isEditing ? (
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Assigned employees</h3>
          <ul className="flex flex-col gap-2">
            {(assignments ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">No one is assigned to this shift yet.</p>
            ) : (
              (assignments ?? []).map((assignment) => {
                const employee = employees.find((e) => e.id === assignment.employee_id);
                return (
                  <li key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2">
                    <span className="text-sm text-neutral-800">{employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown employee'}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={ASSIGNMENT_TONE[assignment.assignment_status]}>{assignment.assignment_status}</Badge>
                      {canAssign && assignment.assignment_status === 'assigned' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => confirmAssignmentMutation.mutate({ assignmentId: assignment.id, status: 'confirmed' })}
                        >
                          Confirm
                        </Button>
                      ) : null}
                      {canRemoveAssignment ? (
                        <Button size="sm" variant="ghost" onClick={() => removeAssignmentMutation.mutate({ assignmentId: assignment.id })}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          {canAssign && assignableEmployees.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <Select
                aria-label="Employee to assign"
                value={assignEmployeeId}
                onChange={(e) => setAssignEmployeeId(e.target.value)}
                placeholder="Select employee"
                options={assignableEmployees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                className="max-w-xs"
              />
              <Button
                size="sm"
                disabled={!assignEmployeeId}
                loading={assignMutation.isPending}
                onClick={() => shift && assignMutation.mutate({ shiftId: shift.id, employeeId: assignEmployeeId })}
              >
                Assign
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
