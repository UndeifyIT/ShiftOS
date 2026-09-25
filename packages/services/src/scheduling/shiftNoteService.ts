import { SHIFT_NOTE_CATEGORIES, ShiftNoteRepository, ShiftRepository, type ShiftNote, type ShiftNoteCategory, type ShiftNoteWithDetails } from '@shiftos/repositories';
import { AuthorizationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertOneOf, assertUuid } from '../validation.js';

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

  async createNote(shiftId: string, note: string, options: { category?: ShiftNoteCategory; includeInHandover?: boolean } = {}): Promise<ShiftNote> {
    assertUuid(shiftId, 'shiftId');
    assertNonEmptyString(note, 'note');
    if (options.category !== undefined) assertOneOf(options.category, SHIFT_NOTE_CATEGORIES, 'category');
    await this.context.requirePermission('shiftnotes.create');

    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, shiftId);
    this.context.requireBranchAccess(shift.branch_id);

    return this.notes.insert(this.context.organizationId, {
      branch_id: shift.branch_id,
      shift_id: shiftId,
      note: note.trim(),
      category: options.category ?? 'handover',
      include_in_handover: options.includeInHandover ?? true,
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

  /** A branch's notes from the last `days` days (1–31), newest first, with their shift and author. */
  async listNotesForBranch(branchId: string, days = 7): Promise<ShiftNoteWithDetails[]> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('shiftnotes.read');
    this.context.requireBranchAccess(branchId);
    const span = Math.min(31, Math.max(1, Math.round(days)));
    const since = new Date(Date.now() - span * 86_400_000).toISOString();
    return this.notes.listForBranchSince(this.context.organizationId, branchId, since);
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
