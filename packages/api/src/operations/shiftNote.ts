import { ShiftNoteService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField } from '../parse.js';

export const createShiftNote = defineRpc('create_shift_note', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).createNote(requiredStringField(input, 'shiftId'), requiredStringField(input, 'note'));
});

export const listShiftNotesForShift = defineRpc('list_shift_notes_for_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).listNotesForShift(requiredStringField(input, 'shiftId'));
});

export const archiveShiftNote = defineRpc('archive_shift_note', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).archiveNote(requiredStringField(input, 'noteId'));
});

export const shiftNoteOperations = [createShiftNote, listShiftNotesForShift, archiveShiftNote];
