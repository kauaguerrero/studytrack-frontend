export type UserRole = 'student' | 'teacher' | 'manager' | 'admin';

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
  teacher: ['view_classes', 'create_assignment', 'grade_exam', 'view_question_bank'],
  manager: ['view_school_stats', 'manage_users', 'view_financial', 'manage_curriculum'],
  admin: ['all']
} as const;