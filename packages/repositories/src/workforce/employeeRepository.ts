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
  department_id: string | null;
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

  /**
   * Matches an authenticated user to "their" employee row by email — the
   * same resolution the frontend already performs client-side (see
   * EmployeeDashboardPage.tsx's `myEmployeeRecord`), needed server-side for
   * self-service flows like announcement acknowledgement. Per the documented
   * DEC-016/032 gap, there is no direct auth_user_id/user_id link on
   * employees; a user with no matching employee row (e.g. an Owner who never
   * added themselves) legitimately resolves to null.
   */
  async findByEmail(organizationId: string, email: string): Promise<Employee | null> {
    // Case-insensitive on purpose: unlike invitations.email, employees.email has
    // no stored-lowercase constraint, so an exact-match filter would silently
    // miss a real match differing only in case.
    const rows = await this.client.query<Employee>(
      'SELECT * FROM employees WHERE organization_id = $1 AND lower(email) = lower($2) AND deleted_at IS NULL LIMIT 1',
      [organizationId, email]
    );
    return rows[0] ?? null;
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
