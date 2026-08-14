// Domain repository layer (Milestone 3). See docs/backend/API-011-REPOSITORY-ARCHITECTURE.md
// for the architecture this implements.

export { BaseRepository } from '@shiftos/database';
export * from './base/tenantScopedRepository.js';
export * from './base/branchScopedRepository.js';

// Generic entity repository (pre-existing, Milestone 1/2 era) — still useful
// for ad hoc/global tables that don't need a dedicated domain repository.
export * from './entityRepository.js';

// Platform
export * from './platform/organizationRepository.js';
export * from './platform/branchRepository.js';

// Identity
export * from './identity/userRepository.js';
export * from './identity/organizationMembershipRepository.js';
export * from './identity/roleRepository.js';
export * from './identity/permissionRepository.js';
export * from './identity/rolePermissionRepository.js';
export * from './identity/organizationMemberBranchAccessRepository.js';
export * from './identity/invitationRepository.js';

// Workforce
export * from './workforce/employeeRepository.js';
export * from './workforce/employeeHistoryRepository.js';

// Scheduling
export * from './scheduling/shiftTemplateRepository.js';
export * from './scheduling/scheduleRepository.js';
export * from './scheduling/scheduleVersionRepository.js';
export * from './scheduling/shiftRepository.js';
export * from './scheduling/shiftAssignmentRepository.js';
export * from './scheduling/publishScheduleWithVersion.js';

// Attendance
export * from './attendance/attendanceRecordRepository.js';
export * from './attendance/attendanceCorrectionRepository.js';

// Leave
export * from './leave/leaveRequestRepository.js';

// Tasks
export * from './tasks/taskRepository.js';
export * from './tasks/taskAssignmentRepository.js';
export * from './tasks/taskHistoryRepository.js';

// Communications
export * from './communications/announcementRepository.js';
export * from './communications/announcementAcknowledgementRepository.js';

// Notifications
export * from './notifications/notificationRepository.js';
export * from './notifications/notificationPreferenceRepository.js';
export * from './notifications/notificationDeliveryAttemptRepository.js';

// Audit / Security
export * from './audit/auditLogRepository.js';
export * from './audit/securityEventRepository.js';
