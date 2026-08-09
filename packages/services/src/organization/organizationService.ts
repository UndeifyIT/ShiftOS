import { OrganizationRepository, type Organization } from '@shiftos/repositories';
import { ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertNonEmptyString } from '../validation.js';

export interface UpdateOrganizationInput {
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * organizationId is never a parameter here — every operation acts on
 * context.organizationId, which createApplicationContext already verified
 * the caller actually belongs to. A service method that accepted an
 * arbitrary organizationId argument would reopen exactly the "trust a
 * client-supplied id" hole authorization resolution exists to close.
 */
export class OrganizationService {
  private readonly organizations: OrganizationRepository;

  constructor(private readonly context: ApplicationContext) {
    this.organizations = new OrganizationRepository(context.client);
  }

  /** PER-002-01: "View Organization Profile" — every active member may view their own organization. */
  async getOrganization(): Promise<Organization> {
    return this.organizations.getByIdOrThrow(this.context.organizationId);
  }

  /** PER-002-01: "Edit Organization Details" — Manager only. */
  async updateOrganization(input: UpdateOrganizationInput): Promise<Organization> {
    await this.context.requirePermission('organizations.update');

    if (input.name !== undefined) {
      assertNonEmptyString(input.name, 'name');
    }
    if (Object.keys(input).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    return this.organizations.update(this.context.organizationId, input as Partial<Organization>);
  }

  /** Every organization the authenticated identity belongs to — no permission check: this is "what can I even see", not an action on one organization. */
  async listAccessibleOrganizations(): Promise<Organization[]> {
    const results: Organization[] = [];
    for (const organizationId of this.context.accessibleOrganizationIds) {
      const organization = await this.organizations.findById(organizationId);
      if (organization) {
        results.push(organization);
      }
    }
    return results;
  }
}
