import { UserService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, stringField } from '../parse.js';

export const updateProfile = defineRpc('update_profile', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new UserService(context).updateMyProfile({
    firstName: stringField(input, 'firstName'),
    lastName: stringField(input, 'lastName'),
    phone: stringField(input, 'phone') ?? (input.phone === null ? null : undefined),
    avatarUrl: stringField(input, 'avatarUrl') ?? (input.avatarUrl === null ? null : undefined)
  });
});

export const userOperations = [updateProfile];
