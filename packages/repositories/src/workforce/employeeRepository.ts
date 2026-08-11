import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type EmploymentStatus = 'active' | 'inactive' | 'terminated' | 'on_leave';

export interface Employee extends BranchEntity {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  hire_date: string;
  employment_status: EmploymentStatus;
  notes: string | null;
  /** Storage object path under the private `avatars` bucket (employees/{organizationId}/{employeeId}/{filename}), not a public URL. Optional. */
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeRepository extends BranchScopedRepository<Employee> {
  constructor(client: DatabaseClient) {
    super(client, 'employees');
  }

  async findByEmployeeNumber(organizationId: string, employeeNumber: string): Promise<Employee | null> {
    const matches = await this.list(organizationId, { filters: { employee_number: employeeNumber } });
    return matches[0] ?? null;
  }

  /** Active (employment_status = 'active') employees in the given accessible branches. */
  async findActiveEmployees(organizationId: string, branchIds: string[], options?: { limit?: number; offset?: number }): Promise<Employee[]> {
    return this.listByBranches(organizationId, branchIds, {
      ...options,
      filters: { employment_status: 'active' },
      orderBy: 'last_name asc'
    });
  }

  async searchByName(organizationId: string, branchIds: string[], query: string, options?: { limit?: number; offset?: number }): Promise<Employee[]> {
    if (branchIds.length === 0 || !query.trim()) {
      return [];
    }
    const params: unknown[] = [organizationId, branchIds, `%${query.trim().toLowerCase()}%`];
    let sql = `SELECT * FROM employees
                WHERE organization_id = $1 AND branch_id = ANY($2::uuid[]) AND deleted_at IS NULL
                  AND (lower(first_name) LIKE $3 OR lower(last_name) LIKE $3 OR lower(employee_number) LIKE $3)
                ORDER BY last_name ASC`;
    if (typeof options?.limit === 'number') {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (typeof options?.offset === 'number') {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }
    return this.client.query<Employee>(sql, params);
  }
}
