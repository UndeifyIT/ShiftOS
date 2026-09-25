import {
  AnnouncementRepository,
  AnnouncementAcknowledgementRepository,
  EmployeeRepository,
  UserRepository,
  type Announcement,
  type AnnouncementAcknowledgement,
  type AnnouncementType,
  type AnnouncementVisibility,
  type Employee
} from '@shiftos/repositories';
import { ValidationError, NotFoundError } from '@shiftos/errors';
import type { ApplicationContext } from '../applicationContext.js';
import { notifyEvent } from '../notifications/notificationService.js';
import { assertNonEmptyString, assertUuid, assertOneOf } from '../validation.js';
import { notify } from '../notifications/notificationService.js';

const ANNOUNCEMENT_TYPES: readonly AnnouncementType[] = ['general', 'policy', 'safety', 'operational', 'emergency'];

export interface CreateAnnouncementInput {
  /** Omit for an organization-wide announcement (visibility_type = 'organization'); provide to scope it to one branch. */
  branchId?: string | null;
  title: string;
  content: string;
  announcementType?: AnnouncementType;
  expiresAt?: string | null;
<<<<<<< HEAD
  /** 067 — sits at the top of the list, in its own card. */
  isPinned?: boolean;
  /** 067 — whether recipients are asked to acknowledge it. */
  requiresAcknowledgement?: boolean;
=======
  /** Migration 066: pin it to the top of the list. */
  isPinned?: boolean;
>>>>>>> origin/main
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  announcementType?: AnnouncementType;
  expiresAt?: string | null;
  isPinned?: boolean;
<<<<<<< HEAD
  requiresAcknowledgement?: boolean;
}

/** One recipient's line in the receipts panel. */
export interface AnnouncementReceipt {
  employeeId: string;
  name: string;
  departmentId: string | null;
  email: string | null;
  acknowledgedAt: string | null;
=======
}

export interface AnnouncementReminderResult {
  /** Outstanding recipients sent an in-app reminder. */
  reminded: number;
  /** Outstanding recipients with no ShiftOS login to remind (no user with their email). */
  undelivered: number;
>>>>>>> origin/main
}

/** Communications service (backend completion pass) — the announcements domain had a full table/repository layer (014) but no permission codes, service, or API until now. */
export class AnnouncementService {
  private readonly announcements: AnnouncementRepository;
  private readonly acknowledgements: AnnouncementAcknowledgementRepository;
  private readonly employees: EmployeeRepository;
  private readonly users: UserRepository;

  constructor(private readonly context: ApplicationContext) {
    this.announcements = new AnnouncementRepository(context.client);
    this.acknowledgements = new AnnouncementAcknowledgementRepository(context.client);
    this.employees = new EmployeeRepository(context.client);
    this.users = new UserRepository(context.client);
  }

  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    await this.context.requirePermission('announcements.create');
    assertNonEmptyString(input.title, 'title');
    assertNonEmptyString(input.content, 'content');
    if (input.announcementType !== undefined) {
      assertOneOf(input.announcementType, ANNOUNCEMENT_TYPES, 'announcementType');
    }
    if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) {
      throw new ValidationError('Invalid expiresAt', ['expiresAt must be a valid date/time']);
    }
    if (input.branchId) {
      this.context.requireBranchAccess(input.branchId);
    }

    const visibilityType: AnnouncementVisibility = input.branchId ? 'branch' : 'organization';

    return this.announcements.insert(this.context.organizationId, {
      branch_id: input.branchId ?? null,
      title: input.title.trim(),
      content: input.content.trim(),
      announcement_type: input.announcementType ?? 'general',
      visibility_type: visibilityType,
      is_published: false,
<<<<<<< HEAD
      is_pinned: input.isPinned ?? false,
      requires_acknowledgement: input.requiresAcknowledgement ?? false,
=======
      is_pinned: input.isPinned === true,
>>>>>>> origin/main
      expires_at: input.expiresAt ?? null,
      created_by: this.context.userId
    } as Partial<Announcement>);
  }

  async updateAnnouncement(announcementId: string, input: UpdateAnnouncementInput): Promise<Announcement> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.update');

    const before = await this.getScoped(announcementId);
    if (input.title !== undefined) assertNonEmptyString(input.title, 'title');
    if (input.content !== undefined) assertNonEmptyString(input.content, 'content');
    if (input.announcementType !== undefined) assertOneOf(input.announcementType, ANNOUNCEMENT_TYPES, 'announcementType');
    if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) {
      throw new ValidationError('Invalid expiresAt', ['expiresAt must be a valid date/time']);
    }

    const changes: Partial<Announcement> = {};
    if (input.title !== undefined) changes.title = input.title.trim();
    if (input.content !== undefined) changes.content = input.content.trim();
    if (input.announcementType !== undefined) changes.announcement_type = input.announcementType;
    if (input.expiresAt !== undefined) changes.expires_at = input.expiresAt;
    if (input.isPinned !== undefined) changes.is_pinned = input.isPinned;
<<<<<<< HEAD
    if (input.requiresAcknowledgement !== undefined) changes.requires_acknowledgement = input.requiresAcknowledgement;
=======
>>>>>>> origin/main

    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No changes supplied');
    }

    return this.announcements.patch(this.context.organizationId, before.id, changes);
  }

  async publishAnnouncement(announcementId: string): Promise<Announcement> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.publish');
    const before = await this.getScoped(announcementId);
    if (before.is_published) {
      throw new ValidationError('Announcement is already published');
    }
    return this.announcements.publish(this.context.organizationId, before.id);
  }

  async archiveAnnouncement(announcementId: string): Promise<Announcement> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.archive');
    const before = await this.getScoped(announcementId);
    const archived = await this.announcements.archive(this.context.organizationId, before.id);
    await this.context.audit('archive_announcement', 'announcement', announcementId, before, archived);
    return archived;
  }

  async getAnnouncement(announcementId: string): Promise<Announcement> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.read');
    return this.getScoped(announcementId);
  }

  /**
   * Callers holding announcements.update (content managers) see every
   * announcement in their accessible branches, drafts included — otherwise,
   * only the published, non-expired audience view (AnnouncementRepository.listVisibleTo).
   */
  async listAnnouncements(requestedBranchId?: string, options?: { limit?: number; offset?: number }): Promise<Announcement[]> {
    await this.context.requirePermission('announcements.read');
    const branchIds = this.context.resolveBranchScope(requestedBranchId);
    const canManage = await this.context.hasPermission('announcements.update');
    if (canManage) {
      return this.announcements.listManaged(this.context.organizationId, branchIds, options);
    }
    return this.announcements.listVisibleTo(this.context.organizationId, branchIds, options);
  }

  async acknowledgeAnnouncement(announcementId: string): Promise<void> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.acknowledge');
    const announcement = await this.getScoped(announcementId);
    if (!announcement.is_published) {
      throw new ValidationError('Cannot acknowledge an unpublished announcement');
    }

    const employee = await this.resolveMyEmployee();
    if (!employee) {
      throw new ValidationError('Your account is not linked to an employee record, so there is nothing to acknowledge as.');
    }

    const already = await this.acknowledgements.hasAcknowledged(this.context.organizationId, announcementId, employee.id);
    if (already) {
      return;
    }
    await this.acknowledgements.acknowledge(this.context.organizationId, announcementId, employee.id);
  }

  /**
   * Who has acknowledged one announcement — the handoff's acknowledgement
   * receipts. Content managers only (announcements.update), the same people
   * who see drafts in listAnnouncements.
   */
  async listAcknowledgements(announcementId: string): Promise<AnnouncementAcknowledgement[]> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.update');
    const announcement = await this.getScoped(announcementId);
    return this.acknowledgements.listForAnnouncement(this.context.organizationId, announcement.id);
  }

  /**
   * The handoff's "Remind unread": an in-app notification to every active
   * employee in the announcement's audience who hasn't acknowledged it yet. An
   * employee with no ShiftOS login (no user with their email) can't be
   * reached and is counted as undelivered instead.
   */
  async remindOutstanding(announcementId: string): Promise<AnnouncementReminderResult> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.update');
    const announcement = await this.getScoped(announcementId);
    if (!announcement.is_published) {
      throw new ValidationError('Publish the announcement before sending reminders');
    }

    const branchIds = announcement.branch_id ? [announcement.branch_id] : this.context.resolveBranchScope();
    const audience = await this.employees.findActiveEmployees(this.context.organizationId, branchIds);
    const acknowledged = new Set(
      (await this.acknowledgements.listForAnnouncement(this.context.organizationId, announcement.id)).map((row) => row.employee_id)
    );

    const result: AnnouncementReminderResult = { reminded: 0, undelivered: 0 };
    for (const employee of audience) {
      if (acknowledged.has(employee.id)) continue;
      const user = employee.email ? await this.users.findByEmail(employee.email) : null;
      if (!user) {
        result.undelivered += 1;
        continue;
      }
      await notifyEvent(
        this.context.client,
        this.context.organizationId,
        user.id,
        'announcement_reminders',
        `Reminder: ${announcement.title}`,
        'Please read this announcement and acknowledge it in ShiftOS.'
      );
      result.reminded += 1;
    }
    await this.context.audit('remind_announcement', 'announcement', announcement.id, null, { ...result });
    return result;
  }

  async hasAcknowledged(announcementId: string): Promise<boolean> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.read');
    const employee = await this.resolveMyEmployee();
    if (!employee) {
      return false;
    }
    return this.acknowledgements.hasAcknowledged(this.context.organizationId, announcementId, employee.id);
  }

  /**
   * Who this announcement went to, and who has acknowledged it — the handoff's
   * receipts panel. Recipients are the active employees of its audience: one
   * branch, or every branch the caller can see for an organization-wide post.
   */
  async listReceipts(announcementId: string): Promise<AnnouncementReceipt[]> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.read');
    await this.context.requirePermission('employees.read');

    const announcement = await this.getScoped(announcementId);
    const branchIds = this.context.resolveBranchScope(announcement.branch_id ?? undefined);
    const employees = (await this.employees.listByBranches(this.context.organizationId, branchIds)).filter(
      (employee) => employee.is_active && !employee.deleted_at
    );
    const acknowledgements = await this.acknowledgements.listForAnnouncement(this.context.organizationId, announcementId);
    const acknowledgedAt = new Map(acknowledgements.map((row) => [row.employee_id, row.acknowledged_at]));

    return employees.map((employee) => ({
      employeeId: employee.id,
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      departmentId: employee.department_id ?? null,
      email: employee.email ?? null,
      acknowledgedAt: acknowledgedAt.get(employee.id) ?? null
    }));
  }

  /**
   * Nudges everyone who has not acknowledged yet. The in-app notification is
   * the delivery this system can actually make good on, so that is what is
   * written; the count of people it could not reach (no ShiftOS login) comes
   * back rather than being quietly dropped.
   */
  async remindUnacknowledged(announcementId: string): Promise<{ reminded: number; unreachable: number }> {
    assertUuid(announcementId, 'announcementId');
    await this.context.requirePermission('announcements.update');

    const announcement = await this.getScoped(announcementId);
    if (!announcement.is_published) {
      throw new ValidationError('Publish the announcement before reminding anyone about it');
    }

    const outstanding = (await this.listReceipts(announcementId)).filter((receipt) => receipt.acknowledgedAt === null);
    let reminded = 0;
    let unreachable = 0;

    for (const receipt of outstanding) {
      const user = receipt.email ? await this.users.findByEmail(receipt.email) : null;
      if (!user) {
        unreachable += 1;
        continue;
      }
      await notify(
        this.context.client,
        this.context.organizationId,
        user.id,
        'Please acknowledge an announcement',
        announcement.title,
        'normal'
      );
      reminded += 1;
    }

    await this.context.audit('remind_announcement', 'announcement', announcementId, null, { reminded, unreachable });
    return { reminded, unreachable };
  }

  /** Branch-visibility-aware fetch: an org-wide announcement (branch_id null) is always in scope; a branch-specific one requires access to that branch. */
  private async getScoped(announcementId: string): Promise<Announcement> {
    const announcement = await this.announcements.getById(this.context.organizationId, announcementId);
    if (!announcement) {
      throw new NotFoundError(`Record ${announcementId} not found in announcements`);
    }
    if (announcement.branch_id) {
      this.context.requireBranchAccess(announcement.branch_id);
    }
    return announcement;
  }

  private async resolveMyEmployee(): Promise<Employee | null> {
    const user = await this.users.getByIdOrThrow(this.context.userId);
    return this.employees.findByEmail(this.context.organizationId, user.email);
  }
}
