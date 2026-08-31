'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_STUDENT_DASHBOARD_STATE } from '../../../../../../studytrack-tutorial-mock';
import {
  Trophy,
  Medal,
  Crown,
  Award,
  Flame,
  Star,
  Zap,
  Gift,
  TrendingUp,
  Target,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Globe,
  Lock,
  Users,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { Skeleton } from '@/components/ui/skeleton';
import { getProgressTierMeta } from '@/components/partners/gamification/titleSystem';
import { StreakFlame } from '@/components/partners/gamification/StreakFlame';
import { getStreakStage } from '@/components/partners/gamification/streakEvolution';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, readableBrandTextOnDark, onBrandText, resolveAccentColor } from '@/lib/brand-color';
import { RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandHero, HERO_ACCENT_COLOR, MiniBar } from '@/components/partners/founder-ui';
import type {
  MonthlyHistoryEntry,
  PartnerRankingEntry,
  NationalRankingEntry,
} from '@/types/gamification';
import { getInitials, getRankingDisplayName, isAnonymousRankingEntry } from '@/lib/ranking-privacy';
import { summarizePodiumStreaks } from '@/lib/podium-streak';
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

// ─── Rank theme config (posição literal do mês — não é a mesma coisa que o
// "nível"/tier de progresso de longo prazo, que já vem de getProgressTierMeta) ──

const RANK_THEMES = {
  1: {
    gradient: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 50%, #D97706 100%)',
    glow: '#F59E0B',
    glowIntensity: '0 0 30px #F59E0B44, 0 0 60px #F59E0B22',
    icon: Crown,
    label: '1º',
    // Badge pequeno na lista — mantém tratamento translúcido/sutil.
    bg: 'linear-gradient(180deg, #F59E0B18 0%, #F59E0B08 50%, transparent 100%)',
    ring: '#F59E0B55',
    textColor: '#FFD700',
    // Pedestal do pódio — sólido/opaco, "tipo altar".
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
    return {
      background: 'rgba(245, 158, 11, 0.14)',
      color: '#B45309',
      border: '1px solid rgba(245, 158, 11, 0.28)',
    };
  }
  if (position === 2) {
    return {
      background: 'rgba(148, 163, 184, 0.14)',
      color: '#475569',
      border: '1px solid rgba(148, 163, 184, 0.24)',
    };
  }
  return {
    background: 'rgba(180, 83, 9, 0.14)',
    color: '#9A3412',
    border: '1px solid rgba(180, 83, 9, 0.24)',
  };
}

/** CSS vars pra `.brand-text-adaptive` escolher claro/escuro sozinho via `.dark` — para texto sobre ElevatedCard (que troca de fundo com o tema). */
function adaptiveTextStyle(hex: string | undefined | null, cssVar: string) {
  return {
    ['--bta-light' as string]: readableBrandText(hex, cssVar),
    ['--bta-dark' as string]: readableBrandTextOnDark(hex, cssVar),
  };
}

// ─── Podium ──────────────────────────────────────────────────────────────────

interface PodiumEntryProps {
  entry: PartnerRankingEntry;
  isSelf: boolean;
  primaryHex?: string | null;
}

function PodiumEntry({ entry, isSelf, primaryHex }: PodiumEntryProps) {
  const theme = RANK_THEMES[entry.rank as 1 | 2 | 3];
  const isFirst = entry.rank === 1;
  const Icon = theme.icon;

  const pedestalHeight = isFirst ? 104 : entry.rank === 2 ? 76 : 60;
  const isAnonymous = isAnonymousRankingEntry(entry, isSelf);
  const selfNameColor = readableBrandTextOnDark(primaryHex, 'var(--brand-primary)');
  const selfFillColor = onBrandText(primaryHex);

  return (
    <motion.div
      className="flex flex-col items-center gap-2 flex-1 min-w-0"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: isFirst ? 0.3 : entry.rank === 2 ? 0.15 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Rank icon */}
      <motion.div
        animate={isFirst ? { rotate: [0, -6, 6, -3, 3, 0] } : undefined}
        transition={isFirst ? { duration: 2, repeat: Infinity, repeatDelay: 4 } : undefined}
      >
        <Icon
          className={isFirst ? 'h-6 w-6' : 'h-5 w-5'}
          style={{ color: theme.textColor, filter: `drop-shadow(0 0 8px ${theme.glow}66)` }}
        />
      </motion.div>

      {/* Name */}
      <p
        className="text-center text-[10px] sm:text-[11px] font-bold leading-tight max-w-[68px] sm:max-w-[80px] truncate text-white/85"
        style={isSelf ? { color: selfNameColor } : undefined}
        title={getRankingDisplayName(entry, { isSelf })}
      >
        {getRankingDisplayName(entry, { isSelf, short: true })}
      </p>

      {/* Avatar */}
      <div className="relative">
        {/* Glow ring for 1st place */}
        {isFirst && (
          <motion.div
            className="absolute -inset-1.5 rounded-full"
            style={{ background: theme.gradient, opacity: 0.3 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {isAnonymous ? (
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
            style={{
              background: 'linear-gradient(135deg, #475569, #334155)',
              boxShadow: theme.glowIntensity,
              border: '2.5px solid rgba(148, 163, 184, 0.55)',
            }}
          >
            <EyeOff className="h-4 w-4" />
          </div>
        ) : entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.avatar_url}
            alt=""
            className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover"
            style={{
              border: `2.5px solid ${theme.glow}`,
              boxShadow: theme.glowIntensity,
            }}
          />
        ) : (
          <div
            className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-xs sm:text-sm font-extrabold"
            style={{
              background: isSelf ? 'var(--brand-primary)' : theme.gradient,
              color: isSelf ? selfFillColor : '#fff',
              boxShadow: theme.glowIntensity,
              border: `2.5px solid ${theme.glow}88`,
            }}
          >
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
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-15"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 60%)`,
          }}
        />

        <span
          className="text-xl sm:text-2xl font-black relative z-10"
          style={{ color: theme.pedestalTextColor, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
        >
          {theme.label}
        </span>
        <p
          className="mt-0.5 text-[9px] sm:text-[10px] font-bold relative z-10 opacity-75"
          style={{ color: theme.pedestalTextColor, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
        >
          {formatPoints(entry.monthly_points)} pts
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  entry: PartnerRankingEntry;
  isSelf: boolean;
  isPrize: boolean;
  index: number;
  primaryHex?: string | null;
}

function RankRow({ entry, isSelf, isPrize, index, primaryHex }: RowProps) {
  const isTop3 = entry.rank <= 3;
  const theme = isTop3 ? RANK_THEMES[entry.rank as 1 | 2 | 3] : null;
  const progressMeta = getProgressTierMeta(entry.progress_tier);
  const ProgressIcon = progressMeta.Icon;
  const recentAchievements = summarizePodiumStreaks(entry.podium_history ?? []).slice(0, 2);
  const isAnonymous = isAnonymousRankingEntry(entry, isSelf);
  const hasActiveStreak = Boolean((entry.current_streak_days ?? 0) > 0 && entry.has_active_streak);
  const selfFillColor = onBrandText(primaryHex);

  const selfHighlight = isSelf
    ? {
        background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 25%, transparent)',
      }
    : {};

  return (
    <motion.div
      className="group relative flex items-center gap-2.5 sm:gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      style={selfHighlight}
      variants={ROW_VARIANTS}
      custom={index}
      initial="hidden"
      animate="show"
    >
      {/* Rank badge */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {theme ? (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: theme.bg,
              border: `1px solid ${theme.ring}`,
            }}
          >
            <theme.icon
              className="h-3.5 w-3.5"
              style={{ color: theme.textColor }}
            />
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

      {/* Avatar */}
      <div className="relative shrink-0">
        {isAnonymous ? (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-white sm:h-9 sm:w-9 dark:bg-slate-700"
            style={{
              border: isSelf
                ? '2px solid var(--brand-primary)'
                : theme
                  ? `2px solid ${theme.glow}44`
                  : '2px solid #475569',
            }}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </div>
        ) : entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.avatar_url}
            alt=""
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
            style={{
              border: isSelf
                ? '2px solid var(--brand-primary)'
                : theme
                  ? `2px solid ${theme.glow}55`
                  : '2px solid transparent',
            }}
          />
        ) : (
          <div
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold"
            style={{
              background: isSelf
                ? 'var(--brand-primary)'
                : theme
                  ? theme.gradient
                  : 'linear-gradient(135deg, #334155, #1E293B)',
              color: isSelf ? selfFillColor : '#fff',
              border: isSelf
                ? '2px solid var(--brand-primary)'
                : theme
                  ? `2px solid ${theme.glow}44`
                  : '2px solid #475569',
            }}
          >
            {getInitials(entry.full_name)}
          </div>
        )}

        {/* Online-style indicator for self */}
        {isSelf && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#0D0D0D]"
            style={{
              background: 'var(--brand-primary)',
            }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Name + title */}
      <div className="flex-1 min-w-0">
        <div className="min-w-0 flex items-center">
          <p
            className={selfNameClass(isSelf)}
            style={isSelf ? adaptiveTextStyle(primaryHex, 'var(--brand-primary)') : undefined}
          >
            {getRankingDisplayName(entry, { isSelf, withYouSuffix: true })}
          </p>
          {hasActiveStreak && (() => {
            const st = getStreakStage(entry.current_streak_days ?? 0);
            return (
              <span
                className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold tabular-nums"
                style={{ color: st.color }}
              >
                {entry.current_streak_days}
                <StreakFlame stage={st.id} size={12} animated={false} />
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <ProgressIcon
            className="h-2.5 w-2.5"
            style={{ color: progressMeta.color }}
          />
          <p
            className="truncate text-[9px] sm:text-[10px] font-semibold"
            style={{ color: progressMeta.color }}
          >
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
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                }}
              >
                Questões
              </span>
            )}
            {entry.has_accuracy_leader_badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                }}
              >
                Acerto
              </span>
            )}
            {entry.has_streak_leader_badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                }}
              >
                Sequência
              </span>
            )}
          </div>
        )}
      </div>

      {/* Points + prize */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {isPrize && (
            <Zap
              className="brand-text-adaptive h-3 w-3"
              style={adaptiveTextStyle(primaryHex, 'var(--brand-primary)')}
            />
          )}
          <span
            className="text-xs sm:text-sm font-extrabold tabular-nums text-slate-800 dark:text-white/90"
            style={isTop3 && theme ? { color: theme.textColor } : undefined}
          >
            {formatPoints(entry.monthly_points)}
          </span>
        </div>
        {(entry.has_questions_leader_badge || entry.has_accuracy_leader_badge || entry.has_streak_leader_badge) ? (
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-1">
            {entry.has_questions_leader_badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                }}
              >
                Mais questões feitas
              </span>
            )}
            {entry.has_accuracy_leader_badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                }}
              >
                Maior % de acerto
              </span>
            )}
            {entry.has_streak_leader_badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                }}
              >
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

function selfNameClass(isSelf: boolean): string {
  return `truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-white/90 ${isSelf ? 'brand-text-adaptive' : ''}`;
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

// ─── Divisória discreta da Disputa Nacional (abaixo do 2º lugar) ─────────────

function NationalZoneDivider() {
  return (
    <div className="relative my-1.5 flex items-center gap-3 px-3 opacity-70">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/15 to-transparent" />
      <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-sky-500/40">
        <Globe className="h-2 w-2" />
        classificação nacional
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/15 to-transparent" />
    </div>
  );
}

// ─── Tema do pódio nacional — amarelo/verde/azul (cores do Brasil), em vez
// do ouro/prata/bronze usado no ranking da própria org ────────────────────────

const NATIONAL_RANK_THEMES = {
  1: {
    gradient: 'linear-gradient(135deg, #FFEE58 0%, #FEDD00 50%, #C9A600 100%)',
    glow: '#FEDD00',
    glowIntensity: '0 0 30px #FEDD0044, 0 0 60px #FEDD0022',
    icon: Crown,
    label: '1º',
    bg: 'linear-gradient(180deg, #FEDD0018 0%, #FEDD0008 50%, transparent 100%)',
    ring: '#FEDD0055',
    textColor: '#FFEE58',
    textOnLight: '#8A6D00',
    pedestalBg: 'linear-gradient(180deg, #FFF176 0%, #FEDD00 55%, #B8960B 100%)',
    pedestalRing: '#7A6208',
    pedestalTextColor: '#2B2200',
  },
  2: {
    gradient: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 50%, #14532D 100%)',
    glow: '#22C55E',
    glowIntensity: '0 0 20px #22C55E44, 0 0 40px #22C55E22',
    icon: Medal,
    label: '2º',
    bg: 'linear-gradient(180deg, #22C55E12 0%, #22C55E06 50%, transparent 100%)',
    ring: '#22C55E44',
    textColor: '#4ADE80',
    textOnLight: '#15803D',
    pedestalBg: 'linear-gradient(180deg, #6EE7A0 0%, #16A34A 55%, #14532D 100%)',
    pedestalRing: '#052E12',
    pedestalTextColor: '#ffffff',
  },
  3: {
    gradient: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 50%, #1E3A8A 100%)',
    glow: '#3B82F6',
    glowIntensity: '0 0 20px #3B82F644, 0 0 40px #3B82F622',
    icon: Award,
    label: '3º',
    bg: 'linear-gradient(180deg, #3B82F612 0%, #3B82F606 50%, transparent 100%)',
    ring: '#3B82F644',
    textColor: '#60A5FA',
    textOnLight: '#1D4ED8',
    pedestalBg: 'linear-gradient(180deg, #93C5FD 0%, #2563EB 55%, #1E3A8A 100%)',
    pedestalRing: '#0B1A3D',
    pedestalTextColor: '#ffffff',
  },
} as const;

// ─── Silhueta discreta do Brasil (decoração de fundo, sem tirar o foco) ──────
// Reaproveita o mesmo SVG oficial (Simplemaps) usado no mapa do Radar Comercial
// (`/geo/brazil-states.svg`) — junta os estados num único preenchimento sólido,
// sem contorno, pra virar uma silhueta do país (não um mapa interativo).

function BrazilSilhouette() {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/geo/brazil-states.svg')
      .then((r) => r.text())
      .then((svgText) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const ds: string[] = [];
        doc.querySelectorAll('path[id]').forEach((el) => {
          const id = el.getAttribute('id') ?? '';
          if (id.startsWith('BR') && id.length === 4) {
            const d = el.getAttribute('d');
            if (d) ds.push(d);
          }
        });
        setPaths(ds);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (paths.length === 0) return null;

  return (
    <svg
      viewBox="0 0 1000 912"
      aria-hidden
      className="pointer-events-none absolute -bottom-14 -right-16 w-[230px] opacity-[0.08] sm:w-[320px]"
      style={{ aspectRatio: '1000 / 912', height: 'auto' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="#ffffff" />
      ))}
    </svg>
  );
}

// ─── Pódio e lista nacional (Disputa Nacional) ───────────────────────────────

function NationalPodiumEntry({ entry, isSelf }: { entry: NationalRankingEntry; isSelf: boolean }) {
  const theme = NATIONAL_RANK_THEMES[entry.rank as 1 | 2 | 3];
  const isFirst = entry.rank === 1;
  const Icon = theme.icon;
  const pedestalHeight = isFirst ? 104 : entry.rank === 2 ? 76 : 60;

  return (
    <motion.div
      className="flex min-w-0 flex-1 flex-col items-center gap-2"
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
        className="max-w-[68px] truncate text-center text-[10px] font-bold leading-tight sm:max-w-[80px] sm:text-[11px]"
        style={{ color: isSelf ? '#FEDD00' : 'rgba(255,255,255,0.85)' }}
      >
        {entry.full_name}
      </p>
      <p className="max-w-[68px] truncate text-center text-[9px] text-white/45 sm:max-w-[80px]">
        {entry.source === 'mock' ? (entry.org_name || 'Concorrente') : entry.org_name}
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
        {entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.avatar_url}
            alt=""
            className="relative h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11"
            style={{ border: `2.5px solid ${theme.glow}`, boxShadow: theme.glowIntensity }}
          />
        ) : (
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-extrabold sm:h-11 sm:w-11 sm:text-sm"
            style={{ background: theme.gradient, color: '#fff', boxShadow: theme.glowIntensity, border: `2.5px solid ${theme.glow}88` }}
          >
            {getInitials(entry.full_name || '?')}
          </div>
        )}
      </div>

      <motion.div
        className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-t-xl"
        style={{ height: pedestalHeight, background: theme.pedestalBg, borderTop: `2px solid ${theme.pedestalRing}`, borderLeft: `1px solid ${theme.pedestalRing}`, borderRight: `1px solid ${theme.pedestalRing}`, originY: 1 }}
        variants={PODIUM_RISE}
        custom={isFirst ? 0.2 : entry.rank === 2 ? 0.1 : 0.3}
        initial="hidden"
        animate="show"
      >
        <motion.div className="absolute inset-0 opacity-15" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 60%)' }} />
        <span className="relative z-10 text-xl font-black sm:text-2xl" style={{ color: theme.pedestalTextColor, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
          {theme.label}
        </span>
        <p className="relative z-10 mt-0.5 text-[9px] font-bold opacity-75 sm:text-[10px]" style={{ color: theme.pedestalTextColor, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
          {formatPoints(entry.national_points)} pts
        </p>
      </motion.div>
    </motion.div>
  );
}

function NationalRow({ entry, isSelf, index }: { entry: NationalRankingEntry; isSelf: boolean; index: number }) {
  const isTop3 = entry.rank <= 3;
  const theme = isTop3 ? NATIONAL_RANK_THEMES[entry.rank as 1 | 2 | 3] : null;
  const Icon = theme?.icon;

  const rowStyle = isSelf
    ? { background: 'rgba(16, 185, 129, 0.1)', boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.3)' }
    : theme
      ? { background: theme.bg, boxShadow: `inset 0 0 0 1px ${theme.ring}` }
      : undefined;

  return (
    <motion.div
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
      style={rowStyle}
      custom={index}
      variants={ROW_VARIANTS}
      initial="hidden"
      animate="show"
    >
      {theme && Icon ? (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: theme.gradient, boxShadow: theme.glowIntensity }}
        >
          <Icon className="h-4 w-4" style={{ color: theme.pedestalTextColor }} />
        </div>
      ) : (
        <span className="w-8 shrink-0 text-center text-sm font-bold text-slate-400 dark:text-white/25">{entry.rank}</span>
      )}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-white/70"
        style={theme ? { boxShadow: `0 0 0 2px ${theme.glow}88` } : undefined}
      >
        {entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(entry.full_name || '?')
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-bold ${
            isSelf ? 'text-emerald-600 dark:text-emerald-400' : !theme ? 'font-semibold text-slate-800 dark:text-white' : 'brand-text-adaptive'
          }`}
          style={!isSelf && theme ? { ['--bta-light' as string]: theme.textOnLight, ['--bta-dark' as string]: theme.textColor } : undefined}
        >
          {entry.full_name}
        </p>
        <p className="truncate text-[11px] text-slate-400 dark:text-white/40">
          {entry.org_name}
        </p>
      </div>
      <span className="text-sm font-black text-slate-800 dark:text-white">{formatPoints(entry.national_points)}</span>
    </motion.div>
  );
}

// ─── Concorrentes diretos ────────────────────────────────────────────────────

function RivalRow({
  entry,
  note,
  noteColor,
  arrow,
  highlight,
  primaryHex,
}: {
  entry: PartnerRankingEntry;
  note?: string;
  noteColor?: string;
  arrow?: 'up' | 'down';
  highlight?: boolean;
  primaryHex?: string | null;
}) {
  const selfFillColor = onBrandText(primaryHex);
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
      style={{
        background: highlight ? 'color-mix(in srgb, var(--brand-primary) 8%, transparent)' : undefined,
        border: highlight ? '1.5px solid var(--brand-primary)' : '1.5px solid transparent',
      }}
    >
      <span
        className={rivalRankClass(highlight)}
        style={highlight ? adaptiveTextStyle(primaryHex, 'var(--brand-primary)') : undefined}
      >
        #{entry.rank}
      </span>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: highlight ? 'var(--brand-primary)' : '#475569', color: highlight ? selfFillColor : '#fff' }}
      >
        {isAnonymousRankingEntry(entry, false) ? <EyeOff className="h-3.5 w-3.5" /> : getInitials(entry.full_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-extrabold text-slate-800 dark:text-white/90">
          {getRankingDisplayName(entry, { isSelf: highlight, withYouSuffix: highlight })}
        </p>
        {note && (
          <p className="flex items-center gap-1 text-[11px] font-bold" style={{ color: noteColor }}>
            {arrow === 'up' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {note}
          </p>
        )}
      </div>
      <span className="font-display text-[16px] font-extrabold tabular-nums text-slate-900 dark:text-white">
        {formatPoints(entry.monthly_points)}
      </span>
    </div>
  );
}

function rivalRankClass(highlight?: boolean): string {
  return `brand-text-adaptive w-9 text-center font-display text-[15px] font-black tabular-nums ${highlight ? '' : 'text-slate-400 dark:text-white/30'}`;
}

// ─── Histórico ───────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: MonthlyHistoryEntry }) {
  const badgeStyle = item.podium_position
    ? getPodiumBadgeStyle(item.podium_position)
    : null;

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.03]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-white/90">
          {formatMonthLabel(item.month_reference)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {item.podium_position ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={badgeStyle ?? undefined}
            >
              {getPodiumLabel(item.podium_position)}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 dark:text-white/25">
              Sem pódio
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-slate-900 dark:text-white">
          {formatPoints(item.points)}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/25">
          pontos
        </p>
      </div>
    </div>
  );
}

function HistoryModal({
  history,
  onClose,
}: {
  history: MonthlyHistoryEntry[];
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/[0.08]"
          style={{ maxHeight: 'min(92dvh, 680px)' }}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/[0.08]">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
              Seu histórico completo
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              aria-label="Fechar histórico"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 'min(72dvh, 560px)' }}>
            {history.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-slate-400 dark:text-white/30">
                Nenhum histórico ainda.
              </p>
            ) : (
              history.map((item) => <HistoryRow key={item.month_reference} item={item} />)
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-white/[0.08] px-4 py-3">
            <p className="text-center text-[10.5px] text-slate-400 dark:text-white/30">
              {history.length} {history.length === 1 ? 'mês registrado' : 'meses registrados'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const { org } = useOrg();
  const primaryAccent = resolveAccentColor(org, 'brand_primary');
  const TOP_LIMIT = 5;

  const _gamification = usePartnerGamification({
    fetchPopupStateOnMount: false,
  });
  const isDemo = org.is_mock;
  const summary = isDemo ? (MOCK_STUDENT_DASHBOARD_STATE.summary as typeof _gamification.summary) : _gamification.summary;
  const ranking = isDemo ? (MOCK_STUDENT_DASHBOARD_STATE.ranking as typeof _gamification.ranking) : _gamification.ranking;
  const isLoading = isDemo ? false : _gamification.isLoading;
  const refreshRanking = _gamification.refreshRanking;
  const nationalStatus = _gamification.nationalStatus;
  const nationalRanking = _gamification.nationalRanking;
  const refreshNationalStatus = _gamification.refreshNationalStatus;
  const refreshNationalRanking = _gamification.refreshNationalRanking;
  const reactivationStatus = _gamification.reactivationStatus;
  const refreshReactivationStatus = _gamification.refreshReactivationStatus;

  useEffect(() => {
    if (!isDemo && !isLoading) {
      refreshRanking(TOP_LIMIT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isDemo]);

  // Status da Disputa Nacional — leve, só pra saber se o switch pode ser usado.
  // Precisa esperar !isLoading: só depois que o hook termina o getSession()
  // inicial é que tokenRef.current existe — chamar antes disso falha em
  // silêncio (refreshNationalStatus só retorna null) e nunca tenta de novo.
  useEffect(() => {
    if (!isDemo && !isLoading) {
      refreshNationalStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isDemo]);

  // Progresso do Desafio de Reativação — mesmo cuidado de esperar !isLoading.
  useEffect(() => {
    if (!isDemo && !isLoading) {
      refreshReactivationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isDemo]);

  const [view, setView] = useState<'org' | 'national'>('org');
  const [nationalLoading, setNationalLoading] = useState(false);
  const isNationalQualified = Boolean(nationalStatus?.qualified);
  const orgFirstName = (org.name || '').trim().split(/\s+/)[0] || org.name;

  function handleSwitchView(next: 'org' | 'national') {
    if (next === 'national' && !isNationalQualified) {
      toast.info('Fique entre os 2 primeiros da sua turma pra desbloquear a Disputa Nacional.');
      return;
    }
    setView(next);
    if (next === 'national' && !nationalRanking) {
      setNationalLoading(true);
      refreshNationalRanking(50).finally(() => setNationalLoading(false));
    }
  }

  async function handleCopyReactivationLink() {
    const loginUrl = `${window.location.origin}/partners/${org.slug}/login`;
    try {
      await navigator.clipboard.writeText(loginUrl);
      toast.success('Link copiado! Manda pro seu colega no WhatsApp 📲');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  const NATIONAL_TOP_LIMIT = 10;
  const nationalFullList = nationalRanking?.ranking ?? [];
  const nationalList = nationalFullList.slice(0, NATIONAL_TOP_LIMIT);
  const nationalPodium = nationalList.slice(0, 3);
  const nationalPodiumOrder =
    nationalPodium.length === 3
      ? [nationalPodium[1], nationalPodium[0], nationalPodium[2]]
      : nationalPodium.length === 2
        ? [nationalPodium[1], nationalPodium[0]]
        : nationalPodium;
  const nationalSelfId = nationalRanking?.user_context?.self.id;

  const monthLabel = summary?.month_label ?? 'Este mês';
  const myPosition = summary?.rank_position ?? null;
  const myPoints = summary?.monthly_points ?? 0;
  const topCutoff = ranking?.prize_cutoff ?? summary?.prize_cutoff ?? 3;
  const monthlyHistory = useMemo(
    () => ranking?.monthly_history ?? [],
    [ranking?.monthly_history],
  );
  const HISTORY_PREVIEW_LIMIT = 3;
  const recentHistory = useMemo(
    () => monthlyHistory.slice(0, HISTORY_PREVIEW_LIMIT),
    [monthlyHistory],
  );
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fullList = ranking?.ranking ?? [];
  const selfEntry = ranking?.user_context?.self ?? null;
  const rivalAbove = ranking?.user_context?.above?.[0] ?? null;
  const rivalBelow = ranking?.user_context?.below?.[0] ?? null;
  const visibleList = fullList.slice(0, TOP_LIMIT);

  // Podium: [2nd, 1st, 3rd] for visual balance
  const top3 = visibleList.slice(0, 3);
  const podiumOrder =
    top3.length === 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [top3[1], top3[0]]
        : top3;

  const hasTopDivider = visibleList.length > topCutoff;

  const leaderEntry = fullList[0] ?? null;
  const leaderPts = leaderEntry?.monthly_points ?? myPoints;
  const isLeader = myPosition === 1;
  const pointsToLeader = Math.max(0, leaderPts - myPoints);
  const raceProgressPct = leaderPts > 0 ? Math.min(100, (myPoints / leaderPts) * 100) : 0;

  return (
    <ModuleGuard permKey="ranking_enabled">
    <div className="relative min-h-screen -m-4 md:-m-8 px-4 py-5 md:px-8 md:py-8 bg-slate-50 dark:bg-[#080808]">
      <RevealGroup className="relative mx-auto max-w-[900px] space-y-5 pb-8">

        {/* ── Header — switch Ranking (org) / Ranking Nacional ────────────── */}
        <RevealItem className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="relative inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
              {(['org', 'national'] as const).map((key) => {
                const isActive = view === key;
                const isNational = key === 'national';
                const locked = isNational && !isNationalQualified;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSwitchView(key)}
                    className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-black transition-colors ${
                      locked ? 'cursor-not-allowed opacity-45' : ''
                    } ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white/70'}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="ranking-view-switch"
                        className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-slate-800"
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {isNational ? (
                        locked ? <Lock className="h-3 w-3" /> : <span aria-hidden>🇧🇷</span>
                      ) : org.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={org.logo_url} alt="" className="h-4 w-4 shrink-0 rounded-full object-contain" />
                      ) : null}
                      {isNational ? 'Ranking Nacional' : `Ranking ${orgFirstName}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[13px] text-slate-500 dark:text-white/40">
              {view === 'org' ? monthLabel : (nationalRanking?.settings.season_label ?? 'Disputa Nacional')}
            </p>
          </div>

          {view === 'org' && myPosition !== null && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-[7px] shadow-sm dark:bg-white/[0.04] dark:shadow-none">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 dark:text-white/30" />
                <span className="text-[12px] font-bold text-slate-700 dark:text-white/80">#{myPosition}</span>
                <span className="text-[11px] text-slate-400 dark:text-white/30">posição</span>
              </div>
              <div
                className="brand-surface-adaptive inline-flex items-center gap-1.5 rounded-full px-3 py-[7px]"
                style={{
                  ['--bsa-bg-light' as string]: 'color-mix(in srgb, var(--brand-primary) 10%, white)',
                  ['--bsa-bg-dark' as string]: 'color-mix(in srgb, var(--brand-primary) 16%, #101522)',
                  ['--bsa-fg-light' as string]: readableBrandText(primaryAccent.hex, primaryAccent.cssVar),
                  ['--bsa-fg-dark' as string]: readableBrandTextOnDark(primaryAccent.hex, primaryAccent.cssVar),
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="text-[12px] font-bold tabular-nums">{formatPoints(myPoints)}</span>
                <span className="text-[11px] opacity-70">pts</span>
              </div>
            </div>
          )}

        </RevealItem>

        {view === 'org' && (
        <>
        {/* ── Podium ────────────────────────────────────────────────────── */}
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
                    <PodiumEntry
                      key={entry.user_id}
                      entry={entry}
                      isSelf={selfEntry?.user_id === entry.user_id}
                      primaryHex={primaryAccent.hex}
                    />
                  ))}
                </div>
              )}
            </BrandHero>
          </RevealItem>
        )}

        {/* ── Concorrentes diretos + Corrida pro topo ──────────────────── */}
        {!isLoading && (rivalAbove || rivalBelow || selfEntry) && (
          <RevealItem className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ElevatedCard accentColor={primaryAccent.cssVar}>
              <div className="p-5">
                <SectionTitle kicker="Quem está ao seu alcance" title="Seus concorrentes diretos" hex={primaryAccent.hex ?? undefined} colorVar={primaryAccent.cssVar} />
                <div className="flex flex-col gap-2">
                  {rivalAbove && (
                    <RivalRow
                      entry={rivalAbove}
                      note={`${formatPoints(Math.max(0, rivalAbove.monthly_points - myPoints))} pts acima`}
                      noteColor="#EF4444"
                      arrow="up"
                      primaryHex={primaryAccent.hex}
                    />
                  )}
                  {selfEntry && <RivalRow entry={selfEntry} highlight primaryHex={primaryAccent.hex} />}
                  {rivalBelow && (
                    <RivalRow
                      entry={rivalBelow}
                      note={`${formatPoints(Math.max(0, myPoints - rivalBelow.monthly_points))} pts abaixo`}
                      noteColor="#22C55E"
                      arrow="down"
                      primaryHex={primaryAccent.hex}
                    />
                  )}
                </div>
                {rivalAbove && (
                  <p className="mt-3 text-[12px] leading-snug text-slate-500 dark:text-white/40">
                    Você precisa de só{' '}
                    <span
                      className="brand-text-adaptive font-extrabold"
                      style={adaptiveTextStyle(primaryAccent.hex, primaryAccent.cssVar)}
                    >
                      {formatPoints(Math.max(0, rivalAbove.monthly_points - myPoints))} pts
                    </span>{' '}
                    para ultrapassar {getRankingDisplayName(rivalAbove, { short: true })}.
                  </p>
                )}
              </div>
            </ElevatedCard>

            <BrandHero>
              <div className="flex h-full flex-col justify-center">
                <div className="mb-2 flex items-center gap-2">
                  {isLeader ? (
                    <Crown className="h-[18px] w-[18px]" style={{ color: '#F59E0B' }} />
                  ) : (
                    <Target className="h-[18px] w-[18px]" style={{ color: HERO_ACCENT_COLOR }} />
                  )}
                  <p
                    className="text-[13px] font-extrabold uppercase tracking-[0.14em]"
                    style={{ color: isLeader ? '#F59E0B' : HERO_ACCENT_COLOR }}
                  >
                    {isLeader ? 'Liderando o mês' : 'Corrida para o topo'}
                  </p>
                </div>

                {isLeader ? (
                  <>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="font-display text-[46px] font-black tabular-nums text-white sm:text-[54px]">
                        {formatPoints(myPoints)}
                      </span>
                      <span className="text-[15px] font-bold text-white/45">pts no mês</span>
                    </div>
                    {(Boolean(selfEntry?.current_streak_days) || selfEntry?.monthly_accuracy_pct != null) && (
                      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                        {Boolean(selfEntry?.current_streak_days) && (
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/70">
                            <Flame className="h-4 w-4 text-orange-400" /> {selfEntry?.current_streak_days}d de sequência
                          </span>
                        )}
                        {selfEntry?.monthly_accuracy_pct != null && (
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/70">
                            <Target className="h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} /> {Math.round(selfEntry.monthly_accuracy_pct)}% de acerto
                          </span>
                        )}
                      </div>
                    )}
                    <p className="flex flex-wrap items-center gap-1.5 text-[14.5px] leading-relaxed text-white/55">
                      {rivalBelow ? (
                        <>
                          <span>
                            Vantagem de{' '}
                            <span className="font-extrabold text-white">
                              {formatPoints(Math.max(0, myPoints - rivalBelow.monthly_points))} pts
                            </span>{' '}
                            sobre
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            {rivalBelow.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={rivalBelow.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/25" />
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[8px] font-bold text-white/80">
                                {getInitials(rivalBelow.full_name)}
                              </span>
                            )}
                            <span className="font-semibold text-white/80">{getRankingDisplayName(rivalBelow, { short: true })}.</span>
                          </span>
                        </>
                      ) : (
                        'Continue respondendo pra manter a liderança.'
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="font-display text-[46px] font-black tabular-nums text-white sm:text-[54px]">
                        {formatPoints(myPoints)}
                      </span>
                      <span className="text-[15px] font-bold text-white/45">/ {formatPoints(leaderPts)} pts</span>
                    </div>
                    <MiniBar pct={raceProgressPct} color="var(--brand-accent)" glow height={10} />
                    <p className="mt-4 flex flex-wrap items-center gap-2 text-[14.5px] leading-relaxed text-white/55">
                      {leaderEntry && leaderEntry.user_id !== selfEntry?.user_id ? (
                        <>
                          <span>
                            Faltam{' '}
                            <span className="font-extrabold text-white">{formatPoints(pointsToLeader)} pts</span>{' '}
                            para
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            {leaderEntry.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={leaderEntry.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-white/25" />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[9px] font-bold text-white/80">
                                {getInitials(leaderEntry.full_name)}
                              </span>
                            )}
                            <span className="font-semibold text-white/80">{getRankingDisplayName(leaderEntry, { short: true })}, o 1º lugar.</span>
                          </span>
                        </>
                      ) : (
                        <>Faltam <span className="font-extrabold text-white">{formatPoints(pointsToLeader)} pts</span> para o 1º lugar.</>
                      )}
                    </p>
                    {(Boolean(selfEntry?.current_streak_days) || selfEntry?.monthly_accuracy_pct != null) && (
                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                        {Boolean(selfEntry?.current_streak_days) && (
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/70">
                            <Flame className="h-4 w-4 text-orange-400" /> {selfEntry?.current_streak_days}d de sequência
                          </span>
                        )}
                        {selfEntry?.monthly_accuracy_pct != null && (
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/70">
                            <CheckCircle2 className="h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} /> {Math.round(selfEntry.monthly_accuracy_pct)}% de acerto
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </BrandHero>
          </RevealItem>
        )}

        {/* ── Desafio de Reativação — "chame seu colega de volta" ─────────── */}
        {reactivationStatus?.enabled && (
          <RevealItem>
            {reactivationStatus.bonus_active ? (
              <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-5 py-4 ring-1 ring-amber-500/30">
                <Zap className="h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                  🔥 Bônus da turma ativo
                  {reactivationStatus.bonus_active_until && (
                    <> até {new Date(reactivationStatus.bonus_active_until).toLocaleDateString('pt-BR')}</>
                  )}{' '}
                  — {reactivationStatus.bonus_multiplier}x pontos pra todo mundo!
                </p>
              </div>
            ) : (
              <button type="button" onClick={handleCopyReactivationLink} className="w-full text-left">
                <ElevatedCard className="cursor-pointer transition-shadow hover:shadow-lg">
                  <div className="p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-500" />
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                          Chame seus colegas de volta
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <Copy className="h-3 w-3" /> Copiar link
                      </span>
                    </div>
                    <p className="mb-1 text-[13px] font-semibold text-slate-700 dark:text-white/80">
                      {reactivationStatus.reactivated_count} de {reactivationStatus.required_students} colegas sumidos já voltaram
                    </p>
                    <p className="mb-3 text-[12.5px] leading-relaxed text-slate-500 dark:text-white/50">
                      Clique aqui pra copiar o link de login da turma e manda pra um colega que sumiu há mais de{' '}
                      {reactivationStatus.inactive_days_threshold} dias. Se ele voltar e responder{' '}
                      {reactivationStatus.required_questions} questões em pelo menos {reactivationStatus.required_distinct_days} dias diferentes, ele conta como reativado. Quando{' '}
                      {reactivationStatus.required_students} colegas voltarem assim, a <strong className="text-slate-700 dark:text-white/70">turma inteira</strong> ganha {reactivationStatus.bonus_multiplier}x pontos por {reactivationStatus.bonus_duration_days} dias.
                    </p>
                    <MiniBar
                      pct={Math.min(100, (reactivationStatus.reactivated_count / reactivationStatus.required_students) * 100)}
                      color="#10b981"
                    />
                  </div>
                </ElevatedCard>
              </button>
            )}
          </RevealItem>
        )}

        {/* ── Full ranking list ─────────────────────────────────────────── */}
        <RevealItem>
          <ElevatedCard>
            <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-white/5">
              <Flame className="h-3.5 w-3.5 text-orange-500/60" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-white/35">Top 5</p>
            </div>

            <div className="p-2 space-y-0.5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/40">Nenhuma entrada ainda</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-white/20">Complete atividades para aparecer no ranking!</p>
                </div>
              ) : (
                <>
                  {visibleList.map((entry, i) => (
                    <div key={entry.user_id}>
                      {i === 2 && visibleList.length > 2 && <NationalZoneDivider />}
                      {hasTopDivider && i === topCutoff && <PrizeZoneDivider cutoff={topCutoff} />}
                      <RankRow
                        entry={entry}
                        isSelf={selfEntry?.user_id === entry.user_id}
                        isPrize={entry.rank <= topCutoff}
                        index={i}
                        primaryHex={primaryAccent.hex}
                      />
                    </div>
                  ))}

                  {selfEntry && !visibleList.some((e) => e.user_id === selfEntry.user_id) && (
                    <>
                      <div className="relative my-2 flex items-center gap-3 px-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent dark:via-white/10" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25">sua posição</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent dark:via-white/10" />
                      </div>
                      <RankRow
                        entry={selfEntry}
                        isSelf
                        isPrize={selfEntry.rank <= topCutoff}
                        index={TOP_LIMIT}
                        primaryHex={primaryAccent.hex}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </ElevatedCard>
        </RevealItem>

        {/* ── Histórico ─────────────────────────────────────────────────── */}
        {!isLoading && monthlyHistory.length > 0 && (
          <RevealItem>
            <button
              type="button"
              onClick={() => setHistoryModalOpen(true)}
              className="block w-full text-left"
              aria-label="Ver histórico completo"
            >
              <ElevatedCard accentColor={primaryAccent.cssVar} className="cursor-pointer">
                <div className="p-5">
                  <SectionTitle
                    kicker="Sua trajetória"
                    title="Seu histórico"
                    hex={primaryAccent.hex ?? undefined}
                    colorVar={primaryAccent.cssVar}
                    action={
                      recentHistory.length < monthlyHistory.length ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-white/30">
                          Ver tudo <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      ) : undefined
                    }
                  />
                  <div className="space-y-2">
                    {recentHistory.map((item) => (
                      <HistoryRow key={item.month_reference} item={item} />
                    ))}
                  </div>
                </div>
              </ElevatedCard>
            </button>
          </RevealItem>
        )}

        {historyModalOpen && (
          <HistoryModal
            history={monthlyHistory}
            onClose={() => setHistoryModalOpen(false)}
          />
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
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
        </>
        )}

        {/* ── Disputa Nacional ─────────────────────────────────────────── */}
        {view === 'national' && (
          <RevealItem>
            <div
              className="relative overflow-hidden rounded-[22px] px-4 pb-2 pt-4 lg:px-6 lg:pb-3 lg:pt-6"
              style={{
                background: 'radial-gradient(130% 150% at 12% -10%, #0c5132 0%, #063a2e 30%, #05264a 62%, #030d22 100%)',
                boxShadow: '0 20px 48px -20px rgba(3,13,34,0.65)',
              }}
            >
              <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-yellow-400/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
              <BrazilSilhouette />
              <div className="relative z-10">
                <div className="mb-5 pr-6">
                  <p
                    className="font-script inline-block pb-1 pr-2 text-[32px] leading-normal sm:text-[38px]"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, #8CE97A 0%, #FEDD00 55%, #FFFFFF 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    Pódio nacional
                  </p>
                </div>

                {nationalRanking?.settings.bonus_active && (
                  <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-amber-500/15 px-3.5 py-1.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                    <Zap className="h-3.5 w-3.5" />
                    Bônus ativo: próximas {nationalRanking.settings.questions_remaining ?? nationalRanking.settings.bonus_questions_total} questões valem {nationalRanking.settings.bonus_multiplier}x
                  </div>
                )}

                {nationalLoading || nationalPodium.length === 0 ? (
                  <div className="flex h-36 items-end justify-center gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="w-full rounded-t-xl" style={{ height: i === 1 ? 80 : i === 2 ? 112 : 64 }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-end justify-center gap-2.5 sm:gap-3">
                    {nationalPodiumOrder.map((entry) => entry && (
                      <NationalPodiumEntry
                        key={`${entry.source}-${entry.id}`}
                        entry={entry}
                        isSelf={entry.source === 'real' && entry.id === nationalSelfId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </RevealItem>
        )}

        {view === 'national' && !nationalLoading && nationalList.length > 0 && (
          <RevealItem>
            <ElevatedCard>
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/5">
                <Globe className="h-3.5 w-3.5 text-sky-500/70" />
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-white/35">Ranking Nacional</p>
              </div>
              <div className="space-y-0.5 p-2">
                {nationalList.map((entry, i) => (
                  <NationalRow
                    key={`${entry.source}-${entry.id}`}
                    entry={entry}
                    index={i}
                    isSelf={entry.source === 'real' && entry.id === nationalSelfId}
                  />
                ))}

                {nationalRanking?.user_context && !nationalList.some((e) => e.source === 'real' && e.id === nationalSelfId) && (
                  <>
                    <div className="relative my-2 flex items-center gap-3 px-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent dark:via-white/10" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25">sua posição</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent dark:via-white/10" />
                    </div>
                    <NationalRow
                      entry={nationalRanking.user_context.self}
                      index={nationalList.length}
                      isSelf
                    />
                  </>
                )}
              </div>
            </ElevatedCard>
          </RevealItem>
        )}
      </RevealGroup>
    </div>
    </ModuleGuard>
  );
}
