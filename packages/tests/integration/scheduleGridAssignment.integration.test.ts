import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('schedule grid cell assignment integration', () => {
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

  it('assigns a custom shift to a cell, then re-assigning the same cell cancels the old shift', async () => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Cell assignment integration test schedule',
      startDate: '2027-10-18',
      endDate: '2027-10-24'
    });
    scheduleId = schedule.id;

    const first = await ctx.call<{ shift: { id: string }; assignment: { id: string; notes: string | null } }>(
      'assign_shift_to_employee_on_date',
      {
        scheduleId,
        employeeId: TEST_FIXTURES.employeeId,
        date: '2027-10-19',
        startTime: '09:00',
        endTime: '17:00',
        notes: 'First assignment'
      }
    );
    shiftIds.push(first.shift.id);
    assignmentIds.push(first.assignment.id);
    expect(first.assignment.notes).toBe('First assignment');

    const second = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-19',
      startTime: '12:00',
      endTime: '20:00'
    });
    shiftIds.push(second.shift.id);
    assignmentIds.push(second.assignment.id);
    expect(second.shift.id).not.toBe(first.shift.id);

    const oldShift = await ctx.client.query<{ status: string }>('SELECT status FROM shifts WHERE organization_id = $1 AND id = $2', [
      TEST_FIXTURES.organizationId,
      first.shift.id
    ]);
    expect(oldShift[0].status).toBe('cancelled');

    const oldAssignment = await ctx.client.query<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM shift_assignments WHERE organization_id = $1 AND id = $2',
      [TEST_FIXTURES.organizationId, first.assignment.id]
    );
    expect(oldAssignment[0].deleted_at).not.toBeNull();
  });

  it('updates an assigned shift\'s time and notes', async () => {
    const created = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-20',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(created.shift.id);
    assignmentIds.push(created.assignment.id);

    const updated = await ctx.call<{ shift: { start_time: string; end_time: string }; assignment: { notes: string | null } }>(
      'update_assigned_shift_on_date',
      { assignmentId: created.assignment.id, startTime: '10:00', endTime: '18:00', notes: 'Updated note' }
    );
    expect(updated.shift.start_time.slice(0, 5)).toBe('10:00');
    expect(updated.assignment.notes).toBe('Updated note');
  });

  it('removing a cell\'s only assignment cancels the underlying shift', async () => {
    const created = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-21',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(created.shift.id);
    assignmentIds.push(created.assignment.id);

    const removed = await ctx.call<{ shiftCancelled: boolean }>('remove_assigned_shift_on_date', { assignmentId: created.assignment.id });
    expect(removed.shiftCancelled).toBe(true);
  });

  it('adds a second shift to an already-filled cell without replacing the first (split shift)', async () => {
    const morning = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-22',
      startTime: '09:00',
      endTime: '13:00'
    });
    shiftIds.push(morning.shift.id);
    assignmentIds.push(morning.assignment.id);

    const afternoon = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('add_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-22',
      startTime: '14:00',
      endTime: '18:00'
    });
    shiftIds.push(afternoon.shift.id);
    assignmentIds.push(afternoon.assignment.id);

    expect(afternoon.shift.id).not.toBe(morning.shift.id);

    const morningStatus = await ctx.client.query<{ status: string }>('SELECT status FROM shifts WHERE organization_id = $1 AND id = $2', [
      TEST_FIXTURES.organizationId,
      morning.shift.id
    ]);
    expect(morningStatus[0].status).not.toBe('cancelled');

    const morningAssignment = await ctx.client.query<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM shift_assignments WHERE organization_id = $1 AND id = $2',
      [TEST_FIXTURES.organizationId, morning.assignment.id]
    );
    expect(morningAssignment[0].deleted_at).toBeNull();
  });
});
