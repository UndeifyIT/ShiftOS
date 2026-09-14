import { EmployeeImportService, type ImportEmployeeRow } from '@shiftos/services';
import { ValidationError } from '@shiftos/errors';
import { defineRpc } from '../rpc.js';
import { asRecord, booleanField, numberField, requiredStringField, stringField } from '../parse.js';

function parseRow(raw: unknown, index: number): ImportEmployeeRow {
  const row = asRecord(raw);
  const rowNumber = numberField(row, 'row');
  if (rowNumber === undefined) {
    throw new ValidationError('Invalid import row', [`rows[${index}].row must be a number`]);
  }
  return {
    row: rowNumber,
    firstName: stringField(row, 'firstName') ?? '',
    lastName: stringField(row, 'lastName') ?? '',
    email: stringField(row, 'email') ?? null,
    phone: stringField(row, 'phone') ?? null,
    departmentId: stringField(row, 'departmentId') ?? null,
    hireDate: stringField(row, 'hireDate') ?? '',
    dateOfBirth: stringField(row, 'dateOfBirth') ?? null,
    employeeNumber: stringField(row, 'employeeNumber'),
    roleId: stringField(row, 'roleId') ?? null
  };
}

export const importEmployees = defineRpc('import_employees', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const rows = input.rows;
  if (!Array.isArray(rows)) {
    throw new ValidationError('Invalid import', ['rows must be an array']);
  }
  return new EmployeeImportService(context).importEmployees({
    branchId: requiredStringField(input, 'branchId'),
    fileName: requiredStringField(input, 'fileName'),
    rows: rows.map(parseRow),
    skippedCount: numberField(input, 'skippedCount') ?? 0,
    sendInvites: booleanField(input, 'sendInvites') ?? false
  });
});

export const listEmployeeImports = defineRpc('list_employee_imports', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new EmployeeImportService(context).listRecentImports(stringField(input, 'branchId'));
});
