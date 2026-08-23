import { DepartmentRepository, type Department } from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid } from '../validation.js';

export interface CreateDepartmentInput {
  branchId: string;
  name: string;
  description?: string | null;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string | null;
}

/** Departments are branch-owned (Organization -> Branches -> Departments hierarchy); lifecycle mirrors BranchService's permission shape. */
export class DepartmentService {
  private readonly departments: DepartmentRepository;

  constructor(private readonly context: ApplicationContext) {
    this.departments = new DepartmentRepository(context.client);
  }

  async createDepartment(input: CreateDepartmentInput): Promise<Department> {
    await this.context.requirePermission('departments.create');
    assertUuid(input.branchId, 'branchId');
    this.context.requireBranchAccess(input.branchId);
    assertNonEmptyString(input.name, 'name');

    const existing = await this.departments.findByName(this.context.organizationId, input.branchId, input.name);
    if (existing) {
      throw new ValidationError('A department with this name already exists in this branch', ['name must be unique within the branch']);
    }

    return this.departments.insert(this.context.organizationId, {
      branch_id: input.branchId,
      name: input.name,
      description: input.description ?? null
    } as Partial<Department>);
  }

  async getDepartment(departmentId: string): Promise<Department> {
    assertUuid(departmentId, 'departmentId');
    await this.context.requirePermission('departments.read');
    const department = await this.departments.getByIdOrThrow(this.context.organizationId, departmentId);
    this.context.requireBranchAccess(department.branch_id);
    return department;
  }

  async updateDepartment(departmentId: string, input: UpdateDepartmentInput): Promise<Department> {
    assertUuid(departmentId, 'departmentId');
    await this.context.requirePermission('departments.update');
    const before = await this.departments.getByIdOrThrow(this.context.organizationId, departmentId);
    this.context.requireBranchAccess(before.branch_id);

    if (input.name !== undefined) {
      assertNonEmptyString(input.name, 'name');
    }
    if (Object.keys(input).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    return this.departments.patch(this.context.organizationId, departmentId, input as Partial<Department>);
  }

  async archiveDepartment(departmentId: string): Promise<Department> {
    assertUuid(departmentId, 'departmentId');
    await this.context.requirePermission('departments.archive');
    const before = await this.departments.getByIdOrThrow(this.context.organizationId, departmentId);
    this.context.requireBranchAccess(before.branch_id);
    const archived = await this.departments.archive(this.context.organizationId, departmentId);
    await this.context.audit('archive_department', 'department', departmentId, before, archived);
    return archived;
  }

  /** requestedBranchId is verified against the caller's accessible branches; omitting it lists every accessible branch's departments. */
  async listDepartments(requestedBranchId?: string): Promise<Department[]> {
    await this.context.requirePermission('departments.read');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.departments.listByBranches(this.context.organizationId, branchIds);
  }

  async countEmployeesInDepartment(departmentId: string): Promise<number> {
    assertUuid(departmentId, 'departmentId');
    await this.context.requirePermission('departments.read');
    const department = await this.departments.getByIdOrThrow(this.context.organizationId, departmentId);
    this.context.requireBranchAccess(department.branch_id);
    return this.departments.countEmployees(this.context.organizationId, departmentId);
  }
}
