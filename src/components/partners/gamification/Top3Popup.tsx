'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Award, Crown, Gift, Sparkles, Trophy, X, Zap } from 'lucide-react';
import type { PartnerRankingEntry, PartnerRankingResponse } from '@/types/gamification';
import { usePopupTheme } from './popupTheme';
import { getGamificationTitleMeta, getProgressTierMeta } from './titleSystem';

interface Props {
  position: 1 | 2 | 3;
  ranking: PartnerRankingResponse | null;
  slug: string;
  onDismiss: () => void;
}

const RANK_THEMES = {
  1: {
    gradient: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 50%, #D97706 100%)',
    glow: '#F59E0B',
    ring: '#F59E0B55',
    bg: 'linear-gradient(180deg, #F59E0B18 0%, #F59E0B08 50%, transparent 100%)',
    textColor: '#FFD700',
    icon: Crown,
  },
  2: {
    gradient: 'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 50%, #64748B 100%)',
    glow: '#94A3B8',
    ring: '#94A3B844',
    bg: 'linear-gradient(180deg, #94A3B812 0%, #94A3B806 50%, transparent 100%)',
    textColor: '#CBD5E1',
    icon: Trophy,
  },
  3: {
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #B45309 50%, #92400E 100%)',
    glow: '#B45309',
    ring: '#B4530944',
    bg: 'linear-gradient(180deg, #B4530912 0%, #B4530906 50%, transparent 100%)',
    textColor: '#D97706',
    icon: Award,
  },
} as const;

const ROW_HEIGHT = 58;
const ROW_GAP = 8;
const SWAP_DELAY = 1.1;
const SWAP_DURATION = 1.2;

function formatPoints(pts: number): string {
  return pts.toLocaleString('pt-BR');
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function FloatingParticles() {
  const data = [
    { left: 12, top: 18, delay: 0.2, duration: 4.4, size: 4 },
    { left: 84, top: 16, delay: 1.1, duration: 5.2, size: 5 },
    { left: 26, top: 68, delay: 0.6, duration: 4.8, size: 3 },
    { left: 72, top: 62, delay: 1.5, duration: 5.4, size: 4 },
    { left: 56, top: 34, delay: 0.9, duration: 4.6, size: 3 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {data.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: 'rgba(245, 158, 11, 0.22)',
          }}
          animate={{ y: [0, -22, 0], opacity: [0.2, 0.65, 0.2], scale: [1, 1.3, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function RankingSliceRow({
  entry,
  isSelf,
  rankOverride,
  forcePrize,
  highlight,
  popupTheme,
}: {
  entry: PartnerRankingEntry;
  isSelf: boolean;
  rankOverride?: number;
  forcePrize?: boolean;
  highlight?: boolean;
  popupTheme: ReturnType<typeof usePopupTheme>;
}) {
  const rank = rankOverride ?? entry.rank;
  const isTop3 = rank <= 3;
  const theme = isTop3 ? RANK_THEMES[rank as 1 | 2 | 3] : null;
  const isPrize = forcePrize ?? isTop3;
  const titleMeta = getGamificationTitleMeta(entry.gamification_title);
  const progressMeta = getProgressTierMeta(entry.progress_tier);
  const ProgressIcon = progressMeta.Icon;

  return (
    <div
      className="group relative flex h-[58px] items-center gap-3 rounded-xl px-3 py-2"
      style={
        highlight
          ? {
              background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 25%, transparent)',
            }
          : {
              ...popupTheme.rankingRowStyle,
            }
      }
    >
      <div className="flex w-8 shrink-0 items-center justify-center">
        {theme ? (
          <div
            className="flex h-6.5 w-6.5 items-center justify-center rounded-lg"
            style={{ background: theme.bg, border: `1px solid ${theme.ring}` }}
          >
            <theme.icon className="h-3 w-3" style={{ color: theme.textColor }} />
          </div>
        ) : (
          <span className={`text-[11px] font-bold tabular-nums ${popupTheme.rankingRowSubtextClass}`}>{rank}</span>
        )}
      </div>

      <div className="relative shrink-0">
        {entry.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{
              background: isSelf
                ? 'var(--brand-primary)'
                : theme
                  ? theme.gradient
                  : 'linear-gradient(135deg, #334155, #1E293B)',
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

        {isSelf && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950"
            style={{ background: 'var(--brand-primary)' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-semibold ${popupTheme.rankingRowTextClass}`}
          style={isSelf ? { color: 'var(--brand-primary)' } : undefined}
        >
          {isSelf ? `${entry.full_name} (você)` : entry.full_name}
        </p>
        <div className="mt-0.5 flex items-center gap-1">
          <ProgressIcon className="h-2.5 w-2.5" style={{ color: progressMeta.color }} />
          <p className="text-[9px] font-semibold" style={{ color: progressMeta.color }}>
            {progressMeta.title}
          </p>
        </div>
        <p className={`text-[9px] ${popupTheme.rankingRowSubtextClass}`}>{titleMeta.title}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {isPrize && <Zap className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />}
          <span
            className={`text-[13px] font-extrabold tabular-nums ${popupTheme.rankingRowValueClass}`}
            style={isTop3 && theme ? { color: theme.textColor } : undefined}
          >
            {formatPoints(entry.monthly_points)}
          </span>
        </div>
        {isPrize ? (
          <span
            className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 80%, #000))',
            }}
          >
            <Gift className="h-2 w-2" />
            aprovação
          </span>
        ) : (
          <span className={`text-[9px] font-medium ${popupTheme.rankingRowSubtextClass}`}>pts</span>
        )}
      </div>
    </div>
  );
}

function PrizeZoneDivider({ cutoff }: { cutoff: number }) {
  return (
    <div className="relative my-2 flex items-center gap-3 px-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-500/50">
        <Gift className="h-2.5 w-2.5" />
        líderes do mês — top {cutoff}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </div>
  );
}

export function Top3Popup({ position, ranking, slug, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('ranking');
  const selfEntry = ranking?.user_context?.self ?? null;
  const currentTop4 = (ranking?.ranking ?? []).slice(0, 4);
  const displacedEntry = currentTop4.find((entry) => entry.rank === 4) ?? null;
  const canShowSwap =
    position === 3 &&
    !!selfEntry &&
    selfEntry.rank === 3 &&
    !!displacedEntry;

  const beforeRows = canShowSwap
    ? currentTop4.map((entry) => {
        if (entry.user_id === selfEntry?.user_id) return { ...entry, rank: 4 };
        if (entry.user_id === displacedEntry?.user_id) return { ...entry, rank: 3 };
        return entry;
      }).sort((a, b) => a.rank - b.rank)
    : currentTop4;

  const handleOpenRanking = () => {
    window.location.assign(`/partners/${slug}/student/ranking`);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex items-center justify-center px-4 py-4 sm:py-6"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      initial={shouldReduce ? {} : { opacity: 0 }}
      animate={shouldReduce ? {} : { opacity: 1 }}
      exit={shouldReduce ? {} : { opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
      aria-label={`Você entrou no top ${position}`}
    >
      <motion.div
        className="relative flex w-full max-w-[920px] flex-col overflow-hidden rounded-[30px] shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { y: 20, opacity: 0, scale: 0.985 }}
        animate={shouldReduce ? {} : { y: 0, opacity: 1, scale: 1 }}
        exit={shouldReduce ? {} : { y: 20, opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-14 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
          <div
            className="absolute -right-10 top-6 h-48 w-48 rounded-full blur-3xl"
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
          />
          <FloatingParticles />
        </div>

        <div className={`relative z-10 flex items-start justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 ${theme.isDark ? 'border-b border-white/8' : 'border-b border-slate-200/80'}`}>
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)',
                color: '#fde68a',
              }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${theme.mutedClass}`}>
                Movimento no ranking
              </p>
              <h2 className={`mt-1 text-lg font-black sm:text-[28px] ${theme.titleClass}`}>
                Você entrou no top 3
              </h2>
              <p className={`mt-1.5 max-w-xl text-[13px] leading-relaxed sm:text-sm ${theme.bodyClass}`}>
                Você está no topo do ranking. A disputa acontece logo abaixo.
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className={`rounded-full p-2 transition-colors ${theme.closeButtonClass}`}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative z-10 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-3">
            <div className="rounded-[24px] p-3.5 sm:p-4" style={theme.elevatedPanelStyle}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-300" />
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.rankingRowSubtextClass}`}>
                    Trecho do ranking
                  </p>
                </div>
                <div className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${theme.rankingRowSubtextClass}`} style={theme.panelStyle}>
                  top 4 -&gt; top 3
                </div>
              </div>

              {beforeRows.length > 0 ? (
                <div className="rounded-2xl p-2.5" style={theme.panelStyle}>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${theme.rankingRowSubtextClass}`}>
                        Antes da sua questão
                      </p>
                      <p className={`mt-0.5 text-[13px] font-semibold ${theme.softTextClass}`}>
                        Você estava logo abaixo da zona de liderança.
                      </p>
                    </div>
                    {canShowSwap && (
                      <motion.div
                        className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300"
                        initial={shouldReduce ? {} : { opacity: 0 }}
                        animate={shouldReduce ? {} : { opacity: [0, 0, 1] }}
                        transition={{ duration: SWAP_DELAY + SWAP_DURATION + 0.3 }}
                      >
                        agora você está dentro
                      </motion.div>
                    )}
                  </div>

                  <div
                    className="relative overflow-hidden rounded-2xl"
                    style={{ height: currentTop4.length * ROW_HEIGHT + (currentTop4.length - 1) * ROW_GAP + 30 }}
                  >
                    <div className="absolute inset-x-0 top-0 z-0">
                      <PrizeZoneDivider cutoff={ranking?.prize_cutoff ?? 3} />
                    </div>

                    <div className="absolute inset-x-0 top-[30px]">
                      {beforeRows.map((entry) => {
                        const isSelf = entry.user_id === selfEntry?.user_id;
                        const finalRank = currentTop4.find((item) => item.user_id === entry.user_id)?.rank ?? entry.rank;
                        const initialY = (entry.rank - 1) * (ROW_HEIGHT + ROW_GAP);
                        const finalY = (finalRank - 1) * (ROW_HEIGHT + ROW_GAP);

                        return (
                          <motion.div
                            key={entry.user_id}
                            className="absolute inset-x-0"
                            initial={shouldReduce ? {} : { y: initialY, opacity: 0 }}
                            animate={
                              shouldReduce
                                ? { y: finalY, opacity: 1 }
                                : { y: finalY, opacity: 1 }
                            }
                            transition={{
                              opacity: { duration: 0.35, delay: 0.15 },
                              y: {
                                duration: canShowSwap ? SWAP_DURATION : 0.45,
                                delay: canShowSwap ? SWAP_DELAY : 0.15,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            }}
                          >
                            <RankingSliceRow
                              entry={entry}
                              isSelf={isSelf}
                              rankOverride={finalRank}
                              highlight={isSelf}
                              forcePrize={finalRank <= (ranking?.prize_cutoff ?? 3)}
                              popupTheme={theme}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-5 text-center" style={theme.panelStyle}>
                  <p className={`text-sm font-semibold ${theme.softTextClass}`}>Ranking indisponível no momento</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl px-4 py-3" style={theme.elevatedPanelStyle}>
              <div className="flex items-start gap-3">
                <Trophy className="mt-0.5 h-4 w-4 text-amber-300" />
                <p className={`text-[13px] leading-relaxed ${theme.softTextClass}`}>
                  Agora você está visível na zona mais disputada do mês. O objetivo continua o mesmo: sustentar a posição e correr para os <span className={`font-black ${theme.titleClass}`}>1.500 pts</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`relative z-10 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:px-5 ${theme.isDark ? 'border-t border-white/8' : 'border-t border-slate-200/80'}`}>
          <button
            onClick={onDismiss}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${theme.secondaryButtonClass}`}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleOpenRanking}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-opacity hover:opacity-90 ${theme.primaryButtonClass}`}
            style={theme.primaryButtonStyle}
          >
            Ver ranking completo
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
