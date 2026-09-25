import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('notifications integration', () => {
  let ctx: TestContext;
  let leaveId: string | undefined;
  let quietLeaveId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    await ctx.client.query("DELETE FROM notifications WHERE organization_id = $1 AND title = 'Leave request approved'", [
      TEST_FIXTURES.organizationId
    ]);
    for (const id of [leaveId, quietLeaveId].filter(Boolean)) {
      await ctx.client.query('DELETE FROM leave_requests WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, id]);
    }
    await ctx.client.query('DELETE FROM notification_event_preferences WHERE organization_id = $1', [TEST_FIXTURES.organizationId]);
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

  it('lets a person switch off one event, and then stops sending it', async () => {
    const defaults = await ctx.call<Array<{ event_type: string; channel: string; is_enabled: boolean }>>('get_my_notification_event_preferences', {});
    expect(defaults).toHaveLength(6);
    expect(defaults.every((row) => row.is_enabled)).toBe(true);

    await ctx.call('set_my_notification_event_preference', { eventType: 'leave_decisions', channel: 'in_app', isEnabled: false });
    const saved = await ctx.call<Array<{ event_type: string; channel: string; is_enabled: boolean }>>('get_my_notification_event_preferences', {});
    expect(saved.find((row) => row.event_type === 'leave_decisions' && row.channel === 'in_app')?.is_enabled).toBe(false);

    const leave = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'annual_leave',
      startDate: '2027-09-01',
      endDate: '2027-09-02',
      reason: 'Muted notification test'
    });
    quietLeaveId = leave.id;
    const before = await ctx.call<unknown[]>('list_my_notifications', { unreadOnly: true });
    await ctx.call('approve_leave_request', { leaveRequestId: leave.id });
    const after = await ctx.call<unknown[]>('list_my_notifications', { unreadOnly: true });
    expect(after).toHaveLength(before.length);

    const bad = await ctx.callRaw('set_my_notification_event_preference', { eventType: 'coverage_gaps', channel: 'in_app', isEnabled: false });
    expect(bad.success).toBe(false);
  });
});
