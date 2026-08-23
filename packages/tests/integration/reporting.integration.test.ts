import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('reporting integration', () => {
  let ctx: TestContext;
  let leaveId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (leaveId) {
      await ctx.client.query('DELETE FROM leave_requests WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, leaveId]);
    }
    await ctx.client.close();
  });

  it('reflects an approved leave request in the leave usage summary', async () => {
    const leave = await ctx.call<{ id: string }>('create_leave_request', {
      employeeId: TEST_FIXTURES.employeeId,
      leaveType: 'annual_leave',
      startDate: '2027-10-01',
      endDate: '2027-10-03',
      reason: 'Reporting integration test'
    });
    leaveId = leave.id;
    await ctx.call('approve_leave_request', { leaveRequestId: leave.id });

    const summary = await ctx.call<Array<{ leave_type: string; request_count: number; total_days: number }>>('get_leave_usage_report', {
      startDate: '2027-10-01',
      endDate: '2027-10-03',
      branchId: TEST_FIXTURES.branchId
    });
    const annual = summary.find((s) => s.leave_type === 'annual_leave');
    expect(annual).toBeTruthy();
    expect(annual!.request_count).toBeGreaterThanOrEqual(1);
    expect(annual!.total_days).toBeGreaterThanOrEqual(3);
  });

  it('rejects an invalid date range', async () => {
    const result = await ctx.callRaw('get_leave_usage_report', {
      startDate: '2027-10-05',
      endDate: '2027-10-01',
      branchId: TEST_FIXTURES.branchId
    });
    expect(result.success).toBe(false);
  });

  it('returns task completion stats with an overdue count', async () => {
    const report = await ctx.call<{ byStatus: Array<{ task_status: string; task_count: number }>; overdueCount: number }>(
      'get_task_completion_report',
      { branchId: TEST_FIXTURES.branchId }
    );
    expect(Array.isArray(report.byStatus)).toBe(true);
    expect(typeof report.overdueCount).toBe('number');
  });

  it('returns an attendance summary grouped by status', async () => {
    const summary = await ctx.call<Array<{ attendance_status: string; record_count: number }>>('get_attendance_summary_report', {
      startDate: '2020-01-01',
      endDate: '2030-01-01',
      branchId: TEST_FIXTURES.branchId
    });
    expect(Array.isArray(summary)).toBe(true);
  });

  it('rejects reports for a branch the caller does not have access to', async () => {
    const result = await ctx.callRaw(
      'get_attendance_summary_report',
      { startDate: '2027-01-01', endDate: '2027-01-31', branchId: '00000000-0000-0000-0000-000000000000' },
      TEST_FIXTURES.ownerAuthUserId
    );
    // Owner is org-wide, so an unknown branch id simply isn't in scope --
    // requireBranchAccess rejects it rather than silently returning everything.
    expect(result.success).toBe(false);
  });
});
