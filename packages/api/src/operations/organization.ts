import { OrganizationService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, stringField, recordField } from '../parse.js';

export const getOrganization = defineRpc('get_organization', async (context) => {
  return new OrganizationService(context).getOrganization();
});

export const updateOrganization = defineRpc('update_organization', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new OrganizationService(context).updateOrganization({
    name: stringField(input, 'name'),
    metadata: recordField(input, 'metadata')
  });
});

export const listAccessibleOrganizations = defineRpc('list_accessible_organizations', async (context) => {
  return new OrganizationService(context).listAccessibleOrganizations();
});

export const organizationOperations = [getOrganization, updateOrganization, listAccessibleOrganizations];
