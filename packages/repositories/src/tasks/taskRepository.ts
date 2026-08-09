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
      assigned_at: new Date().toISOString()
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

  async verify(organizationId: string, id: string, verifiedBy: string, verificationStatus: TaskVerificationStatus, verificationNotes: string | null): Promise<Task> {
    return this.patch(organizationId, id, {
      task_status: verificationStatus === 'verified' ? 'verified' : 'in_progress',
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      verification_status: verificationStatus,
      verification_notes: verificationNotes,
      updated_by: verifiedBy
    } as Partial<Task>);
  }
}
