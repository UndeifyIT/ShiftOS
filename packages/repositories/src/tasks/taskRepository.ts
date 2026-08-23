import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type TaskStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskVerificationStatus = 'pending' | 'verified' | 'rework_required';

export interface Task extends BranchEntity {
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  task_status: TaskStatus;
  assigned_supervisor_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  verification_status: TaskVerificationStatus;
  created_by: string;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class TaskRepository extends BranchScopedRepository<Task> {
  constructor(client: DatabaseClient) {
    super(client, 'tasks');
  }

  async findBySupervisor(organizationId: string, supervisorEmployeeId: string, options?: { limit?: number; offset?: number }): Promise<Task[]> {
    return this.list(organizationId, { ...options, filters: { assigned_supervisor_id: supervisorEmployeeId }, orderBy: 'due_date asc' });
  }

  async findByStatus(organizationId: string, branchIds: string[], status: TaskStatus, options?: { limit?: number; offset?: number }): Promise<Task[]> {
    return this.listByBranches(organizationId, branchIds, { ...options, filters: { task_status: status }, orderBy: 'due_date asc' });
  }

  async assignSupervisor(organizationId: string, id: string, supervisorEmployeeId: string, assignedBy: string): Promise<Task> {
    return this.patch(organizationId, id, {
      task_status: 'assigned',
      assigned_supervisor_id: supervisorEmployeeId,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      // trg_tasks_validate raises on every UPDATE with a null updated_by; this
      // was missing here, so assigning a task failed against the real schema.
      updated_by: assignedBy
    } as Partial<Task>);
  }

  async complete(organizationId: string, id: string, completedBy: string, completionNotes: string | null): Promise<Task> {
    return this.patch(organizationId, id, {
      task_status: 'completed',
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
      completion_notes: completionNotes,
      updated_by: completedBy
    } as Partial<Task>);
  }

  /**
   * Two DB check constraints (012_create_tasks.sql) shape this:
   *   - chk_tasks_verification_consistency requires verified_at IS NULL
   *     whenever task_status <> 'verified', so verified_at/verified_by can
   *     only be set on the 'verified' outcome.
   *   - chk_tasks_completion_consistency requires completed_at IS NULL
   *     whenever task_status is 'draft'/'assigned'/'in_progress'. A rework
   *     outcome moves the task back to 'in_progress', so the completion
   *     record from the completeTask() call that preceded this verify() has
   *     to be cleared too — the task is, in effect, reopened pending rework.
   */
  async verify(organizationId: string, id: string, verifiedBy: string, verificationStatus: TaskVerificationStatus, verificationNotes: string | null): Promise<Task> {
    const isVerified = verificationStatus === 'verified';
    return this.patch(organizationId, id, {
      task_status: isVerified ? 'verified' : 'in_progress',
      verified_by: isVerified ? verifiedBy : null,
      verified_at: isVerified ? new Date().toISOString() : null,
      completed_at: isVerified ? undefined : null,
      completed_by: isVerified ? undefined : null,
      completion_notes: isVerified ? undefined : null,
      verification_status: verificationStatus,
      verification_notes: verificationNotes,
      updated_by: verifiedBy
    } as Partial<Task>);
  }

  /**
   * A distinctly-named method rather than an override of the inherited
   * 2-argument archive() (TenantScopedRepository's own header comment
   * documents why same-name overrides with a different signature are
   * deliberately avoided here). tasks needs its own version because
   * trg_tasks_validate raises on every UPDATE — soft-delete included — with a
   * null updated_by, which the generic softDelete() path never sets.
   */
  async archiveWithActor(organizationId: string, id: string, updatedBy: string): Promise<Task> {
    return this.patch(organizationId, id, {
      deleted_at: new Date().toISOString(),
      updated_by: updatedBy
    } as Partial<Task>);
  }
}
