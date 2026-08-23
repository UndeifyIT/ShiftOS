import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('notifications integration', () => {
  let ctx: TestContext;
  let leaveId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    await ctx.client.query("DELETE FROM notifications WHERE organization_id = $1 AND title = 'Leave request approved'", [
      TEST_FIXTURES.organizationId
    ]);
    if (leaveId) {
      await ctx.client.query('DELETE FROM leave_requests WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, leaveId]);
    }
    await ctx.client.close();
  });

  it('creates a notification as a side effect of leave approval, then supports read/mark-read/mark-all-read', async () => {
    const leave = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'annual_leave',
      startDate: '2027-08-01',
      endDate: '2027-08-02',
      reason: 'Notification wiring test'
    });
    leaveId = leave.id;

    const before = await ctx.call<unknown[]>('list_my_notifications', { unreadOnly: true });
    await ctx.call('approve_leave_request', { leaveRequestId: leave.id });
    const after = await ctx.call<Array<{ id: string; title: string; read_at: string | null }>>('list_my_notifications', { unreadOnly: true });

    expect(after.length).toBe(before.length + 1);
    const notification = after.find((n) => n.title === 'Leave request approved');
    expect(notification).toBeTruthy();
    expect(notification?.read_at).toBeNull();

    const marked = await ctx.call<{ read_at: string | null }>('mark_notification_read', { notificationId: notification!.id });
    expect(marked.read_at).not.toBeNull();

    // Ownership check: marking a nonexistent id must fail, not silently succeed.
    const wrongMark = await ctx.callRaw('mark_notification_read', { notificationId: '00000000-0000-0000-0000-000000000000' });
    expect(wrongMark.success).toBe(false);
    expect(wrongMark.error?.code).toBe('NOT_FOUND');

    const allRead = await ctx.call<{ markedRead: number }>('mark_all_notifications_read', {});
    expect(typeof allRead.markedRead).toBe('number');

    const finalUnread = await ctx.call<unknown[]>('list_my_notifications', { unreadOnly: true });
    expect(finalUnread).toHaveLength(0);
  });
});
