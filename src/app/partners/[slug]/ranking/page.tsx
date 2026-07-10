'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Award,
  Flame,
  Star,
  Zap,
  Gift,
  Users,
  EyeOff,
} from 'lucide-react';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { Skeleton } from '@/components/ui/skeleton';
import { getProgressTierMeta } from '@/components/partners/gamification/titleSystem';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, readableBrandTextOnDark, resolveAccentColor } from '@/lib/brand-color';
import { RevealGroup, RevealItem, ElevatedCard, BrandHero } from '@/components/partners/founder-ui';
import type { PartnerRankingEntry } from '@/types/gamification';
import { getInitials, getRankingDisplayName, isAnonymousRankingEntry } from '@/lib/ranking-privacy';
import { summarizePodiumStreaks } from '@/lib/podium-streak';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';

// ─── Animation config ────────────────────────────────────────────────────────

const ROW_VARIANTS = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      delay: i * 0.04,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const PODIUM_RISE = {
  hidden: { scaleY: 0, opacity: 0 },
  show: (delay: number) => ({
    scaleY: 1,
    opacity: 1,
    transition: {
      scaleY: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
      opacity: { duration: 0.3, delay },
    },
  }),
};

// ─── Rank theme config (posição literal do mês) ───────────────────────────────

const RANK_THEMES = {
  1: {
    gradient: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 50%, #D97706 100%)',
    glow: '#F59E0B',
    glowIntensity: '0 0 30px #F59E0B44, 0 0 60px #F59E0B22',
    icon: Crown,
    label: '1º',
    bg: 'linear-gradient(180deg, #F59E0B18 0%, #F59E0B08 50%, transparent 100%)',
    ring: '#F59E0B55',
    textColor: '#FFD700',
    pedestalBg: 'linear-gradient(180deg, #FCD34D 0%, #F59E0B 55%, #B45309 100%)',
    pedestalRing: '#78350F',
    pedestalTextColor: '#ffffff',
  },
  2: {
    gradient: 'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 50%, #64748B 100%)',
    glow: '#94A3B8',
    glowIntensity: '0 0 20px #94A3B844, 0 0 40px #94A3B822',
    icon: Medal,
    label: '2º',
    bg: 'linear-gradient(180deg, #94A3B812 0%, #94A3B806 50%, transparent 100%)',
    ring: '#94A3B844',
    textColor: '#CBD5E1',
    pedestalBg: 'linear-gradient(180deg, #E2E8F0 0%, #94A3B8 55%, #475569 100%)',
    pedestalRing: '#1E293B',
    pedestalTextColor: '#ffffff',
  },
  3: {
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #B45309 50%, #92400E 100%)',
    glow: '#B45309',
    glowIntensity: '0 0 20px #B4530944, 0 0 40px #B4530922',
    icon: Award,
    label: '3º',
    bg: 'linear-gradient(180deg, #B4530912 0%, #B4530906 50%, transparent 100%)',
    ring: '#B4530944',
    textColor: '#D97706',
    pedestalBg: 'linear-gradient(180deg, #E0995A 0%, #B45309 55%, #7C2D12 100%)',
    pedestalRing: '#431407',
    pedestalTextColor: '#ffffff',
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPoints(pts: number): string {
  return pts.toLocaleString('pt-BR');
}

function formatMonthLabel(monthRef: string): string {
  const date = new Date(`${monthRef}T12:00:00`);
  if (Number.isNaN(date.getTime())) return monthRef;
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getPodiumLabel(position: number): string {
  if (position === 1) return 'Líder';
  if (position === 2) return 'Vice-Líder';
  return `Top ${position}`;
}

function getPodiumBadgeStyle(position: number): { background: string; color: string; border: string } {
  if (position === 1) {
    return { background: 'rgba(245, 158, 11, 0.14)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.28)' };
  }
  if (position === 2) {
    return { background: 'rgba(148, 163, 184, 0.14)', color: '#475569', border: '1px solid rgba(148, 163, 184, 0.24)' };
  }
  return { background: 'rgba(180, 83, 9, 0.14)', color: '#9A3412', border: '1px solid rgba(180, 83, 9, 0.24)' };
}

/** CSS vars pra `.brand-text-adaptive` escolher claro/escuro sozinho via `.dark`. */
function adaptiveTextStyle(hex: string | undefined | null, cssVar: string) {
  return {
    ['--bta-light' as string]: readableBrandText(hex, cssVar),
    ['--bta-dark' as string]: readableBrandTextOnDark(hex, cssVar),
  };
}

// ─── Podium ──────────────────────────────────────────────────────────────────

function PodiumEntry({ entry }: { entry: PartnerRankingEntry }) {
  const theme = RANK_THEMES[entry.rank as 1 | 2 | 3];
  const isFirst = entry.rank === 1;
  const Icon = theme.icon;
  const pedestalHeight = isFirst ? 104 : entry.rank === 2 ? 76 : 60;
  const isAnonymous = isAnonymousRankingEntry(entry);

  return (
    <motion.div
      className="flex flex-col items-center gap-2 flex-1 min-w-0"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: isFirst ? 0.3 : entry.rank === 2 ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={isFirst ? { rotate: [0, -6, 6, -3, 3, 0] } : undefined}
        transition={isFirst ? { duration: 2, repeat: Infinity, repeatDelay: 4 } : undefined}
      >
        <Icon className={isFirst ? 'h-6 w-6' : 'h-5 w-5'} style={{ color: theme.textColor, filter: `drop-shadow(0 0 8px ${theme.glow}66)` }} />
      </motion.div>

      <p
        className="text-center text-[10px] sm:text-[11px] font-bold leading-tight max-w-[68px] sm:max-w-[80px] truncate text-white/85"
        title={getRankingDisplayName(entry)}
      >
        {getRankingDisplayName(entry, { short: true })}
      </p>

      <div className="relative">
        {isFirst && (
          <motion.div
            className="absolute -inset-1.5 rounded-full"
            style={{ background: theme.gradient, opacity: 0.3 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {isAnonymous ? (
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
            style={{ background: 'linear-gradient(135deg, #475569, #334155)', boxShadow: theme.glowIntensity, border: '2.5px solid rgba(148, 163, 184, 0.55)' }}>
            <EyeOff className="h-4 w-4" />
          </div>
        ) : entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.avatar_url} alt="" className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover"
            style={{ border: `2.5px solid ${theme.glow}`, boxShadow: theme.glowIntensity }} />
        ) : (
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-xs sm:text-sm font-extrabold text-white"
            style={{ background: theme.gradient, boxShadow: theme.glowIntensity, border: `2.5px solid ${theme.glow}88` }}>
            {getInitials(entry.full_name)}
          </div>
        )}
      </div>

      {/* Pedestal — sólido/opaco, "tipo altar" */}
      <motion.div
        className="w-full flex flex-col items-center justify-center rounded-t-xl relative overflow-hidden"
        style={{
          height: pedestalHeight,
          background: theme.pedestalBg,
          borderTop: `2px solid ${theme.pedestalRing}`,
          borderLeft: `1px solid ${theme.pedestalRing}`,
          borderRight: `1px solid ${theme.pedestalRing}`,
          originY: 1,
        }}
        variants={PODIUM_RISE}
        custom={isFirst ? 0.2 : entry.rank === 2 ? 0.1 : 0.3}
        initial="hidden"
        animate="show"
      >
        <motion.div className="absolute inset-0 opacity-15" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 60%)' }} />
        <span className="text-xl sm:text-2xl font-black relative z-10" style={{ color: theme.pedestalTextColor, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
          {theme.label}
        </span>
        <p className="mt-0.5 text-[9px] sm:text-[10px] font-bold relative z-10 opacity-75" style={{ color: theme.pedestalTextColor, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
          {formatPoints(entry.monthly_points)} pts
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function RankRow({ entry, isPrize, index, primaryHex }: { entry: PartnerRankingEntry; isPrize: boolean; index: number; primaryHex?: string | null }) {
  const isTop3 = entry.rank <= 3;
  const theme = isTop3 ? RANK_THEMES[entry.rank as 1 | 2 | 3] : null;
  const progressMeta = getProgressTierMeta(entry.progress_tier);
  const ProgressIcon = progressMeta.Icon;
  const recentAchievements = summarizePodiumStreaks(entry.podium_history ?? []).slice(0, 2);
  const isAnonymous = isAnonymousRankingEntry(entry);
  const hasActiveStreak = Boolean((entry.current_streak_days ?? 0) > 0 && entry.has_active_streak);

  return (
    <motion.div
      className="group relative flex items-center gap-2.5 sm:gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      variants={ROW_VARIANTS}
      custom={index}
      initial="hidden"
      animate="show"
    >
      <div className="flex w-8 shrink-0 items-center justify-center">
        {theme ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: theme.bg, border: `1px solid ${theme.ring}` }}>
            <theme.icon className="h-3.5 w-3.5" style={{ color: theme.textColor }} />
          </div>
        ) : (
          <span
            className={`brand-text-adaptive text-xs font-bold tabular-nums ${isPrize ? '' : 'text-slate-400 dark:text-slate-500/60'}`}
            style={isPrize ? adaptiveTextStyle(primaryHex, 'var(--brand-primary)') : undefined}
          >
            {entry.rank}
          </span>
        )}
      </div>

      <div className="relative shrink-0">
        {isAnonymous ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-white sm:h-9 sm:w-9 dark:bg-slate-700"
            style={{ border: theme ? `2px solid ${theme.glow}44` : '2px solid #475569' }}>
            <EyeOff className="h-3.5 w-3.5" />
          </div>
        ) : entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.avatar_url} alt="" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
            style={{ border: theme ? `2px solid ${theme.glow}55` : '2px solid transparent' }} />
        ) : (
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold text-white"
            style={{ background: theme ? theme.gradient : 'linear-gradient(135deg, #334155, #1E293B)', border: theme ? `2px solid ${theme.glow}44` : '2px solid #475569' }}>
            {getInitials(entry.full_name)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="min-w-0 flex items-center">
          <p className="truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-white/90">
            {getRankingDisplayName(entry)}
          </p>
          {hasActiveStreak && (
            <span className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-orange-500 dark:text-orange-400">
              <span className="tabular-nums">{entry.current_streak_days}</span>
              <Flame className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <ProgressIcon className="h-2.5 w-2.5" style={{ color: progressMeta.color }} />
          <p className="truncate text-[9px] sm:text-[10px] font-semibold" style={{ color: progressMeta.color }}>
            {progressMeta.title}
          </p>
        </div>
        {recentAchievements.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {recentAchievements.map((achievement) => (
              <span
                key={`${achievement.latestMonth}-${achievement.position}`}
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={getPodiumBadgeStyle(achievement.position)}
              >
                {achievement.count >= 2
                  ? `${getPodiumLabel(achievement.position)} • ${achievement.count} meses seguidos!`
                  : `${getPodiumLabel(achievement.position)} • ${formatMonthLabel(achievement.latestMonth)}`}
              </span>
            ))}
          </div>
        )}
        {(entry.has_questions_leader_badge || entry.has_accuracy_leader_badge || entry.has_streak_leader_badge) && (
          <div className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
            {entry.has_questions_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                Questões
              </span>
            )}
            {entry.has_accuracy_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                Acerto
              </span>
            )}
            {entry.has_streak_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                Sequência
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {isPrize && (
            <Zap className="brand-text-adaptive h-3 w-3" style={adaptiveTextStyle(primaryHex, 'var(--brand-primary)')} />
          )}
          <span className="text-xs sm:text-sm font-extrabold tabular-nums text-slate-800 dark:text-white/90"
            style={isTop3 && theme ? { color: theme.textColor } : undefined}>
            {formatPoints(entry.monthly_points)}
          </span>
        </div>
        {(entry.has_questions_leader_badge || entry.has_accuracy_leader_badge || entry.has_streak_leader_badge) ? (
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-1">
            {entry.has_questions_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                Mais questões feitas
              </span>
            )}
            {entry.has_accuracy_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                Maior % de acerto
              </span>
            )}
            {entry.has_streak_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                Maior sequência
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-medium text-slate-400 dark:text-white/30">pts</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Prize zone divider ──────────────────────────────────────────────────────

function PrizeZoneDivider({ cutoff }: { cutoff: number }) {
  return (
    <div className="relative my-2 flex items-center gap-3 px-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-500/50">
        <Gift className="h-2.5 w-2.5" />
        líderes do mês — top {cutoff}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FounderRankingPage() {
  const TOP_LIMIT = 5;
  const { org } = useOrg();
  const primaryAccent = resolveAccentColor(org, 'brand_primary');

  const { summary, ranking, isLoading, refreshRanking } = usePartnerGamification({
    fetchPopupStateOnMount: false,
  });

  useEffect(() => {
    if (!isLoading) {
      refreshRanking(TOP_LIMIT, org.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const monthLabel = summary?.month_label ?? 'Este mês';
  const topCutoff = ranking?.prize_cutoff ?? 3;
  const fullList = ranking?.ranking ?? [];
  const visibleList = fullList.slice(0, TOP_LIMIT);

  const top3 = visibleList.slice(0, 3);
  const podiumOrder =
    top3.length === 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [top3[1], top3[0]]
        : top3;

  const hasTopDivider = visibleList.length > topCutoff;

  return (
    <ModuleGuard permKey="ranking_enabled">
      <PartnerLayout>
        <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
          <RevealGroup className="mx-auto max-w-[900px] space-y-5 pb-8">

            {/* ── Header ────────────────────────────────────────────────── */}
            <RevealItem className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  className="brand-text-adaptive text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={adaptiveTextStyle(primaryAccent.hex, primaryAccent.cssVar)}
                >
                  Ranking mensal · {org.name}
                </p>
                <h1 className="font-display text-[28px] font-black leading-tight text-slate-900 dark:text-white sm:text-[32px]">
                  {monthLabel}
                </h1>
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-white/40">
                  {isLoading ? 'Carregando...' : `${visibleList.length} aluno${visibleList.length !== 1 ? 's' : ''} no ranking`}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-[7px] shadow-sm dark:bg-white/[0.04] dark:shadow-none">
                <Users className="h-3.5 w-3.5 text-slate-400 dark:text-white/30" />
                <span className="text-[12px] font-bold text-slate-700 dark:text-white/80">{fullList.length}</span>
                <span className="text-[11px] text-slate-400 dark:text-white/30">no total</span>
              </div>
            </RevealItem>

            {/* ── Pódio ─────────────────────────────────────────────────── */}
            {(isLoading || fullList.length > 0) && (
              <RevealItem>
                <BrandHero smokeColorHex={primaryAccent.hex ?? undefined} halftone={false}>
                  <div className="mb-5 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">Pódio</p>
                  </div>

                  {isLoading || fullList.length === 0 ? (
                    <div className="flex gap-3 items-end justify-center h-36">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="w-full rounded-t-xl" style={{ height: i === 1 ? 80 : i === 2 ? 112 : 64 }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-end gap-2.5 sm:gap-3 justify-center">
                      {podiumOrder.map((entry) => (
                        <PodiumEntry key={entry.user_id} entry={entry} />
                      ))}
                    </div>
                  )}
                </BrandHero>
              </RevealItem>
            )}

            {/* ── Lista completa ───────────────────────────────────────── */}
            <RevealItem>
              <ElevatedCard>
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-orange-500/60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-white/35">
                      Top {TOP_LIMIT}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-white/20 tabular-nums">
                    {visibleList.length} alunos
                  </span>
                </div>

                <div className="p-2 space-y-0.5">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                        <Skeleton className="h-7 w-7 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-28 rounded" />
                          <Skeleton className="h-2.5 w-16 rounded" />
                        </div>
                        <Skeleton className="h-4 w-14 rounded" />
                      </div>
                    ))
                  ) : visibleList.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/[0.03]">
                        <Trophy className="h-7 w-7 text-slate-300 dark:text-white/15" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-white/40">Nenhum aluno no ranking ainda</p>
                    </div>
                  ) : (
                    <>
                      {visibleList.map((entry, i) => (
                        <div key={entry.user_id}>
                          {hasTopDivider && i === topCutoff && <PrizeZoneDivider cutoff={topCutoff} />}
                          <RankRow entry={entry} isPrize={entry.rank <= topCutoff} index={i} primaryHex={primaryAccent.hex} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ElevatedCard>
            </RevealItem>

            {/* ── Footer ────────────────────────────────────────────────── */}
            {!isLoading && visibleList.length > 0 && (
              <RevealItem className="flex items-center justify-center gap-2 py-1">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300 dark:to-white/10" />
                <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-white/25">
                  <Gift className="h-2.5 w-2.5" />
                  Top {topCutoff} lideram o mês — mas qualquer um pode virar o jogo
                </p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300 dark:to-white/10" />
              </RevealItem>
            )}

          </RevealGroup>
        </div>
      </PartnerLayout>
    </ModuleGuard>
  );
}
