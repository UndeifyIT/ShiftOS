import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('attendance integration', () => {
  let ctx: TestContext;
  let throwawayEmployeeId: string | undefined;
  let scheduleId: string | undefined;
  const shiftIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (shiftIds.length > 0) {
      await ctx.client.query(
        'DELETE FROM attendance_corrections WHERE organization_id = $1 AND attendance_record_id IN (SELECT ar.id FROM attendance_records ar JOIN shift_assignments sa ON sa.id = ar.shift_assignment_id WHERE sa.shift_id = ANY($2::uuid[]))',
        [TEST_FIXTURES.organizationId, shiftIds]
      );
      await ctx.client.query(
        'DELETE FROM attendance_records WHERE organization_id = $1 AND shift_assignment_id IN (SELECT id FROM shift_assignments WHERE shift_id = ANY($2::uuid[]))',
        [TEST_FIXTURES.organizationId, shiftIds]
      );
      await ctx.client.query('DELETE FROM shift_assignments WHERE organization_id = $1 AND shift_id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        shiftIds
      ]);
      await ctx.client.query('DELETE FROM shifts WHERE organization_id = $1 AND id = ANY($2::uuid[])', [TEST_FIXTURES.organizationId, shiftIds]);
    }
    if (scheduleId) {
      await ctx.client.query('DELETE FROM schedule_versions WHERE organization_id = $1 AND schedule_id = $2', [
        TEST_FIXTURES.organizationId,
        scheduleId
      ]);
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, scheduleId]);
    }
    if (throwawayEmployeeId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, throwawayEmployeeId]);
    }
    await ctx.client.close();
  });

  it('sets up fixtures: a throwaway employee, schedule, and two shift assignments', async () => {
    const employee = await ctx.call<{ id: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: `ATT-INT-${Date.now()}`,
      firstName: 'Attendance',
      lastName: 'Tester',
      email: 'undeify2026+shiftostest1@gmail.com',
      hireDate: '2026-01-01'
    });
    throwawayEmployeeId = employee.id;

    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Attendance integration test schedule',
      startDate: '2027-02-01',
      endDate: '2027-02-07'
    });
    scheduleId = schedule.id;

    expect(throwawayEmployeeId).toBeTruthy();
    expect(scheduleId).toBeTruthy();
  });

  it('clocks in and out against the caller\'s own assignment, rejecting a second clock-in', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Attendance integration shift 1',
      shiftDate: '2027-02-02',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: throwawayEmployeeId });

    const clockedIn = await ctx.call<{ attendance_status: string; clock_in_at: string | null }>('clock_in', { shiftAssignmentId: assignment.id });
    expect(clockedIn.attendance_status).toBe('present');
    expect(clockedIn.clock_in_at).not.toBeNull();

    const doubleClockIn = await ctx.callRaw('clock_in', { shiftAssignmentId: assignment.id });
    expect(doubleClockIn.success).toBe(false);

    const clockedOut = await ctx.call<{ attendance_status: string; clock_out_at: string | null; id: string }>('clock_out', {
      shiftAssignmentId: assignment.id
    });
    expect(clockedOut.attendance_status).toBe('completed');
    expect(clockedOut.clock_out_at).not.toBeNull();

    // Regression guard for the bug fixed this pass: trg_attendance_records_validate
    // must resolve branch via the joined shift (s.branch_id), not a
    // nonexistent shift_assignments.branch_id column.
    const record = await ctx.call<{ branch_id: string }>('get_attendance_record', { recordId: clockedOut.id });
    expect(record.branch_id).toBe(TEST_FIXTURES.branchId);
  });

  it('rejects clocking in to another employee\'s assignment', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Attendance integration shift 2',
      shiftDate: '2027-02-03',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: TEST_FIXTURES.employeeId });

    const wrongClockIn = await ctx.callRaw('clock_in', { shiftAssignmentId: assignment.id });
    expect(wrongClockIn.success).toBe(false);
    expect(wrongClockIn.error?.code).toBe('AUTHORIZATION_ERROR');

    const absent = await ctx.call<{ attendance_status: string }>('mark_attendance_absent', {
      shiftAssignmentId: assignment.id,
      noShow: true,
      notes: 'No call, no show'
    });
    expect(absent.attendance_status).toBe('no_show');
  });

  it('records a correction and its own audit trail', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Attendance integration shift 3',
      shiftDate: '2027-02-04',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: throwawayEmployeeId });
    await ctx.call('clock_in', { shiftAssignmentId: assignment.id });
    const clockedOut = await ctx.call<{ id: string; clock_in_at: string }>('clock_out', { shiftAssignmentId: assignment.id });

    const corrected = await ctx.call<{ attendance_status: string; clock_out_at: string | null }>('record_attendance_correction', {
      attendanceRecordId: clockedOut.id,
      correctedStatus: 'present',
      correctedClockIn: new Date(clockedOut.clock_in_at).toISOString(),
      correctedClockOut: null,
      reason: 'Employee left early, mis-clocked as completed'
    });
    expect(corrected.attendance_status).toBe('present');
    expect(corrected.clock_out_at).toBeNull();

    const corrections = await ctx.call<unknown[]>('list_attendance_corrections', { attendanceRecordId: clockedOut.id });
    expect(corrections).toHaveLength(1);
  });
});
