import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * Only one real authenticated identity is available to integration tests
 * (the Owner fixture, whose users.email is 'undeify2026+shiftostest1@gmail.com'
 * — see testEnv.ts / the attendance/leave suites for the same convention).
 * "Employee A" below is a throwaway employee created with that same email so
 * self-service RPCs (requestSwap, respondToSwap) resolve "my employee" to A.
 * "Employee B" is a second throwaway employee with an unrelated email, used
 * only as the *other* party in a swap — rows involving B as the acting
 * identity are seeded directly via SQL (still passing through the real DB
 * trigger), since there is no second real auth user to call the RPC as B.
 */
describe('shift swaps integration', () => {
  let ctx: TestContext;
  let employeeAId: string | undefined;
  let employeeBId: string | undefined;
  let scheduleId: string | undefined;
  const shiftIds: string[] = [];
  const assignmentIds: string[] = [];
  const swapIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (swapIds.length > 0) {
      await ctx.client.query('DELETE FROM shift_swap_requests WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        swapIds
      ]);
    }
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
      await ctx.client.query('DELETE FROM schedule_versions WHERE organization_id = $1 AND schedule_id = $2', [
        TEST_FIXTURES.organizationId,
        scheduleId
      ]);
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, scheduleId]);
    }
    if (employeeAId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, employeeAId]);
    }
    if (employeeBId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, employeeBId]);
    }
    await ctx.client.close();
  });

  it('sets up fixtures: two throwaway employees and a schedule', async () => {
    const employeeA = await ctx.call<{ id: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: `SWAP-A-${Date.now()}`,
      firstName: 'Swap',
      lastName: 'TesterA',
      email: 'undeify2026+shiftostest1@gmail.com',
      hireDate: '2026-01-01'
    });
    employeeAId = employeeA.id;

    const employeeB = await ctx.call<{ id: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: `SWAP-B-${Date.now()}`,
      firstName: 'Swap',
      lastName: 'TesterB',
      email: 'undeify2026+shiftostest-swap-b@gmail.com',
      hireDate: '2026-01-01'
    });
    employeeBId = employeeB.id;

    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Shift swap integration test schedule',
      startDate: '2027-09-01',
      endDate: '2027-09-07'
    });
    scheduleId = schedule.id;

    expect(employeeAId).toBeTruthy();
    expect(employeeBId).toBeTruthy();
  });

  it('requests a directed swap on my own assignment and cancels it', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Swap integration shift 1',
      shiftDate: '2027-09-02',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: employeeAId });
    assignmentIds.push(assignment.id);

    const swap = await ctx.call<{ id: string; status: string; target_employee_id: string | null }>('request_shift_swap', {
      shiftAssignmentId: assignment.id,
      targetEmployeeId: employeeBId,
      notes: 'Integration test directed swap'
    });
    swapIds.push(swap.id);
    expect(swap.status).toBe('pending');
    expect(swap.target_employee_id).toBe(employeeBId);

    const cancelled = await ctx.call<{ status: string }>('cancel_shift_swap', { swapId: swap.id });
    expect(cancelled.status).toBe('cancelled');

    const cancelAgain = await ctx.callRaw('cancel_shift_swap', { swapId: swap.id });
    expect(cancelAgain.success).toBe(false);
  });

  it('rejects requesting a swap for someone else\'s assignment, and rejects targeting yourself', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Swap integration shift 2',
      shiftDate: '2027-09-03',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: employeeBId });
    assignmentIds.push(assignment.id);

    // "me" resolves to employee A, but this assignment belongs to employee B.
    const notMine = await ctx.callRaw('request_shift_swap', { shiftAssignmentId: assignment.id });
    expect(notMine.success).toBe(false);
    expect(notMine.error?.code).toBe('AUTHORIZATION_ERROR');

    const ownAssignment = await ctx.call<{ id: string }>('assign_employee', {
      shiftId: (
        await ctx.call<{ id: string }>('create_shift', {
          scheduleId,
          title: 'Swap integration shift 3',
          shiftDate: '2027-09-04',
          startTime: '09:00',
          endTime: '17:00'
        })
      ).id,
      employeeId: employeeAId
    });
    assignmentIds.push(ownAssignment.id);

    const selfTarget = await ctx.callRaw('request_shift_swap', { shiftAssignmentId: ownAssignment.id, targetEmployeeId: employeeAId });
    expect(selfTarget.success).toBe(false);
  });

  it('accepts a directed swap and approves it, atomically reassigning the shift assignment', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Swap integration shift 4',
      shiftDate: '2027-09-05',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: employeeBId });
    assignmentIds.push(assignment.id);

    // Seeded directly (still validated by trg_shift_swap_requests_validate on INSERT):
    // employee B offers their own assignment, directed at employee A.
    const seeded = await ctx.client.query<{ id: string }>(
      `INSERT INTO shift_swap_requests (organization_id, branch_id, shift_assignment_id, requested_by_employee_id, target_employee_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [TEST_FIXTURES.organizationId, TEST_FIXTURES.branchId, assignment.id, employeeBId, employeeAId, 'Seeded for accept/approve test']
    );
    const swapId = seeded[0].id;
    swapIds.push(swapId);

    // "me" resolves to employee A, the named target — accept is allowed.
    const accepted = await ctx.call<{ status: string; target_employee_id: string | null }>('respond_to_shift_swap', {
      swapId,
      accept: true
    });
    expect(accepted.status).toBe('accepted');
    expect(accepted.target_employee_id).toBe(employeeAId);

    const pendingApprovals = await ctx.call<Array<{ id: string }>>('list_pending_shift_swap_approvals', { branchId: TEST_FIXTURES.branchId });
    expect(pendingApprovals.some((s) => s.id === swapId)).toBe(true);

    const approved = await ctx.call<{ status: string }>('approve_shift_swap', { swapId, decisionNotes: 'Approved by integration test' });
    expect(approved.status).toBe('approved');

    const reassigned = await ctx.client.query<{ employee_id: string }>(
      'SELECT employee_id FROM shift_assignments WHERE organization_id = $1 AND id = $2',
      [TEST_FIXTURES.organizationId, assignment.id]
    );
    expect(reassigned[0].employee_id).toBe(employeeAId);

    // Terminal status: no further transitions allowed.
    const reapprove = await ctx.callRaw('approve_shift_swap', { swapId });
    expect(reapprove.success).toBe(false);
  });

  it('rejects an accepted swap when a supervisor declines it', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      title: 'Swap integration shift 5',
      shiftDate: '2027-09-06',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: employeeBId });
    assignmentIds.push(assignment.id);

    const seeded = await ctx.client.query<{ id: string }>(
      `INSERT INTO shift_swap_requests (organization_id, branch_id, shift_assignment_id, requested_by_employee_id, target_employee_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [TEST_FIXTURES.organizationId, TEST_FIXTURES.branchId, assignment.id, employeeBId, employeeAId]
    );
    const swapId = seeded[0].id;
    swapIds.push(swapId);

    await ctx.call('respond_to_shift_swap', { swapId, accept: true });
    const rejected = await ctx.call<{ status: string }>('reject_shift_swap', { swapId, decisionNotes: 'Coverage no longer needed' });
    expect(rejected.status).toBe('rejected');

    const stillOriginal = await ctx.client.query<{ employee_id: string }>(
      'SELECT employee_id FROM shift_assignments WHERE organization_id = $1 AND id = $2',
      [TEST_FIXTURES.organizationId, assignment.id]
    );
    expect(stillOriginal[0].employee_id).toBe(employeeBId);
  });

  it('lists an open (undirected) swap request and rejects claiming your own', async () => {
    const shift = await ctx.call<{ id: string }>('create_shift', {
      scheduleId,
      // Deliberately the schedule's exact end-date boundary: regression guard
      // for the isDateWithinRange Date/string timezone bug fixed this pass
      // (see packages/services/src/scheduling/time.ts).
      title: 'Swap integration shift 6',
      shiftDate: '2027-09-07',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(shift.id);
    const assignment = await ctx.call<{ id: string }>('assign_employee', { shiftId: shift.id, employeeId: employeeAId });
    assignmentIds.push(assignment.id);

    const openSwap = await ctx.call<{ id: string; target_employee_id: string | null }>('request_shift_swap', {
      shiftAssignmentId: assignment.id
    });
    swapIds.push(openSwap.id);
    expect(openSwap.target_employee_id).toBeNull();

    const openList = await ctx.call<Array<{ id: string }>>('list_open_shift_swaps', {});
    expect(openList.some((s) => s.id === openSwap.id)).toBe(true);

    // "me" resolves to employee A, who is also the requester here.
    const selfClaim = await ctx.callRaw('respond_to_shift_swap', { swapId: openSwap.id, accept: true });
    expect(selfClaim.success).toBe(false);
  });
});
