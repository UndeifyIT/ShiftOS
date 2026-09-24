import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionDenied } from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useDefaultBranchId } from '../../auth/useDefaultBranchId.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type { ShiftNote, ShiftNoteCategory } from '../../types/domain.js';
import { OverviewEmpty, OverviewHeader, OverviewLoading } from '../dashboard/manager/ManagerOverview.js';
import { useManagerOverview } from '../dashboard/manager/useManagerOverview.js';
import { buildTodaysShift } from '../dashboard/supervisor/todaysShiftModel.js';
import { HeaderCta, ListToolbar } from '../people/RolePeopleTable.js';
import { ScheduleToast, useScheduleToast } from '../scheduling/grid/ScheduleToast.js';
import { avatarTone, initialsOf, TONES } from '../scheduling/grid/scheduleFormat.js';
import { filterNotes, NOTE_CATEGORIES, NOTE_FILTERS, noteCards, type NoteFilter } from './shiftNotesModel.js';

/*
 * Shift Notes, built to the design handoff (`ShiftOS Dashboards.dc.html`:
 * `kind: "notes"` markup lines 1410-1450 with the shared toolbar): the
 * branch's notes from the last two days, filed by category, and the "Add a
 * shift note" panel, which attaches the note to the shift running now. The
 * prototype has no CSS reset, so the values are what it renders (13px base,
 * `line-height: normal`).
 */

const pill = 'inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-bold';

export default function ShiftNotesPage(): React.ReactElement {
  const navigate = useNavigate();
  const { hasPermission, profile } = useSession();
  const { toast, show, dismiss } = useScheduleToast();
  const { now, branch, overview } = useManagerOverview();
  const branchId = useDefaultBranchId() ?? '';
  const canRead = hasPermission('shiftnotes.read');
  const canCreate = hasPermission('shiftnotes.create');
  const notesQuery = useRpcQuery<ShiftNote[]>('list_branch_shift_notes', branchId ? { branchId, days: 2 } : undefined, { enabled: canRead && Boolean(branchId) });
  const create = useRpcMutation<ShiftNote, { shiftId: string; note: string; category: ShiftNoteCategory; includeInHandover: boolean }>('create_shift_note', {
    invalidates: ['list_branch_shift_notes']
  });
  const [filter, setFilter] = useState<NoteFilter>('All');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ShiftNoteCategory>('handover');
  const [text, setText] = useState('');
  const [handover, setHandover] = useState(true);
  const noteField = useRef<HTMLTextAreaElement>(null);

  if (!canRead) {
    return (
      <div className="px-7 py-6">
        <PermissionDenied />
      </div>
    );
  }

  const branchName = branch?.name ?? 'Your branch';
  const cards = noteCards(notesQuery.data ?? [], now);
  const shown = filterNotes(cards, filter, query);
  // The note belongs to the shift running now — the signed-in person's own slot on it when they have one.
  const shift = overview ? buildTodaysShift(overview, now) : null;
  const mine = shift?.members.find((row) => row.employee?.email && profile?.email && row.employee.email.toLowerCase() === profile.email.toLowerCase());
  const shiftId = (mine ?? shift?.members[0])?.shift.id ?? null;

  const focusForm = (): void => {
    noteField.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    noteField.current?.focus();
  };

  const save = (): void => {
    if (!text.trim()) {
      show('Write the note first', 'error');
      focusForm();
      return;
    }
    if (!shiftId) {
      show('There is no shift today to attach this note to', 'error');
      return;
    }
    create.mutate(
      { shiftId, note: text, category, includeInHandover: handover },
      {
        onSuccess: () => {
          setText('');
          show(handover ? 'Shift note saved · included in handover' : 'Shift note saved');
        },
        onError: (error) => show(error.message || "Couldn't save the note", 'error')
      }
    );
  };

  const form = canCreate ? (
    // 280px basis plus 18px padding and a 1px border each side: the handoff's content-box panel.
    <aside className="min-w-0 flex-[1_1_318px] rounded-[16px] border border-solid border-[#EBE7E3] bg-white p-[18px]">
      <h2 className="m-0 text-[14.5px] font-extrabold tracking-normal">Add a shift note</h2>
      <p className="mb-3.5 mt-[5px] text-[12px] text-[#A79C93]">Notes carry to the next shift&apos;s supervisor at handover.</p>
      <div className="mb-3 block">
        <span className="mb-1.5 block text-[12px] font-bold">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={category === c.value}
              onClick={() => setCategory(c.value)}
              className={[
                'h-8 cursor-pointer rounded-[9px] border border-solid px-[13px] text-[11.5px] font-bold',
                category === c.value ? 'border-[#F04E17] bg-[#FDF0E9] text-[#C6420E]' : 'border-[#EBE7E3] bg-white text-[#857A72]'
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <label className="mb-3 block">
        <span className="mb-1.5 block text-[12px] font-bold">Note</span>
        <textarea
          ref={noteField}
          rows={5}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What does the next shift need to know?"
          className="box-border w-full resize-y rounded-[11px] border border-solid border-[#E4DED9] px-3 py-2.5 text-[13px] text-[#38312B] outline-none focus:border-[#F04E17]"
        />
      </label>
      <label className="mb-3.5 flex cursor-pointer items-start gap-[9px]">
        <input type="checkbox" checked={handover} onChange={(event) => setHandover(event.target.checked)} className="mx-0 mb-0 mt-0.5 size-4 cursor-pointer accent-[#F04E17]" />
        <span className="text-[12px] font-bold">
          Include in handover
          <span className="block font-medium text-[#857A72]">Shown when the next supervisor starts their shift.</span>
        </span>
      </label>
      <button
        type="button"
        onClick={save}
        disabled={create.isPending}
        className="h-[42px] w-full cursor-pointer rounded-[11px] border-0 bg-[#F04E17] text-[13px] font-bold text-white disabled:opacity-70"
      >
        {create.isPending ? 'Saving…' : 'Save note'}
      </button>
    </aside>
  ) : null;

  const body = (): React.ReactNode => {
    if (notesQuery.isLoading) return <OverviewLoading title="Shift notes" />;
    if (cards.length === 0) {
      return (
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[1.7_1_400px]">
            <OverviewEmpty
              title="No shift notes yet"
              body="Notes record what happened on a shift and carry to the next supervisor at handover."
              cta={canCreate ? { label: 'Add note', onClick: focusForm } : null}
              secondary={{ label: "Today's shift", onClick: () => navigate('/') }}
            />
          </div>
          {form}
        </div>
      );
    }
    return (
      <>
        <ListToolbar filters={NOTE_FILTERS} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} searchPlaceholder="Search notes" count={`${shown.length} note${shown.length === 1 ? '' : 's'}`} />
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[1.7_1_400px] flex-col gap-3">
            {shown.length === 0 ? <p className="m-0 rounded-[16px] border border-dashed border-[#E4DED9] px-4 py-[34px] text-center text-[12.5px] text-[#A79C93]">No notes match this filter.</p> : null}
            {shown.map((note) => (
              <article key={note.id} className="rounded-[16px] border border-solid bg-white px-[18px] py-[17px]" style={{ borderColor: note.tone === 'bad' ? '#F3C6BD' : '#EBE7E3' }}>
                <div className="flex flex-wrap items-center gap-[9px]">
                  <span className={pill} style={{ color: TONES[note.tone][0], backgroundColor: TONES[note.tone][1] }}>
                    {note.category}
                  </span>
                  <span className="text-[11.5px] font-bold text-[#857A72]">{note.shift}</span>
                  <span className="ml-auto text-[11px] text-[#A79C93]">{note.time}</span>
                </div>
                <p className="mb-0 mt-2.5 whitespace-pre-line text-[13px] text-[#57504A] [text-wrap:pretty]">{note.body}</p>
                <div className="mt-[11px] flex flex-wrap items-center gap-[9px] border-0 border-t border-solid border-[#F2EEEA] pt-2.5">
                  <span className="flex size-[30px] flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold" style={avatarTone(note.authorName)}>
                    {initialsOf(note.authorName)}
                  </span>
                  <span className="text-[11.5px] text-[#857A72]">{note.author}</span>
                  <span className={`ml-auto ${pill}`} style={note.handover === 'In handover' ? { color: '#C6420E', backgroundColor: '#FDF0E9' } : { color: '#857A72', backgroundColor: '#F4F1EE' }}>
                    {note.handover}
                  </span>
                </div>
              </article>
            ))}
          </div>
          {form}
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-full flex-col text-[13px] text-[#38312B] [line-height:normal]">
      <OverviewHeader title="Shift notes" subtitle={`${branchName} · last two days`} now={now} actions={canCreate ? <HeaderCta label="Add note" onClick={focusForm} /> : null} />
      <div className="flex flex-auto flex-col gap-[18px] bg-[#FDFCFB] px-7 pb-10 pt-[22px] max-[859px]:gap-3.5 max-[859px]:px-3.5 max-[859px]:pb-[84px] max-[859px]:pt-4">{body()}</div>
      <ScheduleToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
