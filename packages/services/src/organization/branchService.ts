import { BranchRepository, type Branch } from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString, assertUuid } from '../validation.js';

export interface CreateBranchInput {
  name: string;
  address?: string | null;
  settings?: Record<string, unknown>;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string | null;
  settings?: Record<string, unknown>;
  is_active?: boolean;
}

/** PER-002-02 Branch Permission Matrix: branch lifecycle is Manager-only; Manager + Supervisor may read. */
export class BranchService {
  private readonly branches: BranchRepository;

  constructor(private readonly context: ApplicationContext) {
    this.branches = new BranchRepository(context.client);
  }

  async createBranch(input: CreateBranchInput): Promise<Branch> {
    await this.context.requirePermission('branches.create');
    assertNonEmptyString(input.name, 'name');

    const existing = await this.branches.findByName(this.context.organizationId, input.name);
    if (existing) {
      throw new ValidationError('A branch with this name already exists', ['name must be unique within the organization']);
    }

    return this.branches.insert(this.context.organizationId, {
      name: input.name,
      address: input.address ?? null,
      settings: input.settings ?? {}
    } as Partial<Branch>);
  }

  async updateBranch(branchId: string, input: UpdateBranchInput): Promise<Branch> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('branches.update');

    if (input.name !== undefined) {
      assertNonEmptyString(input.name, 'name');
    }
    if (Object.keys(input).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    return this.branches.patch(this.context.organizationId, branchId, input as Partial<Branch>);
  }

  async archiveBranch(branchId: string): Promise<Branch> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('branches.archive');
    const before = await this.branches.getByIdOrThrow(this.context.organizationId, branchId);
    const archived = await this.branches.archive(this.context.organizationId, branchId);
    await this.context.audit('archive_branch', 'branch', branchId, before, archived);
    return archived;
  }

  /** Only returns a branch the caller is actually authorized to operate in — see ApplicationContext.requireBranchAccess. */
  async getBranch(branchId: string): Promise<Branch> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('branches.read');
    this.context.requireBranchAccess(branchId);
    return this.branches.getByIdOrThrow(this.context.organizationId, branchId);
  }

  /** Every branch the caller's role/grants make accessible — org-wide roles see all, branch-scoped roles see only their grants. */
  async listAccessibleBranches(): Promise<Branch[]> {
    await this.context.requirePermission('branches.read');
    const all = await this.branches.list(this.context.organizationId);
    const accessible = new Set(this.context.branchAccess.branchIds);
    return all.filter((branch) => accessible.has(branch.id));
  }
}
