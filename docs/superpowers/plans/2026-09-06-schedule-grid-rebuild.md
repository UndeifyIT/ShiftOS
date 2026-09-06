# Schedule Grid Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat shift-table Schedules page with the weekly employee × day grid from the design handoff (roster, click-to-assign shifts, conflict badges, hours summary, inert AI Assistant panel).

**Architecture:** New backend subsystem (`schedule_rosters` table + service, `shift_templates` wired up for the first time, three new cell-level "assign/update/remove" operations, and read-only conflict/hours-summary computation) sits behind new RPC operations, consumed by a new `ScheduleGrid` React component tree that replaces the current `DataTable`-based "Shifts" tab in `ScheduleBuilderPage.tsx`.

**Tech Stack:** TypeScript throughout. Postgres/Supabase migrations (`supabase/migrations`). Backend: `@shiftos/repositories` → `@shiftos/services` → `@shiftos/api` (RPC) layering, already established. Frontend: React + `@tanstack/react-query` (via `useRpcQuery`/`useRpcMutation`) + Tailwind + the existing `@shiftos/ui` kit. Tests: Vitest integration tests in `packages/tests/integration/` against a live Supabase test org (no unit-test/mock layer exists in this repo for services).

**Spec:** [docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md](../specs/2026-09-06-schedule-grid-rebuild-design.md)

## Global Constraints

- Permission codes must never contain an underscore in any segment (`chk_permissions_code_format`) — use `shifttemplates.read`/`shifttemplates.create`, not `shift_templates.read` (see `supabase/migrations/036_create_shift_notes.sql`'s identical `shiftnotes` naming and its comment explaining why).
- Every new migration file must be idempotent (`DO $$ IF NOT EXISTS $$` guards for constraints/indexes/triggers, `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING` for seed inserts) — this is the unbroken convention across every file in `supabase/migrations/`.
- All new/changed backend logic goes through `ApplicationContext` (`context.requirePermission(...)`, `context.requireBranchAccess(...)`) exactly like every existing method in `packages/services/src/scheduling/schedulingService.ts` — never bypass it.
- RPC input parsing uses only the helpers in `packages/api/src/parse.ts` (`asRecord`, `requiredStringField`, `stringField`, `numberField`, `booleanField`) — never a bare `as` cast on untrusted input.
- This repo has **no frontend test runner wired up** (`apps/web/package.json`'s `test` script points at a `jest.config.web.js` that does not exist, and there are zero `*.test.tsx` files anywhere in `apps/web`). Frontend tasks are verified by running the dev server and exercising the feature manually, not by writing component tests — do not introduce a new test framework as a side effect of this plan.
- Backend tasks ARE tested, via Vitest integration tests in `packages/tests/integration/**/*.test.ts` that call real RPC operations against the fixture org (`TEST_FIXTURES` in `packages/tests/testEnv.ts`) — follow `packages/tests/integration/shiftSwaps.integration.test.ts`'s exact pattern (create disposable rows, track their ids, delete them in `afterAll`, never touch fixture rows). Run with `pnpm build && pnpm test:integration` (the root `pretest` script builds automatically before `pnpm test`, but `test:integration` alone does not — build first).
- Only one real authenticated identity exists in the integration-test environment (`TEST_FIXTURES.ownerAuthUserId`, an Owner with every permission). There is no way to integration-test "Manager is denied X" — do not write tests that assume a second, lesser-privileged identity is available.

---

## Part A — Backend

### Task 1: Migration — create `schedule_rosters` table

**Files:**
- Create: `supabase/migrations/055_create_schedule_rosters.sql`

**Interfaces:**
- Produces: table `public.schedule_rosters (id, organization_id, schedule_id, employee_id, added_by, added_at, deleted_at)`, unique on `(schedule_id, employee_id) WHERE deleted_at IS NULL`.

- [ ] **Step 1: Write the migration**

```sql
-- 055_create_schedule_rosters.sql
-- Migration: create schedule_rosters table
--
-- Tracks which employees are "on" a given week's schedule, independent of
-- whether they have any shift yet -- the weekly grid UI needs to render an
-- employee's row with seven empty day-cells before any shift exists for
-- them (see docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md
-- section 2.1). No permission catalog changes here: roster membership
-- reuses the existing assignments.create/assignments.delete permissions --
-- adding someone to the roster is a precursor to assigning them shifts, and
-- PER-003-SCHEDULING.md's closest matching row ("Assign Employee to
-- Shift") already grants exactly that split: Supervisor allow, Manager deny.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.schedule_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  added_by uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Defensive uniqueness for the composite FKs below, mirroring
-- 004_create_shift_templates.sql's identical guard for branches.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'schedules' AND c.conname = 'uq_schedules_id_organization_id')
  THEN
    ALTER TABLE public.schedules ADD CONSTRAINT uq_schedules_id_organization_id UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'employees' AND c.conname = 'uq_employees_id_organization_id')
  THEN
    ALTER TABLE public.employees ADD CONSTRAINT uq_employees_id_organization_id UNIQUE (id, organization_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_organization')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_organization FOREIGN KEY (organization_id)
        REFERENCES public.organizations (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_schedule')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_schedule FOREIGN KEY (schedule_id, organization_id)
        REFERENCES public.schedules (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_employee')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_employee FOREIGN KEY (employee_id, organization_id)
        REFERENCES public.employees (id, organization_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'schedule_rosters' AND c.conname = 'fk_schedule_rosters_added_by')
  THEN
    ALTER TABLE public.schedule_rosters
      ADD CONSTRAINT fk_schedule_rosters_added_by FOREIGN KEY (added_by, organization_id)
        REFERENCES public.organization_memberships (user_id, organization_id) ON DELETE RESTRICT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_schedule_rosters_schedule_employee')
  THEN
    CREATE UNIQUE INDEX uq_schedule_rosters_schedule_employee
      ON public.schedule_rosters (schedule_id, employee_id) WHERE deleted_at IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_schedule_rosters_organization_id') THEN
    CREATE INDEX idx_schedule_rosters_organization_id ON public.schedule_rosters (organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'idx_schedule_rosters_schedule_id') THEN
    CREATE INDEX idx_schedule_rosters_schedule_id ON public.schedule_rosters (schedule_id);
  END IF;
END$$;

COMMENT ON TABLE public.schedule_rosters IS 'Which employees are on a given schedule (weekly grid roster), independent of whether they have a shift assigned yet.';
COMMENT ON COLUMN public.schedule_rosters.deleted_at IS 'Soft-removing from the roster does not touch that employee''s existing shift assignments for the week.';

-- RLS enabled per the same convention as shift_templates/shift_notes: no
-- per-table policies yet, authorization is enforced in the service layer
-- via ApplicationContext.requirePermission/requireBranchAccess.
ALTER TABLE public.schedule_rosters ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply the migration locally and verify it's idempotent**

Run: `psql "$DATABASE_URL" -f supabase/migrations/055_create_schedule_rosters.sql` (repo root `.env` has `DATABASE_URL`)
Expected: succeeds with no output errors. Run the exact same command a second time — expected: still succeeds (every guard is `IF NOT EXISTS`), proving idempotency.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/055_create_schedule_rosters.sql
git commit -m "feat(scheduling): add schedule_rosters table"
```

---

### Task 2: Migration — seed `shifttemplates.*` permissions

**Files:**
- Create: `supabase/migrations/056_seed_shift_template_permissions.sql`

**Interfaces:**
- Produces: permission codes `shifttemplates.read`, `shifttemplates.create`, both granted only to the Supervisor role (Phase 1 has no UI path where Manager opens the template picker — Manager can't assign shifts at all in Phase 1, matching `PER-003-SCHEDULING.md`'s "Assign Employee to Shift: Manager Deny").

- [ ] **Step 1: Write the migration**

```sql
-- 056_seed_shift_template_permissions.sql
-- Migration: permission catalog rows for the shift-templates RPCs
-- (list_shift_templates, create_shift_template) added in this pass.
--
-- "shifttemplates" (no underscore) per chk_permissions_code_format, same
-- reasoning as "shiftnotes" in 036_create_shift_notes.sql. Supervisor-only:
-- in Phase 1 of the schedule grid rebuild, Manager cannot assign shifts at
-- all (PER-003-SCHEDULING.md "Assign Employee to Shift: Manager Deny"), so
-- Manager never opens the template picker and does not need read access
-- yet. Revisit when Manager-facing template management is built.

INSERT INTO public.permissions (code, module, name, description)
VALUES
  ('shifttemplates.read', 'scheduling', 'View shift templates', 'View reusable shift templates for a branch.'),
  ('shifttemplates.create', 'scheduling', 'Create shift template', 'Create a reusable shift template.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.is_active = true
WHERE r.is_system = true AND lower(r.name) = lower('Supervisor')
  AND p.code IN ('shifttemplates.read', 'shifttemplates.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Extend ensure_standard_roles() so future organizations' Supervisor role
-- picks up shifttemplates.* grants at creation time too.
CREATE OR REPLACE FUNCTION public.ensure_standard_roles(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_role_id uuid;
  v_employee_role_id uuid;
BEGIN
  SELECT id INTO v_supervisor_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Supervisor');
  IF v_supervisor_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Supervisor', true, true, false)
    RETURNING id INTO v_supervisor_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_supervisor_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN (
    'branches.read',
    'departments.read',
    'employees.read', 'employees.create', 'employees.update', 'employees.archive',
    'schedules.read', 'schedules.create', 'schedules.update', 'schedules.publish', 'schedules.archive',
    'shifts.read', 'shifts.create', 'shifts.update', 'shifts.archive',
    'assignments.create', 'assignments.update', 'assignments.delete',
    'swaps.read', 'swaps.request', 'swaps.respond', 'swaps.approve',
    'tasks.read', 'tasks.complete',
    'announcements.read', 'announcements.acknowledge',
    'shiftnotes.read', 'shiftnotes.create',
    'reports.read',
    'shifttemplates.read', 'shifttemplates.create'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  SELECT id INTO v_employee_role_id FROM public.roles
    WHERE organization_id = p_organization_id AND lower(name) = lower('Employee');
  IF v_employee_role_id IS NULL THEN
    INSERT INTO public.roles (organization_id, name, is_system, is_active, grants_org_wide_branch_access)
    VALUES (p_organization_id, 'Employee', true, true, false)
    RETURNING id INTO v_employee_role_id;
  END IF;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_employee_role_id, p.id FROM public.permissions p
  WHERE p.is_active = true AND p.code IN ('employees.read', 'schedules.read', 'shifts.read', 'announcements.read', 'announcements.acknowledge', 'swaps.read', 'swaps.request', 'swaps.respond')
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_standard_roles(uuid) FROM PUBLIC;

DO $$
DECLARE
  v_org record;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations LOOP
    PERFORM public.ensure_standard_roles(v_org.id);
  END LOOP;
END$$;
```

- [ ] **Step 2: Apply and verify**

Run: `psql "$DATABASE_URL" -f supabase/migrations/056_seed_shift_template_permissions.sql`
Expected: succeeds. Then run: `psql "$DATABASE_URL" -c "SELECT code FROM permissions WHERE code LIKE 'shifttemplates.%' ORDER BY code;"`
Expected: two rows, `shifttemplates.create` and `shifttemplates.read`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/056_seed_shift_template_permissions.sql
git commit -m "feat(scheduling): seed shifttemplates permissions for Supervisor"
```

---

### Task 3: `ScheduleRosterRepository`

**Files:**
- Create: `packages/repositories/src/scheduling/scheduleRosterRepository.ts`
- Modify: `packages/repositories/src/index.ts` (add export)

**Interfaces:**
- Produces: `ScheduleRosterRepository` with `listForSchedule(organizationId, scheduleId): Promise<ScheduleRosterEntry[]>` and `findEntry(organizationId, scheduleId, employeeId): Promise<ScheduleRosterEntry | null>`, plus the inherited `insert`/`archive`/`getByIdOrThrow` from `TenantScopedRepository`. Exports type `ScheduleRosterEntry`.

- [ ] **Step 1: Write the repository**

```typescript
import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface ScheduleRosterEntry extends TenantEntity {
  schedule_id: string;
  employee_id: string;
  added_by: string;
  added_at: string;
  deleted_at: string | null;
}

/**
 * Not branch-scoped directly (no branch_id column) -- roster membership is
 * scoped through the parent schedule, which already carries branch_id.
 */
export class ScheduleRosterRepository extends TenantScopedRepository<ScheduleRosterEntry> {
  constructor(client: DatabaseClient) {
    super(client, 'schedule_rosters');
  }

  async listForSchedule(organizationId: string, scheduleId: string): Promise<ScheduleRosterEntry[]> {
    return this.list(organizationId, { filters: { schedule_id: scheduleId }, orderBy: 'added_at asc' });
  }

  async findEntry(organizationId: string, scheduleId: string, employeeId: string): Promise<ScheduleRosterEntry | null> {
    const rows = await this.list(organizationId, { filters: { schedule_id: scheduleId, employee_id: employeeId } });
    return rows[0] ?? null;
  }
}
```

- [ ] **Step 2: Add the export**

In `packages/repositories/src/index.ts`, add this line directly under `export * from './scheduling/shiftAssignmentRepository.js';`:

```typescript
export * from './scheduling/scheduleRosterRepository.js';
```

- [ ] **Step 3: Build and verify it compiles**

Run: `pnpm --filter @shiftos/repositories build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add packages/repositories/src/scheduling/scheduleRosterRepository.ts packages/repositories/src/index.ts
git commit -m "feat(scheduling): add ScheduleRosterRepository"
```

---

### Task 4: `ScheduleRosterService`

**Files:**
- Create: `packages/services/src/scheduling/scheduleRosterService.ts`
- Modify: `packages/services/src/index.ts` (add export)

**Interfaces:**
- Consumes: `ScheduleRosterRepository` (Task 3), `ScheduleRepository`/`EmployeeRepository` (existing, from `@shiftos/repositories`), `ApplicationContext` (existing).
- Produces: `ScheduleRosterService` with `addEmployeeToSchedule(scheduleId, employeeId): Promise<ScheduleRosterEntry>`, `removeEmployeeFromSchedule(scheduleId, employeeId): Promise<ScheduleRosterEntry>`, `listScheduleRoster(scheduleId): Promise<ScheduleRosterEntry[]>`.

- [ ] **Step 1: Write the service**

```typescript
import {
  ScheduleRosterRepository, ScheduleRepository, EmployeeRepository,
  type ScheduleRosterEntry
} from '@shiftos/repositories';
import { NotFoundError, ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertUuid } from '../validation.js';

/**
 * Schedule roster: which employees are "on" a given week's schedule,
 * independent of whether they have a shift assigned yet. See
 * docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md §2.1/§3.1.
 * Reuses assignments.create/assignments.delete rather than a dedicated
 * permission (documented in that spec and in migration 055's own comment).
 */
export class ScheduleRosterService {
  private readonly roster: ScheduleRosterRepository;
  private readonly schedules: ScheduleRepository;
  private readonly employees: EmployeeRepository;

  constructor(private readonly context: ApplicationContext) {
    this.roster = new ScheduleRosterRepository(context.client);
    this.schedules = new ScheduleRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
  }

  async addEmployeeToSchedule(scheduleId: string, employeeId: string): Promise<ScheduleRosterEntry> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('assignments.create');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    if (employee.branch_id !== schedule.branch_id) {
      throw new ValidationError('Employee does not belong to this schedule\'s branch');
    }

    const existing = await this.roster.findEntry(this.context.organizationId, scheduleId, employeeId);
    if (existing) {
      throw new ValidationError('Employee is already on this schedule');
    }

    return this.roster.insert(this.context.organizationId, {
      schedule_id: scheduleId,
      employee_id: employeeId,
      added_by: this.context.userId
    } as Partial<ScheduleRosterEntry>);
  }

  async removeEmployeeFromSchedule(scheduleId: string, employeeId: string): Promise<ScheduleRosterEntry> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('assignments.delete');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const existing = await this.roster.findEntry(this.context.organizationId, scheduleId, employeeId);
    if (!existing) {
      throw new NotFoundError('Employee is not on this schedule');
    }
    return this.roster.archive(this.context.organizationId, existing.id);
  }

  async listScheduleRoster(scheduleId: string): Promise<ScheduleRosterEntry[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    return this.roster.listForSchedule(this.context.organizationId, scheduleId);
  }
}
```

- [ ] **Step 2: Add the export**

In `packages/services/src/index.ts`, add directly under `export * from './scheduling/schedulingService.js';`:

```typescript
export * from './scheduling/scheduleRosterService.js';
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @shiftos/services build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/services/src/scheduling/scheduleRosterService.ts packages/services/src/index.ts
git commit -m "feat(scheduling): add ScheduleRosterService"
```

---

### Task 5: Roster RPC operations + registry wiring + integration test

**Files:**
- Create: `packages/api/src/operations/scheduleRoster.ts`
- Modify: `packages/api/src/registry.ts` (imports + 3 `register(...)` calls)
- Create: `packages/tests/integration/scheduleRoster.integration.test.ts`

**Interfaces:**
- Consumes: `ScheduleRosterService` (Task 4).
- Produces: RPC operations `add_employee_to_schedule`, `remove_employee_from_schedule`, `list_schedule_roster`.

- [ ] **Step 1: Write the RPC operations**

```typescript
import { ScheduleRosterService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField } from '../parse.js';

export const addEmployeeToSchedule = defineRpc('add_employee_to_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ScheduleRosterService(context).addEmployeeToSchedule(
    requiredStringField(input, 'scheduleId'),
    requiredStringField(input, 'employeeId')
  );
});

export const removeEmployeeFromSchedule = defineRpc('remove_employee_from_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ScheduleRosterService(context).removeEmployeeFromSchedule(
    requiredStringField(input, 'scheduleId'),
    requiredStringField(input, 'employeeId')
  );
});

export const listScheduleRoster = defineRpc('list_schedule_roster', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ScheduleRosterService(context).listScheduleRoster(requiredStringField(input, 'scheduleId'));
});

export const scheduleRosterOperations = [addEmployeeToSchedule, removeEmployeeFromSchedule, listScheduleRoster];
```

- [ ] **Step 2: Wire into the registry**

In `packages/api/src/registry.ts`, add an import directly under the existing scheduling operations import block:

```typescript
import { addEmployeeToSchedule, removeEmployeeFromSchedule, listScheduleRoster } from './operations/scheduleRoster.js';
```

And add these three lines directly after `registry.register(publishSchedule);`:

```typescript
  registry.register(addEmployeeToSchedule);
  registry.register(removeEmployeeFromSchedule);
  registry.register(listScheduleRoster);
```

- [ ] **Step 3: Write the failing integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('schedule roster integration', () => {
  let ctx: TestContext;
  let scheduleId: string | undefined;
  let secondEmployeeId: string | undefined;

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (scheduleId) {
      await ctx.client.query('DELETE FROM schedule_rosters WHERE organization_id = $1 AND schedule_id = $2', [
        TEST_FIXTURES.organizationId,
        scheduleId
      ]);
      await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, scheduleId]);
    }
    if (secondEmployeeId) {
      await ctx.client.query('DELETE FROM employees WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, secondEmployeeId]);
    }
    await ctx.client.close();
  });

  it('adds, lists, and removes an employee from a schedule roster', async () => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Roster integration test schedule',
      startDate: '2027-10-04',
      endDate: '2027-10-10'
    });
    scheduleId = schedule.id;

    const added = await ctx.call<{ id: string; employee_id: string }>('add_employee_to_schedule', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId
    });
    expect(added.employee_id).toBe(TEST_FIXTURES.employeeId);

    const roster = await ctx.call<Array<{ employee_id: string }>>('list_schedule_roster', { scheduleId });
    expect(roster.some((r) => r.employee_id === TEST_FIXTURES.employeeId)).toBe(true);

    const duplicate = await ctx.callRaw('add_employee_to_schedule', { scheduleId, employeeId: TEST_FIXTURES.employeeId });
    expect(duplicate.success).toBe(false);

    const removed = await ctx.call<{ deleted_at: string | null }>('remove_employee_from_schedule', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId
    });
    expect(removed.deleted_at).not.toBeNull();

    const rosterAfterRemoval = await ctx.call<Array<{ employee_id: string }>>('list_schedule_roster', { scheduleId });
    expect(rosterAfterRemoval.some((r) => r.employee_id === TEST_FIXTURES.employeeId)).toBe(false);
  });

  it('rejects adding an employee from a different branch', async () => {
    const otherBranchEmployee = await ctx.call<{ id: string; branch_id: string }>('create_employee', {
      // A branch other than TEST_FIXTURES.branchId is required for this
      // check -- reuse the org's own branch list rather than hardcoding one.
      branchId: (await ctx.call<Array<{ id: string }>>('list_branches', {})).find((b) => b.id !== TEST_FIXTURES.branchId)?.id ?? TEST_FIXTURES.branchId,
      employeeNumber: `ROSTER-X-${Date.now()}`,
      firstName: 'Roster',
      lastName: 'CrossBranch',
      hireDate: '2026-01-01'
    });
    secondEmployeeId = otherBranchEmployee.id;

    if (otherBranchEmployee.branch_id === TEST_FIXTURES.branchId) {
      // Only one branch exists in the fixture org -- nothing to assert here.
      return;
    }

    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Roster cross-branch test schedule',
      startDate: '2027-10-11',
      endDate: '2027-10-17'
    });
    scheduleId = schedule.id;

    const result = await ctx.callRaw('add_employee_to_schedule', { scheduleId, employeeId: secondEmployeeId });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Build and run the test**

Run: `pnpm build && pnpm test:integration -- scheduleRoster`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/operations/scheduleRoster.ts packages/api/src/registry.ts packages/tests/integration/scheduleRoster.integration.test.ts
git commit -m "feat(scheduling): add schedule roster RPC operations"
```

---

### Task 6: `ShiftTemplateService`

**Files:**
- Create: `packages/services/src/scheduling/shiftTemplateService.ts`
- Modify: `packages/services/src/index.ts` (add export)

**Interfaces:**
- Consumes: `ShiftTemplateRepository` (existing, `@shiftos/repositories`), `computeDuration` (existing, `./time.js`).
- Produces: `ShiftTemplateService` with `listShiftTemplates(branchId): Promise<ShiftTemplate[]>`, `createShiftTemplate(branchId, input): Promise<ShiftTemplate>`.

- [ ] **Step 1: Write the service**

```typescript
import { ShiftTemplateRepository, type ShiftTemplate } from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';
import { assertUuid, assertNonEmptyString } from '../validation.js';
import { computeDuration } from './time.js';

export interface CreateShiftTemplateInput {
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight?: boolean;
  notes?: string | null;
}

export class ShiftTemplateService {
  private readonly templates: ShiftTemplateRepository;

  constructor(private readonly context: ApplicationContext) {
    this.templates = new ShiftTemplateRepository(context.client);
  }

  async listShiftTemplates(branchId: string): Promise<ShiftTemplate[]> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('shifttemplates.read');
    this.context.requireBranchAccess(branchId);
    return this.templates.listActiveByBranch(this.context.organizationId, branchId);
  }

  async createShiftTemplate(branchId: string, input: CreateShiftTemplateInput): Promise<ShiftTemplate> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('shifttemplates.create');
    this.context.requireBranchAccess(branchId);
    assertNonEmptyString(input.name, 'name');

    const crossesMidnight = input.crossesMidnight ?? false;
    const duration = computeDuration(input.startTime, input.endTime, crossesMidnight);

    return this.templates.insert(this.context.organizationId, {
      branch_id: branchId,
      name: input.name.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
      duration,
      crosses_midnight: crossesMidnight,
      notes: input.notes ?? null,
      status: 'active'
    } as Partial<ShiftTemplate>);
  }
}
```

- [ ] **Step 2: Add the export**

In `packages/services/src/index.ts`, add directly under `export * from './scheduling/scheduleRosterService.js';`:

```typescript
export * from './scheduling/shiftTemplateService.js';
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @shiftos/services build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/services/src/scheduling/shiftTemplateService.ts packages/services/src/index.ts
git commit -m "feat(scheduling): add ShiftTemplateService"
```

---

### Task 7: Shift template RPC operations + registry wiring + integration test

**Files:**
- Create: `packages/api/src/operations/shiftTemplate.ts`
- Modify: `packages/api/src/registry.ts`
- Create: `packages/tests/integration/shiftTemplate.integration.test.ts`

**Interfaces:**
- Consumes: `ShiftTemplateService` (Task 6).
- Produces: RPC operations `list_shift_templates`, `create_shift_template`.

- [ ] **Step 1: Write the RPC operations**

```typescript
import { ShiftTemplateService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, booleanField } from '../parse.js';

export const listShiftTemplates = defineRpc('list_shift_templates', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftTemplateService(context).listShiftTemplates(requiredStringField(input, 'branchId'));
});

export const createShiftTemplate = defineRpc('create_shift_template', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftTemplateService(context).createShiftTemplate(requiredStringField(input, 'branchId'), {
    name: requiredStringField(input, 'name'),
    startTime: requiredStringField(input, 'startTime'),
    endTime: requiredStringField(input, 'endTime'),
    crossesMidnight: booleanField(input, 'crossesMidnight'),
    notes: stringField(input, 'notes') ?? null
  });
});

export const shiftTemplateOperations = [listShiftTemplates, createShiftTemplate];
```

- [ ] **Step 2: Wire into the registry**

In `packages/api/src/registry.ts`, add import:

```typescript
import { listShiftTemplates, createShiftTemplate } from './operations/shiftTemplate.js';
```

And register directly after the roster registrations from Task 5:

```typescript
  registry.register(listShiftTemplates);
  registry.register(createShiftTemplate);
```

- [ ] **Step 3: Write the integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('shift templates integration', () => {
  let ctx: TestContext;
  const templateIds: string[] = [];

  beforeAll(() => {
    ctx = createTestContext();
  });

  afterAll(async () => {
    if (templateIds.length > 0) {
      await ctx.client.query('DELETE FROM shift_templates WHERE organization_id = $1 AND id = ANY($2::uuid[])', [
        TEST_FIXTURES.organizationId,
        templateIds
      ]);
    }
    await ctx.client.close();
  });

  it('creates and lists a shift template for the fixture branch', async () => {
    const template = await ctx.call<{ id: string; name: string; duration: string }>('create_shift_template', {
      branchId: TEST_FIXTURES.branchId,
      name: `Integration Test Template ${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00'
    });
    templateIds.push(template.id);
    expect(template.duration).toBe('08:00:00');

    const templates = await ctx.call<Array<{ id: string }>>('list_shift_templates', { branchId: TEST_FIXTURES.branchId });
    expect(templates.some((t) => t.id === template.id)).toBe(true);
  });

  it('rejects a template whose end time is not after its start time', async () => {
    const result = await ctx.callRaw('create_shift_template', {
      branchId: TEST_FIXTURES.branchId,
      name: `Invalid Template ${Date.now()}`,
      startTime: '17:00',
      endTime: '09:00'
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Build and run the test**

Run: `pnpm build && pnpm test:integration -- shiftTemplate`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/operations/shiftTemplate.ts packages/api/src/registry.ts packages/tests/integration/shiftTemplate.integration.test.ts
git commit -m "feat(scheduling): add shift template RPC operations"
```

---

### Task 8: Cell-level assign/update/remove on `SchedulingService` + RPCs + integration tests

**Files:**
- Modify: `packages/services/src/scheduling/schedulingService.ts` (add 3 methods + imports)
- Modify: `packages/api/src/operations/scheduling.ts` (add 3 RPC operations, extend `schedulingOperations` array)
- Modify: `packages/api/src/registry.ts` (import + register the 3 new ops)
- Create: `packages/tests/integration/scheduleGridAssignment.integration.test.ts`

**Interfaces:**
- Consumes: existing `SchedulingService` internals (`this.schedules`, `this.shifts`, `this.assignments`, `this.employees`, `computeDuration`, `isDateWithinRange`), plus `ShiftTemplateRepository` (new import into this file).
- Produces: `assignShiftToEmployeeOnDate(scheduleId, employeeId, date, input): Promise<{ shift: Shift; assignment: ShiftAssignment }>`, `updateAssignedShiftOnDate(assignmentId, input): Promise<{ shift: Shift; assignment: ShiftAssignment }>`, `removeAssignedShiftOnDate(assignmentId): Promise<{ assignment: ShiftAssignment; shiftCancelled: boolean }>`. RPCs: `assign_shift_to_employee_on_date`, `update_assigned_shift_on_date`, `remove_assigned_shift_on_date`.

- [ ] **Step 1: Add the new import and interfaces to `schedulingService.ts`**

At the top of `packages/services/src/scheduling/schedulingService.ts`, change the repositories import to add `ShiftTemplateRepository` and its type:

```typescript
import {
  ScheduleRepository,
  ScheduleVersionRepository,
  ShiftRepository,
  ShiftAssignmentRepository,
  ShiftTemplateRepository,
  EmployeeRepository,
  UserRepository,
  publishScheduleWithVersion,
  type Schedule,
  type ScheduleVersion,
  type Shift,
  type ShiftAssignment,
  type AssignmentStatus,
  type PublishScheduleResult
} from '@shiftos/repositories';
```

Add these two interfaces directly under the existing `UpdateShiftInput` interface:

```typescript
export interface AssignShiftToEmployeeInput {
  templateId?: string | null;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  breakMinutes?: number;
  notes?: string | null;
}

export interface UpdateAssignedShiftInput {
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  breakMinutes?: number;
  notes?: string | null;
}
```

Add a `templates` field to the class and initialize it in the constructor:

```typescript
  private readonly templates: ShiftTemplateRepository;
```

(directly under `private readonly users: UserRepository;`), and in the constructor body directly under `this.users = new UserRepository(context.client);`:

```typescript
    this.templates = new ShiftTemplateRepository(context.client);
```

- [ ] **Step 2: Add the three methods**

Add directly after `listAssignmentsForShift` (before the `// ==================== Publishing ====================` section):

```typescript
  // ==================== Grid cell assignment ====================

  /**
   * One-shot version of createShift + assignEmployee for the weekly grid's
   * click-to-assign flow (docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md §3.3):
   * a single call so the modal's one "Assign Shift" button can't leave a
   * shift created with no assignment on a partial failure. Phase 1 is one
   * shift block per employee per day, so re-assigning a cell that already
   * has an active assignment replaces it (cancels the old shift first)
   * rather than stacking a second block onto the same day.
   */
  async assignShiftToEmployeeOnDate(
    scheduleId: string,
    employeeId: string,
    date: string,
    input: AssignShiftToEmployeeInput
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

    await this.replaceActiveAssignmentOnDate(schedule, employeeId, date);

    const duration = computeDuration(startTime, endTime, crossesMidnight);
    const shift = await this.shifts.insert(this.context.organizationId, {
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

    const assignment = await this.assignments.insert(this.context.organizationId, {
      shift_id: shift.id,
      employee_id: employeeId,
      assignment_status: 'assigned',
      assigned_by: this.context.userId,
      notes: input.notes ?? null
    } as Partial<ShiftAssignment>);

    return { shift, assignment };
  }

  /** If `employeeId` has an active (assigned/confirmed) assignment on `date`, cancels its shift and archives the assignment first. Phase 1 has one block per employee per day, so this is what makes re-assigning a filled cell a clean replace rather than a stack. */
  private async replaceActiveAssignmentOnDate(schedule: Schedule, employeeId: string, date: string): Promise<void> {
    const dayShifts = await this.shifts.findByBranchAndDateRange(this.context.organizationId, schedule.branch_id, date, date);
    if (dayShifts.length === 0) return;

    const assignments = await this.assignments.listForShifts(this.context.organizationId, dayShifts.map((s) => s.id));
    const existing = assignments.find(
      (a) => a.employee_id === employeeId && (a.assignment_status === 'assigned' || a.assignment_status === 'confirmed')
    );
    if (!existing) return;

    await this.assignments.archive(this.context.organizationId, existing.id);
    const remaining = await this.assignments.findByShift(this.context.organizationId, existing.shift_id);
    if (remaining.length === 0) {
      await this.shifts.cancel(this.context.organizationId, existing.shift_id);
    }
  }

  async updateAssignedShiftOnDate(assignmentId: string, input: UpdateAssignedShiftInput): Promise<{ shift: Shift; assignment: ShiftAssignment }> {
    assertUuid(assignmentId, 'assignmentId');
    await this.context.requirePermission('shifts.update');

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, assignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);

    let updatedShift = shift;
    if (input.startTime !== undefined || input.endTime !== undefined || input.crossesMidnight !== undefined || input.breakMinutes !== undefined) {
      updatedShift = await this.updateShift(shift.id, {
        startTime: input.startTime,
        endTime: input.endTime,
        crossesMidnight: input.crossesMidnight,
        breakMinutes: input.breakMinutes
      });
    }

    let updatedAssignment = assignment;
    if (input.notes !== undefined) {
      updatedAssignment = await this.assignments.patch(this.context.organizationId, assignmentId, {
        notes: input.notes
      } as Partial<ShiftAssignment>);
    }

    return { shift: updatedShift, assignment: updatedAssignment };
  }

  /** Removing the cell's only assignment also cancels the now-orphaned shift, so it doesn't linger as dangling data (spec §3.3/§6). */
  async removeAssignedShiftOnDate(assignmentId: string): Promise<{ assignment: ShiftAssignment; shiftCancelled: boolean }> {
    assertUuid(assignmentId, 'assignmentId');
    await this.context.requirePermission('assignments.delete');

    const assignment = await this.assignments.getByIdOrThrow(this.context.organizationId, assignmentId);
    const shift = await this.shifts.getByIdOrThrow(this.context.organizationId, assignment.shift_id);
    this.context.requireBranchAccess(shift.branch_id);

    const archived = await this.assignments.archive(this.context.organizationId, assignmentId);
    const remaining = await this.assignments.findByShift(this.context.organizationId, shift.id);
    let shiftCancelled = false;
    if (remaining.length === 0) {
      await this.shifts.cancel(this.context.organizationId, shift.id);
      shiftCancelled = true;
    }

    return { assignment: archived, shiftCancelled };
  }
```

- [ ] **Step 3: Add the RPC operations**

In `packages/api/src/operations/scheduling.ts`, add directly above the `// ---- Publishing ----` comment:

```typescript
// ---- Grid cell assignment ----

export const assignShiftToEmployeeOnDate = defineRpc('assign_shift_to_employee_on_date', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).assignShiftToEmployeeOnDate(
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

export const updateAssignedShiftOnDate = defineRpc('update_assigned_shift_on_date', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).updateAssignedShiftOnDate(requiredStringField(input, 'assignmentId'), {
    startTime: stringField(input, 'startTime'),
    endTime: stringField(input, 'endTime'),
    crossesMidnight: booleanField(input, 'crossesMidnight'),
    breakMinutes: numberField(input, 'breakMinutes'),
    notes: stringField(input, 'notes') ?? (input.notes === null ? null : undefined)
  });
});

export const removeAssignedShiftOnDate = defineRpc('remove_assigned_shift_on_date', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).removeAssignedShiftOnDate(requiredStringField(input, 'assignmentId'));
});
```

Then update the `schedulingOperations` array at the bottom of that file to include the three new consts (insert directly after `publishSchedule`):

```typescript
export const schedulingOperations = [
  createSchedule, getSchedule, updateSchedule, archiveSchedule, listSchedules,
  listScheduleVersions, getLatestScheduleVersion,
  createShift, getShift, updateShift, cancelShift, archiveShift, listShiftsForSchedule, listShiftsForEmployeeInSchedule,
  listMyShiftAssignmentsInSchedule,
  assignEmployee, updateAssignmentStatus, removeAssignment, listAssignmentsForShift,
  publishSchedule,
  assignShiftToEmployeeOnDate, updateAssignedShiftOnDate, removeAssignedShiftOnDate
];
```

- [ ] **Step 4: Wire into the registry**

In `packages/api/src/registry.ts`, add the three names to the existing scheduling import (extend the destructured import list already there) and add three `registry.register(...)` calls directly after `registry.register(publishSchedule);`:

```typescript
  registry.register(assignShiftToEmployeeOnDate);
  registry.register(updateAssignedShiftOnDate);
  registry.register(removeAssignedShiftOnDate);
```

- [ ] **Step 5: Write the integration test**

```typescript
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
});
```

- [ ] **Step 6: Build and run the tests**

Run: `pnpm build && pnpm test:integration -- scheduleGridAssignment`
Expected: all three tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/services/src/scheduling/schedulingService.ts packages/api/src/operations/scheduling.ts packages/api/src/registry.ts packages/tests/integration/scheduleGridAssignment.integration.test.ts
git commit -m "feat(scheduling): add cell-level assign/update/remove shift operations"
```

---

### Task 9: `listAssignmentsForSchedule` (bulk read) + RPC + integration test

**Files:**
- Modify: `packages/services/src/scheduling/schedulingService.ts`
- Modify: `packages/api/src/operations/scheduling.ts`
- Modify: `packages/api/src/registry.ts`
- Create: `packages/tests/integration/scheduleAssignmentsBulk.integration.test.ts`

**Interfaces:**
- Produces: `listAssignmentsForSchedule(scheduleId): Promise<ShiftAssignment[]>`, RPC `list_assignments_for_schedule`. The grid needs every assignment across an entire schedule at once (existing `list_assignments_for_shift` is per-shift only) to render employee×day cells without one request per shift.

- [ ] **Step 1: Add the method**

In `packages/services/src/scheduling/schedulingService.ts`, add directly after `removeAssignedShiftOnDate` (the last method Task 8 added), still before the `// ==================== Publishing ====================` section:

```typescript
  /** All active+inactive assignments across every shift in the schedule's date range, in one call — what the weekly grid needs to build its employee×day cells (list_assignments_for_shift is per-shift only). */
  async listAssignmentsForSchedule(scheduleId: string): Promise<ShiftAssignment[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('shifts.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const shifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      schedule.branch_id,
      schedule.start_date,
      schedule.end_date
    );
    if (shifts.length === 0) return [];
    return this.assignments.listForShifts(this.context.organizationId, shifts.map((shift) => shift.id));
  }
```

- [ ] **Step 2: Add the RPC operation**

In `packages/api/src/operations/scheduling.ts`, add directly after `removeAssignedShiftOnDate`'s `defineRpc` block (the last one Task 8 added):

```typescript
export const listAssignmentsForSchedule = defineRpc('list_assignments_for_schedule', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).listAssignmentsForSchedule(requiredStringField(input, 'scheduleId'));
});
```

Add `listAssignmentsForSchedule` to the `schedulingOperations` array (directly after `removeAssignedShiftOnDate`).

- [ ] **Step 3: Wire into the registry**

In `packages/api/src/registry.ts`: add `listAssignmentsForSchedule` to the scheduling import, and `registry.register(listAssignmentsForSchedule);` directly after `registry.register(removeAssignedShiftOnDate);` (the last of Task 8's registrations).

- [ ] **Step 4: Write the integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, TEST_FIXTURES, type TestContext } from '../testEnv.js';

describe('list assignments for schedule (bulk) integration', () => {
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

  it('returns assignments across two different shifts in the schedule in one call', async () => {
    const schedule = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Bulk assignments integration test schedule',
      startDate: '2027-10-25',
      endDate: '2027-10-31'
    });
    scheduleId = schedule.id;

    const first = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-26',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(first.shift.id);
    assignmentIds.push(first.assignment.id);

    const second = await ctx.call<{ shift: { id: string }; assignment: { id: string } }>('assign_shift_to_employee_on_date', {
      scheduleId,
      employeeId: TEST_FIXTURES.employeeId,
      date: '2027-10-27',
      startTime: '09:00',
      endTime: '17:00'
    });
    shiftIds.push(second.shift.id);
    assignmentIds.push(second.assignment.id);

    const all = await ctx.call<Array<{ id: string }>>('list_assignments_for_schedule', { scheduleId });
    expect(all.some((a) => a.id === first.assignment.id)).toBe(true);
    expect(all.some((a) => a.id === second.assignment.id)).toBe(true);
  });

  it('returns an empty array for a schedule with no shifts', async () => {
    const empty = await ctx.call<{ id: string }>('create_schedule', {
      branchId: TEST_FIXTURES.branchId,
      name: 'Empty bulk assignments integration test schedule',
      startDate: '2027-11-01',
      endDate: '2027-11-07'
    });
    const result = await ctx.call<Array<unknown>>('list_assignments_for_schedule', { scheduleId: empty.id });
    expect(result).toEqual([]);
    await ctx.client.query('DELETE FROM schedules WHERE organization_id = $1 AND id = $2', [TEST_FIXTURES.organizationId, empty.id]);
  });
});
```

- [ ] **Step 5: Build and run**

Run: `pnpm build && pnpm test:integration -- scheduleAssignmentsBulk`
Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/services/src/scheduling/schedulingService.ts packages/api/src/operations/scheduling.ts packages/api/src/registry.ts packages/tests/integration/scheduleAssignmentsBulk.integration.test.ts
git commit -m "feat(scheduling): add list_assignments_for_schedule bulk RPC"
```

---

### Task 10: `getScheduleConflicts` + RPC + integration test

**Files:**
- Modify: `packages/services/src/scheduling/schedulingService.ts`
- Modify: `packages/api/src/operations/scheduling.ts`
- Modify: `packages/api/src/registry.ts`
- Create: `packages/tests/integration/scheduleConflicts.integration.test.ts`

**Interfaces:**
- Produces: exported type `ScheduleConflict { employeeId: string; date: string; kind: 'double_booking' | 'long_shift'; detail: string }`, method `getScheduleConflicts(scheduleId): Promise<ScheduleConflict[]>`, RPC `get_schedule_conflicts`.

- [ ] **Step 1: Add the type and method**

In `packages/services/src/scheduling/schedulingService.ts`, add directly under the `AssignShiftToEmployeeInput`/`UpdateAssignedShiftInput` interfaces:

```typescript
export interface ScheduleConflict {
  employeeId: string;
  date: string;
  kind: 'double_booking' | 'long_shift';
  detail: string;
}

const LONG_SHIFT_HOURS_THRESHOLD = 10;
```

Add the method directly after `listAssignmentsForSchedule` (Task 9):

```typescript
  /**
   * Computed on read, nothing stored — SCH-012 §2.3 "validation does not
   * modify data". Detects two conditions: an employee double-booked across
   * overlapping active assignments on the same date, and any single shift
   * exceeding the 10-hour rule. Not wired into publishSchedule's validation
   * (spec §3.4) — conflicts are advisory in Phase 1, matching publish's
   * existing "at least one shift" - only check.
   */
  async getScheduleConflicts(scheduleId: string): Promise<ScheduleConflict[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');
    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    const shifts = await this.shifts.findByBranchAndDateRange(
      this.context.organizationId,
      schedule.branch_id,
      schedule.start_date,
      schedule.end_date
    );
    if (shifts.length === 0) return [];

    const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
    const assignments = await this.assignments.listForShifts(this.context.organizationId, shifts.map((shift) => shift.id));

    const conflicts: ScheduleConflict[] = [];
    const shiftsByEmployeeDate = new Map<string, Shift[]>();

    for (const assignment of assignments) {
      if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
      const shift = shiftsById.get(assignment.shift_id);
      if (!shift) continue;

      const key = `${assignment.employee_id}:${shift.shift_date}`;
      const list = shiftsByEmployeeDate.get(key) ?? [];
      list.push(shift);
      shiftsByEmployeeDate.set(key, list);

      const [hoursPart, minutesPart] = shift.duration.split(':').map(Number);
      const totalHours = hoursPart + minutesPart / 60;
      if (totalHours > LONG_SHIFT_HOURS_THRESHOLD) {
        conflicts.push({
          employeeId: assignment.employee_id,
          date: shift.shift_date,
          kind: 'long_shift',
          detail: `${shift.title} is ${hoursPart}h${minutesPart > 0 ? ` ${minutesPart}m` : ''} — over the 10-hour rule`
        });
      }
    }

    for (const [key, dayShifts] of shiftsByEmployeeDate) {
      if (dayShifts.length < 2) continue;
      const [employeeId, date] = key.split(':');
      conflicts.push({
        employeeId,
        date,
        kind: 'double_booking',
        detail: `Double-booked across ${dayShifts.length} shifts on ${date}`
      });
    }

    return conflicts;
  }
```

- [ ] **Step 2: Add the RPC operation**

In `packages/api/src/operations/scheduling.ts`, add directly after `listAssignmentsForSchedule`:

```typescript
export const getScheduleConflicts = defineRpc('get_schedule_conflicts', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new SchedulingService(context).getScheduleConflicts(requiredStringField(input, 'scheduleId'));
});
```

Add `getScheduleConflicts` to the `schedulingOperations` array.

- [ ] **Step 3: Wire into the registry**

Add `getScheduleConflicts` to the scheduling import in `packages/api/src/registry.ts` and `registry.register(getScheduleConflicts);` directly after `registry.register(listAssignmentsForSchedule);`.

- [ ] **Step 4: Write the integration test**

```typescript
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
```

- [ ] **Step 5: Build and run**

Run: `pnpm build && pnpm test:integration -- scheduleConflicts`
Expected: all three tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/services/src/scheduling/schedulingService.ts packages/api/src/operations/scheduling.ts packages/api/src/registry.ts packages/tests/integration/scheduleConflicts.integration.test.ts
git commit -m "feat(scheduling): add get_schedule_conflicts RPC"
```

---

## Part B — Frontend

### Task 11: Add new domain types

**Files:**
- Modify: `apps/web/src/types/domain.ts`

**Interfaces:**
- Produces: `ScheduleRosterEntry`, `ShiftTemplateStatus`, `ShiftTemplate`, `ScheduleConflict` types, for every frontend task from here on to import.

- [ ] **Step 1: Add the types**

Add directly after the existing `ShiftSwap`-related types at the end of `apps/web/src/types/domain.ts`:

```typescript
export interface ScheduleRosterEntry {
  id: string;
  organization_id: string;
  schedule_id: string;
  employee_id: string;
  added_by: string;
  added_at: string;
  deleted_at: string | null;
}

export type ShiftTemplateStatus = 'active' | 'archived';

export interface ShiftTemplate {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration: string;
  crosses_midnight: boolean;
  notes: string | null;
  status: ShiftTemplateStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ScheduleConflict {
  employeeId: string;
  date: string;
  kind: 'double_booking' | 'long_shift';
  detail: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0 (this only adds new exports, nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/domain.ts
git commit -m "feat(web): add schedule grid domain types"
```

---

### Task 12: Hours-summary utility

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/hours.ts`

**Interfaces:**
- Produces: `computeHoursSummary(shifts: Shift[], assignments: ShiftAssignment[], rosterEmployeeIds: string[]): EmployeeHoursSummary[]`, type `EmployeeHoursSummary { employeeId: string; hours: number; overtime: boolean }`. Consumed by Task 18 (`ScheduleSummaryBar`).

- [ ] **Step 1: Write the utility**

```typescript
import type { Shift, ShiftAssignment } from '../../../types/domain.js';

export interface EmployeeHoursSummary {
  employeeId: string;
  hours: number;
  overtime: boolean;
}

/** Hardcoded for Phase 1, not an org setting (spec §3.5). */
const OVERTIME_THRESHOLD_HOURS = 40;

function durationToHours(duration: string): number {
  const [hours, minutes] = duration.split(':').map(Number);
  return hours + minutes / 60;
}

/** Sums each roster employee's active-assignment hours for the week (breaks subtracted); flags anyone over the 40-hour threshold. */
export function computeHoursSummary(
  shifts: Shift[],
  assignments: ShiftAssignment[],
  rosterEmployeeIds: string[]
): EmployeeHoursSummary[] {
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const hoursByEmployee = new Map<string, number>();

  for (const assignment of assignments) {
    if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
    const shift = shiftsById.get(assignment.shift_id);
    if (!shift) continue;
    const hours = durationToHours(shift.duration) - shift.break_minutes / 60;
    hoursByEmployee.set(assignment.employee_id, (hoursByEmployee.get(assignment.employee_id) ?? 0) + hours);
  }

  return rosterEmployeeIds.map((employeeId) => {
    const hours = hoursByEmployee.get(employeeId) ?? 0;
    return { employeeId, hours, overtime: hours > OVERTIME_THRESHOLD_HOURS };
  });
}
```

- [ ] **Step 2: Sanity-check by hand**

For a roster of `['e1']`, one assignment on shift with `duration: '09:00:00'`, `break_minutes: 30`: `computeHoursSummary` should return `[{ employeeId: 'e1', hours: 8.5, overtime: false }]` (9 - 0.5 = 8.5). Trace through the code above to confirm this by inspection — no test runner is wired up for `apps/web` (Global Constraints), so this is a manual read-through, not an automated check.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/hours.ts
git commit -m "feat(web): add schedule hours-summary utility"
```

---

### Task 13: `AddEmployeeModal`

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/AddEmployeeModal.tsx`

**Interfaces:**
- Consumes: `Employee` type, `@shiftos/ui` (`Button`, `Modal`).
- Produces: `AddEmployeeModal` component, props `{ open, onClose, branchEmployees, onAdd, adding }`. Consumed by Task 19 (`ScheduleGrid`).

- [ ] **Step 1: Write the component**

```tsx
import React, { useState } from 'react';
import { Button, Modal } from '@shiftos/ui';
import type { Employee } from '../../../types/domain.js';

export interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  branchEmployees: Employee[];
  onAdd: (employeeId: string) => void;
  adding: boolean;
}

/** Roster picker (design handoff "Add Employees" modal) — multi-select, adds each pick via one add_employee_to_schedule call per selection. */
export function AddEmployeeModal({ open, onClose, branchEmployees, onAdd, adding }: AddEmployeeModalProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = branchEmployees.filter((employee) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(q) ||
      employee.employee_number.toLowerCase().includes(q)
    );
  });

  const toggle = (employeeId: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const confirm = (): void => {
    selected.forEach((employeeId) => onAdd(employeeId));
    setSelected(new Set());
    setQuery('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Employees" description="Pick everyone working this week — you can add more later.">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, role or department"
        className="mb-3 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Nobody matches that search.</p>
        ) : (
          filtered.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => toggle(employee.id)}
              className={[
                'flex items-center gap-3 rounded-lg border px-3 py-2 text-left',
                selected.has(employee.id) ? 'border-brand-400 bg-brand-50' : 'border-transparent hover:bg-neutral-50'
              ].join(' ')}
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900">
                  {employee.first_name} {employee.last_name}
                </span>
                <span className="block text-xs text-neutral-500">{employee.employee_number}</span>
              </span>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-neutral-500">{selected.size} selected</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={selected.size === 0} loading={adding}>
            Add to schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0 (unused-but-exported component, no consumer yet).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/AddEmployeeModal.tsx
git commit -m "feat(web): add AddEmployeeModal for schedule roster"
```

---

### Task 14: `ShiftCell`

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/ShiftCell.tsx`

**Interfaces:**
- Consumes: `Shift`, `ShiftAssignment` types.
- Produces: `ShiftCell` component, props `{ shift, assignment, hasConflict, canEdit, onClick }`. Consumed by Task 19 (`ScheduleGrid`).

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import type { Shift, ShiftAssignment } from '../../../types/domain.js';

export interface ShiftCellProps {
  shift: Shift | null;
  assignment: ShiftAssignment | null;
  hasConflict: boolean;
  canEdit: boolean;
  onClick: () => void;
}

/** One employee/day cell in the weekly grid: shows the assigned shift's time block, or "OFF" when empty. */
export function ShiftCell({ shift, assignment, hasConflict, canEdit, onClick }: ShiftCellProps): React.ReactElement {
  const isOff = !shift || !assignment;

  return (
    <button
      type="button"
      onClick={canEdit ? onClick : undefined}
      disabled={!canEdit}
      className={[
        'relative flex min-h-[64px] flex-col items-start justify-center gap-0.5 border-b border-r border-neutral-200 p-2 text-left transition-colors',
        canEdit ? 'cursor-pointer hover:bg-brand-50/40' : 'cursor-default',
        isOff ? 'bg-neutral-50' : 'bg-white'
      ].join(' ')}
    >
      {isOff ? (
        <span className="text-xs font-medium text-neutral-400">OFF</span>
      ) : (
        <>
          <span className="text-xs font-semibold text-neutral-900">
            {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
          </span>
          {assignment.notes ? <span className="truncate text-[10.5px] text-neutral-500">{assignment.notes}</span> : null}
        </>
      )}
      {hasConflict ? (
        <span
          title="Scheduling conflict"
          className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white"
        >
          !
        </span>
      ) : null}
    </button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ShiftCell.tsx
git commit -m "feat(web): add ShiftCell component for schedule grid"
```

---

### Task 15: `AssignShiftModal`

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/AssignShiftModal.tsx`

**Interfaces:**
- Consumes: `useRpcQuery`/`useRpcMutation` (`../../../lib/useRpc.js`), `Shift`/`ShiftAssignment`/`ShiftTemplate` types, `@shiftos/ui` (`Button`, `Checkbox`, `FormField`, `InlineError`, `Input`, `Modal`, `Select`).
- Produces: `AssignShiftModal` component, props `{ open, onClose, scheduleId, branchId, employeeId, employeeName, date, existing }` where `existing: { shift: Shift; assignment: ShiftAssignment } | null`. Consumed by Task 19 (`ScheduleGrid`). Calls RPCs `list_shift_templates`, `assign_shift_to_employee_on_date`, `update_assigned_shift_on_date`, `remove_assigned_shift_on_date`, `create_shift_template` (all from Part A).

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useState } from 'react';
import { Button, Checkbox, FormField, InlineError, Input, Modal, Select } from '@shiftos/ui';
import { useRpcMutation, useRpcQuery } from '../../../lib/useRpc.js';
import type { Shift, ShiftAssignment, ShiftTemplate } from '../../../types/domain.js';

export interface AssignShiftModalProps {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
  branchId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  existing: { shift: Shift; assignment: ShiftAssignment } | null;
}

const CUSTOM_VALUE = '__custom__';

/** Click-to-assign modal for one employee/day cell — templates, custom time, break, notes, save-as-template, day off/delete. */
export function AssignShiftModal({
  open,
  onClose,
  scheduleId,
  branchId,
  employeeId,
  employeeName,
  date,
  existing
}: AssignShiftModalProps): React.ReactElement {
  const { data: templates } = useRpcQuery<ShiftTemplate[]>('list_shift_templates', { branchId });

  const [templateId, setTemplateId] = useState<string>(existing?.shift.template_id ?? CUSTOM_VALUE);
  const [startTime, setStartTime] = useState(existing?.shift.start_time.slice(0, 5) ?? '09:00');
  const [endTime, setEndTime] = useState(existing?.shift.end_time.slice(0, 5) ?? '17:00');
  const [breakMinutes, setBreakMinutes] = useState(existing?.shift.break_minutes ?? 0);
  const [notes, setNotes] = useState(existing?.assignment.notes ?? '');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    setSaveAsTemplate(false);
    setTemplateName('');
    setError(null);
  }, [existing, open]);

  const assignMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'assign_shift_to_employee_on_date',
    {
      invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts'],
      onSuccess: onClose,
      onError: (err) => setError(err.message)
    }
  );
  const updateMutation = useRpcMutation<{ shift: Shift; assignment: ShiftAssignment }, Record<string, unknown>>(
    'update_assigned_shift_on_date',
    {
      invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts'],
      onSuccess: onClose,
      onError: (err) => setError(err.message)
    }
  );
  const removeMutation = useRpcMutation<unknown, { assignmentId: string }>('remove_assigned_shift_on_date', {
    invalidates: ['list_assignments_for_schedule', 'get_schedule_conflicts'],
    onSuccess: onClose,
    onError: (err) => setError(err.message)
  });
  const createTemplateMutation = useRpcMutation<ShiftTemplate, Record<string, unknown>>('create_shift_template', {
    invalidates: ['list_shift_templates']
  });

  const selectedTemplate = (templates ?? []).find((t) => t.id === templateId);

  const handleDayOff = (): void => {
    if (existing) {
      removeMutation.mutate({ assignmentId: existing.assignment.id });
    } else {
      onClose();
    }
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (templateId === CUSTOM_VALUE && (!startTime || !endTime)) {
      setError('Start and end time are required.');
      return;
    }
    setError(null);

    if (saveAsTemplate && templateName.trim()) {
      createTemplateMutation.mutate({ branchId, name: templateName.trim(), startTime, endTime, crossesMidnight: false });
    }

    const resolvedStart = templateId === CUSTOM_VALUE ? startTime : selectedTemplate?.start_time.slice(0, 5);
    const resolvedEnd = templateId === CUSTOM_VALUE ? endTime : selectedTemplate?.end_time.slice(0, 5);
    const resolvedNotes = notes.trim() || null;

    if (existing) {
      updateMutation.mutate({
        assignmentId: existing.assignment.id,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        breakMinutes,
        notes: resolvedNotes
      });
    } else {
      assignMutation.mutate({
        scheduleId,
        employeeId,
        date,
        templateId: templateId === CUSTOM_VALUE ? null : templateId,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        breakMinutes,
        notes: resolvedNotes
      });
    }
  };

  const busy = assignMutation.isPending || updateMutation.isPending || removeMutation.isPending;
  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit Shift' : 'Assign Shift'}
      description={`For ${employeeName} on ${formattedDate}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Choose a shift template" htmlFor="templateId">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              options={[
                ...(templates ?? []).map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.start_time.slice(0, 5)} – ${t.end_time.slice(0, 5)})`
                })),
                { value: CUSTOM_VALUE, label: 'Custom shift' }
              ]}
            />
          )}
        </FormField>

        {templateId === CUSTOM_VALUE ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start time" htmlFor="startTime" required>
              {(fieldProps) => <Input {...fieldProps} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
            </FormField>
            <FormField label="End time" htmlFor="endTime" required>
              {(fieldProps) => <Input {...fieldProps} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
            </FormField>
          </div>
        ) : null}

        <FormField label="Break (minutes)" htmlFor="breakMinutes">
          {(fieldProps) => (
            <Input {...fieldProps} type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
          )}
        </FormField>

        <FormField label="Notes (optional)" htmlFor="notes">
          {(fieldProps) => (
            <textarea
              {...fieldProps}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={100}
              className="min-h-[62px] w-full rounded-xl border border-neutral-200 p-2.5 text-sm outline-none focus:border-brand-400"
            />
          )}
        </FormField>

        {templateId === CUSTOM_VALUE ? (
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <Checkbox checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
            Save as a shift template
          </label>
        ) : null}
        {saveAsTemplate ? (
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name (e.g. Warehouse Shift)" />
        ) : null}

        {error ? <InlineError message={error} /> : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {existing ? (
            <Button type="button" variant="destructive" onClick={handleDayOff} loading={removeMutation.isPending}>
              Delete shift
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={handleDayOff}>
              Day off
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {existing ? 'Save changes' : 'Assign Shift'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/AssignShiftModal.tsx
git commit -m "feat(web): add AssignShiftModal for schedule grid cells"
```

---

### Task 16: `ScheduleConflictsPanel`

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/ScheduleConflictsPanel.tsx`

**Interfaces:**
- Consumes: `Employee`, `ScheduleConflict` types, `@shiftos/ui` (`Panel`).
- Produces: `ScheduleConflictsPanel` component, props `{ conflicts, employeesById, onSelectConflict }`. Consumed by Task 19.

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { Panel } from '@shiftos/ui';
import type { Employee, ScheduleConflict } from '../../../types/domain.js';

export interface ScheduleConflictsPanelProps {
  conflicts: ScheduleConflict[];
  employeesById: Map<string, Employee>;
  onSelectConflict: (conflict: ScheduleConflict) => void;
}

/** Right-rail "Schedule Conflicts" card — lists up to 4 conflicts, clicking one jumps to that cell (design handoff line ~656-679). */
export function ScheduleConflictsPanel({ conflicts, employeesById, onSelectConflict }: ScheduleConflictsPanelProps): React.ReactElement {
  return (
    <Panel
      title="Schedule Conflicts"
      actions={
        conflicts.length > 0 ? (
          <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-bold text-error-text">{conflicts.length}</span>
        ) : null
      }
    >
      {conflicts.length === 0 ? (
        <p className="text-xs text-neutral-500">No conflicts. Nobody is double-booked and nobody breaks the 10-hour rule.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {conflicts.slice(0, 4).map((conflict, index) => {
            const employee = employeesById.get(conflict.employeeId);
            return (
              <button
                key={`${conflict.employeeId}-${conflict.date}-${index}`}
                type="button"
                onClick={() => onSelectConflict(conflict)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-neutral-50"
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-neutral-900">
                    {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown employee'}
                  </span>
                  <span className="block truncate text-[10.5px] text-neutral-500">{conflict.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ScheduleConflictsPanel.tsx
git commit -m "feat(web): add ScheduleConflictsPanel"
```

---

### Task 17: `AiAssistantPanel` (inert, Phase 1)

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/AiAssistantPanel.tsx`

**Interfaces:**
- Consumes: `@shiftos/ui` (`Badge`, `Panel`, `QuickAction`), `lucide-react` icons (already a dependency, used elsewhere in `apps/web/src`).
- Produces: `AiAssistantPanel` component, no props. Consumed by Task 19. Every action shows a "Coming soon" message and makes no network calls (spec §1/§7 — Phase 3 is the real AI logic).

- [ ] **Step 1: Write the component**

```tsx
import React, { useState } from 'react';
import { CheckCircle, Sliders, Clock, AlertTriangle, Send } from 'lucide-react';
import { Badge, Panel, QuickAction } from '@shiftos/ui';

const ACTIONS = [
  { icon: CheckCircle, label: 'Fill empty shifts', description: 'Automatically fill gaps' },
  { icon: Sliders, label: 'Balance workloads', description: 'Distribute hours evenly' },
  { icon: Clock, label: 'Avoid overtime', description: 'Prevent overtime & fatigue' },
  { icon: AlertTriangle, label: 'Resolve conflicts', description: 'Fix scheduling conflicts' }
];

/** Right-rail "AI Schedule Assistant" card — pixel match to the design handoff, every action inert until Phase 3 wires up real logic. */
export function AiAssistantPanel(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showComingSoon = (): void => {
    setToast('Coming soon');
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <Panel title="AI Schedule Assistant" description="Get help optimizing your schedule." actions={<Badge tone="pending">Beta</Badge>}>
      <div className="flex flex-col gap-2">
        {ACTIONS.map((action) => (
          <QuickAction key={action.label} icon={action.icon} label={action.label} description={action.description} onClick={showComingSoon} />
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          showComingSoon();
          setQuery('');
        }}
        className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about the schedule…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
        />
        <button type="submit" aria-label="Send" className="text-brand-700">
          <Send size={14} />
        </button>
      </form>
      {toast ? <p className="mt-2 text-[10.5px] font-semibold text-brand-700">{toast}</p> : null}
    </Panel>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/AiAssistantPanel.tsx
git commit -m "feat(web): add inert AiAssistantPanel (Phase 3 logic deferred)"
```

---

### Task 18: `ScheduleSummaryBar`

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/ScheduleSummaryBar.tsx`

**Interfaces:**
- Consumes: `computeHoursSummary` (Task 12), `Employee`/`Shift`/`ShiftAssignment` types, `@shiftos/ui` (`Button`, `StatCard`), `lucide-react` icons.
- Produces: `ScheduleSummaryBar` component. Consumed by Task 19.

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { Button, StatCard } from '@shiftos/ui';
import { Users, CalendarCheck, UserX, AlertTriangle, PieChart } from 'lucide-react';
import type { Employee, Shift, ShiftAssignment } from '../../../types/domain.js';
import { computeHoursSummary } from './hours.js';

export interface ScheduleSummaryBarProps {
  totalEmployees: number;
  rosterCount: number;
  scheduledCount: number;
  conflictCount: number;
  open: boolean;
  onToggle: () => void;
  shifts: Shift[];
  assignments: ShiftAssignment[];
  employeesById: Map<string, Employee>;
  rosterEmployeeIds: string[];
}

/**
 * Stats footer + expandable hours breakdown (design handoff line ~690-736).
 * Coverage here is (scheduled ÷ roster) — there is no "required staffing
 * level" concept in this schema, so it will not numerically match the
 * mock's illustrative 100% (spec §7.2).
 */
export function ScheduleSummaryBar({
  totalEmployees,
  rosterCount,
  scheduledCount,
  conflictCount,
  open,
  onToggle,
  shifts,
  assignments,
  employeesById,
  rosterEmployeeIds
}: ScheduleSummaryBarProps): React.ReactElement {
  const coverage = rosterCount === 0 ? 0 : Math.round((scheduledCount / rosterCount) * 100);
  const summaryRows = computeHoursSummary(shifts, assignments, rosterEmployeeIds).map((row) => ({
    ...row,
    employee: employeesById.get(row.employeeId)
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-3.5">
        <StatCard label="Total Employees" value={totalEmployees} icon={Users} className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <StatCard label="Scheduled" value={scheduledCount} icon={CalendarCheck} tone="brand" className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <StatCard
          label="Unscheduled"
          value={Math.max(rosterCount - scheduledCount, 0)}
          icon={UserX}
          className="min-w-[130px] flex-1 border-0 p-0 shadow-none"
        />
        <StatCard label="Conflicts" value={conflictCount} icon={AlertTriangle} className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <StatCard label="Coverage" value={`${coverage}%`} icon={PieChart} tone="brand" className="min-w-[130px] flex-1 border-0 p-0 shadow-none" />
        <Button variant="ghost" size="sm" onClick={onToggle} className="ml-auto">
          Schedule Summary {open ? '▲' : '▼'}
        </Button>
      </div>

      {open ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center gap-2 border-b border-neutral-100 p-3.5">
            <h2 className="text-sm font-bold text-neutral-900">Hours per employee</h2>
            <span className="ml-auto text-xs text-neutral-400">Paid hours · breaks removed</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {summaryRows.map((row) => (
              <div key={row.employeeId} className="flex items-center gap-2.5 border-b border-r border-neutral-100 p-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                  {row.employee ? `${row.employee.first_name[0]}${row.employee.last_name[0]}` : '?'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-xs font-semibold text-neutral-900">
                      {row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : 'Unknown'}
                    </span>
                    <span className={['ml-auto text-xs font-bold', row.overtime ? 'text-warning-text' : 'text-neutral-900'].join(' ')}>
                      {row.hours.toFixed(1)}h
                    </span>
                  </span>
                  {row.overtime ? <span className="text-[10.5px] font-semibold text-warning-text">Over 40h</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ScheduleSummaryBar.tsx
git commit -m "feat(web): add ScheduleSummaryBar with hours breakdown"
```

---

### Task 19: `ScheduleGrid` (ties everything together)

**Files:**
- Create: `apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx`

**Interfaces:**
- Consumes: `useRpcQuery`/`useRpcMutation`, `Employee`/`Schedule`/`ScheduleConflict`/`ScheduleRosterEntry`/`Shift`/`ShiftAssignment` types, `@shiftos/ui` (`Button`), and every component from Tasks 13–18 (`AddEmployeeModal`, `AssignShiftModal`, `ShiftCell`, `ScheduleConflictsPanel`, `AiAssistantPanel`, `ScheduleSummaryBar`).
- Produces: `ScheduleGrid` component, props `{ scheduleId: string; schedule: Schedule; canEdit: boolean }`. Consumed by Task 20 (`ScheduleBuilderPage`). Calls RPCs `list_schedule_roster`, `list_employees`, `list_shifts_for_schedule`, `list_assignments_for_schedule`, `get_schedule_conflicts`, `add_employee_to_schedule`, `remove_employee_from_schedule` (all from Part A / pre-existing).

- [ ] **Step 1: Write the component**

```tsx
import React, { useMemo, useState } from 'react';
import { Button } from '@shiftos/ui';
import { useRpcMutation, useRpcQuery } from '../../../lib/useRpc.js';
import type {
  Employee,
  Schedule,
  ScheduleConflict,
  ScheduleRosterEntry,
  Shift,
  ShiftAssignment
} from '../../../types/domain.js';
import { AddEmployeeModal } from './AddEmployeeModal.js';
import { AiAssistantPanel } from './AiAssistantPanel.js';
import { AssignShiftModal } from './AssignShiftModal.js';
import { ScheduleConflictsPanel } from './ScheduleConflictsPanel.js';
import { ScheduleSummaryBar } from './ScheduleSummaryBar.js';
import { ShiftCell } from './ShiftCell.js';

export interface ScheduleGridProps {
  scheduleId: string;
  schedule: Schedule;
  canEdit: boolean;
}

function activeCellKey(employeeId: string, date: string): string {
  return `${employeeId}:${date}`;
}

/** The weekly employee × day grid — WEB-012 replacement (design handoff "Manager/Schedules" / "Supervisor/Schedules"). */
export function ScheduleGrid({ scheduleId, schedule, canEdit }: ScheduleGridProps): React.ReactElement {
  const { data: roster, isLoading: rosterLoading } = useRpcQuery<ScheduleRosterEntry[]>('list_schedule_roster', { scheduleId });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', { branchId: schedule.branch_id });
  const { data: shifts, isLoading: shiftsLoading } = useRpcQuery<Shift[]>('list_shifts_for_schedule', { scheduleId });
  const { data: assignments } = useRpcQuery<ShiftAssignment[]>('list_assignments_for_schedule', { scheduleId });
  const { data: conflicts } = useRpcQuery<ScheduleConflict[]>('get_schedule_conflicts', { scheduleId });

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const employeesById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, e])), [employees]);
  const shiftsById = useMemo(() => new Map((shifts ?? []).map((s) => [s.id, s])), [shifts]);

  const days = useMemo(() => {
    const result: string[] = [];
    const cursor = new Date(`${schedule.start_date}T00:00:00`);
    for (let i = 0; i < 7; i += 1) {
      result.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [schedule.start_date]);

  const cellAssignments = useMemo(() => {
    const map = new Map<string, { assignment: ShiftAssignment; shift: Shift }>();
    for (const assignment of assignments ?? []) {
      if (assignment.assignment_status === 'cancelled' || assignment.assignment_status === 'declined') continue;
      const shift = shiftsById.get(assignment.shift_id);
      if (!shift) continue;
      map.set(activeCellKey(assignment.employee_id, shift.shift_date), { assignment, shift });
    }
    return map;
  }, [assignments, shiftsById]);

  const conflictsByCell = useMemo(() => {
    const map = new Map<string, ScheduleConflict[]>();
    for (const conflict of conflicts ?? []) {
      const key = activeCellKey(conflict.employeeId, conflict.date);
      const list = map.get(key) ?? [];
      list.push(conflict);
      map.set(key, list);
    }
    return map;
  }, [conflicts]);

  const rosterEmployees = (roster ?? [])
    .map((entry) => employeesById.get(entry.employee_id))
    .filter((e): e is Employee => Boolean(e));

  const addEmployeeMutation = useRpcMutation<ScheduleRosterEntry, { scheduleId: string; employeeId: string }>(
    'add_employee_to_schedule',
    { invalidates: ['list_schedule_roster'] }
  );
  const removeEmployeeMutation = useRpcMutation<ScheduleRosterEntry, { scheduleId: string; employeeId: string }>(
    'remove_employee_from_schedule',
    { invalidates: ['list_schedule_roster'] }
  );

  const isLoading = rosterLoading || shiftsLoading;
  const scheduledCount = rosterEmployees.filter((e) => days.some((d) => cellAssignments.has(activeCellKey(e.id, d)))).length;

  const activeEmployee = activeCell ? employeesById.get(activeCell.employeeId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <div className="grid" style={{ gridTemplateColumns: '200px repeat(7, minmax(120px, 1fr))' }}>
            <div className="border-b border-r border-neutral-200 p-3 text-xs font-semibold uppercase text-neutral-400">Employee</div>
            {days.map((day) => (
              <div key={day} className="border-b border-neutral-200 p-3 text-center text-xs font-semibold text-neutral-500">
                <div>{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div className="text-neutral-400">{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
            ))}

            {isLoading ? (
              <div className="col-span-8 p-8 text-center text-sm text-neutral-500">Loading schedule…</div>
            ) : rosterEmployees.length === 0 ? (
              <div className="col-span-8 p-10 text-center">
                <p className="text-sm font-semibold text-neutral-700">Nobody on this schedule yet</p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  Use Add Employee below to pick who is working this week — every person gets seven empty days you can fill.
                </p>
              </div>
            ) : (
              rosterEmployees.map((employee) => (
                <React.Fragment key={employee.id}>
                  <div className="flex items-center justify-between gap-2 border-b border-r border-neutral-200 p-3">
                    <span className="truncate text-sm font-semibold text-neutral-900">
                      {employee.first_name} {employee.last_name}
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        title="Remove from schedule"
                        onClick={() => removeEmployeeMutation.mutate({ scheduleId, employeeId: employee.id })}
                        className="flex-shrink-0 text-xs text-neutral-400 hover:text-error-500"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                  {days.map((day) => {
                    const cell = cellAssignments.get(activeCellKey(employee.id, day));
                    const cellConflicts = conflictsByCell.get(activeCellKey(employee.id, day)) ?? [];
                    return (
                      <ShiftCell
                        key={day}
                        shift={cell?.shift ?? null}
                        assignment={cell?.assignment ?? null}
                        hasConflict={cellConflicts.length > 0}
                        canEdit={canEdit}
                        onClick={() => setActiveCell({ employeeId: employee.id, date: day })}
                      />
                    );
                  })}
                </React.Fragment>
              ))
            )}

            {canEdit ? (
              <div className="col-span-8 border-t border-neutral-200 p-3">
                <Button variant="secondary" size="sm" onClick={() => setAddEmployeeOpen(true)}>
                  + Add Employee
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="flex w-[268px] flex-shrink-0 flex-col gap-3.5">
          <AiAssistantPanel />
          <ScheduleConflictsPanel
            conflicts={conflicts ?? []}
            employeesById={employeesById}
            onSelectConflict={(conflict) => setActiveCell({ employeeId: conflict.employeeId, date: conflict.date })}
          />
        </aside>
      </div>

      <ScheduleSummaryBar
        totalEmployees={(employees ?? []).length}
        rosterCount={rosterEmployees.length}
        scheduledCount={scheduledCount}
        conflictCount={(conflicts ?? []).length}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((v) => !v)}
        shifts={shifts ?? []}
        assignments={assignments ?? []}
        employeesById={employeesById}
        rosterEmployeeIds={rosterEmployees.map((e) => e.id)}
      />

      {addEmployeeOpen ? (
        <AddEmployeeModal
          open={addEmployeeOpen}
          onClose={() => setAddEmployeeOpen(false)}
          branchEmployees={(employees ?? []).filter((e) => !rosterEmployees.some((r) => r.id === e.id))}
          onAdd={(employeeId) => addEmployeeMutation.mutate({ scheduleId, employeeId })}
          adding={addEmployeeMutation.isPending}
        />
      ) : null}

      {activeCell ? (
        <AssignShiftModal
          open={Boolean(activeCell)}
          onClose={() => setActiveCell(null)}
          scheduleId={scheduleId}
          branchId={schedule.branch_id}
          employeeId={activeCell.employeeId}
          employeeName={activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : ''}
          date={activeCell.date}
          existing={cellAssignments.get(activeCellKey(activeCell.employeeId, activeCell.date)) ?? null}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/scheduling/grid/ScheduleGrid.tsx
git commit -m "feat(web): add ScheduleGrid container component"
```

---

### Task 20: Wire `ScheduleGrid` into `ScheduleBuilderPage`, retire `ShiftModal`

**Files:**
- Modify: `apps/web/src/pages/scheduling/ScheduleBuilderPage.tsx`
- Delete: `apps/web/src/pages/scheduling/ShiftModal.tsx` (its entire role — cell-level shift create/edit/assign — is now `AssignShiftModal`; confirmed via `grep -rl ShiftModal apps/web/src` that `ScheduleBuilderPage.tsx` is its only remaining caller)

**Interfaces:**
- Consumes: `ScheduleGrid` (Task 19).
- Produces: the "Shifts" tab of `ScheduleBuilderPage` now renders the grid instead of the flat `DataTable`.

- [ ] **Step 1: Replace the shifts-tab imports and state**

In `apps/web/src/pages/scheduling/ScheduleBuilderPage.tsx`:

Remove the `ShiftModal` import (`import { ShiftModal } from './ShiftModal.js';`) and add:

```typescript
import { ScheduleGrid } from './grid/ScheduleGrid.js';
```

Remove these now-unused pieces from the component body: the `SHIFT_STATUS_TONE` constant, the `shiftModalOpen`/`editingShift` state (`const [shiftModalOpen, setShiftModalOpen] = useState(false);` and `const [editingShift, setEditingShift] = useState<Shift | null>(null);`), the `shifts`/`shiftsLoading` query (`const { data: shifts, isLoading: shiftsLoading } = useRpcQuery<Shift[]>('list_shifts_for_schedule', ...)`), and the `employees` query (`const { data: employees } = useRpcQuery<Employee[]>('list_employees', ...)`) — `ScheduleGrid` fetches all of this itself.

Remove the now-unused `Shift`/`Employee` type imports if nothing else in the file still uses them (check with a search inside the file first — `Schedule`, `ScheduleStatus`, `ScheduleVersion` are still used by the rest of the file and must stay imported).

- [ ] **Step 2: Replace the shifts-tab JSX**

Replace this whole block:

```tsx
      {tab === 'shifts' ? (
        <>
          {canCreateShift ? (
            <div className="mb-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingShift(null);
                  setShiftModalOpen(true);
                }}
              >
                Add Shift
              </Button>
            </div>
          ) : null}
          <DataTable<Shift>
            columns={[
              { key: 'title', header: 'Title', primary: true, render: (s) => s.title },
              { key: 'date', header: 'Date', render: (s) => new Date(s.shift_date).toLocaleDateString() },
              { key: 'time', header: 'Time', render: (s) => `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}` },
              { key: 'status', header: 'Status', render: (s) => <Badge tone={SHIFT_STATUS_TONE[s.status]}>{s.status}</Badge> }
            ]}
            rows={shifts ?? []}
            rowKey={(s) => s.id}
            loading={shiftsLoading}
            onRowClick={(s) => {
              setEditingShift(s);
              setShiftModalOpen(true);
            }}
            emptyTitle="No shifts yet"
            emptyDescription="At least one shift is required before this schedule can be published."
            emptyAction={canCreateShift ? { label: 'Add Shift', onClick: () => setShiftModalOpen(true) } : undefined}
          />
        </>
      ) : (
```

with:

```tsx
      {tab === 'shifts' ? (
        <ScheduleGrid scheduleId={scheduleId} schedule={schedule} canEdit={canCreateShift} />
      ) : (
```

- [ ] **Step 3: Remove the `ShiftModal` render block**

Remove this block entirely (directly before the `<ConfirmationDialog` for publish):

```tsx
      {shiftModalOpen ? (
        <ShiftModal
          open={shiftModalOpen}
          onClose={() => setShiftModalOpen(false)}
          scheduleId={scheduleId}
          shift={editingShift}
          employees={(employees ?? []).filter((e) => e.branch_id === schedule.branch_id)}
          onCreated={(created) => setEditingShift(created)}
        />
      ) : null}
```

- [ ] **Step 4: Delete `ShiftModal.tsx`**

```bash
git rm apps/web/src/pages/scheduling/ShiftModal.tsx
```

- [ ] **Step 5: Verify it compiles**

Run: `pnpm --filter @shiftos/web build`
Expected: exits 0 — this is the step that would catch a leftover unused import or a stale reference to a removed piece of state.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/scheduling/ScheduleBuilderPage.tsx
git commit -m "feat(web): replace shift table with weekly grid on Schedules page"
```

---

### Task 21: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev servers**

Run: `pnpm dev:backend` (in one terminal) and `pnpm dev:web` (in another).

- [ ] **Step 2: Exercise the golden path**

In the browser: sign in as a Supervisor-role test user, navigate to a schedule's Schedules page, and confirm:
- The page renders the weekly grid (not a table), with the AI Assistant and Schedule Conflicts panels in the right rail and the stats bar at the bottom, matching the shared screenshot's layout.
- "+ Add Employee" opens the picker, search filters the list, selecting one or more and confirming adds them as new rows with all 7 days showing "OFF".
- Clicking an OFF cell opens "Assign Shift"; picking a template or entering a custom start/end time and clicking "Assign Shift" fills the cell and shows the time range.
- Clicking a filled cell opens "Edit Shift" pre-filled with its current values; changing the time and saving updates the cell.
- Clicking "Delete shift" on a filled cell clears it back to "OFF".
- Assigning the same employee to two overlapping shifts on the same date (via re-using the old `create_shift`/`assign_employee` path, or by checking a shift over 10 hours) shows the red conflict badge on the cell and a matching row in the Schedule Conflicts panel; clicking that row opens the right cell.
- "Schedule Summary" expands to show per-employee hours, and an employee with over 40 scheduled hours shows the overtime flag.
- Every AI Schedule Assistant button shows a "Coming soon" message and does not error.

- [ ] **Step 3: Exercise the read-only path**

Sign in as (or switch to) a Manager-role or Staff-role test user and confirm the grid renders read-only where the permission table in the spec (§5) says it should (no Add Employee button, no cell click) without console errors.

- [ ] **Step 4: Note any visual deviations from the screenshot**

Since this task is explicitly meant to match the handoff "exactly" (per the user's own words), use this pass to catch any spacing/color/copy mismatch against the screenshot and fix them directly in the relevant Task 13–19 component files, then re-run this verification step.

- [ ] **Step 5: Stop the dev servers** (no commit — this task produces no file changes unless Step 4 found something to fix, in which case commit those fixes against the task file they belong to)
