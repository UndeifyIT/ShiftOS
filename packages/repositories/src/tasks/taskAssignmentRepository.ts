import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export type TaskAssignmentStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskAssignment extends TenantEntity {
  task_id: string;
  employee_id: string;
  assignment_status: TaskAssignmentStatus;
  assigned_by: string | null;
  assigned_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** No branch_id column of its own — branch is derived through the parent task (see TaskRepository). */
export class TaskAssignmentRepository extends TenantScopedRepository<TaskAssignment> {
  constructor(client: DatabaseClient) {
    super(client, 'task_assignments');
  }

  async findByTask(organizationId: string, taskId: string): Promise<TaskAssignment[]> {
    return this.list(organizationId, { filters: { task_id: taskId } });
  }

  async findByEmployee(organizationId: string, employeeId: string, options?: { limit?: number; offset?: number }): Promise<TaskAssignment[]> {
    return this.list(organizationId, { ...options, filters: { employee_id: employeeId }, orderBy: 'assigned_at desc' });
  }

  async accept(organizationId: string, id: string): Promise<TaskAssignment> {
    return this.patch(organizationId, id, { assignment_status: 'accepted' } as Partial<TaskAssignment>);
  }

  async complete(organizationId: string, id: string): Promise<TaskAssignment> {
    return this.patch(organizationId, id, { assignment_status: 'completed', completed_at: new Date().toISOString() } as Partial<TaskAssignment>);
  }
}
