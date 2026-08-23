import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * Exercises the real RPC -> service -> repository -> Postgres path for the
 * Tasks domain against the live, linked Supabase database, using the same
 * RpcRegistry the real backend process runs. Mirrors the manual verification
 * already performed for this domain during the backend completion pass
 * (see docs/backend-completion-audit.md) — converted into a repeatable,
 * checked-in suite instead of a one-off script.
 */
describe('tasks integration', () => {
  let ctx: TestContext;
  const createdTaskIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (createdTaskIds.length > 0) {
      await ctx.client.query('DELETE FROM task_history WHERE organization_id = $1 AND task_id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        createdTaskIds
      ]);
      await ctx.client.query('DELETE FROM tasks WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        createdTaskIds
      ]);
    }
    await ctx.client.close();
  });

  it('runs the full lifecycle: create -> assign -> complete -> rework -> complete -> verify', async () => {
    const task = await ctx.call<{ id: string; task_status: string }>('create_task', {
      branchId: TEST_FIXTURES.branchId,
      title: 'Integration test task',
      priority: 'high'
    });
    createdTaskIds.push(task.id);
    expect(task.task_status).toBe('draft');

    const assigned = await ctx.call<{ task_status: string; assigned_supervisor_id: string }>('assign_task', {
      taskId: task.id,
      supervisorEmployeeId: TEST_FIXTURES.employeeId
    });
    expect(assigned.task_status).toBe('assigned');
    expect(assigned.assigned_supervisor_id).toBe(TEST_FIXTURES.employeeId);

    const completed = await ctx.call<{ task_status: string; completed_at: string | null }>('complete_task', {
      taskId: task.id,
      notes: 'Done'
    });
    expect(completed.task_status).toBe('completed');
    expect(completed.completed_at).not.toBeNull();

    const reworked = await ctx.call<{ task_status: string; verified_at: string | null; completed_at: string | null }>('verify_task', {
      taskId: task.id,
      status: 'rework_required',
      notes: 'Missed a step'
    });
    // Regression guard for the bug fixed this pass: rework must clear
    // completed_at/verified_at, not just flip verification_status, or it
    // violates chk_tasks_completion_consistency / chk_tasks_verification_consistency.
    expect(reworked.task_status).toBe('in_progress');
    expect(reworked.verified_at).toBeNull();
    expect(reworked.completed_at).toBeNull();

    await ctx.call('complete_task', { taskId: task.id, notes: 'Actually done now' });
    const verified = await ctx.call<{ task_status: string; verified_at: string | null }>('verify_task', {
      taskId: task.id,
      status: 'verified'
    });
    expect(verified.task_status).toBe('verified');
    expect(verified.verified_at).not.toBeNull();
  });

  it('rejects cancelling an unassigned draft task, and allows cancelling an assigned one', async () => {
    const task = await ctx.call<{ id: string }>('create_task', { branchId: TEST_FIXTURES.branchId, title: 'Cancel test task' });
    createdTaskIds.push(task.id);

    const draftCancel = await ctx.callRaw('cancel_task', { taskId: task.id, reason: 'nope' });
    expect(draftCancel.success).toBe(false);
    expect(draftCancel.error?.code).toBe('VALIDATION_ERROR');

    await ctx.call('assign_task', { taskId: task.id, supervisorEmployeeId: TEST_FIXTURES.employeeId });
    const cancelled = await ctx.call<{ task_status: string }>('cancel_task', { taskId: task.id, reason: 'No longer needed' });
    expect(cancelled.task_status).toBe('cancelled');
  });

  it('archives a task and records an audit_logs entry', async () => {
    const task = await ctx.call<{ id: string }>('create_task', { branchId: TEST_FIXTURES.branchId, title: 'Archive test task' });
    createdTaskIds.push(task.id);

    const archived = await ctx.call<{ deleted_at: string | null }>('archive_task', { taskId: task.id });
    expect(archived.deleted_at).not.toBeNull();

    const auditRows = await ctx.client.query<{ action: string }>(
      'SELECT action FROM audit_logs WHERE organization_id = $1 AND entity_id = $2',
      [TEST_FIXTURES.organizationId, task.id]
    );
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.action).toBe('archive_task');
    // audit_logs is append-only by DB trigger (024) — intentionally not
    // deleted in afterAll; this is expected, permanent history.
  });

  it('records a history entry for every status transition', async () => {
    const task = await ctx.call<{ id: string }>('create_task', { branchId: TEST_FIXTURES.branchId, title: 'History test task' });
    createdTaskIds.push(task.id);
    await ctx.call('assign_task', { taskId: task.id, supervisorEmployeeId: TEST_FIXTURES.employeeId });
    await ctx.call('complete_task', { taskId: task.id });

    const history = await ctx.call<Array<{ status: string }>>('get_task_history', { taskId: task.id });
    const statuses = history.map((h) => h.status);
    expect(statuses).toContain('draft');
    expect(statuses).toContain('assigned');
    expect(statuses).toContain('completed');
  });

  it('rejects tasks.create for a branch the caller does not have access to, and logs a security_events row', async () => {
    const fakeBranchId = '00000000-0000-0000-0000-000000000000';
    const result = await ctx.callRaw('create_task', { branchId: fakeBranchId, title: 'Should be denied' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('AUTHORIZATION_ERROR');

    const events = await ctx.client.query<{ event_type: string }>(
      "SELECT event_type FROM security_events WHERE organization_id = $1 AND event_type = 'branch_access_denied' ORDER BY created_at DESC LIMIT 1",
      [TEST_FIXTURES.organizationId]
    );
    expect(events).toHaveLength(1);
  });
});
