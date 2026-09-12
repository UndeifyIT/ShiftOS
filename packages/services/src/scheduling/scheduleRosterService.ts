import {
  ScheduleRosterRepository, ScheduleRepository, EmployeeRepository, ScheduleDayOffRepository,
  type ScheduleRosterEntry
} from '@shiftos/repositories';
import { NotFoundError, ValidationError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { assertUuid } from '../validation.js';
import { clearEmployeeShifts } from './clearEmployeeShifts.js';

/**
 * Schedule roster: which employees are "on" a given week's schedule,
 * independent of whether they have a shift assigned yet. See
 * docs/superpowers/specs/2026-09-06-schedule-grid-rebuild-design.md §2.1/§3.1.
 * Reuses assignments.create/assignments.delete rather than a dedicated
 * permission (documented in that spec and in migration 055's own comment).
 */
export class ScheduleRosterService {
  private readonly roster: ScheduleRosterRepository;
  private readonly schedules: ScheduleRepository;
  private readonly employees: EmployeeRepository;

  constructor(private readonly context: ApplicationContext) {
    this.roster = new ScheduleRosterRepository(context.client);
    this.schedules = new ScheduleRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
  }

  async addEmployeeToSchedule(scheduleId: string, employeeId: string): Promise<ScheduleRosterEntry> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('assignments.create');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }

    const employee = await this.employees.getByIdOrThrow(this.context.organizationId, employeeId);
    if (employee.branch_id !== schedule.branch_id) {
      throw new ValidationError('Employee does not belong to this schedule\'s branch');
    }

    const existing = await this.roster.findEntry(this.context.organizationId, scheduleId, employeeId);
    if (existing) {
      throw new ValidationError('Employee is already on this schedule');
    }

    return this.roster.insert(this.context.organizationId, {
      schedule_id: scheduleId,
      employee_id: employeeId,
      added_by: this.context.userId
    } as Partial<ScheduleRosterEntry>);
  }

  async removeEmployeeFromSchedule(scheduleId: string, employeeId: string): Promise<ScheduleRosterEntry> {
    assertUuid(scheduleId, 'scheduleId');
    assertUuid(employeeId, 'employeeId');
    await this.context.requirePermission('assignments.delete');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);
    if (schedule.status === 'archived') {
      throw new ValidationError('Cannot edit an archived schedule');
    }

    const existing = await this.roster.findEntry(this.context.organizationId, scheduleId, employeeId);
    if (!existing) {
      throw new NotFoundError('Employee is not on this schedule');
    }

    // The handoff's row "✕" takes the person off this week entirely: their
    // shifts and days off for the week go with them (the earlier
    // roster-only rule in the 2026-09-06 spec §6 is superseded by the handoff).
    return this.context.client.transaction(async (trxClient) => {
      await clearEmployeeShifts(trxClient, this.context.organizationId, schedule.branch_id, employeeId, schedule.start_date, schedule.end_date);
      const dayOffsRepo = new ScheduleDayOffRepository(trxClient);
      for (const dayOff of await dayOffsRepo.listForSchedule(this.context.organizationId, scheduleId)) {
        if (dayOff.employee_id === employeeId) await dayOffsRepo.archive(this.context.organizationId, dayOff.id);
      }
      return new ScheduleRosterRepository(trxClient).archive(this.context.organizationId, existing.id);
    });
  }

  async listScheduleRoster(scheduleId: string): Promise<ScheduleRosterEntry[]> {
    assertUuid(scheduleId, 'scheduleId');
    await this.context.requirePermission('schedules.read');

    const schedule = await this.schedules.getByIdOrThrow(this.context.organizationId, scheduleId);
    this.context.requireBranchAccess(schedule.branch_id);

    return this.roster.listForSchedule(this.context.organizationId, scheduleId);
  }
}
