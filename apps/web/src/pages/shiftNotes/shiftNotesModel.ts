/**
 * The Shift Notes page, after the design handoff's "Supervisor/Shift Notes"
 * (NOTES cards and the "Add a shift note" panel). Pure — `now` is injected.
 */
import type { ShiftNote, ShiftNoteCategory } from '../../types/domain.js';
import { todayDateString, type Tone } from '../scheduling/grid/scheduleFormat.js';
import { relativeStamp } from '../dashboard/manager/overviewModel.js';

export const NOTE_CATEGORIES: Array<{ value: ShiftNoteCategory; label: string; tone: Tone }> = [
  { value: 'handover', label: 'Handover', tone: 'primary' },
  { value: 'incident', label: 'Incident', tone: 'bad' },
  { value: 'inventory', label: 'Inventory', tone: 'info' },
  { value: 'staffing', label: 'Staffing', tone: 'warn' }
];

export type NoteFilter = 'All' | 'Handover' | 'Incident' | 'Inventory';
export const NOTE_FILTERS: NoteFilter[] = ['All', 'Handover', 'Incident', 'Inventory'];

export interface NoteCard {
  id: string;
  category: string;
  tone: Tone;
  shift: string;
  time: string;
  body: string;
  author: string;
  authorName: string;
  handover: 'In handover' | 'Closed' | 'Not in handover';
}

/**
 * A note in the handover is passed on while its shift's day is running — the
 * next shift picks it up — and is closed once a new day starts. Notes kept out
 * of the handover say so.
 */
export function handoverState(note: ShiftNote, now: Date): NoteCard['handover'] {
  if (!note.include_in_handover) return 'Not in handover';
  const day = note.shift_date ?? todayDateString(new Date(note.created_at));
  return day >= todayDateString(now) ? 'In handover' : 'Closed';
}

export function noteCards(notes: ShiftNote[], now: Date): NoteCard[] {
  return notes
    .filter((n) => !n.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((n) => {
      const category = NOTE_CATEGORIES.find((c) => c.value === n.category) ?? NOTE_CATEGORIES[0];
      const authorName = n.author_name || 'Someone';
      return {
        id: n.id,
        category: category.label,
        tone: category.tone,
        shift: n.shift_title ?? 'Shift',
        time: relativeStamp(n.created_at, now),
        body: n.note,
        author: n.author_role ? `${authorName} · ${n.author_role}` : authorName,
        authorName,
        handover: handoverState(n, now)
      };
    });
}

export function filterNotes(cards: NoteCard[], filter: NoteFilter, query: string): NoteCard[] {
  const needle = query.trim().toLowerCase();
  return cards.filter((c) => (filter === 'All' || c.category === filter) && (!needle || `${c.body} ${c.author} ${c.shift}`.toLowerCase().includes(needle)));
}
