export type UUID = string;

export interface BaseEntity {
  id: UUID;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: UUID;
  auth_user_id: string;
  email?: string | null;
  display_name?: string | null;
  roles?: Role[];
  permissions?: Permission[];
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
}

export interface RepositoryQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  filters?: Record<string, unknown>;
}

export type Permission = string;

export interface Role {
  id: UUID;
  name: string;
  organization_id: UUID;
}

export interface OrganizationContext {
  organizationId: UUID;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ApiError {
  message: string;
  code: string;
  details?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ApiError;
}
