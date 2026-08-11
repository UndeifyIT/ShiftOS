/** See apps/web/src/types/domain.ts — same mirror-of-repository-types rationale, duplicated across the two client apps since neither depends on packages/repositories at runtime. */

export interface Employee {
  id: string;
  branch_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export type ShiftStatus = 'draft' | 'published' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'archived';

/** No schedule_id column exists on shifts — matched to a schedule by branch_id + shift_date instead (see docs/backend/API-012-SCHEDULING-WORKFLOW.md §4.2). */
export interface Shift {
  id: string;
  branch_id: string;
  title: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
}

export type AssignmentStatus = 'assigned' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  employee_id: string;
  assignment_status: AssignmentStatus;
}

export interface Schedule {
  id: string;
  branch_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published' | 'archived';
}
