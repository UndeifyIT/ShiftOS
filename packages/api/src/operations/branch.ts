import { BranchService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, recordField, booleanField } from '../parse.js';

export const createBranch = defineRpc('create_branch', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new BranchService(context).createBranch({
    name: requiredStringField(input, 'name'),
    address: stringField(input, 'address') ?? null,
    settings: recordField(input, 'settings')
  });
});

export const updateBranch = defineRpc('update_branch', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const branchId = requiredStringField(input, 'branchId');
  return new BranchService(context).updateBranch(branchId, {
    name: stringField(input, 'name'),
    address: stringField(input, 'address'),
    settings: recordField(input, 'settings'),
    is_active: booleanField(input, 'isActive')
  });
});

export const archiveBranch = defineRpc('archive_branch', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new BranchService(context).archiveBranch(requiredStringField(input, 'branchId'));
});

export const getBranch = defineRpc('get_branch', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new BranchService(context).getBranch(requiredStringField(input, 'branchId'));
});

export const listBranches = defineRpc('list_branches', async (context) => {
  return new BranchService(context).listAccessibleBranches();
});

export const branchOperations = [createBranch, updateBranch, archiveBranch, getBranch, listBranches];
