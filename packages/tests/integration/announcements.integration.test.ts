import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('announcements integration', () => {
  let ctx: TestContext;
  const createdAnnouncementIds: string[] = [];
  let throwawayEmployeeId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (createdAnnouncementIds.length > 0) {
      await ctx.client.query('DELETE FROM announcement_acknowledgements WHERE organization_id = $1 AND announcement_id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        createdAnnouncementIds
      ]);
      await ctx.client.query('DELETE FROM announcements WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        createdAnnouncementIds
      ]);
    }
    if (throwawayEmployeeId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, throwawayEmployeeId]);
    }
    await ctx.client.close();
  });

  it('runs create -> update -> publish -> get, and archives a second one', async () => {
    const draft = await ctx.call<{ id: string; is_published: boolean }>('create_announcement', {
      title: 'Integration test announcement',
      content: 'Original content',
      announcementType: 'policy'
    });
    createdAnnouncementIds.push(draft.id);
    expect(draft.is_published).toBe(false);

    await ctx.call('update_announcement', { announcementId: draft.id, content: 'Updated content' });

    const published = await ctx.call<{ is_published: boolean; published_at: string | null }>('publish_announcement', {
      announcementId: draft.id
    });
    expect(published.is_published).toBe(true);
    expect(published.published_at).not.toBeNull();

    const fetched = await ctx.call<{ content: string }>('get_announcement', { announcementId: draft.id });
    expect(fetched.content).toBe('Updated content');

    const toArchive = await ctx.call<{ id: string }>('create_announcement', { title: 'To archive', content: 'x' });
    createdAnnouncementIds.push(toArchive.id);
    const archived = await ctx.call<{ deleted_at: string | null }>('archive_announcement', { announcementId: toArchive.id });
    expect(archived.deleted_at).not.toBeNull();
  });

  it('acknowledges a published announcement idempotently, resolving the caller to their matching employee record', async () => {
    const announcement = await ctx.call<{ id: string }>('create_announcement', { title: 'Ack test', content: 'Please read' });
    createdAnnouncementIds.push(announcement.id);
    await ctx.call('publish_announcement', { announcementId: announcement.id });

    // The Owner test user's own email has no matching employee row by
    // default (a real, documented case — see EmployeeDashboardPage.tsx's
    // "Zero-employee-record handling"), so acknowledge correctly rejects
    // until a matching employee exists.
    const beforeLink = await ctx.callRaw('acknowledge_announcement', { announcementId: announcement.id });
    expect(beforeLink.success).toBe(false);
    expect(beforeLink.error?.message).toContain('not linked to an employee record');

    const throwaway = await ctx.call<{ id: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: `ANN-TEST-${Date.now()}`,
      firstName: 'Ack',
      lastName: 'Tester',
      email: 'undeify2026+shiftostest1@gmail.com',
      hireDate: '2026-01-01'
    });
    throwawayEmployeeId = throwaway.id;

    await ctx.call('acknowledge_announcement', { announcementId: announcement.id });
    const status = await ctx.call<{ acknowledged: boolean }>('has_acknowledged_announcement', { announcementId: announcement.id });
    expect(status.acknowledged).toBe(true);

    // Idempotent: acknowledging again must not throw or duplicate.
    await ctx.call('acknowledge_announcement', { announcementId: announcement.id });
    const ackRows = await ctx.client.query('SELECT id FROM announcement_acknowledgements WHERE organization_id = $1 AND announcement_id = $2', [
      TEST_FIXTURES.organizationId,
      announcement.id
    ]);
    expect(ackRows).toHaveLength(1);

    // The receipts panel reads the same rows back.
    const receipts = await ctx.call<Array<{ employee_id: string }>>('list_announcement_acknowledgements', { announcementId: announcement.id });
    expect(receipts.map((row) => row.employee_id)).toEqual([throwaway.id]);
  });

  it('pins an announcement and reminds only the people who have not acknowledged it', async () => {
    const pinned = await ctx.call<{ id: string; is_pinned: boolean }>('create_announcement', {
      branchId: TEST_FIXTURES.branchId,
      title: 'Pinned reminder test',
      content: 'Please acknowledge',
      isPinned: true
    });
    createdAnnouncementIds.push(pinned.id);
    expect(pinned.is_pinned).toBe(true);

    const draftReminder = await ctx.callRaw('remind_announcement', { announcementId: pinned.id });
    expect(draftReminder.success).toBe(false);
    expect(draftReminder.error?.code).toBe('VALIDATION_ERROR');

    await ctx.call('publish_announcement', { announcementId: pinned.id });
    const result = await ctx.call<{ reminded: number; undelivered: number }>('remind_announcement', { announcementId: pinned.id });
    const [{ count }] = await ctx.client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM employees WHERE organization_id = $1 AND branch_id = $2 AND employment_status = 'active' AND deleted_at IS NULL",
      [TEST_FIXTURES.organizationId, TEST_FIXTURES.branchId]
    );
    expect(result.reminded + result.undelivered).toBe(Number(count));

    const unpinned = await ctx.call<{ is_pinned: boolean }>('update_announcement', { announcementId: pinned.id, isPinned: false });
    expect(unpinned.is_pinned).toBe(false);
  });

  it('rejects acknowledging an unpublished announcement', async () => {
    const draft = await ctx.call<{ id: string }>('create_announcement', { title: 'Unpublished', content: 'x' });
    createdAnnouncementIds.push(draft.id);
    const result = await ctx.callRaw('acknowledge_announcement', { announcementId: draft.id });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});
