import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * import_employees / list_employee_imports (migration 064): valid rows are
 * created through the same checks as create_employee, a bad row fails on its
 * own without stopping the rest, and the import is recorded for "Recent
 * Imports". Invites are off here — they'd send real email.
 */
describe('employee import integration', () => {
  let ctx: TestContext;
  const stamp = Date.now();
  const importIds: string[] = [];
  const employeeIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    const org = TEST_FIXTURES.organizationId;
    for (const id of employeeIds) {
      await ctx.client.query('DELETE FROM employee_history WHERE organization_id = $1 AND employee_id = $2', [org, id]);
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [org, id]);
    }
    for (const id of importIds) {
      await ctx.client.query('DELETE FROM employee_imports WHERE organization_id = $1 AND id = $2', [org, id]);
    }
    await ctx.client.close();
  });

  it('imports the valid rows, reports the failing one, and lists the import as recent', async () => {
    const result = await ctx.call<{
      import: { id: string; status: string; imported_count: number; failed_count: number; skipped_count: number; total_rows: number };
      imported: Array<{ row: number; employeeId: string }>;
      failed: Array<{ row: number; message: string }>;
      invitesSent: number;
    }>('import_employees', {
      branchId: TEST_FIXTURES.branchId,
      fileName: `import-test-${stamp}.csv`,
      skippedCount: 2,
      sendInvites: false,
      rows: [
        { row: 2, firstName: 'Import', lastName: `One ${stamp}`, email: `import.one.${stamp}@example.com`, phone: '+2348010000001', hireDate: '2025-05-12' },
        { row: 3, firstName: 'Import', lastName: `Two ${stamp}`, email: `import.two.${stamp}@example.com`, phone: '+2348010000002', hireDate: 'not-a-date' },
        { row: 4, firstName: 'Import', lastName: `Three ${stamp}`, departmentId: '00000000-0000-4000-8000-000000000000', hireDate: '2025-05-12' }
      ]
    });
    importIds.push(result.import.id);
    employeeIds.push(...result.imported.map((row) => row.employeeId));

    expect(result.imported.map((row) => row.row)).toEqual([2]);
    expect(result.failed.map((row) => row.row)).toEqual([3, 4]);
    expect(result.failed[1].message).toContain("Department doesn't exist");
    expect(result.invitesSent).toBe(0);
    expect(result.import).toMatchObject({ status: 'completed_with_errors', imported_count: 1, failed_count: 2, skipped_count: 2, total_rows: 5 });

    const recent = await ctx.call<Array<{ id: string; imported_by_name: string }>>('list_employee_imports', { branchId: TEST_FIXTURES.branchId });
    expect(recent[0].id).toBe(result.import.id);
    expect(recent.length).toBeLessThanOrEqual(5);
  });

  it('refuses an empty import', async () => {
    const empty = await ctx.callRaw('import_employees', { branchId: TEST_FIXTURES.branchId, fileName: 'empty.csv', rows: [] });
    expect(empty.success).toBe(false);
  });
});
