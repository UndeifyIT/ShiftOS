import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';
import type { TaskStatus } from './taskRepository.js';

export interface TaskHistoryEntry extends TenantEntity {
  task_id: string;
  status: TaskStatus;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

/** Append-only status-transition log; no updated_at/deleted_at columns exist on this table. */
export class TaskHistoryRepository extends TenantScopedRepository<TaskHistoryEntry> {
  constructor(client: DatabaseClient) {
    super(client, 'task_history');
    this.hasSoftDelete = false;
  }

  async listForTask(organizationId: string, taskId: string): Promise<TaskHistoryEntry[]> {
    return this.list(organizationId, { filters: { task_id: taskId }, orderBy: 'changed_at desc' });
  }

  async record(organizationId: string, entry: { task_id: string; status: TaskStatus; changed_by: string | null; notes: string | null }): Promise<TaskHistoryEntry> {
    return this.insert(organizationId, entry);
  }
}
