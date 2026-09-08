import { ShiftTemplateService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, booleanField } from '../parse.js';

export const listShiftTemplates = defineRpc('list_shift_templates', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftTemplateService(context).listShiftTemplates(requiredStringField(input, 'branchId'));
});

export const createShiftTemplate = defineRpc('create_shift_template', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new ShiftTemplateService(context).createShiftTemplate(requiredStringField(input, 'branchId'), {
    name: requiredStringField(input, 'name'),
    startTime: requiredStringField(input, 'startTime'),
    endTime: requiredStringField(input, 'endTime'),
    crossesMidnight: booleanField(input, 'crossesMidnight'),
    notes: stringField(input, 'notes') ?? null
  });
});

export const shiftTemplateOperations = [listShiftTemplates, createShiftTemplate];
