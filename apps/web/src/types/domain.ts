/**
 * Client-side mirrors of the row shapes packages/repositories' RPC
 * operations return as JSON. apps/web cannot import packages/repositories
 * directly (it depends on `pg`/Node, and is deliberately outside apps/web's
 * TS project references — server-only). Keep these in sync with the
 * corresponding repository interfaces if a migration changes a column.
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type EmploymentStatus = 'active' | 'inactive' | 'terminated' | 'on_leave';

export interface Employee {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  hire_date: string;
  employment_status: EmploymentStatus;
  notes: string | null;
  /** Storage object path under the private `avatars` bucket, not a public URL — resolve with lib/avatars.ts's useSignedAvatarUrl. */
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmployeeHistoryEntry {
  id: string;
  employee_id: string;
  field_changed?: string;
  previous_value?: string | null;
  new_value?: string | null;
  changed_at: string;
  [key: string]: unknown;
}

export type ScheduleStatus = 'draft' | 'published' | 'archived';

export interface Schedule {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ScheduleVersion {
  id: string;
  schedule_id: string;
  version_number: number;
  changes_summary: string | null;
  created_at: string;
  [key: string]: unknown;
}

export type ShiftStatus = 'draft' | 'published' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'archived';

/** No schedule_id column exists on shifts — a shift belongs to a schedule by branch_id + shift_date falling within the schedule's date range (see docs/backend/API-012-SCHEDULING-WORKFLOW.md §4.2). Don't add one here; it would silently be undefined at runtime. */
export interface Shift {
  id: string;
  organization_id: string;
  branch_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  crosses_midnight: boolean;
  break_minutes: number;
  status: ShiftStatus;
  published_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Role {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  grants_org_wide_branch_access: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Member {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  joined_at: string;
  is_active: boolean;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  role_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type AssignmentStatus = 'assigned' | 'confirmed' | 'declined' | 'completed' | 'cancelled';

export interface ShiftAssignment {
  id: string;
  organization_id: string;
  shift_id: string;
  employee_id: string;
  assignment_status: AssignmentStatus;
  assigned_at: string;
  confirmed_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
