export interface LeaderboardEntry {
  id: string;
  rank: number;
  full_name: string;
  total_points: number;
  avatar_url?: string;
}

export type LeaderboardScope = 'class' | 'school';