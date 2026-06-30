export interface LeaderboardEntry {
  id: string;
  rank: number;
  full_name: string;
  total_points: number;
  avatar_url?: string;
}

export type LeaderboardScope = 'weekly' | 'all_time';

// ─── Partner / B2B gamification ───────────────────────────────────────────────

export type CanonicalGamificationTitle =
  | 'Aspirante'
  | 'Explorador'
  | 'Estrategista'
  | 'Veterano'
  | 'Elite'
  | 'Lendário';

export type LegacyGamificationTitle = 'Iniciante' | 'Veterano' | 'Expert';

export type GamificationTitle = CanonicalGamificationTitle | LegacyGamificationTitle;
export type ProgressTier = 'Explorador' | 'Estrategista' | 'Veterano' | 'Elite' | 'Lendário';

export interface PodiumAchievement {
  position: number;
  month_reference: string;
}

export interface MonthlyHistoryEntry {
  month_reference: string;
  points: number;
  podium_position?: number | null;
}

export interface PartnerRankingEntry {
  rank: number;
  user_id: string;
  full_name: string;
  is_anonymous?: boolean;
  monthly_points: number;
  monthly_questions_count?: number;
  monthly_accuracy_pct?: number;
  has_questions_leader_badge?: boolean;
  has_accuracy_leader_badge?: boolean;
  has_streak_leader_badge?: boolean;
  current_streak_days?: number;
  has_active_streak?: boolean;
  gamification_title: string;
  progress_tier?: ProgressTier;
  avatar_url?: string | null;
  podium_history?: PodiumAchievement[];
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
  monthly_history: MonthlyHistoryEntry[];
}

export type PopupType = 'onboarding' | 'streak' | 'streak_broken' | 'urgency' | 'motivation' | 'month_end' | 'top3_entered' | 'none';

export interface PopupState {
  type: PopupType;
  mode?: 'monthly_identity_checkin';
  streak?: number;
  streak_lost?: number;
  position?: number;
  month_reference?: string;
  rival_name?: string;
  points_diff?: number;
  points_lost?: number;
  points_to_top3?: number;
  winners?: Array<{
    position: 1 | 2 | 3;
    full_name: string;
    is_anonymous?: boolean;
    avatar_url?: string | null;
    monthly_points: number;
  }>;
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
  progress_tier?: ProgressTier;
  next_tier?: ProgressTier | null;
  points_to_next_tier?: number;
}

export interface DiagnosticResult {
  title: GamificationTitle;
  points_awarded: number;
  current_monthly_points: number;
  already_completed?: boolean;
}

export interface MonthlyCheckInAnswerInput {
  question_id: string;
  answer: string;
}

export interface MonthlyCheckInProfile {
  identity_title: string;
  identity_title_slug: string;
  identity_title_description: string;
  identity_title_icon: string;
  answers_json: Record<string, string>;
  redo_count: number;
  updated_at?: string;
}

export interface MonthlyCheckInStatus {
  enabled: boolean;
  required: boolean;
  can_redo: boolean;
  month_reference: string;
  profile: MonthlyCheckInProfile | null;
}

export interface MonthlyCheckInResult {
  month_reference: string;
  identity_title: string;
  identity_title_slug: string;
  identity_title_description: string;
  identity_title_icon: string;
  answers: Record<string, string>;
  redo_count: number;
  monthly_points: number;
  progress_tier: ProgressTier;
  next_tier: ProgressTier | null;
  points_to_next_tier: number;
}

export interface JourneyMilestone {
  tier: ProgressTier;
  min_points: number;
  max_points: number | null;
  unlocked: boolean;
  is_current: boolean;
}

export interface TitlesJourneyResponse {
  enabled: boolean;
  month_reference: string;
  monthly_points: number;
  identity_profile: MonthlyCheckInProfile | null;
  progress_tier: ProgressTier;
  next_tier: ProgressTier | null;
  points_to_next_tier: number;
  milestones: JourneyMilestone[];
}

export interface TitlesHistoryEntry {
  month_reference: string;
  identity_title: string;
  identity_title_slug: string;
  identity_title_description: string;
  identity_title_icon: string;
  final_monthly_points: number;
  final_progress_tier: ProgressTier;
  final_rank_position?: number | null;
  points_delta_vs_previous?: number | null;
  tier_delta_vs_previous?: number | null;
}

export interface TitlesHistoryResponse {
  history: TitlesHistoryEntry[];
}

export interface StreakDecayResult {
  points_deducted: number;
  previous_rank: number;
  current_rank: number;
  rank_dropped: boolean;
  rival_name: string | null;
}
