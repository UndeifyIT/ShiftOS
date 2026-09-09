# Schedule Grid Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ShiftOS Schedules grid a faithful replica of the design handoff — split shifts, two-way drag-and-drop, the shift-drafts tray, the per-card "⋮" menu, week navigation, a Total Hours stat, and a real "Copy last week" — wired to the real backend.

**Architecture:** Backend adds one new "don't replace, just add" assignment path (`addShiftToEmployeeOnDate`) alongside the existing `assignShiftToEmployeeOnDate`, plus two small read/write helpers (`findAdjacentSchedule`, `duplicateScheduleShifts`). The frontend's `cellAssignments` map changes from one card per cell to an array, which is the prerequisite every other frontend task builds on (menu, modal, tray, drag-and-drop).

**Tech Stack:** TypeScript, React, `@tanstack/react-query`, Postgres (via `@shiftos/repositories`), Vitest, native HTML5 drag-and-drop (`draggable`, `onDragStart`/`onDragOver`/`onDrop`).

**Spec:** `docs/superpowers/specs/2026-09-09-schedule-grid-replica-design.md`

## Global Constraints

- No new tables, columns, or permission codes — every new RPC reuses an existing permission (`shifts.create`, `assignments.create`, `assignments.delete`, `schedules.read`, `schedules.create`).
- `updateAssignedShiftOnDate` / `removeAssignedShiftOnDate` / `getScheduleConflicts` are already correct for multi-card cells — do not modify them; only add new tests that exercise them against multi-card data.
- AI Schedule Assistant's quick actions, the "AI Assist" toolbar button, "Import Schedule", and "Use a template" all stay inert (`toast("Coming soon")` or equivalent) — explicitly out of scope this pass (spec §7).
- Mobile drag-and-drop is out of scope (spec §2) — no `draggable` attribute needs a mobile fallback.
- Every backend method follows `SchedulingService`'s existing style: permission check → fetch → branch-access check → validate → mutate.
- Every new RPC is registered in both `packages/api/src/operations/scheduling.ts`'s exported array and consumed automatically by `packages/api/src/registry.ts` (which already imports `* as schedulingOperations`-style from that file — verify the exact import in Task 1 and follow it, don't guess).

---

### Task 1: Backend — `addShiftToEmployeeOnDate` (split shifts, no replace)

**Files:**
- Modify: `packages/services/src/scheduling/schedulingService.ts` (add a private shared helper + a new public method, near `assignShiftToEmployeeOnDate` at line ~501)
- Modify: `packages/api/src/operations/scheduling.ts` (add RPC definition near `assignShiftToEmployeeOnDate` at line ~154, and add to the exported operations array)
- Modify: `packages/api/src/registry.ts` (register the new RPC — check how `assignShiftToEmployeeOnDate` is already registered and mirror it exactly)
- Test: `packages/tests/integration/scheduleGridAssignment.integration.test.ts`

**Interfaces:**
- Consumes: nothing new — reuses `AssignShiftToEmployeeInput` (already defined at `schedulingService.ts:57-64`), `ShiftRepository`, `ShiftAssignmentRepository`, `computeDuration`, `isDateWithinRange` (all already imported in that file).
- Produces: `SchedulingService.addShiftToEmployeeOnDate(scheduleId: string, employeeId: string, date: string, input: AssignShiftToEmployeeInput): Promise<{ shift: Shift; assignment: ShiftAssignment }>`, RPC `add_shift_to_employee_on_date`. Later tasks (6, 7, 9) call this RPC by name for: "Duplicate" menu action, "add another time block" in the modal, and dropping a tray card onto an already-filled cell.

- [ ] **Step 1: Write the failing test**

Add to `packages/tests/integration/scheduleGridAssignment.integration.test.ts`, inside the existing `describe` block, after the last `it`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/tests/integration/scheduleGridAssignment.integration.test.ts`
Expected: FAIL — `add_shift_to_employee_on_date` is not a registered RPC (error like "Unknown operation" or similar from `RpcRegistry`).

- [ ] **Step 3: Extract the shared insert logic in `schedulingService.ts`**

In `packages/services/src/scheduling/schedulingService.ts`, replace the existing `assignShiftToEmployeeOnDate` method (currently lines ~501-579) with this — it factors the "validate, resolve template, compute duration, insert shift+assignment in a transaction" logic into a private helper both the existing method and the new one call:

```typescript
  async assignShiftToEmployeeOnDate(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput
  ): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    return this.insertShiftAssignment(scheduleId, employeeId, date, input, { replaceExisting: true });
  }

  /**
   * Adds another shift to a cell without touching whatever's already there —
   * split shifts (spec §3.1). Shares every validation/insert step with
   * assignShiftToEmployeeOnDate via insertShiftAssignment; the two methods
   * differ only in replaceExisting.
   */
  async addShiftToEmployeeOnDate(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput
  ): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    return this.insertShiftAssignment(scheduleId, employeeId, date, input, { replaceExisting: false });
  }

  /**
   * Shared body for assignShiftToEmployeeOnDate (replaceExisting: true) and
   * addShiftToEmployeeOnDate (replaceExisting: false, split shifts — spec
   * §3.1). Wraps validation + the replace-then-insert or plain-insert in one
   * transaction so the modal's single button can't leave a half-created
   * shift with no assignment on a partial failure.
   */
  private async insertShiftAssignment(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput,
    options: { replaceExisting: boolean }
  ): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('shifts.create');
    await this.context.requirePermission('assignments.create');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }
    if (!isDateWithinRange(date, schedule.start_date, schedule.end_date)) {
      throw new ValidationError('date must fall within the schedule period', [
        `date must be between ${schedule.start_date} and ${schedule.end_date}`
      ]);
    }
    await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);

    let templateId: string | null = null;
    let startTime = input.startTime;
    let endTime = input.endTime;
    let crossesMidnight = input.crossesMidnight ?? false;
    let title = 'Shift';

    if (input.templateId) {
      const template = await this.templates.getByIdOrThrow(this.context.organizationId, input.templateId);
      templateId = template.id;
      startTime = template.start_time.slice(0, 5);
      endTime = template.end_time.slice(0, 5);
      crossesMidnight = template.crosses_midnight;
      title = template.name;
    }
    assertNonEmptyString(startTime, 'startTime');
    assertNonEmptyString(endTime, 'endTime');

    const duration = computeDuration(startTime, endTime, crossesMidnight);

    return this.context.client.transaction(async (trxClient) => {
      const shiftsRepo = new ShiftRepository(trxClient);
      const assignmentsRepo = new ShiftAssignmentRepository(trxClient);

      if (options.replaceExisting) {
        await this.replaceActiveAssignmentOnDate(shiftsRepo, assignmentsRepo, schedule, employeeId, date);
      }

      const shift = await shiftsRepo.insert(this.context.organizationId, {
        branch_id: schedule.branch_id,
        template_id: templateId,
        title,
        description: null,
        shift_date: date,
        start_time: startTime,
        end_time: endTime,
        duration,
        crosses_midnight: crossesMidnight,
        break_minutes: input.breakMinutes ?? 0,
        status: 'draft'
      } as Partial<Shift>);

      const assignment = await assignmentsRepo.insert(this.context.organizationId, {
        shift_id: shift.id,
        employee_id: employeeId,
        assignment_status: 'assigned',
        assigned_by: this.context.userId,
        notes: input.notes ?? null
      } as Partial<ShiftAssignment>);

      return { shift, assignment };
    });
  }
```

Leave `replaceActiveAssignmentOnDate` (the private method right after) completely unchanged.

- [ ] **Step 4: Register the RPC**

In `packages/api/src/operations/scheduling.ts`, add right after the existing `assignShiftToEmployeeOnDate` RPC definition (~line 169):

```typescript
export const addShiftToEmployeeOnDate = defineRpc('add_shift_to_employee_on_date', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).addShiftToEmployeeOnDate(
    requiredStringField(input, 'scheduleId'),
    requiredStringField(input, 'employeeId'),
    requiredStringField(input, 'date'),
    {
      templateId: stringField(input, 'templateId') ?? null,
      startTime: stringField(input, 'startTime'),
      endTime: stringField(input, 'endTime'),
      crossesMidnight: booleanField(input, 'crossesMidnight'),
      breakMinutes: numberField(input, 'breakMinutes'),
      notes: stringField(input, 'notes') ?? null
    }
  );
});
```

Then add `addShiftToEmployeeOnDate` to the exported operations array at the bottom of the same file (the array currently reads `assignShiftToEmployeeOnDate, updateAssignedShiftOnDate, removeAssignedShiftOnDate, listAssignmentsForSchedule, getScheduleConflicts` — insert `addShiftToEmployeeOnDate` right after `assignShiftToEmployeeOnDate`).

Open `packages/api/src/registry.ts`, find exactly how `assignShiftToEmployeeOnDate` reaches `registry.register(...)` (it's imported from the array or individually — read the file before assuming), and register `addShiftToEmployeeOnDate` the same way.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run packages/tests/integration/scheduleGridAssignment.integration.test.ts`
Expected: PASS, all 4 tests in the file (3 existing + 1 new).

- [ ] **Step 6: Run the full existing scheduling test suite to confirm no regression**

Run: `pnpm exec vitest run packages/tests/integration/scheduleGridAssignment.integration.test.ts packages/tests/integration/scheduleConflicts.integration.test.ts packages/tests/integration/scheduleRoster.integration.test.ts packages/tests/integration/scheduleAssignmentsBulk.integration.test.ts`
Expected: PASS, all tests across all 4 files.

- [ ] **Step 7: Commit**

```bash
git add packages/services/src/scheduling/schedulingService.ts packages/api/src/operations/scheduling.ts packages/api/src/registry.ts packages/tests/integration/scheduleGridAssignment.integration.test.ts
git commit -m "feat(scheduling): add addShiftToEmployeeOnDate for split shifts"
```

---

### Task 2: Backend — `findAdjacentSchedule` (week navigation)

**Files:**
- Modify: `packages/repositories/src/scheduling/scheduleRepository.ts` (add `findAdjacent` method)
- Modify: `packages/services/src/scheduling/schedulingService.ts` (add `findAdjacentSchedule` method)
- Modify: `packages/api/src/operations/scheduling.ts` (add RPC + export array entry)
- Modify: `packages/api/src/registry.ts` (register)
- Test: new file `packages/tests/integration/scheduleAdjacent.integration.test.ts`

**Interfaces:**
- Consumes: `ScheduleRepository` (already imported in `schedulingService.ts`), `assertOneOf` (already imported from `../validation.js`).
- Produces: `ScheduleRepository.findAdjacent(organizationId: string, branchId: string, currentStartDate: string, direction: 'prev' | 'next'): Promise<Schedule | null>`; `SchedulingService.findAdjacentSchedule(scheduleId: string, direction: 'prev' | 'next'): Promise<Schedule | null>`; RPC `find_adjacent_schedule`. Task 10 (week navigator UI) calls this RPC by name.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/integration/scheduleAdjacent.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('find adjacent schedule integration', () => {
  let ctx: TestContext;
  const scheduleIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (scheduleIds.length > 0) {
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        scheduleIds
      ]);
    }
    await ctx.client.close();
  });

  it('finds the next and previous schedule by start date, and returns null past the ends', async () => {
    const earlier = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Adjacent test — earlier week',
      startDate: '2027-12-06',
      endDate: '2027-12-12'
    });
    scheduleIds.push(earlier.id);

    const middle = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Adjacent test — middle week',
      startDate: '2027-12-13',
      endDate: '2027-12-19'
    });
    scheduleIds.push(middle.id);

    const later = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Adjacent test — later week',
      startDate: '2027-12-20',
      endDate: '2027-12-26'
    });
    scheduleIds.push(later.id);

    const next = await ctx.call<{ id: string } | null>('find_adjacent_schedule', { scheduleId: middle.id, direction: 'next' });
    expect(next?.id).toBe(later.id);

    const prev = await ctx.call<{ id: string } | null>('find_adjacent_schedule', { scheduleId: middle.id, direction: 'prev' });
    expect(prev?.id).toBe(earlier.id);

    const pastTheEnd = await ctx.call<{ id: string } | null>('find_adjacent_schedule', { scheduleId: later.id, direction: 'next' });
    expect(pastTheEnd).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/tests/integration/scheduleAdjacent.integration.test.ts`
Expected: FAIL — `find_adjacent_schedule` is not a registered RPC.

- [ ] **Step 3: Add the repository method**

In `packages/repositories/src/scheduling/scheduleRepository.ts`, add after `findCoveringDate` (currently ending ~line 38):

```typescript
  /** The schedule for the same branch whose start_date is the closest one before ('prev') or after ('next') currentStartDate, or null if none exists. Powers the grid's week-navigator arrows (spec §3.2). */
  async findAdjacent(organizationId: string, branchId: string, currentStartDate: string, direction: 'prev' | 'next'): Promise<Schedule | null> {
    const comparison = direction === 'next' ? '>' : '<';
    const order = direction === 'next' ? 'ASC' : 'DESC';
    const rows = await this.client.query<Schedule>(
      `SELECT * FROM schedules
        WHERE organization_id = $1 AND branch_id = $2 AND deleted_at IS NULL
          AND start_date ${comparison} $3
        ORDER BY start_date ${order}
        LIMIT 1`,
      [organizationId, branchId, currentStartDate]
    );
    return rows[0] ?? null;
  }
```

- [ ] **Step 4: Add the service method**

In `packages/services/src/scheduling/schedulingService.ts`, add near `findCoveringDate`'s other call sites (e.g. right after `getScheduleConflicts`, which currently ends the class):

```typescript
  /** Powers the grid's ‹ › week-navigator (spec §3.2) — never auto-creates a schedule for an empty adjacent week, just reports there isn't one. */
  async findAdjacentSchedule(scheduleId: string, direction: 'prev' | 'next'): Promise<Schedule | null> {
    assertUuid(scheduleId, 'scheduleId');
    assertOneOf(direction, ['prev', 'next'], 'direction');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    return this.schedules.findAdjacent(this.context.organizationId, schedule.branch_id, schedule.start_date, direction);
  }
```

- [ ] **Step 5: Register the RPC**

In `packages/api/src/operations/scheduling.ts`, add:

```typescript
export const findAdjacentSchedule = defineRpc('find_adjacent_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const direction = requiredStringField(input, 'direction');
  if (direction !== 'prev' && direction !== 'next') {
    throw new ValidationError('direction must be "prev" or "next"');
  }
  return new SchedulingService(context).findAdjacentSchedule(requiredStringField(input, 'scheduleId'), direction);
});
```

Check the top of the file for how `ValidationError` is imported (it's used elsewhere in `schedulingService.ts` from `@shiftos/errors` — confirm whether `scheduling.ts` operations file already imports it or needs a new import line) and add `findAdjacentSchedule` to the exported operations array. Register it in `packages/api/src/registry.ts` the same way as Task 1's RPC.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run packages/tests/integration/scheduleAdjacent.integration.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/repositories/src/scheduling/scheduleRepository.ts packages/services/src/scheduling/schedulingService.ts packages/api/src/operations/scheduling.ts packages/api/src/registry.ts packages/tests/integration/scheduleAdjacent.integration.test.ts
git commit -m "feat(scheduling): add findAdjacentSchedule for week navigation"
```

---

### Task 3: Backend — `duplicateScheduleShifts` ("Copy last week")

**Files:**
- Modify: `packages/services/src/scheduling/schedulingService.ts` (add `duplicateScheduleShifts`)
- Modify: `packages/api/src/operations/scheduling.ts` (add RPC + export array entry)
- Modify: `packages/api/src/registry.ts` (register)
- Test: new file `packages/tests/integration/scheduleDuplicate.integration.test.ts`

**Interfaces:**
- Consumes: `this.shifts.findByBranchAndDateRange`, `this.assignments.listForShifts` (both already used elsewhere in the file), the transaction pattern from Task 1.
- Produces: `SchedulingService.duplicateScheduleShifts(sourceScheduleId: string, targetScheduleId: string): Promise<{ copiedCount: number }>`; RPC `duplicate_schedule_shifts`. Task 11 (Copy last week UI) calls this RPC by name after creating the target schedule via the existing `create_schedule`.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/integration/scheduleDuplicate.integration.test.ts`:

```typescript
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
      startDate: '2028-01-17',
      endDate: '2028-01-23'
    });
    const emptyTarget = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Duplicate test — empty target',
      startDate: '2028-01-24',
      endDate: '2028-01-30'
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/tests/integration/scheduleDuplicate.integration.test.ts`
Expected: FAIL — `duplicate_schedule_shifts` is not a registered RPC.

- [ ] **Step 3: Implement the service method**

In `packages/services/src/scheduling/schedulingService.ts`, add after `findAdjacentSchedule` (Task 2):

```typescript
  /**
   * "Copy last week" (spec §3.3): for every active assignment in the source
   * schedule's date range, creates an equivalent shift+assignment in the
   * target schedule at the same day-of-week offset. Notes are deliberately
   * not copied — a fresh week shouldn't inherit last week's handover notes.
   * One transaction: a partial failure must not leave a half-copied week.
   */
  async duplicateScheduleShifts(sourceScheduleId: string, targetScheduleId: string): Promise<{ copiedCount: number }> {
    assertUuid(sourceScheduleId, 'sourceScheduleId');
    assertUuid(targetScheduleId, 'targetScheduleId');
    await this.context.requirePermission('shifts.create');
    await this.context.requirePermission('assignments.create');

    const source = await this.schedules.getByIdOrThrow(this.context.organizationId, sourceScheduleId);
    const target = await this.schedules.getByIdOrThrow(this.context.organizationId, targetScheduleId);
    this.context.requireBranchAccess(source.branch_id);
    this.context.requireBranchAccess(target.branch_id);
    if (target.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }

    const sourceShifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      source.branch_id,
      source.start_date,
      source.end_date
    );
    if (sourceShifts.length === 0) {
      return { copiedCount: 0 };
    }

    const sourceAssignments = await this.assignments.listForShifts(this.context.organizationId, sourceShifts.map((s) => s.id));
    const shiftsById = new Map(sourceShifts.map((s) => [s.id, s]));
    const activeAssignments = sourceAssignments.filter(
      (a) => a.assignment_status !== 'cancelled' && a.assignment_status !== 'declined'
    );

    const sourceStart = new Date(`${source.start_date}T00:00:00Z`);
    const targetStart = new Date(`${target.start_date}T00:00:00Z`);

    return this.context.client.transaction(async (trxClient) => {
      const shiftsRepo = new ShiftRepository(trxClient);
      const assignmentsRepo = new ShiftAssignmentRepository(trxClient);
      let copiedCount = 0;

      for (const assignment of activeAssignments) {
        const sourceShift = shiftsById.get(assignment.shift_id);
        if (!sourceShift) continue;

        const sourceDate = new Date(`${sourceShift.shift_date}T00:00:00Z`);
        const dayOffset = Math.round((sourceDate.getTime() - sourceStart.getTime()) / (24 * 60 * 60 * 1000));
        const targetDate = new Date(targetStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const targetDateString = targetDate.toISOString().slice(0, 10);

        const newShift = await shiftsRepo.insert(this.context.organizationId, {
          branch_id: target.branch_id,
          template_id: sourceShift.template_id,
          title: sourceShift.title,
          description: null,
          shift_date: targetDateString,
          start_time: sourceShift.start_time,
          end_time: sourceShift.end_time,
          duration: sourceShift.duration,
          crosses_midnight: sourceShift.crosses_midnight,
          break_minutes: sourceShift.break_minutes,
          status: 'draft'
        } as Partial<Shift>);

        await assignmentsRepo.insert(this.context.organizationId, {
          shift_id: newShift.id,
          employee_id: assignment.employee_id,
          assignment_status: 'assigned',
          assigned_by: this.context.userId,
          notes: null
        } as Partial<ShiftAssignment>);

        copiedCount += 1;
      }

      return { copiedCount };
    });
  }
```

- [ ] **Step 4: Register the RPC**

In `packages/api/src/operations/scheduling.ts`:

```typescript
export const duplicateScheduleShifts = defineRpc('duplicate_schedule_shifts', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).duplicateScheduleShifts(
    requiredStringField(input, 'sourceScheduleId'),
    requiredStringField(input, 'targetScheduleId')
  );
});
```

Add to the exported operations array and register in `packages/api/src/registry.ts`, same pattern as Tasks 1 and 2.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run packages/tests/integration/scheduleDuplicate.integration.test.ts`
Expected: PASS, both tests.

- [ ] **Step 6: Commit**

```bash
git add packages/services/src/scheduling/schedulingService.ts packages/api/src/operations/scheduling.ts packages/api/src/registry.ts packages/tests/integration/scheduleDuplicate.integration.test.ts
git commit -m "feat(scheduling): add duplicateScheduleShifts for Copy last week"
```

---

### Task 4: Frontend — Total Hours stat + duration formatter

**Files:**
- Modify: `apps/web/src/pages/scheduling/grid/hours.ts` (add a duration-formatting helper and a total-hours aggregator)
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleSummaryBar.tsx` (add the 6th stat tile)
- Test: none required (pure function + presentational change) — verify with `tsc --noEmit` and a manual check in Step 3.

**Interfaces:**
- Consumes: `EmployeeHoursSummary[]` (existing type from `hours.ts`), `StatCard` from `@shiftos/ui` (already used in `ScheduleSummaryBar.tsx`).
- Produces: `formatHoursDuration(totalHours: number): string` (e.g. `142.5` → `"142h 30m"`), exported from `hours.ts`. No other task depends on this — it's a leaf.

- [ ] **Step 1: Add the formatter to `hours.ts`**

In `apps/web/src/pages/scheduling/grid/hours.ts`, add after `computeHoursSummary`:

```typescript
/** "142h 30m" style, matching the handoff's stats-bar format (durText). 0 minutes renders as just "0h". */
export function formatHoursDuration(totalHours: number): string {
  const totalMinutes = Math.round(totalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
```

- [ ] **Step 2: Wire it into `ScheduleSummaryBar.tsx`**

In `apps/web/src/pages/scheduling/grid/ScheduleSummaryBar.tsx`:

Change the import line:
```typescript
import { computeHoursSummary, formatHoursDuration } from './hours.js';
```

Change the icon import line to add `Clock`:
```typescript
import { Users, CalendarCheck, UserX, AlertTriangle, PieChart, Clock } from 'lucide-react';
```

After the `const summaryRows = ...` line, add:
```typescript
  const totalHours = summaryRows.reduce((sum, row) => sum + row.hours, 0);
```

In the stats row JSX, insert a new `StatCard` between the "Conflicts" one and the "Coverage" one (matching the handoff's tile order — On this schedule → Scheduled → Unscheduled → Conflicts → Total Hours → Coverage):

```tsx
        <StatCard label="Total Hours" value={formatHoursDuration(totalHours)} icon={Clock} className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
```

(placed immediately before the existing `<StatCard label="Coverage" ...>` line).

- [ ] **Step 3: Verify with a type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/hours.ts apps/web/src/pages/scheduling/grid/ScheduleSummaryBar.tsx
git commit -m "feat(schedule-grid): add Total Hours stat tile"
```

---

### Task 5: Frontend — multi-card cells (`cellAssignments` becomes an array)

This is the foundational data-shape change every remaining frontend task depends on. It changes `ScheduleGrid.tsx`'s `cellAssignments` map from one `{assignment, shift}` value per cell to an array, and `ShiftCell.tsx` from single `shift`/`assignment` props to a `cards` array. The "⋮" menu (Task 6) is deliberately NOT built here — this task only makes multi-card rendering correct; Task 6 adds the menu on top of it.

**Files:**
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx`
- Modify: `apps/web/src/pages/scheduling/grid/ShiftCell.tsx`
- Test: none required (presentational/data-shape refactor with no new business logic) — verified via `tsc --noEmit` and the existing integration tests (unaffected, backend-only) staying green.

**Interfaces:**
- Consumes: `ShiftAssignment`, `Shift` (existing types).
- Produces: `ShiftCellProps.cards: Array<{ shift: Shift; assignment: ShiftAssignment }>` (replaces `shift`/`assignment` singular props) and `ShiftCellProps.onCardClick: (card: { shift: Shift; assignment: ShiftAssignment }) => void` (replaces the old single `onClick`), plus `ShiftCellProps.onAddClick: () => void` (opens the assign-shift modal for an empty cell, or the "+" affordance on a non-empty cell per the handoff's `c.showPlus`/plus-button distinction — see Step 2). Task 6 (menu), Task 7 (modal), Task 9 (drag-and-drop) all render/consume `cards` this way.

- [ ] **Step 1: Change `ScheduleGrid.tsx`'s `cellAssignments` to hold arrays**

In `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx`, replace the `cellAssignments` `useMemo` block:

```typescript
  const cellAssignments = useMemo(() => {
    const map = new Map<string, Array<{ assignment: ShiftAssignment; shift: Shift }>>();
    for (const assignment of assignments ?? []) {
      if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
      const shift = shiftsById.get(assignment.shift_id);
      if (!shift) continue;
      const key = activeCellKey(assignment.employee_id, shift.shift_date);
      const list = map.get(key) ?? [];
      list.push({ assignment, shift });
      map.set(key, list);
    }
    return map;
  }, [assignments, shiftsById]);
```

Replace the cell-rendering loop's use of `cellAssignments.get(...)` (currently `const cell = cellAssignments.get(activeCellKey(employee.id, day));` and the `ShiftCell` it feeds) with:

```tsx
                  {days.map((day) => {
                    const cards = cellAssignments.get(activeCellKey(employee.id, day)) ?? [];
                    const cellConflicts = conflictsByCell.get(activeCellKey(employee.id, day)) ?? [];
                    return (
                      <ShiftCell
                        key={day}
                        cards={cards}
                        hasConflict={cellConflicts.length > 0}
                        canEdit={canEdit}
                        onCardClick={(card) => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: card.assignment.id })}
                        onAddClick={() => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: null })}
                      />
                    );
                  })}
```

Update the `activeCell` state's type and every place it's constructed/read. Change:

```typescript
  const [activeCell, setActiveCell] = useState<{ employeeId: string; date: string } | null>(null);
```

to:

```typescript
  const [activeCell, setActiveCell] = useState<{ employeeId: string; date: string; editingAssignmentId: string | null } | null>(null);
```

Update the `ScheduleConflictsPanel`'s `onSelectConflict` callback (which also constructs an `activeCell`) to include the new field — since clicking a conflict row should open the modal for editing (there's always an existing assignment in a conflict), find the matching card:

```tsx
            onSelectConflict={
              canEdit
                ? (conflict) => {
                    const cards = cellAssignments.get(activeCellKey(conflict.employeeId, conflict.date)) ?? [];
                    setActiveCell({ employeeId: conflict.employeeId, date: conflict.date, editingAssignmentId: cards[0]?.assignment.id ?? null });
                  }
                : undefined
            }
```

Update the `AssignShiftModal` mount at the bottom of the file — it currently passes `existing={cellAssignments.get(...) ?? null}` (a single object). Replace with:

```tsx
      {activeCell ? (
        <AssignShiftModal
          open={Boolean(activeCell)}
          onClose={() => setActiveCell(null)}
          scheduleId={scheduleId}
          branchId={schedule.branch_id}
          employeeId={activeCell.employeeId}
          employeeName={activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : ''}
          date={activeCell.date}
          existing={
            activeCell.editingAssignmentId
              ? (cellAssignments.get(activeCellKey(activeCell.employeeId, activeCell.date)) ?? []).find(
                  (c) => c.assignment.id === activeCell.editingAssignmentId
                ) ?? null
              : null
          }
        />
      ) : null}
```

- [ ] **Step 2: Rewrite `ShiftCell.tsx` to render a card array**

Replace the full contents of `apps/web/src/pages/scheduling/grid/ShiftCell.tsx`:

```tsx
import React from 'react';
import type { Shift, ShiftAssignment } from '../../../types/domain.js';

export interface ShiftCellCard {
  shift: Shift;
  assignment: ShiftAssignment;
}

export interface ShiftCellProps {
  cards: ShiftCellCard[];
  hasConflict: boolean;
  canEdit: boolean;
  onCardClick: (card: ShiftCellCard) => void;
  onAddClick: () => void;
}

/** One employee/day cell in the weekly grid — holds zero or more shift cards (split shifts, spec §3.1). Empty renders "OFF"; canEdit shows a "+" affordance to add the first (or another) card. */
export function ShiftCell({ cards, hasConflict, canEdit, onCardClick, onAddClick }: ShiftCellProps): React.ReactElement {
  const isEmpty = cards.length === 0;

  return (
    <div
      className={[
        'relative flex min-h-[64px] flex-col gap-1 border-b border-r border-neutral-200 p-1.5',
        isEmpty ? 'bg-neutral-50' : 'bg-white'
      ].join(' ')}
    >
      {isEmpty ? (
        <span className="flex flex-1 items-center justify-center text-xs font-medium text-neutral-400">OFF</span>
      ) : (
        cards.map((card) => (
          <button
            key={card.assignment.id}
            type="button"
            onClick={canEdit ? () => onCardClick(card) : undefined}
            disabled={!canEdit}
            className={[
              'flex flex-col items-start justify-center gap-0.5 rounded-lg border border-transparent bg-brand-50 p-1.5 text-left transition-colors',
              canEdit ? 'cursor-pointer hover:border-brand-200' : 'cursor-default'
            ].join(' ')}
          >
            <span className="text-xs font-semibold text-neutral-900">
              {card.shift.start_time.slice(0, 5)} – {card.shift.end_time.slice(0, 5)}
            </span>
            {card.assignment.notes ? <span className="truncate text-[10.5px] text-neutral-500">{card.assignment.notes}</span> : null}
          </button>
        ))
      )}
      {canEdit ? (
        <button
          type="button"
          onClick={onAddClick}
          aria-label={isEmpty ? 'Assign shift' : 'Add another shift'}
          className="flex h-6 w-full items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs font-bold text-neutral-400 hover:border-brand-400 hover:text-brand-600"
        >
          +
        </button>
      ) : null}
      {hasConflict ? (
        <span
          title="Scheduling conflict"
          className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white"
        >
          !
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean. If `AssignShiftModal.tsx`'s `existing` prop type doesn't yet match (it still expects `{shift, assignment} | null`, which it does — no change needed there since Task 5 only changes what's passed in, not the shape), this should already be clean; if not, fix any type mismatch surfaced before moving on (do not defer to Task 6/7).

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @shiftos/web build`
Expected: clean build. Then start the dev server (`pnpm dev:web`) and open an existing schedule with at least one assigned shift — confirm the cell still renders the time range and clicking it still opens the edit modal; confirm the "+" button appears at the bottom of every editable cell (both empty and filled).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx apps/web/src/pages/scheduling/grid/ShiftCell.tsx
git commit -m "refactor(schedule-grid): support multiple shift cards per cell"
```

---

### Task 6: Frontend — per-card "⋮" menu

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/ShiftCardMenu.tsx`
- Modify: `apps/web/src/pages/scheduling/grid/ShiftCell.tsx`
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx`
- Test: none required (UI-only) — verified via `tsc --noEmit` and manual check.

**Interfaces:**
- Consumes: `ShiftCellCard` (Task 5), `useRpcMutation` (existing), the `add_shift_to_employee_on_date` RPC (Task 1), `remove_assigned_shift_on_date` (existing).
- Produces: `ShiftCardMenu` component with props `{ card: ShiftCellCard; onEdit: () => void; onMoveToDrafts: (card: ShiftCellCard) => void; onDeleted: () => void }`. Task 9 (drag-and-drop) reuses the same `onMoveToDrafts` callback shape when a card is dragged onto the tray, so the tray-state-update logic lives in one place (`ScheduleGrid.tsx`) that both the menu and drag-and-drop call into.

- [ ] **Step 1: Create the menu component**

Create `apps/web/src/pages/scheduling/grid/ShiftCardMenu.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { useRpcMutation } from '../../../lib/useRpc.js';
import type { ShiftAssignment } from '../../../types/domain.js';
import type { ShiftCellCard } from './ShiftCell.js';

export interface ShiftCardMenuProps {
  card: ShiftCellCard;
  onEdit: () => void;
  onDuplicated: () => void;
  onMoveToDrafts: (card: ShiftCellCard) => void;
  onDeleted: () => void;
}

/** The "⋮" per-card menu (design handoff cardView's menuItem list): Edit shift, Duplicate, Move to drafts, Mark day off, Delete. */
export function ShiftCardMenu({ card, onEdit, onDuplicated, onMoveToDrafts, onDeleted }: ShiftCardMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const duplicateMutation = useRpcMutation<{ shift: unknown; assignment: ShiftAssignment }, Record<string, unknown>>(
    'add_shift_to_employee_on_date',
    {
      invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
      onSuccess: onDuplicated
    }
  );
  const removeMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'],
    onSuccess: onDeleted
  });

  const handleDuplicate = (): void => {
    setOpen(false);
    duplicateMutation.mutate({
      scheduleId: undefined, // filled by the caller via a bound closure — see Step 2's note
      employeeId: card.assignment.employee_id,
      date: card.shift.shift_date,
      startTime: card.shift.start_time.slice(0, 5),
      endTime: card.shift.end_time.slice(0, 5),
      crossesMidnight: card.shift.crosses_midnight,
      breakMinutes: card.shift.break_minutes,
      notes: card.assignment.notes
    });
  };

  const item = (label: string, onClick: () => void, danger = false): React.ReactElement => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={['block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-neutral-50', danger ? 'text-error-500' : 'text-neutral-800'].join(
        ' '
      )}
    >
      {label}
    </button>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Shift options"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        ⋮
      </button>
      {open ? (
        <div className="absolute right-0 top-5 z-30 flex w-36 flex-col gap-0.5 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {item('Edit shift', () => {
            setOpen(false);
            onEdit();
          })}
          {item('Duplicate', handleDuplicate)}
          {item('Move to drafts', () => {
            setOpen(false);
            onMoveToDrafts(card);
          })}
          {item('Delete', () => {
            setOpen(false);
            removeMutation.mutate({ assignmentId: card.assignment.id });
          }, true)}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Fix the Duplicate mutation's missing `scheduleId`**

The handoff's card data has no direct reference to its owning schedule, but the RPC needs one. Rather than threading `scheduleId` down as a prop (which would need updating every call site), change `ShiftCardMenu`'s props to accept it directly:

Update the props interface and function signature in `ShiftCardMenu.tsx`:

```typescript
export interface ShiftCardMenuProps {
  card: ShiftCellCard;
  scheduleId: string;
  onEdit: () => void;
  onDuplicated: () => void;
  onMoveToDrafts: (card: ShiftCellCard) => void;
  onDeleted: () => void;
}

export function ShiftCardMenu({ card, scheduleId, onEdit, onDuplicated, onMoveToDrafts, onDeleted }: ShiftCardMenuProps): React.ReactElement {
```

And in `handleDuplicate`, replace `scheduleId: undefined, // filled by the caller...` with `scheduleId,`.

- [ ] **Step 3: Wire the menu into `ShiftCell.tsx`**

In `apps/web/src/pages/scheduling/grid/ShiftCell.tsx`, add the import:

```typescript
import { ShiftCardMenu } from './ShiftCardMenu.js';
```

Add `scheduleId: string` and `onMoveToDrafts: (card: ShiftCellCard) => void` to `ShiftCellProps`. Change the card-rendering `button` to a wrapping `div` so the menu can sit alongside the clickable card body without being inside the `<button>` (a `<button>` cannot contain another interactive `<button>`):

```tsx
        cards.map((card) => (
          <div
            key={card.assignment.id}
            className="relative flex items-start gap-1 rounded-lg border border-transparent bg-brand-50 p-1.5 hover:border-brand-200"
          >
            <button
              type="button"
              onClick={canEdit ? () => onCardClick(card) : undefined}
              disabled={!canEdit}
              className={['flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 text-left', canEdit ? 'cursor-pointer' : 'cursor-default'].join(
                ' '
              )}
            >
              <span className="text-xs font-semibold text-neutral-900">
                {card.shift.start_time.slice(0, 5)} – {card.shift.end_time.slice(0, 5)}
              </span>
              {card.assignment.notes ? <span className="truncate text-[10.5px] text-neutral-500">{card.assignment.notes}</span> : null}
            </button>
            {canEdit ? (
              <ShiftCardMenu
                card={card}
                scheduleId={scheduleId}
                onEdit={() => onCardClick(card)}
                onDuplicated={() => undefined}
                onMoveToDrafts={onMoveToDrafts}
                onDeleted={() => undefined}
              />
            ) : null}
          </div>
        ))
```

(`onDuplicated`/`onDeleted` are no-ops here because `useRpcMutation`'s `invalidates` already refetches the grid's data — nothing extra to do on success. They exist as props so Task 9's drag-and-drop version, if it needs a hook, has one available.)

- [ ] **Step 4: Wire `scheduleId` and `onMoveToDrafts` through `ScheduleGrid.tsx`**

In `ScheduleGrid.tsx`, add tray state (used properly by Task 8, but declared here since `onMoveToDrafts` needs somewhere to put the card):

```typescript
  const [tray, setTray] = useState<Array<{ shift: Shift; assignment: ShiftAssignment }>>([]);
```

Add a handler:

```typescript
  const handleMoveToDrafts = (card: { shift: Shift; assignment: ShiftAssignment }): void => {
    setTray((prev) => [...prev, card]);
    removeAssignedShiftMutation.mutate({ assignmentId: card.assignment.id });
  };
```

Add the mutation it uses, near the existing `addEmployeeMutation`/`removeEmployeeMutation`:

```typescript
  const removeAssignedShiftMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule']
  });
```

Pass both new props to `ShiftCell` in the render loop:

```tsx
                      <ShiftCell
                        key={day}
                        cards={cards}
                        scheduleId={scheduleId}
                        hasConflict={cellConflicts.length > 0}
                        canEdit={canEdit}
                        onCardClick={(card) => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: card.assignment.id })}
                        onAddClick={() => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: null })}
                        onMoveToDrafts={handleMoveToDrafts}
                      />
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Manual verification**

Run: `pnpm --filter @shiftos/web build`, then `pnpm dev:web`. Open a schedule with an assigned shift, click the "⋮" on its card, confirm all 4 items render (Edit shift, Duplicate, Move to drafts, Delete), and that clicking outside the menu closes it. Confirm "Duplicate" adds a second card to the same cell. Confirm "Delete" removes the card. ("Move to drafts" removing it from the grid is enough to verify here — the tray UI itself doesn't exist until Task 8, so there's nowhere to see it land yet; that's expected.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ShiftCardMenu.tsx apps/web/src/pages/scheduling/grid/ShiftCell.tsx apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx
git commit -m "feat(schedule-grid): add per-card menu (edit/duplicate/move to drafts/delete)"
```

---

### Task 7: Frontend — "Mark day off" + AssignShiftModal "add another time block"

**Files:**
- Modify: `apps/web/src/pages/scheduling/grid/ShiftCardMenu.tsx` (add "Mark day off")
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx` (pass the cell's full card list to the menu so "Mark day off" can clear all of them)
- Modify: `apps/web/src/pages/scheduling/grid/AssignShiftModal.tsx` (add another time block)
- Test: none required (UI-only) — verified via `tsc --noEmit` and manual check.

**Interfaces:**
- Consumes: `ShiftCellCard[]` (a cell's full card list, not just one card), `add_shift_to_employee_on_date` RPC (Task 1).
- Produces: nothing new consumed by later tasks — this is a leaf task.

- [ ] **Step 1: Add "Mark day off" to the menu**

Per spec §4.2, "Mark day off" clears every card in the cell (there's no new stored OFF flag — an empty cell already renders "OFF"). Change `ShiftCardMenuProps` in `ShiftCardMenu.tsx` to take the full cell list instead of relying on `card` alone for this one action:

```typescript
export interface ShiftCardMenuProps {
  card: ShiftCellCard;
  cellCards: ShiftCellCard[];
  scheduleId: string;
  onEdit: () => void;
  onDuplicated: () => void;
  onMoveToDrafts: (card: ShiftCellCard) => void;
  onDeleted: () => void;
}
```

Update the function signature to destructure `cellCards`, add a second mutation instance for the "mark day off" bulk-remove (reusing `remove_assigned_shift_on_date`, called once per card):

```typescript
  const markOffMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule']
  });

  const handleMarkDayOff = (): void => {
    setOpen(false);
    cellCards.forEach((c) => markOffMutation.mutate({ assignmentId: c.assignment.id }));
  };
```

Add the menu item, right after "Move to drafts" and before "Delete":

```tsx
          {item('Mark day off', handleMarkDayOff)}
```

- [ ] **Step 2: Pass `cellCards` from `ShiftCell.tsx`**

In `ShiftCell.tsx`'s `ShiftCardMenu` usage (inside the `cards.map(...)` loop), add the prop:

```tsx
              <ShiftCardMenu
                card={card}
                cellCards={cards}
                scheduleId={scheduleId}
                onEdit={() => onCardClick(card)}
                onDuplicated={() => undefined}
                onMoveToDrafts={onMoveToDrafts}
                onDeleted={() => undefined}
              />
```

- [ ] **Step 3: Add "add another time block" to `AssignShiftModal.tsx`**

This lets a *new* assignment (not yet saved) include a second time block in one submit — matching the handoff's "Add another time block (split / double shift)" control. Replace the single `startTime`/`endTime`/`breakMinutes` state with a list of blocks, but only when creating (not editing — editing a single existing card stays a single-block edit, since "add another" for an already-saved cell is what the "+" button on the cell / menu's Duplicate already cover).

In `apps/web/src/pages/scheduling/grid/AssignShiftModal.tsx`, add new state right after the existing `breakMinutes` state:

```typescript
  const [extraBlocks, setExtraBlocks] = useState<Array<{ startTime: string; endTime: string; breakMinutes: number }>>([]);
```

Reset it in the existing `useEffect` (alongside the other resets in both branches):

```typescript
  useEffect(() => {
    if (existing) {
      setTemplateId(existing.shift.template_id ?? CUSTOM_VALUE);
      setStartTime(existing.shift.start_time.slice(0, 5));
      setEndTime(existing.shift.end_time.slice(0, 5));
      setBreakMinutes(existing.shift.break_minutes);
      setNotes(existing.assignment.notes ?? '');
    } else {
      setTemplateId(CUSTOM_VALUE);
      setStartTime('09:00');
      setEndTime('17:00');
      setBreakMinutes(0);
      setNotes('');
    }
    setExtraBlocks([]);
    setSaveAsTemplate(false);
    setTemplateName('');
    setError(null);
  }, [existing?.assignment.id ?? null, open]);
```

Add the mutation for the extra blocks, next to `assignMutation`:

```typescript
  const addBlockMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'add_shift_to_employee_on_date',
    { invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'] }
  );
```

In `handleSubmit`, after the existing `assignMutation.mutate({...})` call in the `else` branch (the "creating new" branch — leave the `if (existing)` branch untouched), add:

```typescript
      extraBlocks.forEach((block) => {
        addBlockMutation.mutate({
          scheduleId,
          employeeId,
          date,
          templateId: null,
          startTime: block.startTime,
          endTime: block.endTime,
          breakMinutes: block.breakMinutes,
          notes: null
        });
      });
```

Add the UI, right after the custom start/end time fields' closing `</div>` and before the "Break (minutes)" `FormField` — only shown when creating (`!existing`) and using a custom time (matching the handoff's control, which only makes sense alongside a manually-entered block):

```tsx
        {!existing && templateId === CUSTOM_VALUE ? (
          <>
            {extraBlocks.map((block, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <FormField label={`Block ${index + 2} start`} htmlFor={`extraStart${index}`}>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="time"
                      value={block.startTime}
                      onChange={(e) =>
                        setExtraBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, startTime: e.target.value } : b)))
                      }
                    />
                  )}
                </FormField>
                <FormField label={`Block ${index + 2} end`} htmlFor={`extraEnd${index}`}>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="time"
                      value={block.endTime}
                      onChange={(e) => setExtraBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, endTime: e.target.value } : b)))}
                    />
                  )}
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtraBlocks((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setExtraBlocks((prev) => [...prev, { startTime: '18:00', endTime: '22:00', breakMinutes: 0 }])}
              className="self-start"
            >
              + Add another time block (split / double shift)
            </Button>
          </>
        ) : null}
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Manual verification**

Run: `pnpm --filter @shiftos/web build`, then `pnpm dev:web`. Open an empty cell, add a custom time block, click "+ Add another time block", fill a second block, submit — confirm the cell shows two cards. Open a filled cell's "⋮" menu and click "Mark day off" — confirm every card in that cell disappears and it renders "OFF" again.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ShiftCardMenu.tsx apps/web/src/pages/scheduling/grid/ShiftCell.tsx apps/web/src/pages/scheduling/grid/AssignShiftModal.tsx
git commit -m "feat(schedule-grid): add Mark day off and multi-block shift creation"
```

---

### Task 8: Frontend — Shift Drafts Tray

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/ShiftDraftsTray.tsx`
- Create: `apps/web/src/pages/scheduling/grid/NewDraftModal.tsx`
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx`
- Test: none required (local-state-only UI, no backend calls until a draft is dropped — covered by Task 9's manual verification) — verified via `tsc --noEmit`.

**Interfaces:**
- Consumes: the `tray` state and `setTray` already added to `ScheduleGrid.tsx` in Task 6.
- Produces: `ShiftDraftsTray` component with props `{ drafts: TrayDraft[]; canEdit: boolean; onNewDraft: () => void; onEditDraft: (draft: TrayDraft) => void }`, and the `TrayDraft` type (`{ id: string; startTime: string; endTime: string; breakMinutes: number; note: string }`) exported from `ShiftDraftsTray.tsx`. Task 9 (drag-and-drop) adds `draggable`/`onDragStart` to the draft cards this task renders, and adds the drop target that removes a drafted card from `tray` when it's assigned to a cell.

- [ ] **Step 1: Define the draft type and create the tray component**

Create `apps/web/src/pages/scheduling/grid/ShiftDraftsTray.tsx`:

```tsx
import React from 'react';
import { Button } from '@shiftos/ui';

export interface TrayDraft {
  id: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  note: string;
}

export interface ShiftDraftsTrayProps {
  drafts: TrayDraft[];
  canEdit: boolean;
  onNewDraft: () => void;
  onEditDraft: (draft: TrayDraft) => void;
}

/** The bottom "Shift drafts" tray (design handoff line ~586-624) — drafts here aren't real shifts/assignments until dragged onto a grid cell (spec §4.4). */
export function ShiftDraftsTray({ drafts, canEdit, onNewDraft, onEditDraft }: ShiftDraftsTrayProps): React.ReactElement | null {
  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 p-3">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-400">Shift drafts</span>
      {drafts.length === 0 ? <span className="text-xs text-neutral-400">Drag a draft onto any cell to assign it.</span> : null}
      <div className="flex flex-wrap items-stretch gap-2">
        {drafts.map((draft) => (
          <button
            key={draft.id}
            type="button"
            draggable
            onClick={() => onEditDraft(draft)}
            className="flex min-w-[86px] flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-neutral-300 bg-white px-2.5 py-1.5 text-center hover:border-brand-400"
          >
            <span className="text-[10px] font-bold text-neutral-900">
              {draft.startTime} – {draft.endTime}
            </span>
          </button>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={onNewDraft}>
          + New shift
        </Button>
      </div>
    </div>
  );
}
```

(`draggable` is added here already since it costs nothing without a `dragStart` handler yet — Task 9 adds the handler. Not wiring it yet keeps this task's diff focused on the tray's own state and rendering.)

- [ ] **Step 2: Create the new-draft modal**

Create `apps/web/src/pages/scheduling/grid/NewDraftModal.tsx` — a lightweight modal that writes to tray state instead of calling any RPC:

```tsx
import React, { useState } from 'react';
import { Button, FormField, Input, Modal } from '@shiftos/ui';
import type { TrayDraft } from './ShiftDraftsTray.js';

export interface NewDraftModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (draft: TrayDraft) => void;
  editingDraft: TrayDraft | null;
}

/** Creates or edits one shift draft in the tray (spec §4.4) — no RPC call, just local tray state via onSave. */
export function NewDraftModal({ open, onClose, onSave, editingDraft }: NewDraftModalProps): React.ReactElement {
  const [startTime, setStartTime] = useState(editingDraft?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(editingDraft?.endTime ?? '17:00');
  const [breakMinutes, setBreakMinutes] = useState(editingDraft?.breakMinutes ?? 0);
  const [note, setNote] = useState(editingDraft?.note ?? '');

  return (
    <Modal open={open} onClose={onClose} title={editingDraft ? 'Edit shift draft' : 'New shift draft'} description="Drag this onto any cell once it's ready.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: editingDraft?.id ?? crypto.randomUUID(),
            startTime,
            endTime,
            breakMinutes,
            note: note.trim()
          });
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start time" htmlFor="draftStart" required>
            {(fieldProps) => <Input {...fieldProps} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
          </FormField>
          <FormField label="End time" htmlFor="draftEnd" required>
            {(fieldProps) => <Input {...fieldProps} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
          </FormField>
        </div>
        <FormField label="Break (minutes)" htmlFor="draftBreak">
          {(fieldProps) => <Input {...fieldProps} type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />}
        </FormField>
        <FormField label="Note (optional)" htmlFor="draftNote">
          {(fieldProps) => <Input {...fieldProps} value={note} onChange={(e) => setNote(e.target.value)} />}
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save draft</Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 3: Wire both into `ScheduleGrid.tsx`**

Change the `tray` state's type (currently `Array<{ shift: Shift; assignment: ShiftAssignment }>` from Task 6 — that was a placeholder shape for "move to drafts"; unify it with `TrayDraft` now):

```typescript
  const [tray, setTray] = useState<TrayDraft[]>([]);
  const [draftModal, setDraftModal] = useState<{ open: boolean; editing: TrayDraft | null }>({ open: false, editing: null });
```

Add the import:

```typescript
import { ShiftDraftsTray, type TrayDraft } from './ShiftDraftsTray.js';
import { NewDraftModal } from './NewDraftModal.js';
```

Update `handleMoveToDrafts` (from Task 6) to build a `TrayDraft` instead of the old shape:

```typescript
  const handleMoveToDrafts = (card: { shift: Shift; assignment: ShiftAssignment }): void => {
    setTray((prev) => [
      ...prev,
      {
        id: card.assignment.id,
        startTime: card.shift.start_time.slice(0, 5),
        endTime: card.shift.end_time.slice(0, 5),
        breakMinutes: card.shift.break_minutes,
        note: card.assignment.notes ?? ''
      }
    ]);
    removeAssignedShiftMutation.mutate({ assignmentId: card.assignment.id });
  };
```

Add the tray and modal to the JSX, right after the grid's closing `</div>` (the one wrapping the grid `+` "Add Employee" row) and before the `<aside>` — actually, per the handoff, the tray spans the full grid width below the employee rows, so place it inside the grid's bordered container, after the roster rows and the "+ Add Employee" row:

```tsx
            {canEdit ? (
              <div className="col-span-8 border-t border-neutral-200 p-3">
                <Button variant="secondary" size="sm" onClick={() => setAddEmployeeOpen(true)}>
                  + Add Employee
                </Button>
              </div>
            ) : null}
          </div>
          <ShiftDraftsTray
            drafts={tray}
            canEdit={canEdit}
            onNewDraft={() => setDraftModal({ open: true, editing: null })}
            onEditDraft={(draft) => setDraftModal({ open: true, editing: draft })}
          />
        </div>
```

(This closes the `<div className="grid" ...>` one line earlier than before and puts the tray inside the outer bordered card but below the grid — check the existing indentation in the file before applying so the JSX nesting stays valid; the outer `<div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border ...">` should now wrap both the grid and the tray.)

Add the modal mount near the other modal mounts at the bottom of the component:

```tsx
      <NewDraftModal
        open={draftModal.open}
        onClose={() => setDraftModal({ open: false, editing: null })}
        editingDraft={draftModal.editing}
        onSave={(draft) => {
          setTray((prev) => {
            const exists = prev.some((d) => d.id === draft.id);
            return exists ? prev.map((d) => (d.id === draft.id ? draft : d)) : [...prev, draft];
          });
          setDraftModal({ open: false, editing: null });
        }}
      />
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Manual verification**

Run: `pnpm --filter @shiftos/web build`, then `pnpm dev:web`. Open a schedule, click "+ New shift" in the tray, fill times, save — confirm a draft card appears in the tray. Click it again — confirm it opens pre-filled for editing. Use "⋮ → Move to drafts" on a real assigned card (from Task 6/7) — confirm it disappears from the grid and a new draft appears in the tray.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ShiftDraftsTray.tsx apps/web/src/pages/scheduling/grid/NewDraftModal.tsx apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx
git commit -m "feat(schedule-grid): add shift drafts tray"
```

---

### Task 9: Frontend — drag-and-drop (tray↔grid, cell↔cell)

This is the most involved frontend task — it wires every drag interaction listed in spec §5 on top of the multi-card cells (Task 5), the tray (Task 8), and the "add"/"remove" RPCs (Task 1, existing).

**Files:**
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx` (drag state + drop handlers)
- Modify: `apps/web/src/pages/scheduling/grid/ShiftCell.tsx` (draggable cards, drop target)
- Modify: `apps/web/src/pages/scheduling/grid/ShiftDraftsTray.tsx` (real `onDragStart`, drop target)
- Test: none required (drag-and-drop is not meaningfully unit-testable via jsdom's synthetic drag events; covered entirely by manual verification in Step 5) — verified via `tsc --noEmit`.

**Interfaces:**
- Consumes: `TrayDraft` (Task 8), `ShiftCellCard` (Task 5), `add_shift_to_employee_on_date` (Task 1), `assign_shift_to_employee_on_date` (existing), `remove_assigned_shift_on_date` (existing).
- Produces: nothing new consumed by later tasks — this is a leaf task.

- [ ] **Step 1: Add drag state to `ScheduleGrid.tsx`**

Add a discriminated-union drag-source type and state, near the other `useState` calls:

```typescript
type DragSource = { kind: 'tray'; draftId: string } | { kind: 'cell'; assignmentId: string; employeeId: string; date: string };
```

```typescript
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);
```

- [ ] **Step 2: Add the mutations drag-and-drop needs**

`assignShiftMutation`/`addShiftMutation` (for dropping onto empty vs. filled cells) and reuse `removeAssignedShiftMutation` (already added in Task 6). Add near it:

```typescript
  const assignShiftMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'assign_shift_to_employee_on_date',
    { invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'] }
  );
  const addShiftMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'add_shift_to_employee_on_date',
    { invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts', 'list_shifts_for_schedule'] }
  );
```

- [ ] **Step 3: Implement the drop handler**

Add this function in `ScheduleGrid.tsx`, above the `return`:

```typescript
  const handleDropOnCell = (employeeId: string, date: string): void => {
    setDragOverCellKey(null);
    if (!dragging) return;
    const targetCards = cellAssignments.get(activeCellKey(employeeId, date)) ?? [];
    const mutate = targetCards.length === 0 ? assignShiftMutation.mutate : addShiftMutation.mutate;

    if (dragging.kind === 'tray') {
      const draft = tray.find((d) => d.id === dragging.draftId);
      if (!draft) {
        setDragging(null);
        return;
      }
      mutate({
        scheduleId,
        employeeId,
        date,
        templateId: null,
        startTime: draft.startTime,
        endTime: draft.endTime,
        breakMinutes: draft.breakMinutes,
        notes: draft.note || null
      });
      setTray((prev) => prev.filter((d) => d.id !== draft.id));
    } else {
      // Moving an already-assigned card from one cell to another: remove
      // the source assignment, then assign/add on the destination. Two RPC
      // calls rather than one atomic "move" — matches the handoff's own
      // mock treating this as remove+add (spec §4.1).
      if (dragging.employeeId === employeeId && dragging.date === date) {
        setDragging(null);
        return; // dropped on its own cell — no-op
      }
      const sourceCards = cellAssignments.get(activeCellKey(dragging.employeeId, dragging.date)) ?? [];
      const sourceCard = sourceCards.find((c) => c.assignment.id === dragging.assignmentId);
      if (!sourceCard) {
        setDragging(null);
        return;
      }
      removeAssignedShiftMutation.mutate({ assignmentId: dragging.assignmentId });
      mutate({
        scheduleId,
        employeeId,
        date,
        templateId: sourceCard.shift.template_id,
        startTime: sourceCard.shift.start_time.slice(0, 5),
        endTime: sourceCard.shift.end_time.slice(0, 5),
        crossesMidnight: sourceCard.shift.crosses_midnight,
        breakMinutes: sourceCard.shift.break_minutes,
        notes: sourceCard.assignment.notes
      });
    }
    setDragging(null);
  };

  const handleDropOnTray = (): void => {
    if (!dragging || dragging.kind !== 'cell') {
      setDragging(null);
      return;
    }
    const sourceCards = cellAssignments.get(activeCellKey(dragging.employeeId, dragging.date)) ?? [];
    const sourceCard = sourceCards.find((c) => c.assignment.id === dragging.assignmentId);
    if (sourceCard) {
      handleMoveToDrafts(sourceCard);
    }
    setDragging(null);
  };
```

- [ ] **Step 4: Wire drop targets and draggable cards into `ShiftCell.tsx`**

Add these props to `ShiftCellProps`:

```typescript
  isDragOver: boolean;
  onDragStartCard: (card: ShiftCellCard) => void;
  onDragOverCell: () => void;
  onDragLeaveCell: () => void;
  onDropCell: () => void;
```

Update the destructured props in the function signature to include these, and change the outer `<div>` to a drop target:

```tsx
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCell();
      }}
      onDragLeave={onDragLeaveCell}
      onDrop={(e) => {
        e.preventDefault();
        onDropCell();
      }}
      className={[
        'relative flex min-h-[64px] flex-col gap-1 border-b border-r border-neutral-200 p-1.5',
        isEmpty ? 'bg-neutral-50' : 'bg-white',
        isDragOver ? 'bg-brand-50 ring-2 ring-inset ring-brand-400' : ''
      ].join(' ')}
    >
```

Add `draggable`/`onDragStart` to each card's wrapping `<div>` (from Task 6's Step 3):

```tsx
          <div
            key={card.assignment.id}
            draggable={canEdit}
            onDragStart={() => onDragStartCard(card)}
            className="relative flex items-start gap-1 rounded-lg border border-transparent bg-brand-50 p-1.5 hover:border-brand-200"
          >
```

- [ ] **Step 5: Pass the new props from `ScheduleGrid.tsx`, and wire the tray's drop target**

In the `ShiftCell` render call inside `ScheduleGrid.tsx`:

```tsx
                      <ShiftCell
                        key={day}
                        cards={cards}
                        scheduleId={scheduleId}
                        hasConflict={cellConflicts.length > 0}
                        canEdit={canEdit}
                        isDragOver={dragOverCellKey === activeCellKey(employee.id, day)}
                        onCardClick={(card) => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: card.assignment.id })}
                        onAddClick={() => setActiveCell({ employeeId: employee.id, date: day, editingAssignmentId: null })}
                        onMoveToDrafts={handleMoveToDrafts}
                        onDragStartCard={(card) => setDragging({ kind: 'cell', assignmentId: card.assignment.id, employeeId: employee.id, date: day })}
                        onDragOverCell={() => setDragOverCellKey(activeCellKey(employee.id, day))}
                        onDragLeaveCell={() => setDragOverCellKey((prev) => (prev === activeCellKey(employee.id, day) ? null : prev))}
                        onDropCell={() => handleDropOnCell(employee.id, day)}
                      />
```

In `ShiftDraftsTray.tsx`, add drag support. Update `ShiftDraftsTrayProps` to include:

```typescript
  onDragStartDraft: (draft: TrayDraft) => void;
  onDropTray: () => void;
```

Wire them onto the outer container and each draft button:

```tsx
export function ShiftDraftsTray({ drafts, canEdit, onNewDraft, onEditDraft, onDragStartDraft, onDropTray }: ShiftDraftsTrayProps): React.ReactElement | null {
  if (!canEdit) return null;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropTray();
      }}
      className="flex flex-wrap items-center gap-2 border-t border-neutral-200 p-3"
    >
```

(keep the rest of the body the same, just add `draggable` + `onDragStart` to the per-draft `<button>`:)

```tsx
          <button
            key={draft.id}
            type="button"
            draggable
            onDragStart={() => onDragStartDraft(draft)}
            onClick={() => onEditDraft(draft)}
            className="flex min-w-[86px] flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-neutral-300 bg-white px-2.5 py-1.5 text-center hover:border-brand-400"
          >
```

Update the `<ShiftDraftsTray>` mount in `ScheduleGrid.tsx` to pass the two new props:

```tsx
          <ShiftDraftsTray
            drafts={tray}
            canEdit={canEdit}
            onNewDraft={() => setDraftModal({ open: true, editing: null })}
            onEditDraft={(draft) => setDraftModal({ open: true, editing: draft })}
            onDragStartDraft={(draft) => setDragging({ kind: 'tray', draftId: draft.id })}
            onDropTray={handleDropOnTray}
          />
```

- [ ] **Step 6: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Manual verification (this task's only real test coverage)**

Run: `pnpm --filter @shiftos/web build`, then `pnpm dev:web`. Against a real schedule:
1. Create a tray draft, drag it onto an empty cell — confirm the cell now shows that time range and the draft is gone from the tray.
2. Create another tray draft, drag it onto an *already-filled* cell — confirm the cell now shows two cards (split shift) and no conflict badge if the times don't overlap.
3. Drag an assigned card from one cell to a different employee/day — confirm it disappears from the source cell and appears in the destination.
4. Drag an assigned card onto the tray — confirm it disappears from the grid and a new draft appears in the tray with the same time range.
5. Drag a card and drop it back on its own cell — confirm nothing changes (no duplicate, no error).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx apps/web/src/pages/scheduling/grid/ShiftCell.tsx apps/web/src/pages/scheduling/grid/ShiftDraftsTray.tsx
git commit -m "feat(schedule-grid): add two-way drag-and-drop between tray and grid cells"
```

---

### Task 10: Frontend — week navigator

**Files:**
- Modify: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx`
- Test: none required (thin UI + RPC-navigation wiring) — verified via `tsc --noEmit` and manual check.

**Interfaces:**
- Consumes: `find_adjacent_schedule` RPC (Task 2), `useNavigate` from `react-router-dom`.
- Produces: nothing consumed by later tasks — leaf task.

- [ ] **Step 1: Add the navigator UI and wiring**

In `ScheduleGrid.tsx`, add the import:

```typescript
import { useNavigate } from 'react-router-dom';
```

Inside the component, add:

```typescript
  const navigate = useNavigate();

  const goToAdjacentWeek = async (direction: 'prev' | 'next'): Promise<void> => {
    const adjacent = await callRpc<Schedule | null>('find_adjacent_schedule', schedule.organization_id, { scheduleId, direction });
    if (adjacent) {
      navigate(`/schedules/${adjacent.id}`);
    } else {
      // No adjacent schedule — surface the same guidance as the existing
      // "Nothing scheduled" state rather than navigating anywhere (spec §3.2:
      // paging into an empty week never auto-creates one).
      window.alert(direction === 'next' ? 'No later schedule exists yet for this branch.' : 'No earlier schedule exists for this branch.');
    }
  };
```

Check the top of the file for whether `callRpc` is already imported (it's used inside `useRpcQuery`/`useRpcMutation` internally, but this is a one-off imperative call outside React Query's hooks, so it needs a direct import). Add:

```typescript
import { callRpc } from '../../../lib/apiClient.js';
```

(If `window.alert` reads as too blunt for this codebase's conventions, check whether a toast utility already exists elsewhere in `apps/web/src` — e.g. grep for `useToast` or similar — and use that instead; only fall back to `window.alert` if nothing lighter-weight already exists in the codebase.)

Add the navigator UI right above the grid's outer `<div className="flex flex-wrap gap-4">`:

```tsx
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-2">
        <button
          type="button"
          onClick={() => void goToAdjacentWeek('prev')}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-neutral-300"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-neutral-900">
          {new Date(`${schedule.start_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {new Date(`${schedule.end_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => void goToAdjacentWeek('next')}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-neutral-300"
        >
          ›
        </button>
      </div>
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter @shiftos/web build`, then `pnpm dev:web`. Against a branch with 2+ schedules at different weeks, open one, click "›" — confirm it navigates to the later schedule's grid. Click "‹" twice from there — confirm it goes back, then shows the "no earlier schedule" message once it runs out.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx
git commit -m "feat(schedule-grid): add week navigator"
```

---

### Task 11: Frontend — "Copy last week" on schedule creation

**Files:**
- Modify: `apps/web/src/pages/scheduling/ScheduleBuilderPage.tsx` (`CreateScheduleForm`)
- Test: none required (thin form + RPC-sequencing wiring) — verified via `tsc --noEmit` and manual check.

**Interfaces:**
- Consumes: `duplicate_schedule_shifts` RPC (Task 3), the existing `create_schedule` RPC/mutation already in `CreateScheduleForm`.
- Produces: nothing consumed by later tasks — leaf task, and the final task in this plan.

- [ ] **Step 1: Add a "Copy from" picker to `CreateScheduleForm`**

In `apps/web/src/pages/scheduling/ScheduleBuilderPage.tsx`, inside `CreateScheduleForm`, add state and a query for candidate source schedules once a branch is known:

```typescript
  const [copyFromScheduleId, setCopyFromScheduleId] = useState('');
  const resolvedBranchIdForCopy = singleBranchId ?? branchId;
  const { data: candidateSchedules } = useRpcQuery<Schedule[]>(
    'list_schedules',
    resolvedBranchIdForCopy ? { branchId: resolvedBranchIdForCopy } : undefined,
    { enabled: Boolean(resolvedBranchIdForCopy) }
  );
```

Add the duplicate mutation:

```typescript
  const duplicateMutation = useRpcMutation<{ copiedCount: number }, { sourceScheduleId: string; targetScheduleId: string }>(
    'duplicate_schedule_shifts',
    { invalidates: ['list_shifts_for_schedule', 'list_assignments_for_schedule'] }
  );
```

Update `createMutation`'s `onSuccess` to chain the copy when a source was picked:

```typescript
  const createMutation = useRpcMutation<Schedule, Record<string, unknown>>('create_schedule', {
    invalidates: ['list_schedules'],
    onSuccess: (created) => {
      if (copyFromScheduleId) {
        duplicateMutation.mutate(
          { sourceScheduleId: copyFromScheduleId, targetScheduleId: created.id },
          { onSettled: () => navigate(`/schedules/${created.id}`, { replace: true }) }
        );
      } else {
        navigate(`/schedules/${created.id}`, { replace: true });
      }
    },
    onError: (err) => setError(err.message)
  });
```

Add the picker to the form JSX, right after the "End date" fields' closing `</div>` and before the error/submit block — matching the handoff's "New schedule" modal fields (Week starting / **Copy from** / Template set — "Template set" stays out of scope per spec §7, unchanged):

```tsx
          <FormField label="Copy from (optional)" htmlFor="copyFromScheduleId">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={copyFromScheduleId}
                onChange={(e) => setCopyFromScheduleId(e.target.value)}
                placeholder="Start from scratch"
                options={(candidateSchedules ?? []).map((s) => ({
                  value: s.id,
                  label: `${s.name} (${new Date(`${s.start_date}T00:00:00`).toLocaleDateString()})`
                }))}
              />
            )}
          </FormField>
```

Update the submit button's `loading` prop to also reflect the chained copy:

```tsx
          <Button type="submit" loading={createMutation.isPending || duplicateMutation.isPending} className="self-start">
            Create schedule
          </Button>
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @shiftos/web exec tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter @shiftos/web build`, then `pnpm dev:web`. Create a new schedule, pick an existing schedule (with at least one shift) in "Copy from", submit — confirm the new schedule's grid shows the copied shift(s) on the equivalent day, with no notes carried over.

- [ ] **Step 4: Run the full test suite one more time to confirm nothing regressed across the whole plan**

Run: `pnpm exec vitest run packages/tests/integration`
Expected: PASS, every integration test file green (existing files plus the 3 new ones from Tasks 1–3).

Run: `pnpm --filter @shiftos/web build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/scheduling/ScheduleBuilderPage.tsx
git commit -m "feat(schedule-grid): wire real Copy last week into schedule creation"
```

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-09-09-schedule-grid-replica-design.md`):
- §3.1 split shifts (`addShiftToEmployeeOnDate`) → Task 1. ✓
- §3.2 week navigation (`findAdjacentSchedule`) → Task 2, UI in Task 10. ✓
- §3.3 Copy last week (`duplicateScheduleShifts`) → Task 3, UI in Task 11. ✓
- §3.4 Total Hours → Task 4. ✓
- §4.1–4.2 multi-card cells, drag-and-drop, "⋮" menu → Tasks 5, 6, 9. ✓
- §4.2 Mark day off → Task 7. ✓
- §4.3 add another time block → Task 7. ✓
- §4.4 shift-drafts tray → Task 8. ✓
- §4.5 ScheduleListPage/ScheduleBuilderPage — spec says "no structural change beyond what's already shipped," confirmed no task touches `ScheduleListPage.tsx`. ✓
- §5 interaction table — every row maps to a task: assign→Task 9/existing, add split→Task 1/6/7/9, move→Task 9, return to drafts→Task 6/9, edit→existing (unchanged), delete→Task 6, mark off→Task 7, page week→Task 10, copy last week→Task 3/11. ✓
- §6 edge cases: archived-schedule read-only was already true before this plan (`canEdit` gates `draggable`/click handlers throughout) — no dedicated task needed, confirmed by Task 9 Step 7's manual-verification note relying on existing `canEdit` plumbing. §7 non-goals (AI/import stay inert) — no task touches `AiAssistantPanel.tsx` or the empty-state's Import/Use-a-template buttons, confirmed by absence. ✓
- §8 testing: service tests present in Tasks 1–3; component/permission tests for drag-and-drop are explicitly manual (Task 9 Step 7) since jsdom drag events aren't a reliable substitute — flagged inline in that task rather than silently skipped.

**Placeholder scan:** no "TBD"/"TODO"/"add appropriate error handling" found in any task; every step has real, complete code. One exception: Task 10 Step 1 has a conditional instruction ("check whether a toast utility already exists... only fall back to window.alert if nothing lighter-weight exists") — this is a genuine judgment call for the implementer to make by reading the codebase, not a deferred unknown; the concrete fallback (`window.alert`) is fully specified either way, so the task is buildable and testable regardless of which path is taken.

**Type consistency:** `ShiftCellCard` (Task 5) is the one type introduced early and reused everywhere after — verified `ShiftCardMenu.tsx` (Task 6), `AssignShiftModal.tsx`'s `existing` prop (unchanged shape, already matches), `ScheduleGrid.tsx`'s drag state (Task 9), and `ShiftCell.tsx`'s props (Tasks 5, 6, 7, 9) all reference the same field names (`card.shift`, `card.assignment`) with no renaming across tasks. `TrayDraft` (Task 8) is used identically in `ShiftDraftsTray.tsx`, `NewDraftModal.tsx`, and `ScheduleGrid.tsx`'s `tray` state and `handleMoveToDrafts`/`handleDropOnTray`/`handleDropOnCell` (Tasks 8, 9) — same 5 fields (`id`, `startTime`, `endTime`, `breakMinutes`, `note`) throughout, no drift.
