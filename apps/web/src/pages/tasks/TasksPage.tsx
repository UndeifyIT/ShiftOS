import React, { useMemo, useState } from 'react';
import {
  Badge,
  type BadgeTone,
  Button,
  ConfirmationDialog,
  DataTable,
  FormField,
  InlineError,
  Input,
  Modal,
  PageContainer,
  PageHeader,
  PermissionDenied,
  Select,
  Textarea
} from '@shiftos/ui';
import { useSession } from '../../auth/SessionProvider.js';
import { useRpcMutation, useRpcQuery } from '../../lib/useRpc.js';
import type {
  Branch,
  Employee,
  Task,
  TaskHistoryEntry,
  TaskPriority,
  TaskStatus,
  TaskVerificationStatus
} from '../../types/domain.js';

const STATUS_LABEL: Record<TaskStatus, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified: 'Verified',
  cancelled: 'Cancelled'
};

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  draft: 'neutral',
  assigned: 'info',
  in_progress: 'pending',
  completed: 'warning',
  verified: 'success',
  cancelled: 'error'
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical'
};

const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  critical: 'error'
};

const STATUS_FILTER_OPTIONS: { value: 'all' | TaskStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: STATUS_LABEL.draft },
  { value: 'assigned', label: STATUS_LABEL.assigned },
  { value: 'in_progress', label: STATUS_LABEL.in_progress },
  { value: 'completed', label: STATUS_LABEL.completed },
  { value: 'verified', label: STATUS_LABEL.verified },
  { value: 'cancelled', label: STATUS_LABEL.cancelled }
];

const PRIORITY_FILTER_OPTIONS: { value: 'all' | TaskPriority; label: string }[] = [
  { value: 'all', label: 'All priorities' },
  { value: 'low', label: PRIORITY_LABEL.low },
  { value: 'normal', label: PRIORITY_LABEL.normal },
  { value: 'high', label: PRIORITY_LABEL.high },
  { value: 'critical', label: PRIORITY_LABEL.critical }
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: PRIORITY_LABEL.low },
  { value: 'normal', label: PRIORITY_LABEL.normal },
  { value: 'high', label: PRIORITY_LABEL.high },
  { value: 'critical', label: PRIORITY_LABEL.critical }
];

const FINISHED_STATUSES: TaskStatus[] = ['completed', 'verified', 'cancelled'];

function formatDue(task: Task): string {
  if (!task.due_date) return '—';
  const dateLabel = new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return task.due_time ? `${dateLabel} · ${task.due_time.slice(0, 5)}` : dateLabel;
}

function canShowAssign(task: Task, canAssign: boolean): boolean {
  return canAssign && !FINISHED_STATUSES.includes(task.task_status);
}

function canShowComplete(task: Task, canComplete: boolean, myEmployeeId: string | undefined): boolean {
  if (!canComplete || !['assigned', 'in_progress'].includes(task.task_status)) return false;
  // Restrict to the caller's own assigned task when we can resolve their
  // employee record; if we can't (no employees.read), fall back to
  // permission-only so the action is never silently hidden with no signal.
  if (myEmployeeId) return task.assigned_supervisor_id === myEmployeeId;
  return true;
}

function canShowVerify(task: Task, canVerify: boolean): boolean {
  if (!canVerify) return false;
  return task.task_status === 'completed' || (task.task_status === 'in_progress' && task.verification_status === 'rework_required');
}

function canShowCancel(task: Task, canUpdate: boolean): boolean {
  return canUpdate && ['assigned', 'in_progress'].includes(task.task_status);
}

function canShowReopen(task: Task, canUpdate: boolean): boolean {
  return canUpdate && task.task_status === 'completed';
}

function CreateTaskForm({
  branches,
  requireBranchPicker,
  onCreate,
  onDone
}: {
  branches: Branch[];
  requireBranchPicker: boolean;
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0]!.id : '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!title.trim() || !branchId) {
      setError('Title and branch are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onCreate({
        branchId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        priority
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {requireBranchPicker ? (
        <FormField label="Branch" htmlFor="taskBranch" required>
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder="Select a branch"
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
        </FormField>
      ) : null}
      <FormField label="Title" htmlFor="taskTitle" required>
        {(fieldProps) => (
          <Input {...fieldProps} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cold room temperature check" />
        )}
      </FormField>
      <FormField label="Description" htmlFor="taskDescription">
        {(fieldProps) => <Textarea {...fieldProps} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Due date" htmlFor="taskDueDate">
          {(fieldProps) => <Input {...fieldProps} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </FormField>
        <FormField label="Due time" htmlFor="taskDueTime">
          {(fieldProps) => <Input {...fieldProps} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />}
        </FormField>
      </div>
      <FormField label="Priority" htmlFor="taskPriority" required>
        {(fieldProps) => (
          <Select {...fieldProps} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} options={PRIORITY_OPTIONS} />
        )}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} fullWidth>
        Create task
      </Button>
    </form>
  );
}

function AssignTaskForm({
  task,
  employees,
  onAssign,
  onDone
}: {
  task: Task;
  employees: Employee[];
  onAssign: (supervisorEmployeeId: string) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const eligible = useMemo(() => employees.filter((e) => e.branch_id === task.branch_id && e.is_active), [employees, task.branch_id]);
  const [supervisorEmployeeId, setSupervisorEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!supervisorEmployeeId) {
      setError('Choose someone to assign this task to.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onAssign(supervisorEmployeeId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign task.');
    } finally {
      setSubmitting(false);
    }
  };

  if (eligible.length === 0) {
    return <p className="text-sm text-neutral-500">No active employees in this task's branch are available to assign yet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Assign to" htmlFor="assignSupervisor" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={supervisorEmployeeId}
            onChange={(e) => setSupervisorEmployeeId(e.target.value)}
            placeholder="Select an employee"
            options={eligible.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
          />
        )}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} fullWidth>
        {task.assigned_supervisor_id ? 'Reassign task' : 'Assign task'}
      </Button>
    </form>
  );
}

function CompleteTaskForm({
  onComplete,
  onDone
}: {
  onComplete: (notes: string | undefined) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onComplete(notes.trim() || undefined);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark this task complete.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Notes" htmlFor="completeNotes" hint="Optional — anything the verifier should know.">
        {(fieldProps) => <Textarea {...fieldProps} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} fullWidth>
        Mark complete
      </Button>
    </form>
  );
}

function VerifyTaskForm({
  onVerify,
  onDone
}: {
  onVerify: (status: TaskVerificationStatus, notes: string | undefined) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const [status, setStatus] = useState<TaskVerificationStatus>('verified');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onVerify(status, notes.trim() || undefined);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record this verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Decision" htmlFor="verifyStatus" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskVerificationStatus)}
            options={[
              { value: 'verified', label: 'Verified — looks good' },
              { value: 'rework_required', label: 'Request rework' }
            ]}
          />
        )}
      </FormField>
      <FormField
        label="Notes"
        htmlFor="verifyNotes"
        hint={status === 'rework_required' ? 'Explain what needs to be redone.' : 'Optional.'}
      >
        {(fieldProps) => <Textarea {...fieldProps} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} fullWidth variant={status === 'rework_required' ? 'destructive' : 'primary'}>
        {status === 'rework_required' ? 'Send back for rework' : 'Mark verified'}
      </Button>
    </form>
  );
}

function CancelTaskForm({
  onCancel,
  onDone
}: {
  onCancel: (reason: string | undefined) => Promise<unknown>;
  onDone: () => void;
}): React.ReactElement {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onCancel(reason.trim() || undefined);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Reason" htmlFor="cancelReason" hint="Optional — visible in the task's history.">
        {(fieldProps) => <Textarea {...fieldProps} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </FormField>
      {error ? <InlineError message={error} /> : null}
      <Button type="submit" loading={submitting} variant="destructive" fullWidth>
        Cancel task
      </Button>
    </form>
  );
}

function TaskDetailModal({
  task,
  open,
  onClose,
  branchName,
  assigneeName
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  branchName: string;
  assigneeName: string;
}): React.ReactElement {
  const { data: history, isLoading, error, refetch } = useRpcQuery<TaskHistoryEntry[]>(
    'get_task_history',
    task ? { taskId: task.id } : undefined,
    { enabled: Boolean(task) && open }
  );

  return (
    <Modal open={open} onClose={onClose} title={task?.title ?? 'Task'} description={branchName}>
      {task ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-neutral-500">Status</p>
              <Badge tone={STATUS_TONE[task.task_status]}>{STATUS_LABEL[task.task_status]}</Badge>
            </div>
            <div>
              <p className="text-neutral-500">Priority</p>
              <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
            </div>
            <div>
              <p className="text-neutral-500">Due</p>
              <p className="text-neutral-800">{formatDue(task)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Assigned to</p>
              <p className="text-neutral-800">{assigneeName}</p>
            </div>
          </div>
          {task.description ? (
            <div>
              <p className="text-xs font-medium text-neutral-500">Description</p>
              <p className="mt-1 text-sm text-neutral-800">{task.description}</p>
            </div>
          ) : null}
          {task.completion_notes ? (
            <div>
              <p className="text-xs font-medium text-neutral-500">Completion notes</p>
              <p className="mt-1 text-sm text-neutral-800">{task.completion_notes}</p>
            </div>
          ) : null}
          {task.verification_notes ? (
            <div>
              <p className="text-xs font-medium text-neutral-500">Verification notes</p>
              <p className="mt-1 text-sm text-neutral-800">{task.verification_notes}</p>
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-500">History</p>
            {isLoading ? (
              <p className="text-sm text-neutral-500">Loading history…</p>
            ) : error ? (
              <InlineError message={(error as Error).message} />
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-neutral-500">No history recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={STATUS_TONE[entry.status]}>{STATUS_LABEL[entry.status]}</Badge>
                      <span className="text-xs text-neutral-500">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    {entry.notes ? <p className="mt-1 text-sm text-neutral-700">{entry.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            {error ? (
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void refetch()}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/** WEB-014-equivalent — Tasks. One page for every role, gated entirely by hasPermission(...); see RoleDashboard.tsx's doc comment for why this codebase never branches UI on a role name. */
export default function TasksPage(): React.ReactElement {
  const { hasPermission, profile } = useSession();
  const canRead = hasPermission('tasks.read');
  const canCreate = hasPermission('tasks.create');
  const canAssign = hasPermission('tasks.assign');
  const canComplete = hasPermission('tasks.complete');
  const canVerify = hasPermission('tasks.verify');
  const canArchive = hasPermission('tasks.archive');
  const canUpdate = hasPermission('tasks.update');
  const canReadEmployees = hasPermission('employees.read');

  const [branchId, setBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Task | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Task | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Task | null>(null);
  const [reopenTarget, setReopenTarget] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const { data: branches } = useRpcQuery<Branch[]>('list_branches', undefined, { enabled: canRead });
  const { data: employees } = useRpcQuery<Employee[]>('list_employees', undefined, { enabled: canRead && canReadEmployees });

  const myEmployeeRecord = useMemo(
    () => employees?.find((e) => e.email && profile?.email && e.email.toLowerCase() === profile.email.toLowerCase()),
    [employees, profile]
  );

  const activeBranchId = branchId || undefined;
  const {
    data: tasks,
    isLoading,
    error,
    refetch
  } = useRpcQuery<Task[]>(
    'list_tasks',
    { branchId: activeBranchId, status: statusFilter !== 'all' ? statusFilter : undefined },
    { enabled: canRead }
  );

  const branchNameById = useMemo(() => new Map((branches ?? []).map((b) => [b.id, b.name])), [branches]);
  const employeeNameById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, `${e.first_name} ${e.last_name}`])), [employees]);
  const branchOptions = useMemo(() => (branches ?? []).map((b) => ({ value: b.id, label: b.name })), [branches]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    const query = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, search, priorityFilter]);

  const createMutation = useRpcMutation<Task, Record<string, unknown>>('create_task', { invalidates: ['list_tasks'] });
  const assignMutation = useRpcMutation<Task, { taskId: string; supervisorEmployeeId: string }>('assign_task', {
    invalidates: ['list_tasks']
  });
  const completeMutation = useRpcMutation<Task, { taskId: string; notes?: string }>('complete_task', { invalidates: ['list_tasks'] });
  const verifyMutation = useRpcMutation<Task, { taskId: string; status: TaskVerificationStatus; notes?: string }>('verify_task', {
    invalidates: ['list_tasks']
  });
  const cancelMutation = useRpcMutation<Task, { taskId: string; reason?: string }>('cancel_task', { invalidates: ['list_tasks'] });
  const archiveMutation = useRpcMutation<Task, { taskId: string }>('archive_task', {
    invalidates: ['list_tasks'],
    onSuccess: () => setArchiveTarget(null)
  });
  const reopenMutation = useRpcMutation<Task, { taskId: string }>('reopen_task', {
    invalidates: ['list_tasks'],
    onSuccess: () => setReopenTarget(null)
  });

  if (!canRead) {
    return (
      <PageContainer>
        <PermissionDenied />
      </PageContainer>
    );
  }

  const requireBranchPicker = (branches ?? []).length !== 1;

  return (
    <PageContainer>
      <PageHeader
        title="Tasks"
        description="Recurring checks and one-off jobs for the branches you can access."
        actions={canCreate ? <Button onClick={() => setCreateOpen(true)}>New task</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        {branchOptions.length > 1 ? (
          <div className="max-w-xs">
            <Select
              aria-label="Branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={[{ value: '', label: 'All branches' }, ...branchOptions]}
            />
          </div>
        ) : null}
        <div className="max-w-xs">
          <Select
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        <div className="max-w-xs">
          <Select
            aria-label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
            options={PRIORITY_FILTER_OPTIONS}
          />
        </div>
        <div className="max-w-xs flex-1">
          <Input placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks" />
        </div>
      </div>

      <DataTable<Task>
        columns={[
          {
            key: 'title',
            header: 'Task',
            primary: true,
            render: (t) => (
              <button type="button" onClick={() => setDetailTask(t)} className="text-left font-medium text-neutral-900 hover:underline">
                {t.title}
              </button>
            )
          },
          ...(branchOptions.length > 1
            ? [{ key: 'branch', header: 'Branch', render: (t: Task) => branchNameById.get(t.branch_id) ?? '—' }]
            : []),
          { key: 'priority', header: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge> },
          { key: 'status', header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.task_status]}>{STATUS_LABEL[t.task_status]}</Badge> },
          { key: 'due', header: 'Due', render: (t) => formatDue(t) },
          {
            key: 'assignee',
            header: 'Assigned to',
            render: (t) => (t.assigned_supervisor_id ? employeeNameById.get(t.assigned_supervisor_id) ?? 'Assigned' : 'Unassigned')
          },
          {
            key: 'actions',
            header: '',
            render: (t) => (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {canShowAssign(t, canAssign) ? (
                  <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setAssignTarget(t)}>
                    {t.assigned_supervisor_id ? 'Reassign' : 'Assign'}
                  </button>
                ) : null}
                {canShowComplete(t, canComplete, myEmployeeRecord?.id) ? (
                  <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setCompleteTarget(t)}>
                    Complete
                  </button>
                ) : null}
                {canShowVerify(t, canVerify) ? (
                  <button type="button" className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setVerifyTarget(t)}>
                    Verify
                  </button>
                ) : null}
                {canShowReopen(t, canUpdate) ? (
                  <button type="button" className="text-sm font-medium text-neutral-600 hover:underline" onClick={() => setReopenTarget(t)}>
                    Reopen
                  </button>
                ) : null}
                {canShowCancel(t, canUpdate) ? (
                  <button type="button" className="text-sm font-medium text-error-600 hover:underline" onClick={() => setCancelTarget(t)}>
                    Cancel
                  </button>
                ) : null}
                {canArchive ? (
                  <button type="button" className="text-sm font-medium text-error-600 hover:underline" onClick={() => setArchiveTarget(t)}>
                    Archive
                  </button>
                ) : null}
              </div>
            )
          }
        ]}
        rows={filtered}
        rowKey={(t) => t.id}
        loading={isLoading}
        error={error ? (error as Error).message : undefined}
        onRetry={() => void refetch()}
        emptyTitle={search || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No tasks match these filters' : 'No tasks yet'}
        emptyDescription={
          search || statusFilter !== 'all' || priorityFilter !== 'all'
            ? 'Try clearing a filter or search term.'
            : 'Add the recurring checks that keep the branch running — cold room, floor walk, restocks.'
        }
        emptyAction={
          !search && statusFilter === 'all' && priorityFilter === 'all' && canCreate
            ? { label: 'Create task', onClick: () => setCreateOpen(true) }
            : undefined
        }
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New task" description="Add a job for your team to complete.">
        <CreateTaskForm
          branches={branches ?? []}
          requireBranchPicker={requireBranchPicker}
          onCreate={(input) => createMutation.mutateAsync(input)}
          onDone={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={assignTarget?.assigned_supervisor_id ? 'Reassign task' : 'Assign task'}
        description={assignTarget?.title}
      >
        {assignTarget ? (
          <AssignTaskForm
            task={assignTarget}
            employees={employees ?? []}
            onAssign={(supervisorEmployeeId) => assignMutation.mutateAsync({ taskId: assignTarget.id, supervisorEmployeeId })}
            onDone={() => setAssignTarget(null)}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(completeTarget)} onClose={() => setCompleteTarget(null)} title="Mark task complete" description={completeTarget?.title}>
        {completeTarget ? (
          <CompleteTaskForm
            onComplete={(notes) => completeMutation.mutateAsync({ taskId: completeTarget.id, notes })}
            onDone={() => setCompleteTarget(null)}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(verifyTarget)} onClose={() => setVerifyTarget(null)} title="Verify task" description={verifyTarget?.title}>
        {verifyTarget ? (
          <VerifyTaskForm
            onVerify={(status, notes) => verifyMutation.mutateAsync({ taskId: verifyTarget.id, status, notes })}
            onDone={() => setVerifyTarget(null)}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel task" description={cancelTarget?.title}>
        {cancelTarget ? (
          <CancelTaskForm
            onCancel={(reason) => cancelMutation.mutateAsync({ taskId: cancelTarget.id, reason })}
            onDone={() => setCancelTarget(null)}
          />
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate({ taskId: archiveTarget.id })}
        title="Archive task"
        description={archiveTarget ? `"${archiveTarget.title}" will be removed from this list. This can't be undone from here.` : undefined}
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
      />

      <ConfirmationDialog
        open={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        onConfirm={() => reopenTarget && reopenMutation.mutate({ taskId: reopenTarget.id })}
        title="Reopen task"
        description={reopenTarget ? `"${reopenTarget.title}" will go back to In Progress, clearing its completion record.` : undefined}
        confirmLabel="Reopen"
        loading={reopenMutation.isPending}
      />

      <TaskDetailModal
        task={detailTask}
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        branchName={detailTask ? branchNameById.get(detailTask.branch_id) ?? '' : ''}
        assigneeName={
          detailTask?.assigned_supervisor_id ? employeeNameById.get(detailTask.assigned_supervisor_id) ?? 'Assigned' : 'Unassigned'
        }
      />
    </PageContainer>
  );
}
