import type { DatabaseClient } from '@shiftos/database';
import { BranchScopedRepository } from '../base/branchScopedRepository.js';
import type { BranchEntity } from '../base/branchScopedRepository.js';

export type ShiftNoteCategory = 'handover' | 'incident' | 'inventory' | 'staffing';
export const SHIFT_NOTE_CATEGORIES: ShiftNoteCategory[] = ['handover', 'incident', 'inventory', 'staffing'];

export interface ShiftNote extends BranchEntity {
  shift_id: string;
  note: string;
  /** Migration 070. */
  category: ShiftNoteCategory;
  include_in_handover: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** listForBranchSince()'s row: the note plus its shift and author. */
export interface ShiftNoteWithDetails extends ShiftNote {
  shift_title: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  author_name: string | null;
  author_role: string | null;
}

export class ShiftNoteRepository extends BranchScopedRepository<ShiftNote> {
  constructor(client: DatabaseClient) {
    super(client, 'shift_notes');
  }

  /**
   * A branch's notes from `sinceIso` on, newest first, with the shift they
   * belong to and who wrote them (their name and role in this organization).
   */
  async listForBranchSince(organizationId: string, branchId: string, sinceIso: string, limit = 100): Promise<ShiftNoteWithDetails[]> {
    return this.client.query<ShiftNoteWithDetails>(
      `SELECT n.*,
              s.title AS shift_title, s.shift_date, s.start_time AS shift_start_time, s.end_time AS shift_end_time,
              NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS author_name,
              r.name AS author_role
         FROM shift_notes n
         JOIN shifts s ON s.id = n.shift_id AND s.organization_id = n.organization_id
         LEFT JOIN users u ON u.id = n.created_by
         LEFT JOIN organization_memberships om ON om.user_id = n.created_by AND om.organization_id = n.organization_id AND om.deleted_at IS NULL
         LEFT JOIN roles r ON r.id = om.role_id
        WHERE n.organization_id = $1 AND n.branch_id = $2 AND n.deleted_at IS NULL AND n.created_at >= $3
        ORDER BY n.created_at DESC
        LIMIT $4`,
      [organizationId, branchId, sinceIso, limit]
    );
  }

  async listForShift(organizationId: string, shiftId: string): Promise<ShiftNote[]> {
    return this.list(organizationId, { filters: { shift_id: shiftId }, orderBy: 'created_at desc' });
  }
}
