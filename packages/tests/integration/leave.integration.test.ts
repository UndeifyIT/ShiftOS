import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('leave requests integration', () => {
  let ctx: TestContext;
  const createdLeaveIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (createdLeaveIds.length > 0) {
      await ctx.client.query('DELETE FROM leave_requests WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        createdLeaveIds
      ]);
    }
    await ctx.client.close();
  });

  it('creates a request with a DB-computed total_days, then approves it', async () => {
    const leave = await ctx.call<{ id: string; total_days: number; status: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'annual_leave',
      startDate: '2027-03-01',
      endDate: '2027-03-03',
      reason: 'Integration test leave'
    });
    createdLeaveIds.push(leave.id);
    expect(leave.total_days).toBe(3);
    expect(leave.status).toBe('pending');

    const approved = await ctx.call<{ status: string; approved_at: string | null }>('approve_leave_request', { leaveRequestId: leave.id });
    expect(approved.status).toBe('approved');
    expect(approved.approved_at).not.toBeNull();
  });

  it('rejects an overlapping request for the same employee (DB exclusion constraint)', async () => {
    const first = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'sick_leave',
      startDate: '2027-04-10',
      endDate: '2027-04-12',
      reason: 'First'
    });
    createdLeaveIds.push(first.id);

    const overlap = await ctx.callRaw('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'sick_leave',
      startDate: '2027-04-11',
      endDate: '2027-04-11',
      reason: 'Overlaps'
    });
    expect(overlap.success).toBe(false);
  });

  it('rejects cancelling an approved (terminal) request, but allows cancelling a pending one', async () => {
    const approvedTarget = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'unpaid_leave',
      startDate: '2027-05-01',
      endDate: '2027-05-01',
      reason: 'Will be approved'
    });
    createdLeaveIds.push(approvedTarget.id);
    await ctx.call('approve_leave_request', { leaveRequestId: approvedTarget.id });

    const cancelApproved = await ctx.callRaw('cancel_leave_request', { leaveRequestId: approvedTarget.id, reason: 'changed my mind' });
    expect(cancelApproved.success).toBe(false);

    const pendingTarget = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'unpaid_leave',
      startDate: '2027-06-01',
      endDate: '2027-06-01',
      reason: 'Will be cancelled while pending'
    });
    createdLeaveIds.push(pendingTarget.id);
    const cancelled = await ctx.call<{ status: string; cancelled_at: string | null }>('cancel_leave_request', {
      leaveRequestId: pendingTarget.id,
      reason: 'No longer needed'
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_at).not.toBeNull();
  });

  it('rejecting a pending request requires manager notes and notifies the requester', async () => {
    const leave = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'sick_leave',
      startDate: '2027-07-01',
      endDate: '2027-07-01',
      reason: 'Will be rejected'
    });
    createdLeaveIds.push(leave.id);

    const rejected = await ctx.call<{ status: string; manager_notes: string | null }>('reject_leave_request', {
      leaveRequestId: leave.id,
      managerNotes: 'Coverage unavailable'
    });
    expect(rejected.status).toBe('rejected');
    expect(rejected.manager_notes).toBe('Coverage unavailable');

    const notifications = await ctx.call<Array<{ title: string }>>('list_my_notifications', { unreadOnly: true });
    const found = notifications.find((n) => n.title === 'Leave request rejected');
    expect(found).toBeTruthy();

    // Cleanup this test's own notification so it doesn't leak into other suites' unread counts.
    if (found) {
      const idRow = await ctx.client.query<{ id: string }>(
        "SELECT id FROM notifications WHERE organization_id = $1 AND title = 'Leave request rejected' ORDER BY created_at DESC LIMIT 1",
        [TEST_FIXTURES.organizationId]
      );
      if (idRow[0]) {
        await ctx.call('mark_notification_read', { notificationId: idRow[0].id });
      }
    }
  });
});
