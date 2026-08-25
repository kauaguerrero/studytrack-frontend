export interface OrgOption {
  id: string;
  name: string;
}

export interface RecentAchievement {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  organization_name: string | null;
  achievement_id: string;
  achievement_title: string;
  achievement_icon: string | null;
  difficulty: string | null;
  unlocked_at: string;
}

export interface HistoryResponse {
  achievements: RecentAchievement[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardTopItem {
  id: string;
  title: string;
  count: number;
}

export interface DashboardData {
  total_unlocked: number;
  unlocked_in_period: number;
  unique_achievers: number;
  students_count: number;
  avg_per_student: number;
  completion_rate_pct: number;
  completionist_count: number;
  most_popular: DashboardTopItem | null;
  rarest_unlocked: DashboardTopItem | null;
  unlocks_by_day: { date: string; count: number }[];
  by_difficulty: { difficulty: string; label: string; count: number }[];
  by_category: { category: string; count: number }[];
  top_achievements: DashboardTopItem[];
  by_org: { org_id: string; org_name: string; count: number }[];
}

export interface CatalogAchievement {
  id: string;
  category: string;
  group: string;
  group_label: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  difficulty: string;
  difficulty_label: string;
  chance_pct: number;
  completion_count: number;
  completion_pct: number;
}

export interface CatalogResponse {
  achievements: CatalogAchievement[];
  total: number;
  page: number;
  limit: number;
  students_in_scope: number;
}
