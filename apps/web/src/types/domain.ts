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

export interface Department {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  description: string | null;
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
  version: number;
  changes_summary: string | null;
  published_at: string;
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

export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  role_name: string;
  status: InvitationStatus;
  invited_by: string;
  invited_by_first_name: string;
  invited_by_last_name: string;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
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

export type TaskStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskVerificationStatus = 'pending' | 'verified' | 'rework_required';

export interface Task {
  id: string;
  organization_id: string;
  branch_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  task_status: TaskStatus;
  assigned_supervisor_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  verification_status: TaskVerificationStatus;
  created_by: string;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskHistoryEntry {
  id: string;
  organization_id: string;
  task_id: string;
  status: TaskStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
  [key: string]: unknown;
}

export type AttendanceStatus = 'scheduled' | 'present' | 'late' | 'absent' | 'no_show' | 'left_early' | 'completed';

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  shift_assignment_id: string;
  employee_id: string;
  attendance_status: AttendanceStatus;
  clock_in_at: string | null;
  clock_out_at: string | null;
  break_minutes: number;
  /** Database-owned (computed by trg_attendance_records_validate) — not client-writable in practice. */
  worked_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
  early_departure_minutes: number;
  notes: string | null;
  recorded_by: string;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type AnnouncementType = 'general' | 'policy' | 'safety' | 'operational' | 'emergency';
export type AnnouncementVisibility = 'organization' | 'branch' | 'public';

export interface Announcement {
  id: string;
  organization_id: string;
  /** Nullable: null means organization-wide, matching visibility_type = 'organization'. */
  branch_id: string | null;
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  visibility_type: AnnouncementVisibility;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type LeaveType = 'annual_leave' | 'sick_leave' | 'emergency_leave' | 'unpaid_leave';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_id: string;
  requested_by: string;
  approved_by: string | null;
  leave_type: LeaveType;
  status: LeaveRequestStatus;
  start_date: string;
  end_date: string;
  /** Database-generated (GENERATED ALWAYS STORED as (end_date - start_date) + 1) — never sent by the client. */
  total_days: number;
  reason: string;
  manager_notes: string | null;
  cancellation_reason: string | null;
  last_status_changed_at: string;
  version: number;
  created_by: string;
  rejected_by: string | null;
  cancelled_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ShiftSwapStatus = 'pending' | 'accepted' | 'declined' | 'approved' | 'rejected' | 'cancelled';

/** No soft-delete: shift_swap_requests is a workflow state machine, not an append-only log — no deleted_at column exists. */
export interface ShiftSwap {
  id: string;
  organization_id: string;
  branch_id: string;
  shift_assignment_id: string;
  requested_by_employee_id: string;
  target_employee_id: string | null;
  status: ShiftSwapStatus;
  notes: string | null;
  responded_by_employee_id: string | null;
  responded_at: string | null;
  decision_by: string | null;
  decision_at: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

/** Effectively append-only/mutate-once (read_at); no updated_at/deleted_at columns exist. */
export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  content: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  read_at: string | null;
  created_at: string;
}
