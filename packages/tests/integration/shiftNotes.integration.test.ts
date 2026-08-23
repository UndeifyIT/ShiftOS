import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('shift notes integration', () => {
  let ctx: TestContext;
  const noteIds: string[] = [];
  // The pre-existing published shift fixture in "ShiftOS Test Org".
  const SHIFT_ID = '779cc0c5-616c-499b-9b95-69a5d0b1e946';

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (noteIds.length > 0) {
      await ctx.client.query('DELETE FROM shift_notes WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        noteIds
      ]);
    }
    await ctx.client.close();
  });

  it('creates, lists, and archives a note on a real shift', async () => {
    const note = await ctx.call<{ id: string; note: string }>('create_shift_note', {
      shiftId: SHIFT_ID,
      note: 'Integration test: handover, register reconciled.'
    });
    noteIds.push(note.id);
    expect(note.note).toBe('Integration test: handover, register reconciled.');

    const notes = await ctx.call<Array<{ id: string }>>('list_shift_notes_for_shift', { shiftId: SHIFT_ID });
    expect(notes.some((n) => n.id === note.id)).toBe(true);

    const archived = await ctx.call<{ deleted_at: string | null }>('archive_shift_note', { noteId: note.id });
    expect(archived.deleted_at).not.toBeNull();
  });

  it('rejects an empty note', async () => {
    const result = await ctx.callRaw('create_shift_note', { shiftId: SHIFT_ID, note: '   ' });
    expect(result.success).toBe(false);
  });
});
