import { ShiftNoteRepository, ShiftRepository, type ShiftNote } from '@shiftos/repositories';
import { AuthorizationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid } from '../validation.js';

/**
 * Shift Notes (backend completion pass, migration 036) — a handover/incident
 * log entry attached to a shift. This is a genuinely new feature: no table,
 * repository, service, or API existed anywhere in this workspace before
 * (the only prior occurrence of the name was route files in shift-app-hero/,
 * a disconnected, unrelated scaffold — not this app).
 */
export class ShiftNoteService {
  private readonly notes: ShiftNoteRepository;
  private readonly shifts: ShiftRepository;

  constructor(private readonly context: ApplicationContext) {
    this.notes = new ShiftNoteRepository(context.client);
    this.shifts = new ShiftRepository(context.client);
  }

  async createNote(shiftId: string, note: string): Promise<ShiftNote> {
    assertUuid(shiftId, 'shiftId');
    assertNonEmptyString(note, 'note');
    await this.context.requirePermission('shiftnotes.create');

    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);

    return this.notes.insert(this.context.organizationId, {
      branch_id: shift.branch_id,
      shift_id: shiftId,
      note: note.trim(),
      created_by: this.context.userId
    } as Partial<ShiftNote>);
  }

  async listNotesForShift(shiftId: string): Promise<ShiftNote[]> {
    assertUuid(shiftId, 'shiftId');
    await this.context.requirePermission('shiftnotes.read');

    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);

    return this.notes.listForShift(this.context.organizationId, shiftId);
  }

  async archiveNote(noteId: string): Promise<ShiftNote> {
    assertUuid(noteId, 'noteId');
    await this.context.requirePermission('shiftnotes.archive');

    const before = await this.notes.getByIdOrThrow(this.context.organizationId, noteId);
    this.context.requireBranchAccess(before.branch_id);

    if (before.created_by !== this.context.userId && !(await this.context.hasPermission('shifts.update'))) {
      throw new AuthorizationError('Only the note author or a shift manager can archive this note');
    }

    return this.notes.archive(this.context.organizationId, noteId);
  }
}
