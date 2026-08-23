import { TaskService } from '@shiftos/services';
import type { TaskPriority, TaskStatus, TaskVerificationStatus } from '@shiftos/repositories';
import { defineRpc } from '../rpc.js';
import { asRecord, requiredStringField, stringField, numberField } from '../parse.js';

export const createTask = defineRpc('create_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).createTask({
    branchId: requiredStringField(input, 'branchId'),
    title: requiredStringField(input, 'title'),
    description: stringField(input, 'description') ?? null,
    dueDate: stringField(input, 'dueDate') ?? null,
    dueTime: stringField(input, 'dueTime') ?? null,
    priority: stringField(input, 'priority') as TaskPriority | undefined
  });
});

export const getTask = defineRpc('get_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).getTask(requiredStringField(input, 'taskId'));
});

export const updateTask = defineRpc('update_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  const taskId = requiredStringField(input, 'taskId');
  return new TaskService(context).updateTask(taskId, {
    title: stringField(input, 'title'),
    description: stringField(input, 'description') ?? (input.description === null ? null : undefined),
    dueDate: stringField(input, 'dueDate') ?? (input.dueDate === null ? null : undefined),
    dueTime: stringField(input, 'dueTime') ?? (input.dueTime === null ? null : undefined),
    priority: stringField(input, 'priority') as TaskPriority | undefined
  });
});

export const assignTask = defineRpc('assign_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).assignTask(requiredStringField(input, 'taskId'), requiredStringField(input, 'supervisorEmployeeId'));
});

export const completeTask = defineRpc('complete_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).completeTask(requiredStringField(input, 'taskId'), stringField(input, 'notes') ?? null);
});

export const verifyTask = defineRpc('verify_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).verifyTask(
    requiredStringField(input, 'taskId'),
    requiredStringField(input, 'status') as TaskVerificationStatus,
    stringField(input, 'notes') ?? null
  );
});

export const reopenTask = defineRpc('reopen_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).reopenTask(requiredStringField(input, 'taskId'));
});

export const cancelTask = defineRpc('cancel_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).cancelTask(requiredStringField(input, 'taskId'), stringField(input, 'reason') ?? null);
});

export const archiveTask = defineRpc('archive_task', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).archiveTask(requiredStringField(input, 'taskId'));
});

export const listTasks = defineRpc('list_tasks', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput ?? {});
  return new TaskService(context).listTasks(stringField(input, 'branchId'), {
    status: stringField(input, 'status') as TaskStatus | undefined,
    limit: numberField(input, 'limit'),
    offset: numberField(input, 'offset')
  });
});

export const getTaskHistory = defineRpc('get_task_history', async (context, rawInput: unknown) => {
  const input = asRecord(rawInput);
  return new TaskService(context).getTaskHistory(requiredStringField(input, 'taskId'));
});

export const taskOperations = [
  createTask, getTask, updateTask, assignTask, completeTask, verifyTask, reopenTask, cancelTask, archiveTask, listTasks, getTaskHistory
];
