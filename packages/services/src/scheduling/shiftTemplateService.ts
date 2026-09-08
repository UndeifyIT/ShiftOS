import { ShiftTemplateRepository, type ShiftTemplate } from '@shiftos/repositories';
import type { ApplicationContext } from '../applicationContext.js';
import { assertUuid, assertNonEmptyString } from '../validation.js';
import { computeDuration } from './time.js';

export interface CreateShiftTemplateInput {
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight?: boolean;
  notes?: string | null;
}

export class ShiftTemplateService {
  private readonly templates: ShiftTemplateRepository;

  constructor(private readonly context: ApplicationContext) {
    this.templates = new ShiftTemplateRepository(context.client);
  }

  async listShiftTemplates(branchId: string): Promise<ShiftTemplate[]> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('shifttemplates.read');
    this.context.requireBranchAccess(branchId);
    return this.templates.listActiveByBranch(this.context.organizationId, branchId);
  }

  async createShiftTemplate(branchId: string, input: CreateShiftTemplateInput): Promise<ShiftTemplate> {
    assertUuid(branchId, 'branchId');
    await this.context.requirePermission('shifttemplates.create');
    this.context.requireBranchAccess(branchId);
    assertNonEmptyString(input.name, 'name');

    const crossesMidnight = input.crossesMidnight ?? false;
    const duration = computeDuration(input.startTime, input.endTime, crossesMidnight);

    return this.templates.insert(this.context.organizationId, {
      branch_id: branchId,
      name: input.name.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
      duration,
      crosses_midnight: crossesMidnight,
      notes: input.notes ?? null,
      status: 'active'
    } as Partial<ShiftTemplate>);
  }
}
