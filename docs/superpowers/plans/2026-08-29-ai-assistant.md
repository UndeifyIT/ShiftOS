# ShiftOS AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace "Ask ShiftOS"'s hardcoded keyword-matcher with a real OpenAI-backed, tool-calling assistant that answers questions from live org data and can navigate the UI, available to every signed-in role, bounded entirely by the app's own existing permission-checked RPC catalog.

**Architecture:** One new backend RPC (`ask_assistant`) builds a tool list from an explicit allowlist of existing read-only operations plus a synthetic `navigate` tool, runs a capped tool-calling loop against OpenAI's chat completions endpoint (raw `fetch`, no new SDK dependency), and executes any tool the model calls via that operation's own `.handler(context, args)` — reusing the caller's already-resolved `ApplicationContext` so every existing permission/branch-scoping check fires exactly as it would from a normal UI click. One new shared frontend component (`AssistantPanel`) is mounted from the TopBar for every role and reused (not duplicated) by the Admin Console's existing card.

**Tech Stack:** TypeScript, Node's built-in `fetch` (no `openai` npm package), Vitest, React, `@tanstack/react-query` (via this repo's existing `useRpcMutation`).

**Spec:** `docs/superpowers/specs/2026-08-29-ai-assistant-design.md`

## Global Constraints

- No new npm dependency for the OpenAI call — raw `fetch` to `https://api.openai.com/v1/chat/completions`, per the spec's explicit reasoning (Node's built-in `fetch` already covers a single JSON-over-HTTPS endpoint).
- The tool catalog is a fixed, explicit allowlist of already-existing **read-only** operations (`list_*`/`get_*`/`count_*`) plus the synthetic `navigate` tool. Never `create_*`/`update_*`/`approve_*`/`archive_*`/etc., and never "every registered operation" — adding a new tool later is a deliberate, reviewed addition to the allowlist, not something the model can expand itself.
- Every real tool call executes via that operation's own `.handler(context, args)`, reusing the `ApplicationContext` already resolved for the `ask_assistant` call — never a second `createApplicationContext()` round trip, and never a new authorization mechanism.
- `navigate` is not a real operation and never touches `RpcRegistry` — its `path` argument is checked against a fixed allowlist (`APP_ROUTES` in `@shiftos/constants`, shared with the frontend) before being returned to the client.
- `OPENAI_API_KEY` is optional in config (may be unset for a while — the user will add the real key later). `askAssistant` must check for it first and return a typed "not configured" result, never throw, when it's absent.
- `OPENAI_MODEL` defaults to `'gpt-4o-mini'` when unset.
- v1 is single-shot per question — no conversation history is sent on a later question.
- Performing actions, multi-turn memory, rate limiting, and streaming are explicitly out of scope for this plan (see the spec's "Out of scope" section) — do not add them.

---

## Task 1: OpenAI config fields

**Files:**
- Modify: `packages/config/src/index.ts`
- Test: `packages/tests/unit/config.test.ts` (new)

**Interfaces:**
- Produces: `AppConfig.OPENAI_API_KEY?: string`, `AppConfig.OPENAI_MODEL: string`, both returned by the existing `loadConfig(): AppConfig`.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/unit/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '@shiftos/config';

const REQUIRED_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
};

describe('loadConfig OpenAI fields', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults OPENAI_API_KEY to undefined and OPENAI_MODEL to gpt-4o-mini when unset', () => {
    const config = loadConfig();
    expect(config.OPENAI_API_KEY).toBeUndefined();
    expect(config.OPENAI_MODEL).toBe('gpt-4o-mini');
  });

  it('reads OPENAI_API_KEY and OPENAI_MODEL from the environment when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_MODEL = 'gpt-4o';
    const config = loadConfig();
    expect(config.OPENAI_API_KEY).toBe('sk-test-key');
    expect(config.OPENAI_MODEL).toBe('gpt-4o');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/config.test.ts`
Expected: FAIL — `Property 'OPENAI_API_KEY' does not exist on type 'AppConfig'` (or the test simply can't find those fields set).

- [ ] **Step 3: Implement**

In `packages/config/src/index.ts`, add to the `AppConfig` interface (after `SUPABASE_SERVICE_ROLE_KEY?`):

```typescript
  /**
   * Optional: the AI assistant (packages/api/src/operations/assistant.ts)
   * checks for this itself and returns a typed "not configured" result
   * when absent, rather than the app failing to boot without it.
   */
  OPENAI_API_KEY?: string;
  /** Defaults to a cheap, tool-calling-capable model — no reason to default larger for short Q&A + tool selection. */
  OPENAI_MODEL: string;
```

And in `loadConfig()`'s returned object (after `SUPABASE_SERVICE_ROLE_KEY: ...`):

```typescript
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/config/src/index.ts packages/tests/unit/config.test.ts
git commit -m "feat(assistant): add OPENAI_API_KEY/OPENAI_MODEL config fields"
```

---

## Task 2: Shared route allowlist

**Files:**
- Modify: `packages/constants/src/index.ts`
- Modify: `apps/web/src/layout/Sidebar.tsx` (comment only, no logic change)
- Test: `packages/tests/unit/appRoutes.test.ts` (new)

**Interfaces:**
- Produces: `APP_ROUTES: readonly string[]` from `@shiftos/constants`, the fixed list of real in-app paths — used by Task 3's `isAllowedRoute()` and, for reference, matches `Sidebar.tsx`'s `NAV_ITEMS[].to` values.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/unit/appRoutes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { APP_ROUTES } from '@shiftos/constants';

describe('APP_ROUTES', () => {
  it('includes the known dashboard/operational routes', () => {
    for (const path of ['/', '/schedules', '/employees', '/tasks', '/attendance', '/announcements', '/requests']) {
      expect(APP_ROUTES).toContain(path);
    }
  });

  it('does not include an external or made-up path', () => {
    expect(APP_ROUTES).not.toContain('https://evil.example.com');
    expect(APP_ROUTES).not.toContain('/not-a-real-route');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/appRoutes.test.ts`
Expected: FAIL — `'APP_ROUTES' is not exported from '@shiftos/constants'` (or import error).

- [ ] **Step 3: Implement**

Add to `packages/constants/src/index.ts` (at the end of the file):

```typescript
/**
 * Every real in-app route the AI assistant's `navigate` tool is allowed to
 * send a user to (packages/api/src/operations/assistant.ts's
 * isAllowedRoute()) — kept in sync by hand with
 * apps/web/src/layout/Sidebar.tsx's NAV_ITEMS[].to, since a frontend .tsx
 * file can't be imported from this backend-and-frontend-shared package.
 * Adding a new page to Sidebar.tsx's NAV_ITEMS should add its path here
 * too if the assistant should be able to navigate to it.
 */
export const APP_ROUTES = [
  '/',
  '/schedules',
  '/employees',
  '/tasks',
  '/attendance',
  '/announcements',
  '/requests',
  '/branches',
  '/members',
  '/invitations',
  '/organization',
  '/admin',
  '/profile',
  '/security'
] as const;
```

In `apps/web/src/layout/Sidebar.tsx`, add a one-line comment immediately above `export const NAV_ITEMS: NavItem[] = [` (no other change to this file):

```typescript
// If you add or remove a route here, also update APP_ROUTES in packages/constants/src/index.ts — the AI assistant's navigate tool checks paths against that list, not this one (a frontend file can't be imported from the backend).
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/appRoutes.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/constants/src/index.ts apps/web/src/layout/Sidebar.tsx packages/tests/unit/appRoutes.test.ts
git commit -m "feat(assistant): add shared APP_ROUTES allowlist"
```

---

## Task 3: Tool catalog and route/error helpers

**Files:**
- Create: `packages/api/src/operations/assistant.ts`
- Modify: `packages/api/package.json` (add `@shiftos/constants` and `@shiftos/config` dependencies)
- Test: `packages/tests/unit/assistantTools.test.ts` (new)

**Interfaces:**
- Consumes: `APP_ROUTES` from `@shiftos/constants` (Task 2).
- Produces: `ASSISTANT_TOOLS: AssistantToolSchema[]`, `isAllowedRoute(path: string): boolean`, `toSafeToolErrorMessage(error: unknown): string | null` — all named exports of `packages/api/src/operations/assistant.ts`. `AssistantToolSchema` is also exported (the OpenAI-tool-shaped type Task 5's HTTP call will send as `tools`).

- [ ] **Step 1: Write the failing test**

Create `packages/tests/unit/assistantTools.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ASSISTANT_TOOLS, isAllowedRoute, toSafeToolErrorMessage } from '@shiftos/api';
import { AuthorizationError, ValidationError } from '@shiftos/errors';

describe('ASSISTANT_TOOLS', () => {
  it('includes the expected read-only tool names', () => {
    const names = ASSISTANT_TOOLS.map((t) => t.function.name);
    for (const expected of [
      'navigate', 'list_branches', 'list_employees', 'list_tasks',
      'list_attendance_for_branch_and_range', 'get_attendance_summary_report'
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('never includes a mutating operation', () => {
    const names = ASSISTANT_TOOLS.map((t) => t.function.name);
    for (const name of names) {
      expect(name).not.toMatch(/^(create|update|delete|archive|approve|reject|assign|complete|verify|publish|acknowledge|clock|record|revoke|invite)_/);
    }
  });

  it('every tool has a non-empty description and an object-typed parameters schema', () => {
    for (const tool of ASSISTANT_TOOLS) {
      expect(tool.function.description.length).toBeGreaterThan(0);
      expect(tool.function.parameters.type).toBe('object');
    }
  });
});

describe('isAllowedRoute', () => {
  it('allows a known app route', () => {
    expect(isAllowedRoute('/attendance')).toBe(true);
  });

  it('rejects an external URL', () => {
    expect(isAllowedRoute('https://evil.example.com')).toBe(false);
  });

  it('rejects an unknown path', () => {
    expect(isAllowedRoute('/not-a-real-route')).toBe(false);
  });
});

describe('toSafeToolErrorMessage', () => {
  it('returns a safe message for AuthorizationError', () => {
    const message = toSafeToolErrorMessage(new AuthorizationError('You lack schedules.read'));
    expect(message).toBe('not permitted');
  });

  it('returns a safe message for ValidationError', () => {
    const message = toSafeToolErrorMessage(new ValidationError('branchId is required'));
    expect(message).toBe('invalid request: branchId is required');
  });

  it('returns null for an unexpected error, signaling it should be rethrown', () => {
    expect(toSafeToolErrorMessage(new Error('boom'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantTools.test.ts`
Expected: FAIL — `Module '"@shiftos/api"' has no exported member 'ASSISTANT_TOOLS'` (the file doesn't exist yet).

- [ ] **Step 3: Add dependencies**

In `packages/api/package.json`, add to `"dependencies"` (alphabetical, matching the existing list's style):

```json
    "@shiftos/config": "workspace:*",
    "@shiftos/constants": "workspace:*",
```

(Full `dependencies` block should read: `@shiftos/auth`, `@shiftos/config`, `@shiftos/constants`, `@shiftos/database`, `@shiftos/errors`, `@shiftos/repositories`, `@shiftos/services`, `@shiftos/types`, `@shiftos/utils` — keep alphabetical.)

Run `pnpm install` from the repo root after this change (workspace dependency graph changed).

- [ ] **Step 4: Implement**

Create `packages/api/src/operations/assistant.ts`:

```typescript
import { AuthorizationError, ValidationError } from '@shiftos/errors';
import { APP_ROUTES } from '@shiftos/constants';

/** One OpenAI "function" tool definition — the shape OpenAI's chat completions `tools` array expects. */
export interface AssistantToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

function tool(
  name: string,
  description: string,
  properties: Record<string, { type: string; description: string; enum?: string[] }> = {},
  required: string[] = []
): AssistantToolSchema {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } };
}

/**
 * The AI assistant's full tool catalog (design spec, "Backend" section) —
 * a fixed, explicit allowlist of already-existing read-only operations plus
 * the synthetic `navigate` tool. Every real tool here is executed via that
 * operation's own already-permission-checked handler (Task 4/5) — this
 * list only decides what the model is *offered*, never bypasses anything.
 * Adding a tool here is a deliberate, reviewed change, not something the
 * model can expand itself.
 */
export const ASSISTANT_TOOLS: AssistantToolSchema[] = [
  tool(
    'navigate',
    "Send the user to a screen in the app, when they ask to be taken/shown/opened to a page rather than asking a factual question. path must be one of the app's real routes.",
    { path: { type: 'string', description: 'The in-app route to navigate to, e.g. "/attendance".' } },
    ['path']
  ),
  tool('list_branches', 'List every branch in the organization the caller can see.'),
  tool(
    'list_employees',
    'List employees, optionally filtered to one branch.',
    { branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' } }
  ),
  tool(
    'list_departments',
    'List departments, optionally filtered to one branch.',
    { branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' } }
  ),
  tool(
    'count_employees_in_department',
    'Count active employees in one specific department. Call list_departments first to resolve a department name to its id.',
    { departmentId: { type: 'string', description: 'The department id (from list_departments).' } },
    ['departmentId']
  ),
  tool(
    'list_schedules',
    'List schedules, optionally filtered to one branch.',
    { branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' } }
  ),
  tool(
    'list_shifts_for_schedule',
    'List every shift in one specific schedule. Call list_schedules first to resolve a schedule id.',
    { scheduleId: { type: 'string', description: 'The schedule id (from list_schedules).' } },
    ['scheduleId']
  ),
  tool(
    'list_tasks',
    'List tasks, optionally filtered by branch and/or status.',
    {
      branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' },
      status: {
        type: 'string',
        description: 'Task status to filter by.',
        enum: ['draft', 'assigned', 'in_progress', 'completed', 'verified', 'cancelled']
      }
    }
  ),
  tool(
    'list_announcements',
    'List announcements, optionally filtered to one branch.',
    { branchId: { type: 'string', description: 'Branch id to filter by. Omit for organization-wide + all accessible branches.' } }
  ),
  tool('list_my_attendance', "List the caller's own attendance records."),
  tool(
    'list_attendance_for_branch_and_range',
    'List attendance records for one branch within a date range — use for questions like "who is late today" or "how many people clocked in".',
    {
      branchId: { type: 'string', description: 'The branch id.' },
      startIso: { type: 'string', description: 'Start of the range, ISO date (e.g. "2026-08-29").' },
      endIso: { type: 'string', description: 'End of the range, ISO date (e.g. "2026-08-29").' }
    },
    ['branchId', 'startIso', 'endIso']
  ),
  tool('list_my_leave', "List the caller's own leave requests."),
  tool(
    'list_pending_leave',
    'List leave requests awaiting approval, optionally filtered to one branch.',
    { branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' } }
  ),
  tool('list_my_shift_swaps', "List the caller's own shift swap requests."),
  tool('list_open_shift_swaps', 'List open (unclaimed) shift swap requests anyone eligible could accept.'),
  tool(
    'list_pending_shift_swap_approvals',
    'List shift swap requests that have been accepted by a coworker and are now awaiting manager/supervisor approval.',
    { branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' } }
  ),
  tool(
    'list_my_notifications',
    "List the caller's own notifications.",
    { unreadOnly: { type: 'boolean', description: 'Set true to only list unread notifications.' } }
  ),
  tool('list_members', 'List the organization\'s members (people with login access) and their roles.'),
  tool('list_invitations', 'List pending and past invitations sent to join the organization.'),
  tool(
    'get_attendance_summary_report',
    'Get an attendance summary (present/late/absent counts) for a date range, optionally filtered to one branch.',
    {
      startDate: { type: 'string', description: 'Start of the range, ISO date.' },
      endDate: { type: 'string', description: 'End of the range, ISO date.' },
      branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' }
    },
    ['startDate', 'endDate']
  ),
  tool(
    'get_task_completion_report',
    'Get task completion statistics, optionally filtered by branch and/or date range.',
    {
      branchId: { type: 'string', description: 'Branch id to filter by.' },
      startDate: { type: 'string', description: 'Start of the range, ISO date.' },
      endDate: { type: 'string', description: 'End of the range, ISO date.' }
    }
  ),
  tool(
    'get_leave_usage_report',
    'Get leave usage statistics for a date range, optionally filtered to one branch.',
    {
      startDate: { type: 'string', description: 'Start of the range, ISO date.' },
      endDate: { type: 'string', description: 'End of the range, ISO date.' },
      branchId: { type: 'string', description: 'Branch id to filter by. Omit for all accessible branches.' }
    },
    ['startDate', 'endDate']
  )
];

/** Defense in depth against the model emitting an arbitrary/external path — checked before a `navigate` tool call's path ever reaches the client. */
export function isAllowedRoute(path: string): boolean {
  return (APP_ROUTES as readonly string[]).includes(path);
}

/**
 * Classifies a thrown tool-execution error into a short, safe string to
 * feed back to the model as that tool's result (design spec, "Error
 * handling") — or null to signal the caller should let it propagate
 * (an unexpected error still fails the whole ask_assistant call, per the
 * spec). Never includes the original error's own message for anything
 * other than ValidationError, whose messages are already written to be
 * client-safe (see packages/errors).
 */
export function toSafeToolErrorMessage(error: unknown): string | null {
  if (error instanceof AuthorizationError) {
    return 'not permitted';
  }
  if (error instanceof ValidationError) {
    return `invalid request: ${error.message}`;
  }
  return null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantTools.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/api/package.json packages/api/src/operations/assistant.ts packages/tests/unit/assistantTools.test.ts pnpm-lock.yaml
git commit -m "feat(assistant): add tool catalog, route allowlist check, and error classification"
```

---

## Task 4: Tool dispatch table

**Files:**
- Modify: `packages/api/src/operations/assistant.ts`
- Test: `packages/tests/unit/assistantDispatch.test.ts` (new)

**Interfaces:**
- Consumes: the real operation objects already exported by `branch.ts`, `employee.ts`, `department.ts`, `scheduling.ts`, `task.ts`, `announcement.ts`, `attendance.ts`, `leave.ts`, `shiftSwap.ts`, `notification.ts`, `membership.ts`, `reporting.ts` (all already exist, per `registry.ts`'s own imports).
- Produces: `TOOL_OPERATION_NAMES: readonly string[]` (every real, non-`navigate` tool name in `ASSISTANT_TOOLS`) and `getToolOperation(name: string): RpcOperation<unknown, unknown> | undefined`, both exported from `assistant.ts`.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/unit/assistantDispatch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ASSISTANT_TOOLS, TOOL_OPERATION_NAMES, getToolOperation } from '@shiftos/api';

describe('tool dispatch table', () => {
  it('has a dispatch entry for every non-navigate tool in the catalog', () => {
    const nonNavigateNames = ASSISTANT_TOOLS.map((t) => t.function.name).filter((n) => n !== 'navigate');
    for (const name of nonNavigateNames) {
      expect(TOOL_OPERATION_NAMES).toContain(name);
      const operation = getToolOperation(name);
      expect(operation).toBeDefined();
      expect(operation!.name).toBe(name);
    }
  });

  it('returns undefined for navigate and for an unknown tool name', () => {
    expect(getToolOperation('navigate')).toBeUndefined();
    expect(getToolOperation('not_a_real_tool')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantDispatch.test.ts`
Expected: FAIL — `'TOOL_OPERATION_NAMES' is not exported`.

- [ ] **Step 3: Implement**

Add to the top of `packages/api/src/operations/assistant.ts`, alongside the existing imports:

```typescript
import type { RpcOperation } from '../rpc.js';
import { listBranches } from './branch.js';
import { listEmployees } from './employee.js';
import { listDepartments, countEmployeesInDepartment } from './department.js';
import { listSchedules, listShiftsForSchedule } from './scheduling.js';
import { listTasks } from './task.js';
import { listAnnouncements } from './announcement.js';
import { listMyAttendance, listAttendanceForBranchAndRange } from './attendance.js';
import { listMyLeave, listPendingLeave } from './leave.js';
import { listMyShiftSwaps, listOpenShiftSwaps, listPendingShiftSwapApprovals } from './shiftSwap.js';
import { listMyNotifications } from './notification.js';
import { listMembers, listInvitations } from './membership.js';
import { getAttendanceSummaryReport, getTaskCompletionReport, getLeaveUsageReport } from './reporting.js';
```

Then, after `ASSISTANT_TOOLS`'s closing `];`, add:

```typescript
/**
 * Maps each real (non-navigate) tool name to the actual RpcOperation it
 * executes — the same operation object registry.ts registers at the top
 * level, reused here rather than re-implemented, so a tool call and a
 * normal UI-triggered call to the same RPC run identical code, including
 * identical permission/branch-scoping checks.
 */
const TOOL_OPERATIONS: Record<string, RpcOperation<unknown, unknown>> = {
  list_branches: listBranches as RpcOperation<unknown, unknown>,
  list_employees: listEmployees as RpcOperation<unknown, unknown>,
  list_departments: listDepartments as RpcOperation<unknown, unknown>,
  count_employees_in_department: countEmployeesInDepartment as RpcOperation<unknown, unknown>,
  list_schedules: listSchedules as RpcOperation<unknown, unknown>,
  list_shifts_for_schedule: listShiftsForSchedule as RpcOperation<unknown, unknown>,
  list_tasks: listTasks as RpcOperation<unknown, unknown>,
  list_announcements: listAnnouncements as RpcOperation<unknown, unknown>,
  list_my_attendance: listMyAttendance as RpcOperation<unknown, unknown>,
  list_attendance_for_branch_and_range: listAttendanceForBranchAndRange as RpcOperation<unknown, unknown>,
  list_my_leave: listMyLeave as RpcOperation<unknown, unknown>,
  list_pending_leave: listPendingLeave as RpcOperation<unknown, unknown>,
  list_my_shift_swaps: listMyShiftSwaps as RpcOperation<unknown, unknown>,
  list_open_shift_swaps: listOpenShiftSwaps as RpcOperation<unknown, unknown>,
  list_pending_shift_swap_approvals: listPendingShiftSwapApprovals as RpcOperation<unknown, unknown>,
  list_my_notifications: listMyNotifications as RpcOperation<unknown, unknown>,
  list_members: listMembers as RpcOperation<unknown, unknown>,
  list_invitations: listInvitations as RpcOperation<unknown, unknown>,
  get_attendance_summary_report: getAttendanceSummaryReport as RpcOperation<unknown, unknown>,
  get_task_completion_report: getTaskCompletionReport as RpcOperation<unknown, unknown>,
  get_leave_usage_report: getLeaveUsageReport as RpcOperation<unknown, unknown>
};

export const TOOL_OPERATION_NAMES: readonly string[] = Object.keys(TOOL_OPERATIONS);

export function getToolOperation(name: string): RpcOperation<unknown, unknown> | undefined {
  return TOOL_OPERATIONS[name];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantDispatch.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/operations/assistant.ts packages/tests/unit/assistantDispatch.test.ts
git commit -m "feat(assistant): wire tool catalog to real RPC operation handlers"
```

---

## Task 5: OpenAI HTTP client wrapper

**Files:**
- Modify: `packages/api/src/operations/assistant.ts`
- Test: `packages/tests/unit/assistantOpenAiClient.test.ts` (new)

**Interfaces:**
- Produces: `OpenAiMessage`, `OpenAiToolCall` types, and `callOpenAiChatCompletion(apiKey: string, model: string, messages: OpenAiMessage[]): Promise<OpenAiChatCompletionResult>` exported from `assistant.ts`, where `OpenAiChatCompletionResult = { content: string | null; toolCalls: OpenAiToolCall[] }`.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/unit/assistantOpenAiClient.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { callOpenAiChatCompletion, ASSISTANT_TOOLS } from '@shiftos/api';

describe('callOpenAiChatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the expected request shape and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello', tool_calls: undefined } }] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await callOpenAiChatCompletion('sk-test', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer sk-test');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.tools).toEqual(ASSISTANT_TOOLS);
  });

  it('parses a plain text response with no tool calls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'The answer is 4.', tool_calls: undefined } }] })
    }));

    const result = await callOpenAiChatCompletion('sk-test', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('The answer is 4.');
    expect(result.toolCalls).toEqual([]);
  });

  it('parses a tool-call response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: null,
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'list_branches', arguments: '{}' } }]
          }
        }]
      })
    }));

    const result = await callOpenAiChatCompletion('sk-test', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }]);
    expect(result.content).toBeNull();
    expect(result.toolCalls).toEqual([{ id: 'call_1', name: 'list_branches', arguments: '{}' }]);
  });

  it('throws a clear error when the HTTP call itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid API key' } }) }));

    await expect(callOpenAiChatCompletion('sk-bad', 'gpt-4o-mini', [{ role: 'user', content: 'hi' }])).rejects.toThrow('Invalid API key');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantOpenAiClient.test.ts`
Expected: FAIL — `'callOpenAiChatCompletion' is not exported`.

- [ ] **Step 3: Implement**

Add to `packages/api/src/operations/assistant.ts`:

```typescript
export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
}

export interface OpenAiToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface OpenAiChatCompletionResult {
  content: string | null;
  toolCalls: OpenAiToolCall[];
}

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Raw fetch wrapper around OpenAI's chat completions endpoint — no `openai`
 * npm package (design spec: a single well-documented JSON-over-HTTPS
 * endpoint doesn't need one). Always sends the full ASSISTANT_TOOLS list;
 * the model decides whether to use any of them.
 */
export async function callOpenAiChatCompletion(
  apiKey: string,
  model: string,
  messages: OpenAiMessage[]
): Promise<OpenAiChatCompletionResult> {
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, tools: ASSISTANT_TOOLS })
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.error?.message ?? `OpenAI request failed with status ${response.status}`);
  }

  const message = body?.choices?.[0]?.message ?? {};
  const rawToolCalls: { id: string; function: { name: string; arguments: string } }[] = message.tool_calls ?? [];

  return {
    content: message.content ?? null,
    toolCalls: rawToolCalls.map((call) => ({ id: call.id, name: call.function.name, arguments: call.function.arguments }))
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantOpenAiClient.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/operations/assistant.ts packages/tests/unit/assistantOpenAiClient.test.ts
git commit -m "feat(assistant): add raw-fetch OpenAI chat completions client"
```

---

## Task 6: `ask_assistant` RPC — tool-calling loop and registration

**Files:**
- Modify: `packages/api/src/operations/assistant.ts`
- Modify: `packages/api/src/registry.ts`
- Test: `packages/tests/unit/assistantNotConfigured.test.ts` (new)

**Interfaces:**
- Consumes: `loadConfig` from `@shiftos/config`; `defineRpc` from `../rpc.js`; everything from Tasks 3–5.
- Produces: `askAssistant: RpcOperation<unknown, { answer: string; navigateTo?: string }>` (input is `unknown` and parsed internally via `asRecord`/`requiredStringField`, matching every other operation in this codebase — see `list_tasks` etc. in `registry.ts`), registered as RPC `ask_assistant`.

- [ ] **Step 1: Write the failing test**

Create `packages/tests/unit/assistantNotConfigured.test.ts`. This only exercises the early-return path that needs no live `ApplicationContext` or network access — the full multi-round tool-calling loop against a real organization is covered by this plan's final manual verification step (Task 9), consistent with how this codebase already verifies its service layer (live against the real linked Supabase project, not mocks).

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askAssistant } from '@shiftos/api';

describe('askAssistant when OPENAI_API_KEY is not configured', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Self-contained, like config.test.ts (Task 1) — doesn't rely on a real
    // .env being present, and explicitly clears OPENAI_API_KEY regardless
    // of what the real environment has it set to.
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('returns a typed "not configured" answer without calling OpenAI', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // A minimal stand-in context — the not-configured check must happen
    // before anything reads from it, so its shape doesn't matter here.
    const fakeContext = {} as Parameters<typeof askAssistant.handler>[0];

    const result = await askAssistant.handler(fakeContext, { question: 'How many branches do we have?' });

    expect(result.answer).toBe("AI assistant isn't configured yet.");
    expect(result.navigateTo).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantNotConfigured.test.ts`
Expected: FAIL — `'askAssistant' is not exported`.

- [ ] **Step 3: Implement**

Add to `packages/api/src/operations/assistant.ts`:

```typescript
import { loadConfig } from '@shiftos/config';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField } from '../parse.js';
import type { ApplicationContext } from '@shiftos/services';

const MAX_TOOL_ROUNDS = 3;
const NOT_CONFIGURED_ANSWER = "AI assistant isn't configured yet.";
const COULD_NOT_ANSWER_FALLBACK = "I couldn't fully answer that — try rephrasing or asking something more specific.";

function systemPrompt(context: ApplicationContext, branches: { id: string; name: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const branchList = branches.map((b) => `${b.name} (id: ${b.id})`).join(', ') || 'none yet';
  const scope = context.branchAccess.isOrgWide
    ? 'organization-wide (every branch)'
    : `limited to branch id(s): ${context.branchAccess.branchIds.join(', ')}`;

  return [
    'You are the ShiftOS assistant, built into a workforce-scheduling app for shift-based teams (organizations, branches, employees, schedules, shifts, tasks, attendance, leave requests, announcements, shift swaps).',
    `Today's date is ${today}.`,
    `The person asking is scoped to: ${scope}.`,
    `This organization's branches: ${branchList}.`,
    'Only state facts or numbers that came from a tool result — never invent or estimate one.',
    'If the request is clearly "take me to" / "show me the X screen" rather than a factual question, call the navigate tool instead of describing the screen in text.',
    'If a tool call fails because it is "not permitted", tell the user plainly that they do not have access to that information — do not guess an answer instead.'
  ].join(' ');
}

/**
 * Runs the model's requested tool calls for one round, executing each real
 * tool via its own already-permission-checked handler against the shared
 * `context` (design spec: no second createApplicationContext() round trip,
 * no new authorization mechanism). `navigate` is handled specially — it is
 * never a real operation and never touches the tool dispatch table.
 */
async function runToolCalls(
  context: ApplicationContext,
  toolCalls: { id: string; name: string; arguments: string }[]
): Promise<{ toolMessages: OpenAiMessage[]; navigateTo?: string }> {
  const toolMessages: OpenAiMessage[] = [];
  let navigateTo: string | undefined;

  for (const call of toolCalls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.arguments || '{}');
    } catch {
      toolMessages.push({ role: 'tool', tool_call_id: call.id, content: 'invalid request: malformed arguments' });
      continue;
    }

    if (call.name === 'navigate') {
      const path = typeof args.path === 'string' ? args.path : '';
      if (isAllowedRoute(path)) {
        navigateTo = path;
        toolMessages.push({ role: 'tool', tool_call_id: call.id, content: 'navigating' });
      } else {
        toolMessages.push({ role: 'tool', tool_call_id: call.id, content: 'invalid request: not a real app route' });
      }
      continue;
    }

    const operation = getToolOperation(call.name);
    if (!operation) {
      toolMessages.push({ role: 'tool', tool_call_id: call.id, content: 'invalid request: unknown tool' });
      continue;
    }

    try {
      const result = await operation.handler(context, args);
      toolMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    } catch (error) {
      const safeMessage = toSafeToolErrorMessage(error);
      if (safeMessage === null) {
        throw error;
      }
      toolMessages.push({ role: 'tool', tool_call_id: call.id, content: safeMessage });
    }
  }

  return { toolMessages, navigateTo };
}

export const askAssistant = defineRpc('ask_assistant', async (context: ApplicationContext, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const question = requiredStringField(input, 'question');

  const config = loadConfig();
  if (!config.OPENAI_API_KEY) {
    return { answer: NOT_CONFIGURED_ANSWER };
  }

  const branches = (await listBranches.handler(context, undefined)) as { id: string; name: string }[];

  const messages: OpenAiMessage[] = [
    { role: 'system', content: systemPrompt(context, branches) },
    { role: 'user', content: question }
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callOpenAiChatCompletion(config.OPENAI_API_KEY, config.OPENAI_MODEL, messages);

    if (response.toolCalls.length === 0) {
      return { answer: response.content ?? COULD_NOT_ANSWER_FALLBACK };
    }

    messages.push({
      role: 'assistant',
      content: response.content,
      tool_calls: response.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } }))
    });

    const { toolMessages, navigateTo } = await runToolCalls(context, response.toolCalls);
    if (navigateTo) {
      return { answer: response.content ?? 'Taking you there now.', navigateTo };
    }
    messages.push(...toolMessages);
  }

  return { answer: COULD_NOT_ANSWER_FALLBACK };
});
```

In `packages/api/src/registry.ts`, add the import (new line after the notification import block):

```typescript
import { askAssistant } from './operations/assistant.js';
```

And register it (after `registry.register(setMyNotificationPreference);`):

```typescript
  registry.register(askAssistant);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -w exec tsc -b && pnpm exec vitest run packages/tests/unit/assistantNotConfigured.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Run the full unit suite and full build to confirm nothing else broke**

Run: `pnpm -w exec tsc -b && pnpm test:unit`
Expected: all test files pass (the four new ones from Tasks 1–6 plus the pre-existing `validation.test.ts`), zero TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/operations/assistant.ts packages/api/src/registry.ts packages/tests/unit/assistantNotConfigured.test.ts
git commit -m "feat(assistant): implement ask_assistant RPC with tool-calling loop"
```

---

## Task 7: Frontend `AssistantPanel` component

**Files:**
- Create: `apps/web/src/components/assistant/AssistantPanel.tsx`

**Interfaces:**
- Consumes: `useRpcMutation` from `../../lib/useRpc.js` (existing hook, same one every other mutation in this app already uses).
- Produces: `export function AssistantPanel({ onClose }: { onClose: () => void }): React.ReactElement` — a self-contained panel with its own open/closed question-answer state; the caller (Task 8) owns whether it's mounted at all.

There is no automated test harness for `apps/web` components in this repo (no `*.test.tsx` files exist anywhere in it) — frontend work in this codebase is verified by building cleanly and checking the real running app in a browser, the same way every other frontend task this session verified its own work. This task's steps follow that pattern instead of inventing a new test framework.

- [ ] **Step 1: Implement the component**

Create `apps/web/src/components/assistant/AssistantPanel.tsx`:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@shiftos/ui';
import { useRpcMutation } from '../../lib/useRpc.js';

interface AskAssistantResult {
  answer: string;
  navigateTo?: string;
}

/**
 * Shared "Ask ShiftOS" chat panel — mounted from TopBar.tsx for every
 * signed-in role, and reused as-is by AdminConsolePage.tsx (Task 8) rather
 * than that page keeping its own separate implementation. Single question
 * per turn (design spec v1: no multi-turn memory) — each ask is independent.
 */
export function AssistantPanel({ onClose }: { onClose: () => void }): React.ReactElement {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const navigate = useNavigate();

  const ask = useRpcMutation<AskAssistantResult, { question: string }>('ask_assistant', {
    onSuccess: (result) => {
      if (result.navigateTo) {
        onClose();
        navigate(result.navigateTo);
        return;
      }
      setAnswer(result.answer);
    },
    onError: (err) => setAnswer(err.message)
  });

  return (
    <div role="dialog" aria-label="Ask ShiftOS" className="w-80 rounded-lg border border-neutral-200 bg-white p-3 shadow-md">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return;
          setAnswer(null);
          ask.mutate({ question: question.trim() });
        }}
        className="flex flex-col gap-2"
      >
        <label className="text-sm font-medium text-neutral-900" htmlFor="assistant-question">
          Ask ShiftOS
        </label>
        <Input
          id="assistant-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question or say “open attendance”…"
          disabled={ask.isPending}
        />
        <Button type="submit" size="sm" loading={ask.isPending} disabled={!question.trim()}>
          Ask
        </Button>
      </form>
      {ask.isPending ? <p className="mt-2 text-sm text-neutral-500">Thinking…</p> : null}
      {!ask.isPending && answer ? <p className="mt-2 text-sm text-neutral-800">{answer}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build is clean**

Run: `cd apps/web && npm run build`
Expected: `tsc -p tsconfig.json && vite build` completes with no new errors (the pre-existing Rollup chunk-size warning is fine and unrelated).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/assistant/AssistantPanel.tsx
git commit -m "feat(assistant): add shared AssistantPanel component"
```

---

## Task 8: Wire `AssistantPanel` into TopBar and Admin Console

**Files:**
- Modify: `apps/web/src/layout/TopBar.tsx`
- Modify: `apps/web/src/pages/admin/AdminConsolePage.tsx`

**Interfaces:**
- Consumes: `AssistantPanel` from `../components/assistant/AssistantPanel.js` (Task 7).

- [ ] **Step 1: Add the trigger + panel to TopBar.tsx**

In `apps/web/src/layout/TopBar.tsx`:

Add to the imports (near the top, with the other icon and component imports):

```typescript
import { Bell, Sparkles } from 'lucide-react';
import { AssistantPanel } from '../components/assistant/AssistantPanel.js';
```

(Replace the existing `import { Bell } from 'lucide-react';` line with the combined one above.)

Add state near the other `useState` calls inside `TopBar`:

```typescript
  const [assistantOpen, setAssistantOpen] = useState(false);
```

Add the trigger button + panel in the right-hand `<div className="flex items-center gap-2">` group, immediately before the existing notifications `{canReadNotifications ? (...) : null}` block:

```typescript
        <div className="relative">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={assistantOpen}
            aria-label="Ask ShiftOS"
            onClick={() => setAssistantOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Sparkles size={18} aria-hidden="true" />
          </button>
          {assistantOpen ? (
            <div className="absolute right-0 z-20 mt-1">
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            </div>
          ) : null}
        </div>
```

- [ ] **Step 2: Verify the build is clean**

Run: `cd apps/web && npm run build`
Expected: clean build.

- [ ] **Step 3: Manually verify in the browser**

Start the app (`pnpm dev:backend` and `pnpm dev:web`, or use whatever is already running), sign in as any role, and confirm:
- The sparkles icon appears in the TopBar next to the notifications bell for every role (not just Manager/Owner).
- Clicking it opens the panel; typing a question and submitting shows "Thinking…" then either an answer or, if `OPENAI_API_KEY` is still unset, "AI assistant isn't configured yet."

- [ ] **Step 4: Replace AdminConsolePage's `runAsk` stub**

Read `apps/web/src/pages/admin/AdminConsolePage.tsx` in full first — it was last touched in this session and its exact current line numbers may have shifted from what's referenced here.

Remove the `askQuery`/`askResult`/`runAsk` state and function entirely, and the `askChips` constant. Replace the "Ask ShiftOS" card's form/input/result markup (currently built around `askQuery`, `runAsk()`, and `askResult`) with:

```typescript
<AssistantPanel onClose={() => {}} />
```

placed where the existing card's inner form/result currently sits, keeping the surrounding card wrapper (`<section className="rounded-[20px] bg-[#231E1A] ...">` and its header) as-is — only the inner question/answer implementation changes, not the card's visual placement. Add the import:

```typescript
import { AssistantPanel } from '../../components/assistant/AssistantPanel.js';
```

Note: `AssistantPanel`'s own styling (`rounded-lg border border-neutral-200 bg-white`) was designed for the TopBar's light popover context, not this card's dark background — if it looks visually wrong once running, that's an expected follow-up (adjust `AssistantPanel`'s classes to work on both a light popover and this dark card background, e.g. by accepting an optional `className` prop), not a sign the wiring is broken. Confirming the *data flow* (the card now gets real answers from `ask_assistant`, not the deleted keyword matcher) is this step's actual goal.

- [ ] **Step 5: Verify the build is clean**

Run: `cd apps/web && npm run build`
Expected: clean build, no leftover references to `runAsk`/`askQuery`/`askResult`/`askChips`.

- [ ] **Step 6: Manually verify in the browser**

Sign in as a Manager/Owner, open Admin Console → Overview, and confirm the "Ask ShiftOS" card now answers via the real assistant (or shows the "not configured" message if the key still isn't set) instead of the old four-keyword matcher.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/layout/TopBar.tsx apps/web/src/pages/admin/AdminConsolePage.tsx
git commit -m "feat(assistant): wire AssistantPanel into TopBar (all roles) and Admin Console"
```

---

## Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full workspace build and unit tests**

Run: `pnpm -w exec tsc -b && pnpm test:unit`
Expected: zero TypeScript errors across the whole workspace; every unit test file passes, including all new ones from Tasks 1–6.

- [ ] **Step 2: Full apps/web production build**

Run: `cd apps/web && npm run build`
Expected: clean build (the pre-existing large-chunk warning is fine).

- [ ] **Step 3: Grep for leftover references to the deleted stub**

Run: `grep -rn "runAsk\|askChips" apps/web/src`
Expected: no output (confirms Task 8's cleanup was complete).

- [ ] **Step 4: Confirm the "not configured" path live, with today's real (still-unset) key**

With `OPENAI_API_KEY` unset in `.env` (as it is right now), sign in as any role, open the assistant from the TopBar, ask any question, and confirm it shows "AI assistant isn't configured yet." rather than an error or a hang. This is the state the feature ships in until the real key is added.

- [ ] **Step 5: Once the real `OPENAI_API_KEY` is available, live-verify the full loop**

This step can't run yet (the user said they'll provide the key later) — do it as a follow-up once `OPENAI_API_KEY` is set in `.env` and the backend restarted:
- Ask a factual question ("How many employees are in Main Branch?") as an org-wide Manager — confirm the answer's number matches what `list_employees` actually returns for that branch (check directly, e.g. via the Employees page or a direct RPC call).
- Ask the same shape of question as a branch-scoped Employee/Supervisor — confirm the answer only reflects their own accessible branch(es), never another branch's data.
- Ask a navigation request ("take me to attendance") — confirm it calls the `navigate` tool and the app actually navigates to `/attendance`.
- Ask something requiring a permission the signed-in test account lacks (e.g. a Staff account asking about pending invitations) — confirm the answer says something like "not permitted" rather than erroring or fabricating a number.

- [ ] **Step 6: Commit** (only if Step 3's grep or any earlier step required a fix)

```bash
git add -A
git commit -m "chore(assistant): final verification pass"
```
