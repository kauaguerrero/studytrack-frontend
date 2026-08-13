export type UserRole = 'student' | 'admin' | 'founder' | 'associate' | 'dev';

export interface UserMetadata {
  role: UserRole;
  school_id?: string;
  full_name?: string;
  avatar_url?: string;
  organization_id?: string;
  permissions?: string[];
}

export const ROLE_PERMISSIONS = {
  student: ['view_dashboard', 'view_assignments', 'take_exam'],
  admin: ['all'],
  founder: ['view_org_dashboard', 'manage_students', 'manage_org_settings'],
  associate: ['correct_essays'],
  dev: ['view_tasks', 'update_tasks', 'use_platform'],
} as const;
