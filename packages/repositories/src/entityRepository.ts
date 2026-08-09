import { BaseRepository } from '@shiftos/database';
import type { DatabaseClient } from '@shiftos/database';
import type { RepositoryQueryOptions } from '@shiftos/types';

/**
 * Generic, table-agnostic repository (Milestone 1/2 era). Prefer a dedicated
 * domain repository (EmployeeRepository, ShiftRepository, ...) for any table
 * that's organization- or branch-owned — this class does not enforce tenant
 * scoping and is only appropriate for ad hoc or genuinely global tables.
 */
export class EntityRepository<T extends Record<string, unknown>> extends BaseRepository<T> {
  constructor(client: DatabaseClient, tableName: string) {
    super(client, tableName);
  }

  async findMany(options?: RepositoryQueryOptions): Promise<T[]> {
    return this.findAll(options);
  }
}
