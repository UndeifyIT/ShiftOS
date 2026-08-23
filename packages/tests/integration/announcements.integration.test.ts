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
  });

  it('rejects acknowledging an unpublished announcement', async () => {
    const draft = await ctx.call<{ id: string }>('create_announcement', { title: 'Unpublished', content: 'x' });
    createdAnnouncementIds.push(draft.id);
    const result = await ctx.callRaw('acknowledge_announcement', { announcementId: draft.id });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});
