import React from 'react';
import { Button } from '@shiftos/ui';

export interface TrayDraft {
  id: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  note: string;
}

export interface ShiftDraftsTrayProps {
  drafts: TrayDraft[];
  canEdit: boolean;
  onNewDraft: () => void;
  onEditDraft: (draft: TrayDraft) => void;
}

/** The bottom "Shift drafts" tray (design handoff line ~586-624) — drafts here aren't real shifts/assignments until dragged onto a grid cell (spec §4.4). */
export function ShiftDraftsTray({ drafts, canEdit, onNewDraft, onEditDraft }: ShiftDraftsTrayProps): React.ReactElement | null {
  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 p-3">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-400">Shift drafts</span>
      {drafts.length === 0 ? <span className="text-xs text-neutral-400">Drag a draft onto any cell to assign it.</span> : null}
      <div className="flex flex-wrap items-stretch gap-2">
        {drafts.map((draft) => (
          <button
            key={draft.id}
            type="button"
            draggable
            onClick={() => onEditDraft(draft)}
            className="flex min-w-[86px] flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-neutral-300 bg-white px-2.5 py-1.5 text-center hover:border-brand-400"
          >
            <span className="text-[10px] font-bold text-neutral-900">
              {draft.startTime} – {draft.endTime}
            </span>
          </button>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={onNewDraft}>
          + New shift
        </Button>
      </div>
    </div>
  );
}
