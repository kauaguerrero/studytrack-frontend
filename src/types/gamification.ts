export interface LeaderboardEntry {
  id: string;
  rank: number;
  full_name: string;
  total_points: number;
  avatar_url?: string;
}

export type LeaderboardScope = 'weekly' | 'all_time';

// ─── Partner / B2B gamification ───────────────────────────────────────────────

export type GamificationTitle = 'Iniciante' | 'Veterano' | 'Expert';

export interface PartnerRankingEntry {
  rank: number;
  user_id: string;
  full_name: string;
  monthly_points: number;
  gamification_title: GamificationTitle;
  avatar_url?: string | null;
}

export interface UserRankingContext {
  position: number;
  above: PartnerRankingEntry[];
  self: PartnerRankingEntry;
  below: PartnerRankingEntry[];
}

export interface PartnerRankingResponse {
  ranking: PartnerRankingEntry[];
  user_context: UserRankingContext | null;
  prize_cutoff: number;
}

export type PopupType = 'onboarding' | 'streak' | 'streak_broken' | 'urgency' | 'motivation' | 'month_end' | 'top3_entered' | 'none';

export interface PopupState {
  type: PopupType;
  streak?: number;
  streak_lost?: number;
  position?: number;
  rival_name?: string;
  points_diff?: number;
  points_lost?: number;
  points_to_top3?: number;
  /** For month_end: user's final rank for that month */
  winner_rank?: number;
  /** For month_end: total participants */
  total_participants?: number;
  /** Signals a month reset just occurred; triggers MonthEndScreen with winners */
  month_reset_pending?: boolean;
}

export interface MonthlySummary {
  monthly_points: number;
  rank_position: number;
  points_to_top3: number;
  prize_cutoff: number;
  month_label: string;
  monthly_goal: number;
  goal_reached: boolean;
  goal_progress_pct: number;
  shield_count: number;
}

export interface DiagnosticResult {
  title: GamificationTitle;
  points_awarded: number;
  current_monthly_points: number;
  already_completed?: boolean;
}

export interface StreakDecayResult {
  points_deducted: number;
  previous_rank: number;
  current_rank: number;
  rank_dropped: boolean;
  rival_name: string | null;
}