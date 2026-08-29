# ShiftOS AI Assistant — design spec

Status: approved-by-default (user explicitly said "yes, go ahead" to the
in-chat design this spec formalizes, after three scoping decisions made
via direct question — see "Decisions" below).

## Why

`apps/web/src/pages/admin/AdminConsolePage.tsx`'s "Ask ShiftOS" card is
not AI. `runAsk()` is a hardcoded `if (query.includes('branch')) ...`
keyword-matcher running entirely in the browser — no API call, no model,
no ability to navigate anywhere. It happens to answer its own four
suggested-question chips correctly because they were written to match its
own keywords. Found and confirmed during manual QA (read the component's
source directly); the user's own examples of what they expect ("show me
how many people are in Ikeja Branch," "navigate to the attendance screen")
are exactly the kind of open-ended, action-taking request it cannot
handle.

## Decisions (asked directly, answered by the user)

1. **Capability: read-only answers + navigation, not actions.** It can
   answer questions from real org data and navigate the UI to a screen. It
   never creates, approves, or mutates anything itself — a person still
   clicks the button for that. Performing actions is explicitly deferred
   (see Out of scope).
2. **Audience: everyone, scoped to their own permissions.** Not
   Admin-Console-only — added to the TopBar so every signed-in role can
   use it, each one bounded to what that person could already see/do.
3. **Data access: broad, but only through the existing permission-checked
   RPC catalog — never raw SQL.** The user's own preference was "let it
   query freely"; this spec deliberately narrows *how* that's implemented
   rather than building literal unrestricted database access, which is a
   well-known injection/exfiltration risk class for a multi-tenant app and
   not something to ship regardless of how the request is framed. "Query
   freely" is satisfied by giving the model tool-calling access to dozens
   of the app's own real endpoints (not four canned phrases) — every one
   of them already permission- and branch-scoped by
   `ApplicationContext`/the service layer, identically to a normal UI
   click. This is the one point in this spec where the implementation
   intentionally does not match a literal reading of what was asked, and
   it was surfaced to the user as such before they approved it.

## Architecture

```
Frontend (AssistantPanel, mounted from TopBar)
  -> ask_assistant RPC { question: string }
Backend (packages/api/src/operations/assistant.ts)
  -> builds tool list (allowlisted read-only operations + `navigate`)
  -> calls OpenAI chat completions (tool-calling loop, capped rounds)
  -> a tool call the model makes against a real operation: invoke that
     operation's own `.handler(context, args)` directly, reusing the
     SAME ApplicationContext already resolved for this request — not a
     second createApplicationContext() round trip, and not a new
     authorization mechanism; the operation's own service-layer
     permission checks fire exactly as they would from a normal click
  -> `navigate` is not a real operation — the backend never executes it,
     just returns { navigateTo: path } to the frontend
  -> returns { answer: string, navigateTo?: string }
Frontend
  -> shows `answer`; if `navigateTo` is present, calls react-router's
     navigate() and closes the panel
```

### Backend: `packages/api/src/operations/assistant.ts` (new file)

- `askAssistant = defineRpc('ask_assistant', async (context, input: { question: string }) => ...)`.
  No `requirePermission()` call of its own — every tool it might invoke
  enforces its own permission requirement via the shared `context`, so a
  user with no relevant permissions can still *ask*, they just can't get
  an answer that needed a permission they don't have (see Error handling).
- **Tool catalog**: a fixed, explicit allowlist — not "every registered
  read operation." Starting list (read-only; `list_*`/`get_*`/`count_*`
  operations whose parameters don't require the caller to already know a
  specific record's id, since those aren't useful to reach from an
  open-ended question):
  `list_branches`, `list_employees`, `list_departments`,
  `count_employees_in_department`, `list_schedules`,
  `list_shifts_for_schedule`, `list_tasks`, `list_announcements`,
  `list_my_attendance`, `list_attendance_for_branch_and_range`,
  `list_my_leave`, `list_pending_leave`, `list_my_shift_swaps`,
  `list_open_shift_swaps`, `list_pending_shift_swap_approvals`,
  `list_my_notifications`, `list_members`, `list_invitations`,
  `get_attendance_summary_report`, `get_task_completion_report`,
  `get_leave_usage_report`. The three report operations
  (`packages/api/src/operations/reporting.ts`) are a particularly good
  fit — they're already purpose-built aggregate/summary queries, so "ask
  a question" becomes a real interface onto the Reports backend that has
  no dedicated UI yet (MVP-001 Phase 6, still unbuilt) without building
  that phase.
  Each tool's JSON-schema (for OpenAI's `tools` parameter) is derived from
  that operation's actual input type — written by hand per tool at
  implementation time, not auto-generated, so every exposed parameter is a
  deliberate choice, not an accident of reflection.
- Implementation note: the module imports the same operation objects
  `registry.ts` already imports (e.g. `import { listEmployees } from
  './employee.js'`) to get direct `.handler` references — no change to
  `RpcRegistry`/`rpc.ts` needed, and no circular import (operation modules
  don't import `registry.ts`).
- **Tool-calling loop**: capped at 3 rounds (model requests tool(s) → we
  execute → feed results back → repeat). If the cap is hit without a
  final answer, return a graceful "I couldn't fully answer that — try
  rephrasing or asking something more specific" rather than erroring or
  looping further.
- **`navigate` tool**: synthetic, not a real operation. Schema: `{ path:
  string }`. The model is instructed (system prompt) to use it when the
  user's request is clearly "take me to X" rather than "tell me X."
  `path` is checked against a small allowlist of known app routes before
  being returned to the frontend (defense in depth against the model
  emitting an arbitrary string) — same route list `Sidebar.tsx`'s
  `NAV_ITEMS` already defines, reused rather than duplicated.
- **Error handling**: if a tool call throws (most commonly
  `AuthorizationError` from a permission the caller lacks, or
  `ValidationError`), catch it, feed a short, safe description back to
  the model as that tool's result (e.g. "not permitted") rather than
  letting the whole request fail — the model can then tell the user
  plainly that it can't answer that, instead of a raw stack trace
  reaching the client. A genuinely unexpected error (not one of the
  above) still fails the whole `ask_assistant` call.
- **System prompt**: describes ShiftOS's domain at a high level
  (organizations, branches, employees, schedules, shifts, tasks,
  attendance, leave, announcements, shift swaps) and the tool list: never
  table/column names or anything below the RPC's own already-public
  operation names. Explicitly instructed: only state numbers/facts that
  came from a tool result, never fabricate; prefer `navigate` over a text
  answer when the request is a "take me to" / "show me the X screen"
  phrasing. Also includes per-request context the model needs to fill in
  tool parameters without asking the user for IDs it should already know:
  today's date, the caller's own branch(es) (from `context.branchAccess`)
  and whether they're org-wide, and the organization's branch list (name
  ↔ id) so "how many people are in Ikeja Branch" can resolve `Ikeja
  Branch` to the right `branchId` itself rather than asking the user for
  a UUID.
- **Model call**: raw `fetch()` to
  `https://api.openai.com/v1/chat/completions` — not the `openai` npm
  package. This is a single, well-documented JSON-over-HTTPS endpoint;
  Node's built-in `fetch` (already relied on elsewhere in this backend)
  covers it without a new dependency, consistent with this codebase's
  existing "no new npm dependency" preference for changes that don't
  need one.

### Config: `packages/config/src/index.ts`

- `OPENAI_API_KEY?: string` — optional, same pattern as
  `SUPABASE_SERVICE_ROLE_KEY?`. The user will supply the real key later;
  until then this stays `undefined`.
- `OPENAI_MODEL: string` — defaults to `'gpt-4o-mini'` if unset (cheap,
  fast, tool-calling-capable; no reason to default to a larger model for
  short Q&A + tool selection). Overridable via env for later tuning.
- `askAssistant`'s handler checks `config.OPENAI_API_KEY` itself and
  returns a clear, typed "not configured" result (not a thrown error) when
  absent, so the rest of the app is completely unaffected before the key
  is added.

### Frontend

- New shared component, `apps/web/src/components/assistant/AssistantPanel.tsx`
  (name/location may adjust slightly during implementation) — a small
  chat-style panel: a text input, a "Thinking…" state while
  `useRpcMutation('ask_assistant', ...)` is pending, and the rendered
  answer. On a response with `navigateTo`, calls `useNavigate()` and
  closes the panel. Single-shot per question for v1 — no message history
  sent back on the next question (each question is independent). This
  matches the existing UX exactly (the current stub is also single-shot)
  and keeps the first version's scope tight; threading conversation
  history is a natural, separate follow-up.
- `apps/web/src/layout/TopBar.tsx`: a new icon button (next to the
  notifications bell) opens `AssistantPanel` — available to every
  signed-in role, per decision 2.
  `AdminConsolePage.tsx`'s existing "Ask ShiftOS" card keeps its current
  visual placement and copy, but its `runAsk()` keyword-matcher is deleted
  and replaced with the same `ask_assistant` call the TopBar entry point
  uses — one real implementation, two entry points, not two
  implementations of the same feature.
- If `OPENAI_API_KEY` isn't configured server-side, the panel shows "AI
  assistant isn't configured yet" instead of a broken chat box.

## Out of scope (deferred, named so they aren't silently dropped)

- Performing actions from the assistant (approvals, creates, status
  changes) — decision 1. Would need per-action confirmation UI, its own
  audit trail, and a much narrower per-action permission review; a
  separate future phase.
- Multi-turn conversation memory — v1 is single-shot per question.
- Per-user/per-org rate limiting beyond OpenAI's own account-level caps —
  worth adding once real usage volume exists, not blocking a first
  version.
- Streaming responses (token-by-token) — a plain request/response is
  simpler for v1; the model calls involved here are short.
- Any tool beyond the fixed allowlist above. Adding a new tool later is a
  deliberate, reviewed addition to that list, not something the model can
  expand itself.

## Testing

- Unit-level: the tool-catalog-to-JSON-schema mapping, the `navigate`
  path allowlist check, and the "not configured" fallback path (no real
  API key needed for any of these).
- Manual/live verification (per this session's own established pattern —
  live-test against the real linked Supabase project, not mocks): once
  the real `OPENAI_API_KEY` is available, ask it a factual question
  ("how many employees are in Main Branch?") and a navigation request
  ("take me to attendance") as at least two different roles (an org-wide
  Manager and a branch-scoped Employee), confirming each answer only
  reflects data that role could already see, and that a tool call outside
  a role's permissions degrades to a plain "not permitted" rather than an
  error.
