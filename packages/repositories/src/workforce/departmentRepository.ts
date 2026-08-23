import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export interface Department extends BranchEntity {
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class DepartmentRepository extends BranchScopedRepository<Department> {
  constructor(client: DatabaseClient) {
    super(client, 'departments');
  }

  async findByName(organizationId: string, branchId: string, name: string): Promise<Department | null> {
    const matches = await this.listByBranch(organizationId, branchId, { filters: { name } });
    return matches[0] ?? null;
  }

  async countEmployees(organizationId: string, departmentId: string): Promise<number> {
    const rows = await this.client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM employees WHERE organization_id = $1 AND department_id = $2 AND deleted_at IS NULL',
      [organizationId, departmentId]
    );
    return rows[0]?.count ?? 0;
  }
}
