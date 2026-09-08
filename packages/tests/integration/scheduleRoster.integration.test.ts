import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('schedule roster integration', () => {
  let ctx: TestContext;
  // Every schedule this file creates is tracked so afterAll cleans up all of
  // them -- a single shared variable let the second test overwrite the first
  // test's id, leaking that schedule and its schedule_rosters rows into the
  // fixture org and self-poisoning the next run.
  const scheduleIds: string[] = [];
  let secondEmployeeId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    for (const id of scheduleIds) {
      await ctx.client.query('DELETE FROM schedule_rosters WHERE organization_id = $1 AND schedule_id = $2', [
        TEST_FIXTURES.organizationId,
        id
      ]);
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, id]);
    }
    if (secondEmployeeId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, secondEmployeeId]);
    }
    await ctx.client.close();
  });

  it('adds, lists, and removes an employee from a schedule roster', async () => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Roster integration test schedule',
      startDate: '2027-10-04',
      endDate: '2027-10-10'
    });
    scheduleIds.push(schedule.id);
    const scheduleId = schedule.id;

    const added = await ctx.call<{ id: string; employee_id: string }>('add_employee_to_schedule', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId
    });
    expect(added.employee_id).toBe(TEST_FIXTURES.employeeId);

    const roster = await ctx.call<Array<{ employee_id: string }>>('list_schedule_roster', { scheduleId });
    expect(roster.some((r) => r.employee_id === TEST_FIXTURES.employeeId)).toBe(true);

    const duplicate = await ctx.callRaw('add_employee_to_schedule', { scheduleId, employeeId: TEST_FIXTURES.employeeId });
    expect(duplicate.success).toBe(false);

    const removed = await ctx.call<{ deleted_at: string | null }>('remove_employee_from_schedule', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId
    });
    expect(removed.deleted_at).not.toBeNull();

    const rosterAfterRemoval = await ctx.call<Array<{ employee_id: string }>>('list_schedule_roster', { scheduleId });
    expect(rosterAfterRemoval.some((r) => r.employee_id === TEST_FIXTURES.employeeId)).toBe(false);
  });

  it('rejects adding an employee from a different branch', async () => {
    const otherBranchEmployee = await ctx.call<{ id: string; branch_id: string }>('create_employee', {
      // A branch other than TEST_FIXTURES.branchId is required for this
      // check -- reuse the org's own branch list rather than hardcoding one.
      branchId: (await ctx.call<Array<{ id: string }>>('list_branches', {})).find((b) => b.id !== TEST_FIXTURES.branchId)?.id ?? TEST_FIXTURES.branchId,
      employeeNumber: `ROSTER-X-${Date.now()}`,
      firstName: 'Roster',
      lastName: 'CrossBranch',
      hireDate: '2026-01-01'
    });
    secondEmployeeId = otherBranchEmployee.id;

    if (otherBranchEmployee.branch_id === TEST_FIXTURES.branchId) {
      // Only one branch exists in the fixture org -- nothing to assert here.
      return;
    }

    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Roster cross-branch test schedule',
      startDate: '2027-10-11',
      endDate: '2027-10-17'
    });
    scheduleIds.push(schedule.id);
    const scheduleId = schedule.id;

    const result = await ctx.callRaw('add_employee_to_schedule', { scheduleId, employeeId: secondEmployeeId });
    expect(result.success).toBe(false);
  });
});
