import { EmployeeService } from '@shiftos/services';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, numberField } from '../parse.js';

export const createEmployee = defineRpc('create_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new EmployeeService(context).createEmployee({
    branchId: requiredStringField(input, 'branchId'),
    employeeNumber: requiredStringField(input, 'employeeNumber'),
    firstName: requiredStringField(input, 'firstName'),
    lastName: requiredStringField(input, 'lastName'),
    email: stringField(input, 'email') ?? null,
    phone: stringField(input, 'phone') ?? null,
    dateOfBirth: stringField(input, 'dateOfBirth') ?? null,
    hireDate: requiredStringField(input, 'hireDate')
  });
});

export const getEmployee = defineRpc('get_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new EmployeeService(context).getEmployee(requiredStringField(input, 'employeeId'));
});

export const updateEmployee = defineRpc('update_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const employeeId = requiredStringField(input, 'employeeId');
  const employmentStatus = stringField(input, 'employmentStatus');
  return new EmployeeService(context).updateEmployee(employeeId, {
    branchId: stringField(input, 'branchId'),
    employeeNumber: stringField(input, 'employeeNumber'),
    firstName: stringField(input, 'firstName'),
    lastName: stringField(input, 'lastName'),
    email: stringField(input, 'email'),
    phone: stringField(input, 'phone'),
    employmentStatus: employmentStatus as 'active' | 'inactive' | 'terminated' | 'on_leave' | undefined,
    notes: stringField(input, 'notes')
  });
});

export const archiveEmployee = defineRpc('archive_employee', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new EmployeeService(context).archiveEmployee(requiredStringField(input, 'employeeId'));
});

export const listEmployees = defineRpc('list_employees', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  const limit = numberField(input, 'limit');
  const offset = numberField(input, 'offset');
  return new EmployeeService(context).listEmployees(stringField(input, 'branchId'), { limit, offset });
});

export const getEmployeeHistory = defineRpc('get_employee_history', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new EmployeeService(context).getEmployeeHistory(requiredStringField(input, 'employeeId'));
});

export const employeeOperations = [createEmployee, getEmployee, updateEmployee, archiveEmployee, listEmployees, getEmployeeHistory];
