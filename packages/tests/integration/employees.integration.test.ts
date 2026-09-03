import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

/**
 * Regression test for Task 6 (docs/superpowers/specs/2026-09-03-onboarding-
 * ux-audit-design.md §2 Phase 10 -- "Employee creation cleanup") --
 * 057_generate_employee_number.sql's server-side, per-organization
 * EMP-#### generator (public.generate_next_employee_number +
 * trg_employees_generate_employee_number, a BEFORE INSERT trigger on
 * employees). Task 6's own report documents thorough one-off manual/live
 * verification of this at the time it shipped (both raw SQL and the full
 * create_employee RPC path), but nothing before this file asserted it as a
 * standing, committed regression test -- unlike Tasks 1-4, which each added
 * one for their core new server-side behavior. The logic here (per-org
 * sequencing that must skip past pre-existing non-4-digit values like the
 * fixture org's own 'EMP-002', a transaction-scoped advisory lock for
 * concurrent-insert safety, and NULL-vs-blank-vs-explicit trigger branching)
 * is at least as involved as those, so it gets the same standing coverage.
 *
 * Runs against the shared "ShiftOS Test Org" fixture (see testEnv.ts's own
 * comment on TEST_FIXTURES) via the real create_employee RPC -- not raw SQL
 * -- so this also exercises EmployeeService.createEmployee's now-optional
 * employeeNumber handling (packages/services/src/workforce/employeeService.ts)
 * end to end, the same path EmployeeFormPage.tsx's Add Employee form uses.
 * Every row created here is a disposable throwaway, deleted in afterAll;
 * the fixture org's own pre-existing employees ('EMP-0001', 'EMP-002') are
 * never touched.
 */
describe('employees integration -- server-generated employee_number (Task 6)', () => {
  let ctx: TestContext;
  const employeeIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (employeeIds.length > 0) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        employeeIds
      ]);
    }
    await ctx.client.close();
  });

  const EMP_NUMBER_PATTERN = /^EMP-(\d+)$/;

  it('assigns sequential, non-colliding EMP-#### numbers to two employees created with no employeeNumber, continuing past any pre-existing values', async () => {
    const first = await ctx.call<{ id: string; employee_number: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      firstName: 'AutoNumber',
      lastName: 'One',
      hireDate: '2026-01-01'
    });
    employeeIds.push(first.id);

    const second = await ctx.call<{ id: string; employee_number: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      firstName: 'AutoNumber',
      lastName: 'Two',
      hireDate: '2026-01-01'
    });
    employeeIds.push(second.id);

    const firstMatch = first.employee_number.match(EMP_NUMBER_PATTERN);
    const secondMatch = second.employee_number.match(EMP_NUMBER_PATTERN);
    expect(firstMatch).not.toBeNull();
    expect(secondMatch).not.toBeNull();

    // Sequential and distinct -- the second call must continue exactly one
    // past the first, not repeat or skip (no concurrent inserts for this
    // organization happen between these two awaited calls).
    expect(Number(secondMatch![1])).toBe(Number(firstMatch![1]) + 1);
    expect(second.employee_number).not.toBe(first.employee_number);

    // Never collides with the fixture org's own pre-existing employees,
    // including the non-4-digit-padded 'EMP-002' -- the generator reads its
    // numeric value (2) when computing the next number, so nothing newly
    // generated here can equal it or 'EMP-0001'.
    expect(['EMP-0001', 'EMP-002']).not.toContain(first.employee_number);
    expect(['EMP-0001', 'EMP-002']).not.toContain(second.employee_number);
  });

  it('keeps an explicit employeeNumber exactly as supplied -- the generator only fills in a NULL/blank value', async () => {
    const explicitNumber = `TASK6-EXPLICIT-${Date.now()}`;
    const created = await ctx.call<{ id: string; employee_number: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: explicitNumber,
      firstName: 'ExplicitNumber',
      lastName: 'Tester',
      hireDate: '2026-01-01'
    });
    employeeIds.push(created.id);

    expect(created.employee_number).toBe(explicitNumber);
  });

  it('rejects a duplicate explicit employeeNumber within the same organization', async () => {
    const explicitNumber = `TASK6-DUP-${Date.now()}`;
    const first = await ctx.call<{ id: string; employee_number: string }>('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: explicitNumber,
      firstName: 'DupNumber',
      lastName: 'One',
      hireDate: '2026-01-01'
    });
    employeeIds.push(first.id);

    const dup = await ctx.callRaw('create_employee', {
      branchId: TEST_FIXTURES.branchId,
      employeeNumber: explicitNumber,
      firstName: 'DupNumber',
      lastName: 'Two',
      hireDate: '2026-01-01'
    });
    expect(dup.success).toBe(false);
    expect(dup.error?.code).toBe('VALIDATION_ERROR');
  });
});
