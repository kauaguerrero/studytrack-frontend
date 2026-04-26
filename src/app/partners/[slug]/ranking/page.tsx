'use client';

import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  ChevronUp,
  Flame,
  Star,
  Zap,
  Gift,
  TrendingUp,
  Award,
  Sparkles,
  EyeOff,
} from 'lucide-react';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { Skeleton } from '@/components/ui/skeleton';
import { getProgressTierMeta } from '@/components/partners/gamification/titleSystem';
import type { PartnerRankingEntry } from '@/types/gamification';
import { getInitials, getRankingDisplayName, isAnonymousRankingEntry } from '@/lib/ranking-privacy';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { useOrg } from '@/contexts/OrgContext';

// ─── Animation config ────────────────────────────────────────────────────────

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const ITEM = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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

// ─── Rank theme config ───────────────────────────────────────────────────────

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
  return `Top ${position}`;
}

function getPodiumBadgeStyle(position: number): { background: string; color: string; border: string } {
  if (position === 1) return { background: 'rgba(245, 158, 11, 0.14)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.28)' };
  if (position === 2) return { background: 'rgba(148, 163, 184, 0.14)', color: '#475569', border: '1px solid rgba(148, 163, 184, 0.24)' };
  return { background: 'rgba(180, 83, 9, 0.14)', color: '#9A3412', border: '1px solid rgba(180, 83, 9, 0.24)' };
}

// ─── Animated background particles ───────────────────────────────────────────

const PARTICLE_DATA = [
  { width: 6.5, height: 6.9, opacity: 0.16, left: 20.2, top: 71.8, yPeak: -38, duration: 4.6, delay: 0.4 },
  { width: 4.9, height: 6.2, opacity: 0.19, left: 48.6, top: 56.8, yPeak: -31, duration: 5.1, delay: 1.0 },
  { width: 5.8, height: 5.1, opacity: 0.22, left: 67.3, top: 29.4, yPeak: -44, duration: 3.8, delay: 0.7 },
  { width: 3.9, height: 4.6, opacity: 0.17, left: 34.8, top: 22.6, yPeak: -26, duration: 4.3, delay: 1.5 },
  { width: 6.1, height: 3.8, opacity: 0.2,  left: 79.1, top: 63.2, yPeak: -35, duration: 5.6, delay: 0.2 },
  { width: 4.3, height: 5.7, opacity: 0.18, left: 14.5, top: 40.7, yPeak: -29, duration: 4.9, delay: 1.3 },
];

function FloatingParticles() {
  return (
    <div className="dark:block hidden pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLE_DATA.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: p.width, height: p.height, background: `rgba(245, 158, 11, ${p.opacity})`, left: `${p.left}%`, top: `${p.top}%` }}
          animate={{ y: [0, p.yPeak, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
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
        className="text-center text-[10px] sm:text-[11px] font-bold leading-tight max-w-[68px] sm:max-w-[80px] truncate text-slate-800 dark:text-white/85"
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

      <motion.div
        className="w-full flex flex-col items-center justify-center rounded-t-xl relative overflow-hidden"
        style={{ height: pedestalHeight, background: theme.bg, borderTop: `2px solid ${theme.ring}`, borderLeft: `1px solid ${theme.ring}`, borderRight: `1px solid ${theme.ring}`, originY: 1 }}
        variants={PODIUM_RISE}
        custom={isFirst ? 0.2 : entry.rank === 2 ? 0.1 : 0.3}
        initial="hidden"
        animate="show"
      >
        <motion.div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(180deg, ${theme.glow}33 0%, transparent 60%)` }} />
        <span className="text-xl sm:text-2xl font-black relative z-10" style={{ color: theme.textColor }}>{theme.label}</span>
        <p className="mt-0.5 text-[9px] sm:text-[10px] font-bold relative z-10" style={{ color: `${theme.textColor}99` }}>
          {formatPoints(entry.monthly_points)} pts
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function RankRow({ entry, isPrize, index }: { entry: PartnerRankingEntry; isPrize: boolean; index: number }) {
  const isTop3 = entry.rank <= 3;
  const theme = isTop3 ? RANK_THEMES[entry.rank as 1 | 2 | 3] : null;
  const progressMeta = getProgressTierMeta(entry.progress_tier);
  const ProgressIcon = progressMeta.Icon;
  const recentAchievements = (entry.podium_history ?? []).slice(0, 2);
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
          <span className={`text-xs font-bold tabular-nums ${isPrize ? '' : 'text-slate-400 dark:text-slate-500/60'}`}
            style={isPrize ? { color: 'var(--brand-primary)' } : undefined}>
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
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold text-white dark:text-white"
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
              <span key={`${achievement.month_reference}-${achievement.position}`}
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={getPodiumBadgeStyle(achievement.position)}>
                {getPodiumLabel(achievement.position)} • {formatMonthLabel(achievement.month_reference)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {isPrize && <Zap className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />}
          <span className="text-xs sm:text-sm font-extrabold tabular-nums text-slate-800 dark:text-white/90"
            style={isTop3 && theme ? { color: theme.textColor } : undefined}>
            {formatPoints(entry.monthly_points)}
          </span>
        </div>
        {(entry.has_questions_leader_badge || entry.has_accuracy_leader_badge || entry.has_streak_leader_badge) ? (
          <div className="flex flex-wrap items-center justify-end gap-1">
            {entry.has_questions_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                Mais questões feitas
              </span>
            )}
            {entry.has_accuracy_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #22C55E, #15803D)' }}>
                Maior % de acerto
              </span>
            )}
            {entry.has_streak_leader_badge && (
              <span className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)' }}>
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

// ─── Glass card ──────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-[rgba(255,255,255,0.04)] dark:border-[rgba(255,255,255,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] dark:backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FounderRankingPage() {
  const shouldReduce = useReducedMotion();
  const TOP_LIMIT = 50;
  const { org } = useOrg();

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
  const podiumOrder = useMemo(() =>
    top3.length === 3 ? [top3[1], top3[0], top3[2]] :
    top3.length === 2 ? [top3[1], top3[0]] : top3,
  [top3]);

  const hasTopDivider = visibleList.length > topCutoff;

  return (
    <PartnerLayout>
      <div className="relative -m-4 md:-m-8 px-4 py-5 md:px-8 md:py-8 min-h-full overflow-hidden bg-slate-50 dark:bg-[#080808]">
        <div className="hidden dark:block pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--brand-primary) 12%, transparent) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, color-mix(in srgb, var(--brand-primary) 6%, transparent) 0%, transparent 60%)' }} />

        {/* Decoração lateral esquerda */}
        <div className="hidden lg:flex pointer-events-none select-none absolute left-[3%] xl:left-[6%] top-[12%] flex-col items-center gap-3">
          <div className="flex items-end gap-[5px] mb-1">
            {([28, 48, 64, 40, 22] as number[]).map((h, i) => (
              <div key={i} className="rounded-full" style={{ width: '2px', height: `${h}px`, background: 'linear-gradient(to top, var(--brand-primary), transparent)', opacity: 0.07 + i * 0.012 }} />
            ))}
          </div>
          {([0.18, 0.13, 0.09, 0.06] as number[]).map((op, i) => (
            <ChevronUp key={i} size={18 - i} style={{ color: 'var(--brand-primary)', opacity: op }} />
          ))}
          <div className="w-px rounded-full mt-1" style={{ height: '72px', background: 'linear-gradient(to bottom, var(--brand-primary), transparent)', opacity: 0.1 }} />
          <TrendingUp size={15} style={{ color: 'var(--brand-primary)', opacity: 0.1 }} />
        </div>

        {/* Decoração lateral direita */}
        <div className="hidden lg:flex pointer-events-none select-none absolute right-[3%] xl:right-[6%] top-[12%] flex-col items-center gap-3">
          <Crown size={20} style={{ color: 'var(--brand-primary)', opacity: 0.16 }} />
          <div className="flex items-end gap-[5px]">
            {([52, 80, 60] as number[]).map((h, i) => (
              <div key={i} className="rounded-t-sm" style={{ width: '10px', height: `${h}px`, background: i === 1 ? 'linear-gradient(to top, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 40%, white))' : 'linear-gradient(to top, var(--brand-primary), transparent)', opacity: i === 1 ? 0.16 : 0.09 }} />
            ))}
          </div>
          <Trophy size={16} style={{ color: 'var(--brand-primary)', opacity: 0.12 }} />
          <div className="w-px rounded-full" style={{ height: '56px', background: 'linear-gradient(to bottom, var(--brand-primary), transparent)', opacity: 0.09 }} />
          <div className="flex flex-col items-center gap-2">
            {([0.12, 0.08, 0.05] as number[]).map((op, i) => (
              <Star key={i} size={8 + i * 2} style={{ color: 'var(--brand-primary)', fill: 'var(--brand-primary)', opacity: op }} />
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-lg space-y-4 pb-8">
          <motion.div variants={shouldReduce ? undefined : CONTAINER} initial="hidden" animate="show" className="space-y-4">

            {/* Header */}
            <motion.div variants={shouldReduce ? undefined : ITEM}>
              <div className="relative overflow-hidden rounded-2xl p-5 bg-white border border-slate-200 shadow-sm dark:border-[rgba(255,255,255,0.06)] dark:shadow-none">
                <div className="hidden dark:block pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 40%, #0D0D0D 100%)' }} />
                <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-[80px] opacity-20" style={{ background: 'var(--brand-primary)' }} />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full blur-[80px] opacity-10" style={{ background: '#F59E0B' }} />
                <FloatingParticles />

                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}>
                        <Sparkles className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/35">Ranking mensal</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{monthLabel}</h1>
                    <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">
                      {isLoading ? '...' : `${visibleList.length} aluno${visibleList.length !== 1 ? 's' : ''} no ranking`}
                    </p>
                  </div>
                  <motion.div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 15%, transparent), color-mix(in srgb, var(--brand-primary) 8%, transparent))', border: '1px solid color-mix(in srgb, var(--brand-primary) 20%, transparent)', boxShadow: '0 0 24px color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
                    animate={{ rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Trophy className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Pódio */}
            {(isLoading || fullList.length > 0) && (
              <motion.div variants={shouldReduce ? undefined : ITEM}>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Star className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-white/35">Pódio</p>
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
                </GlassCard>
              </motion.div>
            )}

            {/* Lista completa */}
            <motion.div variants={shouldReduce ? undefined : ITEM}>
              <GlassCard>
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
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
                      <Trophy className="mx-auto h-10 w-10 text-slate-300 dark:text-white/10 mb-3" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-white/30">Nenhum aluno no ranking ainda</p>
                    </div>
                  ) : (
                    <>
                      {visibleList.map((entry, i) => (
                        <div key={entry.user_id}>
                          {hasTopDivider && i === topCutoff && <PrizeZoneDivider cutoff={topCutoff} />}
                          <RankRow entry={entry} isPrize={entry.rank <= topCutoff} index={i} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {!isLoading && visibleList.length > 0 && (
              <motion.div variants={shouldReduce ? undefined : ITEM}>
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-white/25 flex items-center gap-1">
                    <Gift className="h-2.5 w-2.5" />
                    Top {topCutoff} lideram o mês — mas qualquer um pode virar o jogo
                  </p>
                  <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
                </div>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>
    </PartnerLayout>
  );
}
