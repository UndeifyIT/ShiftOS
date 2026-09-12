import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * Backend behaviour the design handoff's Schedules screen needs (migration 062
 * and the 2026-09-12 "handoff wins" rebuild): explicit days off, roster
 * removal clearing the person's week, week copies including people and days
 * off, unpublish-to-edit, and the paid-hours 10-hour rule.
 */
describe('schedule handoff behaviours integration', () => {
  let ctx: TestContext;
  const scheduleIds: string[] = [];
  // Weeks no other integration file uses (uq_schedules_branch_active_dates allows one schedule per branch+range).
  const WEEK_A = { start: '2028-03-06', end: '2028-03-12' };
  const WEEK_B = { start: '2028-03-13', end: '2028-03-19' };
  const WEEK_C = { start: '2028-03-20', end: '2028-03-26' };

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    const org = TEST_FIXTURES.organizationId;
    for (const id of scheduleIds) {
      await ctx.client.query('DELETE FROM schedule_day_offs WHERE organization_id = $1 AND schedule_id = $2', [org, id]);
      await ctx.client.query('DELETE FROM schedule_rosters WHERE organization_id = $1 AND schedule_id = $2', [org, id]);
      await ctx.client.query('DELETE FROM schedule_versions WHERE organization_id = $1 AND schedule_id = $2', [org, id]);
    }
    await ctx.client.query(
      `DELETE FROM shift_assignments WHERE organization_id = $1 AND shift_id IN (
         SELECT id FROM shifts WHERE organization_id = $1 AND branch_id = $2 AND shift_date BETWEEN $3 AND $4)`,
      [org, TEST_FIXTURES.branchId, WEEK_A.start, WEEK_C.end]
    );
    await ctx.client.query('DELETE FROM shifts WHERE organization_id = $1 AND branch_id = $2 AND shift_date BETWEEN $3 AND $4', [
      org,
      TEST_FIXTURES.branchId,
      WEEK_A.start,
      WEEK_C.end
    ]);
    for (const id of scheduleIds) {
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [org, id]);
    }
    await ctx.client.close();
  });

  const createWeek = async (week: { start: string; end: string }, name: string): Promise<string> => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', { branchId: TEST_FIXTURES.branchId, name, startDate: week.start, endDate: week.end });
    scheduleIds.push(schedule.id);
    await ctx.call('add_employee_to_schedule', { scheduleId: schedule.id, employeeId: TEST_FIXTURES.employeeId });
    return schedule.id;
  };

  const activeAssignmentsOn = async (scheduleId: string, date: string): Promise<number> => {
    const shifts = await ctx.call<Array<{ id: string; shift_date: string }>>('list_shifts_for_schedule', { scheduleId });
    const assignments = await ctx.call<Array<{ shift_id: string; employee_id: string; assignment_status: string }>>('list_assignments_for_schedule', { scheduleId });
    const onDate = new Set(shifts.filter((s) => s.shift_date === date).map((s) => s.id));
    return assignments.filter((a) => onDate.has(a.shift_id) && a.employee_id === TEST_FIXTURES.employeeId && a.assignment_status === 'assigned').length;
  };

  it('marks a day off (clearing that day\'s shifts), clears it when a shift is assigned, and clears it on request', async () => {
    const scheduleId = await createWeek(WEEK_A, 'Handoff day-off test week');
    const employeeId = TEST_FIXTURES.employeeId;

    await ctx.call('add_shift_to_employee_on_date', { scheduleId, employeeId, date: '2028-03-07', startTime: '09:00', endTime: '17:00' });
    expect(await activeAssignmentsOn(scheduleId, '2028-03-07')).toBe(1);

    const off = await ctx.call<{ off_date: string; employee_id: string }>('mark_day_off', { scheduleId, employeeId, date: '2028-03-07' });
    expect(off.off_date).toBe('2028-03-07');
    expect(await activeAssignmentsOn(scheduleId, '2028-03-07')).toBe(0);

    const again = await ctx.call<{ id: string }>('mark_day_off', { scheduleId, employeeId, date: '2028-03-07' });
    const listed = await ctx.call<Array<{ id: string; off_date: string }>>('list_schedule_day_offs', { scheduleId });
    expect(listed.filter((d) => d.off_date === '2028-03-07').map((d) => d.id)).toEqual([again.id]);

    await ctx.call('add_shift_to_employee_on_date', { scheduleId, employeeId, date: '2028-03-07', startTime: '10:00', endTime: '14:00' });
    expect((await ctx.call<Array<{ off_date: string }>>('list_schedule_day_offs', { scheduleId })).some((d) => d.off_date === '2028-03-07')).toBe(false);

    await ctx.call('mark_day_off', { scheduleId, employeeId, date: '2028-03-08' });
    expect(await ctx.call('clear_day_off', { scheduleId, employeeId, date: '2028-03-08' })).toBeNull();
    expect((await ctx.call<Array<{ off_date: string }>>('list_schedule_day_offs', { scheduleId })).some((d) => d.off_date === '2028-03-08')).toBe(false);

    const outside = await ctx.callRaw('mark_day_off', { scheduleId, employeeId, date: '2028-03-20' });
    expect(outside.success).toBe(false);
  });

  it('copies a week\'s roster, shifts and days off into another week', async () => {
    const sourceId = scheduleIds[0];
    await ctx.call('mark_day_off', { scheduleId: sourceId, employeeId: TEST_FIXTURES.employeeId, date: '2028-03-11' });
    const targetSchedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Handoff copy target week',
      startDate: WEEK_B.start,
      endDate: WEEK_B.end
    });
    scheduleIds.push(targetSchedule.id);

    const result = await ctx.call<{ copiedCount: number }>('duplicate_schedule_shifts', { sourceScheduleId: sourceId, targetScheduleId: targetSchedule.id });
    expect(result.copiedCount).toBeGreaterThanOrEqual(1);

    const roster = await ctx.call<Array<{ employee_id: string }>>('list_schedule_roster', { scheduleId: targetSchedule.id });
    expect(roster.map((r) => r.employee_id)).toContain(TEST_FIXTURES.employeeId);
    const dayOffs = await ctx.call<Array<{ off_date: string }>>('list_schedule_day_offs', { scheduleId: targetSchedule.id });
    expect(dayOffs.map((d) => d.off_date)).toContain('2028-03-18');
    expect(await activeAssignmentsOn(targetSchedule.id, '2028-03-14')).toBe(1);
  });

  it('removing someone from the week also clears their shifts and days off', async () => {
    const scheduleId = scheduleIds[1];
    await ctx.call('remove_employee_from_schedule', { scheduleId, employeeId: TEST_FIXTURES.employeeId });
    expect(await activeAssignmentsOn(scheduleId, '2028-03-14')).toBe(0);
    expect(await ctx.call<unknown[]>('list_schedule_day_offs', { scheduleId })).toEqual([]);
  });

  it('unpublishes a published week back to draft, shifts included, and refuses to unpublish a draft', async () => {
    const scheduleId = await createWeek(WEEK_C, 'Handoff unpublish test week');
    await ctx.call('add_shift_to_employee_on_date', { scheduleId, employeeId: TEST_FIXTURES.employeeId, date: '2028-03-21', startTime: '09:00', endTime: '17:00' });

    const draftAttempt = await ctx.callRaw('unpublish_schedule', { scheduleId });
    expect(draftAttempt.success).toBe(false);

    await ctx.call('publish_schedule', { scheduleId });
    const unpublished = await ctx.call<{ status: string }>('unpublish_schedule', { scheduleId });
    expect(unpublished.status).toBe('draft');

    const shifts = await ctx.call<Array<{ status: string; published_at: string | null }>>('list_shifts_for_schedule', { scheduleId });
    expect(shifts.filter((s) => s.status !== 'cancelled').every((s) => s.status === 'draft' && s.published_at === null)).toBe(true);
    const versions = await ctx.call<unknown[]>('list_schedule_versions', { scheduleId });
    expect(versions.length).toBe(1);
  });

  it('allows exactly 10 paid hours but flags more (breaks removed)', async () => {
    const scheduleId = scheduleIds[2];
    await ctx.call('add_shift_to_employee_on_date', { scheduleId, employeeId: TEST_FIXTURES.employeeId, date: '2028-03-22', startTime: '11:30', endTime: '22:30', breakMinutes: 60 });
    await ctx.call('add_shift_to_employee_on_date', { scheduleId, employeeId: TEST_FIXTURES.employeeId, date: '2028-03-23', startTime: '11:30', endTime: '22:30', breakMinutes: 0 });

    const conflicts = await ctx.call<Array<{ date: string; kind: string; detail: string }>>('get_schedule_conflicts', { scheduleId });
    expect(conflicts.some((c) => c.date === '2028-03-22')).toBe(false);
    expect(conflicts).toContainEqual(expect.objectContaining({ date: '2028-03-23', kind: 'long_shift', detail: 'Exceeds 10 hrs rule' }));
  });
});
