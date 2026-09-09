import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('duplicate schedule shifts integration', () => {
  let ctx: TestContext;
  let sourceScheduleId: string | undefined;
  let targetScheduleId: string | undefined;
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
    const ids = [sourceScheduleId, targetScheduleId].filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = ANY($2::uuid[])', [TEST_FIXTURES.organizationId, ids]);
    }
    await ctx.client.close();
  });

  it('copies a Monday shift into the equivalent day of the target week, without notes', async () => {
    const source = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Duplicate test — source week',
      startDate: '2028-01-03', // a Monday
      endDate: '2028-01-09'
    });
    sourceScheduleId = source.id;

    const target = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Duplicate test — target week',
      startDate: '2028-01-10', // the following Monday
      endDate: '2028-01-16'
    });
    targetScheduleId = target.id;

    const sourceAssignment = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId: sourceScheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2028-01-03', // Monday of source week
      startTime: '09:00',
      endTime: '17:00',
      notes: 'Handover note — should not carry over'
    });
    shiftIds.push(sourceAssignment.shift.id);
    assignmentIds.push(sourceAssignment.assignment.id);

    const result = await ctx.call<{ copiedCount: number }>('duplicate_schedule_shifts', {
      sourceScheduleId,
      targetScheduleId
    });
    expect(result.copiedCount).toBe(1);

    const targetShifts = await ctx.client.query<{ id: string; shift_date: string; start_time: string; end_time: string }>(
      'SELECT id, shift_date::text, start_time::text, end_time::text FROM shifts WHERE organization_id = $1 AND branch_id = $2 AND shift_date = $3',
      [TEST_FIXTURES.organizationId, TEST_FIXTURES.branchId, '2028-01-10']
    );
    expect(targetShifts).toHaveLength(1);
    shiftIds.push(targetShifts[0].id);
    expect(targetShifts[0].start_time.slice(0, 5)).toBe('09:00');
    expect(targetShifts[0].end_time.slice(0, 5)).toBe('17:00');

    const targetAssignments = await ctx.client.query<{ id: string; notes: string | null }>(
      'SELECT id, notes FROM shift_assignments WHERE organization_id = $1 AND shift_id = $2',
      [TEST_FIXTURES.organizationId, targetShifts[0].id]
    );
    expect(targetAssignments).toHaveLength(1);
    assignmentIds.push(targetAssignments[0].id);
    expect(targetAssignments[0].notes).toBeNull();
  });

  it('is a no-op when the source schedule has zero shifts', async () => {
    const emptySource = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Duplicate test — empty source',
      startDate: '2028-02-07',
      endDate: '2028-02-13'
    });
    const emptyTarget = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Duplicate test — empty target',
      startDate: '2028-02-14',
      endDate: '2028-02-20'
    });

    const result = await ctx.call<{ copiedCount: number }>('duplicate_schedule_shifts', {
      sourceScheduleId: emptySource.id,
      targetScheduleId: emptyTarget.id
    });
    expect(result.copiedCount).toBe(0);

    await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
      TEST_FIXTURES.organizationId,
      [emptySource.id, emptyTarget.id]
    ]);
  });
});
