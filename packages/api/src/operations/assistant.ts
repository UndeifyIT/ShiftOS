import { AuthorizationError, ValidationError } from '@shiftos/errors';
import { APP_ROUTES } from '@shiftos/constants';
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
