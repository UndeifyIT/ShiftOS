import { ShiftNoteService } from '@shiftos/services';
import type { ShiftNoteCategory } from '@shiftos/repositories';
import { defineRpc } from '../rpc.js';
import { asRecord, booleanField, numberField, requiredStringField, stringField } from '../parse.js';

export const createShiftNote = defineRpc('create_shift_note', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).createNote(requiredStringField(input, 'shiftId'), requiredStringField(input, 'note'), {
    category: stringField(input, 'category') as ShiftNoteCategory | undefined,
    includeInHandover: booleanField(input, 'includeInHandover')
  });
});

export const listShiftNotesForShift = defineRpc('list_shift_notes_for_shift', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).listNotesForShift(requiredStringField(input, 'shiftId'));
});

export const listBranchShiftNotes = defineRpc('list_branch_shift_notes', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).listNotesForBranch(requiredStringField(input, 'branchId'), numberField(input, 'days'));
});

export const archiveShiftNote = defineRpc('archive_shift_note', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftNoteService(context).archiveNote(requiredStringField(input, 'noteId'));
});

export const shiftNoteOperations = [createShiftNote, listShiftNotesForShift, listBranchShiftNotes, archiveShiftNote];
