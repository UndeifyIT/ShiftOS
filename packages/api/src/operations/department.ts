import { DepartmentService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField } from '../parse.js';

export const createDepartment = defineRpc('create_department', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new DepartmentService(context).createDepartment({
    branchId: requiredStringField(input, 'branchId'),
    name: requiredStringField(input, 'name'),
    description: stringField(input, 'description') ?? null
  });
});

export const getDepartment = defineRpc('get_department', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new DepartmentService(context).getDepartment(requiredStringField(input, 'departmentId'));
});

export const updateDepartment = defineRpc('update_department', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const changes: { name?: string; description?: string | null } = {};
  const name = stringField(input, 'name');
  if (name !== undefined) changes.name = name;
  if ('description' in input) changes.description = stringField(input, 'description') ?? null;
  return new DepartmentService(context).updateDepartment(requiredStringField(input, 'departmentId'), changes);
});

export const archiveDepartment = defineRpc('archive_department', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new DepartmentService(context).archiveDepartment(requiredStringField(input, 'departmentId'));
});

export const listDepartments = defineRpc('list_departments', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new DepartmentService(context).listDepartments(stringField(input, 'branchId'));
});

export const countEmployeesInDepartment = defineRpc('count_employees_in_department', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const count = await new DepartmentService(context).countEmployeesInDepartment(requiredStringField(input, 'departmentId'));
  return { count };
});

export const departmentOperations = [
  createDepartment,
  getDepartment,
  updateDepartment,
  archiveDepartment,
  listDepartments,
  countEmployeesInDepartment
];
