import {
  TaskRepository,
  TaskHistoryRepository,
  EmployeeRepository,
  type Task,
  type TaskPriority,
  type TaskRecurrence,
  type TaskVerificationStatus,
  type TaskHistoryEntry
} from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid, assertOneOf } from '../validation.js';
import { nextTaskOccurrence, TASK_RECURRENCES } from './taskRecurrence.js';

const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'normal', 'high', 'critical'];
const VERIFICATION_STATUSES: readonly TaskVerificationStatus[] = ['verified', 'rework_required'];
/** Terminal states — the DB's chk_tasks_completion_consistency and the service's own edit guard both treat these as closed. */
const FINISHED_STATUSES = ['completed', 'verified', 'cancelled'];

export interface CreateTaskInput {
  branchId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  recurrence?: TaskRecurrence;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  recurrence?: TaskRecurrence;
}

/**
 * Task lifecycle service (backend completion pass). Follows the schema's own
 * design (012_create_tasks.sql): a task has exactly one accountable
 * assignee — assigned_supervisor_id, a branch-scoped employee — not the
 * separate many-employee task_assignments table, which the DB trigger
 * doesn't validate against and which this pass leaves as a documented,
 * un-implemented extension point rather than half-wiring a second,
 * unverified assignment path.
 */
export class TaskService {
  private readonly tasks: TaskRepository;
  private readonly history: TaskHistoryRepository;
  private readonly employees: EmployeeRepository;

  constructor(private readonly context: ApplicationContext) {
    this.tasks = new TaskRepository(context.client);
    this.history = new TaskHistoryRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.context.requirePermission('tasks.create');
    assertUuid(input.branchId, 'branchId');
    this.context.requireBranchAccess(input.branchId);
    assertNonEmptyString(input.title, 'title');
    if (input.priority !== undefined) {
      assertOneOf(input.priority, TASK_PRIORITIES, 'priority');
    }
    if (input.recurrence !== undefined) {
      assertOneOf(input.recurrence, TASK_RECURRENCES, 'recurrence');
    }
    if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
      throw new ValidationError('Invalid dueDate', ['dueDate must be a valid date']);
    }

    const task = await this.tasks.insert(this.context.organizationId, {
      branch_id: input.branchId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_date: input.dueDate ?? null,
      due_time: input.dueTime ?? null,
      priority: input.priority ?? 'normal',
      recurrence: input.recurrence ?? 'none',
      created_by: this.context.userId
    } as Partial<Task>);

    await this.recordHistory(task.id, 'draft', null);
    return task;
  }

  async getTask(taskId: string): Promise<Task> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.read');
    const task = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(task.branch_id);
    return task;
  }

  async listTasks(requestedBranchId?: string, options?: { status?: Task['task_status']; limit?: number; offset?: number }): Promise<Task[]> {
    await this.context.requirePermission('tasks.read');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    if (options?.status) {
      return this.tasks.findByStatus(this.context.organizationId, branchIds, options.status, options);
    }
    return this.tasks.listByBranches(this.context.organizationId, branchIds, { ...options, orderBy: 'due_date asc' });
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.update');

    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    this.assertNotFinished(before, 'edited');

    if (input.title !== undefined) assertNonEmptyString(input.title, 'title');
    if (input.priority !== undefined) assertOneOf(input.priority, TASK_PRIORITIES, 'priority');
    if (input.recurrence !== undefined) assertOneOf(input.recurrence, TASK_RECURRENCES, 'recurrence');
    if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
      throw new ValidationError('Invalid dueDate', ['dueDate must be a valid date']);
    }

    const changes: Partial<Task> = { updated_by: this.context.userId };
    if (input.title !== undefined) changes.title = input.title.trim();
    if (input.description !== undefined) changes.description = input.description?.trim() || null;
    if (input.dueDate !== undefined) changes.due_date = input.dueDate;
    if (input.dueTime !== undefined) changes.due_time = input.dueTime;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.recurrence !== undefined) changes.recurrence = input.recurrence;

    return this.tasks.patch(this.context.organizationId, taskId, changes);
  }

  async assignTask(taskId: string, supervisorEmployeeId: string): Promise<Task> {
    assertUuid(taskId, 'taskId');
    assertUuid(supervisorEmployeeId, 'supervisorEmployeeId');
    await this.context.requirePermission('tasks.assign');

    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    this.assertNotFinished(before, 'assigned');

    const supervisor = await this.employees.getByIdOrThrow(this.context.organizationId, supervisorEmployeeId);
    if (supervisor.branch_id !== before.branch_id) {
      throw new ValidationError("Assigned supervisor must belong to the task's branch");
    }
    if (!supervisor.is_active) {
      throw new ValidationError('Assigned supervisor must be an active employee');
    }

    const updated = await this.tasks.assignSupervisor(this.context.organizationId, taskId, supervisorEmployeeId, this.context.userId);
    await this.recordHistory(taskId, 'assigned', null);
    return updated;
  }

  async completeTask(taskId: string, notes?: string | null): Promise<Task> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.complete');

    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    if (!['assigned', 'in_progress'].includes(before.task_status)) {
      throw new ValidationError(`Cannot complete a task in status "${before.task_status}"`);
    }

    const updated = await this.tasks.complete(this.context.organizationId, taskId, this.context.userId, notes?.trim() || null);
    await this.recordHistory(taskId, 'completed', notes ?? null);
    await this.repeat(updated);
    return updated;
  }

  async verifyTask(taskId: string, status: TaskVerificationStatus, notes?: string | null): Promise<Task> {
    assertUuid(taskId, 'taskId');
    assertOneOf(status, VERIFICATION_STATUSES, 'status');
    await this.context.requirePermission('tasks.verify');

    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    if (before.task_status !== 'completed' && !(before.task_status === 'in_progress' && before.verification_status === 'rework_required')) {
      throw new ValidationError(`Cannot verify a task in status "${before.task_status}"`);
    }

    const updated = await this.tasks.verify(this.context.organizationId, taskId, this.context.userId, status, notes?.trim() || null);
    await this.recordHistory(taskId, updated.task_status, notes ?? null);
    return updated;
  }

  /** Reopens a task that was marked completed by mistake, back to in_progress, clearing the completion record. Only while it has not yet been verified. */
  async reopenTask(taskId: string): Promise<Task> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.update');

    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    if (before.task_status !== 'completed') {
      throw new ValidationError('Only a completed task can be reopened');
    }

    const updated = await this.tasks.patch(this.context.organizationId, taskId, {
      task_status: 'in_progress',
      completed_at: null,
      completed_by: null,
      completion_notes: null,
      updated_by: this.context.userId
    } as Partial<Task>);
    await this.recordHistory(taskId, 'in_progress', 'Reopened');
    return updated;
  }

  async cancelTask(taskId: string, reason?: string | null): Promise<Task> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.update');

    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    this.assertNotFinished(before, 'cancelled');
    // chk_tasks_assignment_consistency requires assigned_supervisor_id to be
    // set for every non-draft status, including 'cancelled' — an unassigned
    // draft has nothing to call off; archiveTask is the right operation for
    // "this task is no longer wanted" before it was ever assigned.
    if (before.task_status === 'draft') {
      throw new ValidationError('A draft task has not been assigned yet; archive it instead of cancelling it');
    }

    const updated = await this.tasks.patch(this.context.organizationId, taskId, {
      task_status: 'cancelled',
      completed_at: new Date().toISOString(),
      completed_by: this.context.userId,
      completion_notes: reason?.trim() || null,
      updated_by: this.context.userId
    } as Partial<Task>);
    await this.recordHistory(taskId, 'cancelled', reason ?? null);
    return updated;
  }

  async archiveTask(taskId: string): Promise<Task> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.archive');
    const before = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(before.branch_id);
    const archived = await this.tasks.archiveWithActor(this.context.organizationId, taskId, this.context.userId);
    // Archive is a soft-delete outside the task_status enum, so unlike
    // verify/cancel (already fully captured by task_history's per-transition
    // rows) it has no domain-specific audit trail of its own.
    await this.context.audit('archive_task', 'task', taskId, before, archived);
    return archived;
  }

  async getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
    assertUuid(taskId, 'taskId');
    await this.context.requirePermission('tasks.read');
    const task = await this.tasks.getByIdOrThrow(this.context.organizationId, taskId);
    this.context.requireBranchAccess(task.branch_id);
    return this.history.listForTask(this.context.organizationId, taskId);
  }

  /**
   * Creates the next occurrence of a repeating task (066). This is the only
   * thing that advances a recurrence — there is no scheduler — so an
   * unfinished daily check stays on the board instead of being replaced.
   *
   * It deliberately does not require `tasks.create`: whoever set the task up
   * authorized the repetition, and the person finishing the work is only
   * closing the loop. The owner carries over when they are still an active
   * employee of the branch, because the DB trigger rejects anything else.
   */
  private async repeat(completed: Task): Promise<Task | null> {
    const due = nextTaskOccurrence(completed.due_date ?? new Date().toISOString().slice(0, 10), completed.recurrence);
    if (!due) return null;

    let owner: string | null = null;
    if (completed.assigned_supervisor_id) {
      const employee = await this.employees.getById(this.context.organizationId, completed.assigned_supervisor_id);
      if (employee && employee.is_active && !employee.deleted_at && employee.branch_id === completed.branch_id) {
        owner = employee.id;
      }
    }

    const assignment = owner
      ? { task_status: 'assigned' as const, assigned_supervisor_id: owner, assigned_by: this.context.userId, assigned_at: new Date().toISOString() }
      : {};

    const next = await this.tasks.insert(this.context.organizationId, {
      branch_id: completed.branch_id,
      title: completed.title,
      description: completed.description,
      due_date: due,
      due_time: completed.due_time,
      priority: completed.priority,
      recurrence: completed.recurrence,
      created_by: this.context.userId,
      ...assignment
    } as Partial<Task>);

    await this.recordHistory(next.id, next.task_status, `Repeat of ${completed.id}`);
    return next;
  }

  private assertNotFinished(task: Task, action: string): void {
    if (FINISHED_STATUSES.includes(task.task_status)) {
      throw new ValidationError(`Cannot be ${action}: task is already "${task.task_status}"`);
    }
  }

  private async recordHistory(taskId: string, status: Task['task_status'], notes: string | null): Promise<void> {
    await this.history.record(this.context.organizationId, {
      task_id: taskId,
      status,
      changed_by: this.context.userId,
      notes: notes?.trim() || null
    });
  }
}
