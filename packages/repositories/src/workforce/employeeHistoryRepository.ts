import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export interface EmployeeHistoryEntry extends TenantEntity {
  employee_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

/** Append-only change log; no updated_at/deleted_at columns exist on this table. */
export class EmployeeHistoryRepository extends TenantScopedRepository<EmployeeHistoryEntry> {
  constructor(client: DatabaseClient) {
    super(client, 'employee_history');
    this.hasSoftDelete = false;
  }

  async listForEmployee(organizationId: string, employeeId: string, options?: { limit?: number; offset?: number }): Promise<EmployeeHistoryEntry[]> {
    return this.list(organizationId, {
      ...options,
      filters: { employee_id: employeeId },
      orderBy: 'changed_at desc'
    });
  }

  async record(organizationId: string, entry: {
    employee_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string | null;
  }): Promise<EmployeeHistoryEntry> {
    return this.insert(organizationId, entry);
  }
}
