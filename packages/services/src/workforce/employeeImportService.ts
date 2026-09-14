import {
  DepartmentRepository,
  EmployeeImportRepository,
  type EmployeeImport,
  type EmployeeImportError,
  type EmployeeImportStatus
} from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { MembershipService } from '../organization/membershipService.js';
import { assertNonEmptyString, assertUuid } from '../validation.js';
import { EmployeeService } from './employeeService.js';

/** Most rows one import may carry — a spreadsheet of a whole branch, not a data migration. */
export const MAX_IMPORT_ROWS = 1000;

export interface ImportEmployeeRow {
  /** Row number in the uploaded file (header = row 1), echoed back in results. */
  row: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  hireDate: string;
  dateOfBirth?: string | null;
  employeeNumber?: string;
  /** Membership role to invite this person as; omitted means no invite. */
  roleId?: string | null;
}

export interface ImportEmployeesInput {
  branchId: string;
  fileName: string;
  rows: ImportEmployeeRow[];
  /** Rows the manager chose to leave out at validation ("Skip & Import Valid Rows"). */
  skippedCount: number;
  sendInvites: boolean;
}

export interface ImportEmployeesResult {
  import: EmployeeImport;
  imported: Array<{ row: number; employeeId: string; name: string }>;
  failed: EmployeeImportError[];
  invitesSent: number;
  inviteFailures: EmployeeImportError[];
}

function errorMessage(error: unknown): string {
  if (error instanceof ValidationError && error.details?.length) return error.details.join('; ');
  return error instanceof Error ? error.message : 'Could not be imported';
}

/**
 * The handoff's Import Employees wizard, server side: creates each validated
 * row through EmployeeService (the same checks as adding one person), keeps
 * going past a bad row, optionally invites each new person with their role,
 * and records the import for "Recent Imports".
 */
export class EmployeeImportService {
  private readonly imports: EmployeeImportRepository;
  private readonly departments: DepartmentRepository;

  constructor(private readonly context: ApplicationContext) {
    this.imports = new EmployeeImportRepository(context.client);
    this.departments = new DepartmentRepository(context.client);
  }

  async importEmployees(input: ImportEmployeesInput): Promise<ImportEmployeesResult> {
    await this.context.requirePermission('employees.create');
    assertUuid(input.branchId, 'branchId');
    this.context.requireBranchAccess(input.branchId);
    assertNonEmptyString(input.fileName, 'fileName');
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      throw new ValidationError('Nothing to import', ['rows must contain at least one employee']);
    }
    if (input.rows.length > MAX_IMPORT_ROWS) {
      throw new ValidationError('Too many rows in one import', [`Import at most ${MAX_IMPORT_ROWS} employees at a time`]);
    }

    const employees = new EmployeeService(this.context);
    const canInvite = input.sendInvites && (await this.context.hasPermission('org.members.manage')) && Boolean(this.context.authProvider);
    const membership = canInvite ? new MembershipService(this.context) : null;
    const departmentBranch = new Map<string, string | null>();

    const imported: ImportEmployeesResult['imported'] = [];
    const failed: EmployeeImportError[] = [];
    const inviteFailures: EmployeeImportError[] = [];
    let invitesSent = 0;

    for (const row of input.rows) {
      const name = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || `Row ${row.row}`;
      try {
        if (row.departmentId) {
          if (!departmentBranch.has(row.departmentId)) {
            const department = await this.departments.getById(this.context.organizationId, row.departmentId);
            departmentBranch.set(row.departmentId, department && department.is_active ? department.branch_id : null);
          }
          if (departmentBranch.get(row.departmentId) !== input.branchId) {
            throw new ValidationError("Department doesn't exist", ["Department doesn't exist in this branch"]);
          }
        }
        const employee = await employees.createEmployee({
          branchId: input.branchId,
          employeeNumber: row.employeeNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          dateOfBirth: row.dateOfBirth || null,
          hireDate: row.hireDate,
          departmentId: row.departmentId || null
        });
        imported.push({ row: row.row, employeeId: employee.id, name });
      } catch (error) {
        failed.push({ row: row.row, name, message: errorMessage(error) });
        continue;
      }

      if (membership && row.email && row.roleId) {
        try {
          await membership.inviteMember({ email: row.email, firstName: row.firstName, lastName: row.lastName, roleId: row.roleId, branchIds: [input.branchId] });
          invitesSent += 1;
        } catch (error) {
          inviteFailures.push({ row: row.row, name, message: errorMessage(error) });
        }
      }
    }

    const status: EmployeeImportStatus = imported.length === 0 ? 'failed' : failed.length > 0 ? 'completed_with_errors' : 'completed';
    const record = await this.imports.record(this.context.organizationId, {
      branch_id: input.branchId,
      file_name: input.fileName.trim().slice(0, 255),
      imported_by: this.context.userId,
      status,
      total_rows: input.rows.length + Math.max(0, Math.floor(input.skippedCount || 0)),
      imported_count: imported.length,
      failed_count: failed.length,
      skipped_count: Math.max(0, Math.floor(input.skippedCount || 0)),
      invites_sent: invitesSent,
      errors: failed
    });
    await this.context.audit('import_employees', 'employee_import', record.id, null, {
      file_name: record.file_name,
      imported_count: imported.length,
      failed_count: failed.length,
      invites_sent: invitesSent
    });

    return { import: record, imported, failed, invitesSent, inviteFailures };
  }

  /** The handoff's "Recent Imports — your last 5 import activities". */
  async listRecentImports(requestedBranchId?: string): Promise<Array<EmployeeImport & { imported_by_name: string }>> {
    await this.context.requirePermission('employees.read');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    return this.imports.listRecentForBranches(this.context.organizationId, branchIds, 5);
  }
}
