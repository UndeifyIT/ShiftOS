import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('schedule conflicts integration', () => {
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

  it('reports no conflicts for a clean schedule', async () => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Conflicts integration test schedule (clean)',
      startDate: '2027-11-08',
      endDate: '2027-11-14'
    });
    scheduleId = schedule.id;

    const assigned = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-11-09',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(assigned.shift.id);
    assignmentIds.push(assigned.assignment.id);

    const conflicts = await ctx.call<Array<unknown>>('get_schedule_conflicts', { scheduleId });
    expect(conflicts).toEqual([]);
  });

  it('flags a shift longer than 10 hours', async () => {
    const longShift = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-11-10',
      startTime: '08:00',
      endTime: '19:00'
    });
    shiftIds.push(longShift.shift.id);
    assignmentIds.push(longShift.assignment.id);

    const conflicts = await ctx.call<Array<{ kind: string; date: string }>>('get_schedule_conflicts', { scheduleId });
    expect(conflicts.some((c) => c.kind === 'long_shift' && c.date === '2027-11-10')).toBe(true);
  });

  it('flags a double-booked employee across two shifts on the same date', async () => {
    // Seeded directly: the normal assign_shift_to_employee_on_date flow
    // deliberately replaces same-day assignments (Phase 1 is one block per
    // day), so a genuine double-booking has to come from the older,
    // still-registered create_shift/assign_employee pair, exactly like a
    // pre-existing shift created outside the grid would.
    const shiftA = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Conflict test shift A',
      shiftDate: '2027-11-11',
      startTime: '09:00',
      endTime: '13:00'
    });
    shiftIds.push(shiftA.id);
    const assignmentA = await ctx.call<{ id: string }>('assign_employee', { shiftId: shiftA.id, employeeId: TEST_FIXTURES.employeeId });
    assignmentIds.push(assignmentA.id);

    const shiftB = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Conflict test shift B',
      shiftDate: '2027-11-11',
      startTime: '12:00',
      endTime: '16:00'
    });
    shiftIds.push(shiftB.id);
    const assignmentB = await ctx.call<{ id: string }>('assign_employee', { shiftId: shiftB.id, employeeId: TEST_FIXTURES.employeeId });
    assignmentIds.push(assignmentB.id);

    const conflicts = await ctx.call<Array<{ kind: string; date: string }>>('get_schedule_conflicts', { scheduleId });
    expect(conflicts.some((c) => c.kind === 'double_booking' && c.date === '2027-11-11')).toBe(true);
  });
});
