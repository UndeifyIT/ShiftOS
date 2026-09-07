import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('list assignments for schedule (bulk) integration', () => {
  let ctx: TestContext;
  let scheduleId: string | undefined;
  const shiftIds: string[] = [];
  const assignmentIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (assignmentIds.length > 0) {
      await ctx.client.query('DELETE FROM shift_assignments WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        assignmentIds
      ]);
    }
    if (shiftIds.length > 0) {
      await ctx.client.query('DELETE FROM shifts WHERE organization_id = $1 AND id = ANY($2::uuid[])', [TEST_FIXTURES.organizationId, shiftIds]);
    }
    if (scheduleId) {
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, scheduleId]);
    }
    await ctx.client.close();
  });

  it('returns assignments across two different shifts in the schedule in one call', async () => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Bulk assignments integration test schedule',
      startDate: '2027-10-25',
      endDate: '2027-10-31'
    });
    scheduleId = schedule.id;

    const first = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-26',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(first.shift.id);
    assignmentIds.push(first.assignment.id);

    const second = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-27',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(second.shift.id);
    assignmentIds.push(second.assignment.id);

    const all = await ctx.call<Array<{ id: string }>>('list_assignments_for_schedule', { scheduleId });
    expect(all.some((a) => a.id === first.assignment.id)).toBe(true);
    expect(all.some((a) => a.id === second.assignment.id)).toBe(true);
  });

  it('returns an empty array for a schedule with no shifts', async () => {
    const empty = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Empty bulk assignments integration test schedule',
      startDate: '2027-11-01',
      endDate: '2027-11-07'
    });
    const result = await ctx.call<Array<unknown>>('list_assignments_for_schedule', { scheduleId: empty.id });
    expect(result).toEqual([]);
    await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, empty.id]);
  });
});
