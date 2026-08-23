import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('departments integration', () => {
  let ctx: TestContext;
  const departmentIds: string[] = [];
  let throwawayEmployeeId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (throwawayEmployeeId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [
        TEST_FIXTURES.organizationId,
        throwawayEmployeeId
      ]);
    }
    if (departmentIds.length > 0) {
      await ctx.client.query('DELETE FROM departments WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        departmentIds
      ]);
    }
    await ctx.client.close();
  });

  it('creates, lists, updates, and archives a department', async () => {
    const department = await ctx.call<{ id: string; name: string }>('create_department', {
      branchId: TEST_FIXTURES.branchId,
      name: `Integration Test Dept ${Date.now()}`,
      description: 'Created by departments.integration.test.ts'
    });
    departmentIds.push(department.id);

    const fetched = await ctx.call<{ id: string; description: string | null }>('get_department', { departmentId: department.id });
    expect(fetched.id).toBe(department.id);
    expect(fetched.description).toBe('Created by departments.integration.test.ts');

    const list = await ctx.call<Array<{ id: string }>>('list_departments', { branchId: TEST_FIXTURES.branchId });
    expect(list.some((d) => d.id === department.id)).toBe(true);

    const updated = await ctx.call<{ name: string }>('update_department', {
      departmentId: department.id,
      name: `${department.name} (renamed)`
    });
    expect(updated.name).toBe(`${department.name} (renamed)`);

    const archived = await ctx.call<{ deleted_at: string | null }>('archive_department', { departmentId: department.id });
    expect(archived.deleted_at).not.toBeNull();
  });

  it('rejects a duplicate department name within the same branch', async () => {
    const name = `Dup Dept ${Date.now()}`;
    const first = await ctx.call<{ id: string }>('create_department', { branchId: TEST_FIXTURES.branchId, name });
    departmentIds.push(first.id);

    const dup = await ctx.callRaw('create_department', { branchId: TEST_FIXTURES.branchId, name });
    expect(dup.success).toBe(false);
  });

  it('assigns an employee to a department and enforces same-branch consistency via the DB trigger', async () => {
    const department = await ctx.call<{ id: string }>('create_department', {
      branchId: TEST_FIXTURES.branchId,
      name: `Assignment Dept ${Date.now()}`
    });
    departmentIds.push(department.id);

    const employee = await ctx.call<{ id: string; department_id: string | null }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: `DEPT-INT-${Date.now()}`,
      firstName: 'Department',
      lastName: 'Tester',
      email: 'undeify2026+shiftostest2@gmail.com',
      hireDate: '2026-01-01',
      departmentId: department.id
    });
    throwawayEmployeeId = employee.id;
    expect(employee.department_id).toBe(department.id);

    const count = await ctx.call<{ count: number }>('count_employees_in_department', { departmentId: department.id });
    expect(count.count).toBe(1);

    // A department in a different branch must be rejected by trg_employees_validate.
    const otherBranchRes = await ctx.client.query<{ id: string }>(
      'SELECT id FROM branches WHERE organization_id = $1 AND id != $2 AND deleted_at IS NULL LIMIT 1',
      [TEST_FIXTURES.organizationId, TEST_FIXTURES.branchId]
    );
    if (otherBranchRes[0]) {
      const otherBranchDept = await ctx.call<{ id: string }>('create_department', {
        branchId: otherBranchRes[0].id,
        name: `Cross Branch Dept ${Date.now()}`
      });
      departmentIds.push(otherBranchDept.id);

      const crossBranch = await ctx.callRaw('update_employee', { employeeId: employee.id, departmentId: otherBranchDept.id });
      expect(crossBranch.success).toBe(false);
    }
  });
});
