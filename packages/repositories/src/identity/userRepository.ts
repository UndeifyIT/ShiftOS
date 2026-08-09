import { BaseRepository, type DatabaseClient } from '@shiftos/database';
import type { RepositoryQueryOptions } from '@shiftos/types';
import { NotFoundError } from '@shiftos/errors';

export interface User extends Record<string, unknown> {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * users is platform identity, not organization-owned (see GOV-003 DEC-016:
 * user identity is deliberately separate from employee/workforce data, and
 * from any single organization — a user may belong to multiple
 * organizations via organization_memberships). No organization_id column,
 * so this extends BaseRepository directly rather than TenantScopedRepository.
 */
export class UserRepository extends BaseRepository<User> {
  constructor(client: DatabaseClient) {
    super(client, 'users');
  }

  async list(options?: RepositoryQueryOptions): Promise<User[]> {
    return this.findAll(options);
  }

  async getByIdOrThrow(id: string): Promise<User> {
    const record = await this.findById(id);
    if (!record) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return record;
  }

  /** The join point between a Supabase Auth identity and this platform's user profile. */
  async findByAuthUserId(authUserId: string): Promise<User | null> {
    const rows = await this.client.query<User>(
      'SELECT * FROM users WHERE auth_user_id = $1 AND deleted_at IS NULL',
      [authUserId]
    );
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.client.query<User>(
      'SELECT * FROM users WHERE email = lower($1) AND deleted_at IS NULL',
      [email]
    );
    return rows[0] ?? null;
  }

  async archive(id: string): Promise<User> {
    return this.softDelete(id);
  }
}
