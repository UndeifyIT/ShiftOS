import type { DatabaseClient } from '@shiftos/database';
import { TenantScopedRepository, type TenantEntity } from '../base/tenantScopedRepository.js';

export type EmployeeImportStatus = 'completed' | 'completed_with_errors' | 'failed';

export interface EmployeeImportError {
  /** The row number in the uploaded spreadsheet (header = row 1). */
  row: number;
  name: string;
  message: string;
}

export interface EmployeeImport extends TenantEntity {
  branch_id: string;
  file_name: string;
  imported_by: string;
  status: EmployeeImportStatus;
  total_rows: number;
  imported_count: number;
  failed_count: number;
  skipped_count: number;
  invites_sent: number;
  errors: EmployeeImportError[];
  created_at: string;
  deleted_at: string | null;
}

/** One confirmed spreadsheet import into one branch (migration 064). */
export class EmployeeImportRepository extends TenantScopedRepository<EmployeeImport> {
  constructor(client: DatabaseClient) {
    super(client, 'employee_imports');
  }

  async record(organizationId: string, entry: Omit<EmployeeImport, 'id' | 'organization_id' | 'created_at' | 'deleted_at'>): Promise<EmployeeImport> {
    // node-postgres turns a JS array into a Postgres array literal, not JSON — serialize jsonb explicitly.
    return this.insert(organizationId, { ...entry, errors: JSON.stringify(entry.errors) as unknown as EmployeeImportError[] });
  }

  /** Newest first, with the importer's name joined in for the "Imported By" column. */
  async listRecentForBranches(organizationId: string, branchIds: string[], limit: number): Promise<Array<EmployeeImport & { imported_by_name: string }>> {
    return this.client.query<EmployeeImport & { imported_by_name: string }>(
      `SELECT ei.*, trim(concat_ws(' ', u.first_name, u.last_name)) AS imported_by_name
         FROM employee_imports ei
         LEFT JOIN users u ON u.id = ei.imported_by
        WHERE ei.organization_id = $1 AND ei.deleted_at IS NULL AND ei.branch_id = ANY($2::uuid[])
        ORDER BY ei.created_at DESC
        LIMIT $3`,
      [organizationId, branchIds, limit]
    );
  }
}
