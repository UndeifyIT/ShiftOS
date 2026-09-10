import React, { useEffect, useState } from 'react';
import { Button, Checkbox, FormField, InlineError, Input, Modal, Select } from '@shiftos/ui';
import { useRpcMutation, useRpcQuery } from '../../../lib/useRpc.js';
import type { Shift, ShiftAssignment, ShiftTemplate } from '../../../types/domain.js';

export interface AssignShiftModalProps {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
  branchId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  existing: { shift: Shift; assignment: ShiftAssignment } | null;
}

const CUSTOM_VALUE = '__custom__';

/** Click-to-assign modal for one employee/day cell — templates, custom time, break, notes, save-as-template, day off/delete. */
export function AssignShiftModal({
  open,
  onClose,
  scheduleId,
  branchId,
  employeeId,
  employeeName,
  date,
  existing
}: AssignShiftModalProps): React.ReactElement {
  const { data: templates } = useRpcQuery<ShiftTemplate[]>('list_shift_templates', { branchId });

  const [templateId, setTemplateId] = useState<string>(existing?.shift.template_id ?? CUSTOM_VALUE);
  const [startTime, setStartTime] = useState(existing?.shift.start_time.slice(0, 5) ?? '09:00');
  const [endTime, setEndTime] = useState(existing?.shift.end_time.slice(0, 5) ?? '17:00');
  const [breakMinutes, setBreakMinutes] = useState(existing?.shift.break_minutes ?? 0);
  const [notes, setNotes] = useState(existing?.assignment.notes ?? '');
  const [extraBlocks, setExtraBlocks] = useState<Array<{ startTime: string; endTime: string; breakMinutes: number }>>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setTemplateId(existing.shift.template_id ?? CUSTOM_VALUE);
      setStartTime(existing.shift.start_time.slice(0, 5));
      setEndTime(existing.shift.end_time.slice(0, 5));
      setBreakMinutes(existing.shift.break_minutes);
      setNotes(existing.assignment.notes ?? '');
    } else {
      setTemplateId(CUSTOM_VALUE);
      setStartTime('09:00');
      setEndTime('17:00');
      setBreakMinutes(0);
      setNotes('');
    }
    setExtraBlocks([]);
    setSaveAsTemplate(false);
    setTemplateName('');
    setError(null);
  }, [existing?.assignment.id ?? null, open]);

  const assignMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'assign_shift_to_employee_on_date',
    {
      invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
      onSuccess: async () => {
        if (extraBlocks.length === 0) {
          onClose();
          return;
        }
        try {
          for (const block of extraBlocks) {
            await addBlockMutation.mutateAsync({
              scheduleId,
              employeeId,
              date,
              templateId: null,
              startTime: block.startTime,
              endTime: block.endTime,
              breakMinutes: block.breakMinutes,
              notes: null
            });
          }
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to add an extra time block.');
        }
      },
      onError: (err) => setError(err.message)
    }
  );
  const addBlockMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'add_shift_to_employee_on_date',
    { invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'] }
  );
  const updateMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'update_assigned_shift_on_date',
    {
      invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
      onSuccess: onClose,
      onError: (err) => setError(err.message)
    }
  );
  const removeMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
    onSuccess: onClose,
    onError: (err) => setError(err.message)
  });
  const createTemplateMutation = useRpcMutation<ShiftTemplate, Record<string, unknown>>('create_shift_template', {
    invalidates: ['list_shift_templates']
  });

  const selectedTemplate = (templates ?? []).find((t) => t.id === templateId);

  const handleDayOff = (): void => {
    if (existing) {
      removeMutation.mutate({ assignmentId: existing.assignment.id });
    } else {
      onClose();
    }
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (templateId === CUSTOM_VALUE && (!startTime || !endTime)) {
      setError('Start and end time are required.');
      return;
    }
    setError(null);

    if (saveAsTemplate && templateName.trim()) {
      createTemplateMutation.mutate({ branchId, name: templateName.trim(), startTime, endTime, crossesMidnight: false });
    }

    const resolvedStart = templateId === CUSTOM_VALUE ? startTime : selectedTemplate?.start_time.slice(0, 5);
    const resolvedEnd = templateId === CUSTOM_VALUE ? endTime : selectedTemplate?.end_time.slice(0, 5);
    const resolvedNotes = notes.trim() || null;

    if (existing) {
      updateMutation.mutate({
        assignmentId: existing.assignment.id,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        breakMinutes,
        notes: resolvedNotes
      });
    } else {
      assignMutation.mutate({
        scheduleId,
        employeeId,
        date,
        templateId: templateId === CUSTOM_VALUE ? null : templateId,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        breakMinutes,
        notes: resolvedNotes
      });
    }
  };

  const busy = assignMutation.isPending || updateMutation.isPending || removeMutation.isPending || addBlockMutation.isPending;
  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit Shift' : 'Assign Shift'}
      description={`For ${employeeName} on ${formattedDate}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Choose a shift template" htmlFor="templateId">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              options={[
                ...(templates ?? []).map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.start_time.slice(0, 5)} – ${t.end_time.slice(0, 5)})`
                })),
                { value: CUSTOM_VALUE, label: 'Custom shift' }
              ]}
            />
          )}
        </FormField>

        {templateId === CUSTOM_VALUE ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start time" htmlFor="startTime" required>
              {(fieldProps) => <Input {...fieldProps} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
            </FormField>
            <FormField label="End time" htmlFor="endTime" required>
              {(fieldProps) => <Input {...fieldProps} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
            </FormField>
          </div>
        ) : null}

        {!existing && templateId === CUSTOM_VALUE ? (
          <>
            {extraBlocks.map((block, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <FormField label={`Block ${index + 2} start`} htmlFor={`extraStart${index}`}>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="time"
                      value={block.startTime}
                      onChange={(e) =>
                        setExtraBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, startTime: e.target.value } : b)))
                      }
                    />
                  )}
                </FormField>
                <FormField label={`Block ${index + 2} end`} htmlFor={`extraEnd${index}`}>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="time"
                      value={block.endTime}
                      onChange={(e) => setExtraBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, endTime: e.target.value } : b)))}
                    />
                  )}
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtraBlocks((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setExtraBlocks((prev) => [...prev, { startTime: '18:00', endTime: '22:00', breakMinutes: 0 }])}
              className="self-start"
            >
              + Add another time block (split / double shift)
            </Button>
          </>
        ) : null}

        <FormField label="Break (minutes)" htmlFor="breakMinutes">
          {(fieldProps) => (
            <Input {...fieldProps} type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
          )}
        </FormField>

        <FormField label="Notes (optional)" htmlFor="notes">
          {(fieldProps) => (
            <textarea
              {...fieldProps}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={100}
              className="min-h-[62px] w-full rounded-xl border border-neutral-200 p-2.5 text-sm outline-none focus:border-brand-400"
            />
          )}
        </FormField>

        {templateId === CUSTOM_VALUE ? (
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <Checkbox checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
            Save as a shift template
          </label>
        ) : null}
        {saveAsTemplate ? (
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name (e.g. Warehouse Shift)" />
        ) : null}

        {error ? <InlineError message={error} /> : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {existing ? (
            <Button type="button" variant="destructive" onClick={handleDayOff} loading={removeMutation.isPending}>
              Delete shift
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={handleDayOff}>
              Day off
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {existing ? 'Save changes' : 'Assign Shift'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
