export type GoalSource = 'teacher' | 'ai' | 'personal';
// Adicionei 'active' para compatibilidade com o banco, embora o visual use 'pending'
export type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'active';

export interface UnifiedGoal {
  id: string;
  source: GoalSource;
  title: string;
  description: string;
  date: string; // ISO Date String
  target: number;
  current: number;
  status: GoalStatus;
  proof_url?: string | null;
  group_id?: string; 
  metric?: string;
  comments?: string;
}

export interface RankingItem {
  rank: number;
  name: string;
  completed: boolean;
  progress: number;
}