import { UserRepository, type User } from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';

/**
 * Self-service profile updates only. No permission check: the security
 * boundary here is identity, not capability — this always writes to
 * context.userId (the caller's own row), never an id supplied by the
 * client. users is platform identity, not organization-scoped (DEC-016),
 * so org.* permissions don't apply to it.
 */
export class UserService {
  private readonly users: UserRepository;

  constructor(private readonly context: ApplicationContext) {
    this.users = new UserRepository(this.context.client);
  }

  async updateMyProfile(patch: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  }): Promise<User> {
    const changes: Partial<User> = {};
    if (patch.firstName !== undefined) changes.first_name = patch.firstName;
    if (patch.lastName !== undefined) changes.last_name = patch.lastName;
    if (patch.phone !== undefined) changes.phone = patch.phone;
    if (patch.avatarUrl !== undefined) changes.avatar_url = patch.avatarUrl;
    return this.users.update(this.context.userId, changes);
  }
}
