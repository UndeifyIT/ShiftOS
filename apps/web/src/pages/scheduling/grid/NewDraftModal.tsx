import React, { useState } from 'react';
import { Button, FormField, Input, Modal } from '@shiftos/ui';
import type { TrayDraft } from './ShiftDraftsTray.js';

export interface NewDraftModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (draft: TrayDraft) => void;
  editingDraft: TrayDraft | null;
}

/** Creates or edits one shift draft in the tray (spec §4.4) — no RPC call, just local tray state via onSave. */
export function NewDraftModal({ open, onClose, onSave, editingDraft }: NewDraftModalProps): React.ReactElement {
  const [startTime, setStartTime] = useState(editingDraft?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(editingDraft?.endTime ?? '17:00');
  const [breakMinutes, setBreakMinutes] = useState(editingDraft?.breakMinutes ?? 0);
  const [note, setNote] = useState(editingDraft?.note ?? '');

  return (
    <Modal open={open} onClose={onClose} title={editingDraft ? 'Edit shift draft' : 'New shift draft'} description="Drag this onto any cell once it's ready.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: editingDraft?.id ?? crypto.randomUUID(),
            startTime,
            endTime,
            breakMinutes,
            note: note.trim()
          });
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start time" htmlFor="draftStart" required>
            {(fieldProps) => <Input {...fieldProps} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
          </FormField>
          <FormField label="End time" htmlFor="draftEnd" required>
            {(fieldProps) => <Input {...fieldProps} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
          </FormField>
        </div>
        <FormField label="Break (minutes)" htmlFor="draftBreak">
          {(fieldProps) => <Input {...fieldProps} type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />}
        </FormField>
        <FormField label="Note (optional)" htmlFor="draftNote">
          {(fieldProps) => <Input {...fieldProps} value={note} onChange={(e) => setNote(e.target.value)} />}
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save draft</Button>
        </div>
      </form>
    </Modal>
  );
}
