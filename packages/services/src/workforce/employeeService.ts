import {
  EmployeeRepository,
  EmployeeHistoryRepository,
  type Employee,
  type EmploymentStatus,
  type EmployeeHistoryEntry
} from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid, assertOneOf } from '../validation.js';

const EMPLOYMENT_STATUSES: readonly EmploymentStatus[] = ['active', 'inactive', 'terminated', 'on_leave'];

/** Fields whose changes are recorded to employee_history — the fields that actually matter for workforce auditing (PER-002-01 "every workforce action affecting employees should generate an audit log"), not a diff of every column. */
const TRACKED_FIELDS = ['first_name', 'last_name', 'branch_id', 'employment_status', 'employee_number'] as const;

export interface CreateEmployeeInput {
  branchId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  hireDate: string;
}

export interface UpdateEmployeeInput {
  branchId?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  employmentStatus?: EmploymentStatus;
  notes?: string | null;
}

export class EmployeeService {
  private readonly employees: EmployeeRepository;
  private readonly history: EmployeeHistoryRepository;

  constructor(private readonly context: ApplicationContext) {
    this.employees = new EmployeeRepository(context.client);
    this.history = new EmployeeHistoryRepository(context.client);
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    await this.context.requirePermission('employees.create');
    assertUuid(input.branchId, 'branchId');
    this.context.requireBranchAccess(input.branchId);
    assertNonEmptyString(input.employeeNumber, 'employeeNumber');
    assertNonEmptyString(input.firstName, 'firstName');
    assertNonEmptyString(input.lastName, 'lastName');
    assertNonEmptyString(input.hireDate, 'hireDate');
    if (Number.isNaN(Date.parse(input.hireDate))) {
      throw new ValidationError('Invalid hireDate', ['hireDate must be a valid date']);
    }

    const existing = await this.employees.findByEmployeeNumber(this.context.organizationId, input.employeeNumber);
    if (existing) {
      throw new ValidationError('An employee with this employee number already exists', ['employeeNumber must be unique within the organization']);
    }

    return this.employees.insert(this.context.organizationId, {
      branch_id: input.branchId,
      employee_number: input.employeeNumber,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      hire_date: input.hireDate
    } as Partial<Employee>);
  }

  async getEmployee(employeeId: string): Promise<Employee> {
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('employees.read');
    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    this.context.requireBranchAccess(employee.branch_id);
    return employee;
  }

  async updateEmployee(employeeId: string, input: UpdateEmployeeInput): Promise<Employee> {
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('employees.update');

    const before = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    this.context.requireBranchAccess(before.branch_id);

    if (input.branchId !== undefined) {
      this.context.requireBranchAccess(input.branchId);
    }
    if (input.employmentStatus !== undefined) {
      assertOneOf(input.employmentStatus, EMPLOYMENT_STATUSES, 'employmentStatus');
    }
    if (input.firstName !== undefined) assertNonEmptyString(input.firstName, 'firstName');
    if (input.lastName !== undefined) assertNonEmptyString(input.lastName, 'lastName');

    const changes: Partial<Employee> = {};
    if (input.branchId !== undefined) changes.branch_id = input.branchId;
    if (input.employeeNumber !== undefined) changes.employee_number = input.employeeNumber;
    if (input.firstName !== undefined) changes.first_name = input.firstName;
    if (input.lastName !== undefined) changes.last_name = input.lastName;
    if (input.email !== undefined) changes.email = input.email;
    if (input.phone !== undefined) changes.phone = input.phone;
    if (input.employmentStatus !== undefined) changes.employment_status = input.employmentStatus;
    if (input.notes !== undefined) changes.notes = input.notes;

    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    const updated = await this.employees.patch(this.context.organizationId, employeeId, changes);
    await this.recordHistory(before, updated);
    return updated;
  }

  async archiveEmployee(employeeId: string): Promise<Employee> {
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('employees.archive');
    const before = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    this.context.requireBranchAccess(before.branch_id);
    return this.employees.archive(this.context.organizationId, employeeId);
  }

  /** requestedBranchId is verified against the caller's accessible branches (ApplicationContext.resolveBranchScope); omitting it lists every accessible branch's employees. */
  async listEmployees(requestedBranchId?: string, options?: { limit?: number; offset?: number }): Promise<Employee[]> {
    await this.context.requirePermission('employees.read');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.employees.listByBranches(this.context.organizationId, branchIds, options);
  }

  async getEmployeeHistory(employeeId: string): Promise<EmployeeHistoryEntry[]> {
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('employees.read');
    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    this.context.requireBranchAccess(employee.branch_id);
    return this.history.listForEmployee(this.context.organizationId, employeeId);
  }

  private async recordHistory(before: Employee, after: Employee): Promise<void> {
    for (const field of TRACKED_FIELDS) {
      const oldValue = before[field];
      const newValue = after[field];
      if (oldValue !== newValue) {
        await this.history.record(this.context.organizationId, {
          employee_id: after.id,
          field_name: field,
          old_value: oldValue === null || oldValue === undefined ? null : String(oldValue),
          new_value: newValue === null || newValue === undefined ? null : String(newValue),
          changed_by: this.context.userId
        });
      }
    }
  }
}
