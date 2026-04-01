'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Medal, Crown, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { Skeleton } from '@/components/ui/skeleton';
import type { PartnerRankingEntry } from '@/types/gamification';

// ─── Animation config ────────────────────────────────────────────────────────

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TITLE_COLORS: Record<string, string> = {
  Expert: '#f59e0b',
  Veterano: '#6366f1',
  Iniciante: '#64748b',
};

function medalIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-300" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return null;
}

function podiumHeight(rank: number): string {
  if (rank === 1) return 'h-24';
  if (rank === 2) return 'h-16';
  return 'h-12';
}

// ─── Podium ──────────────────────────────────────────────────────────────────

interface PodiumEntryProps {
  entry: PartnerRankingEntry;
  isSelf: boolean;
}

function PodiumEntry({ entry, isSelf }: PodiumEntryProps) {
  const height = podiumHeight(entry.rank);
  const isFirst = entry.rank === 1;

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      {/* Name */}
      <p
        className="text-center text-[11px] font-semibold leading-tight max-w-[72px] truncate"
        style={isSelf ? { color: 'var(--brand-primary)' } : undefined}
        title={entry.full_name}
      >
        {isSelf ? 'Você' : entry.full_name.split(' ')[0]}
      </p>

      {/* Avatar circle */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-2"
        style={{
          background: isSelf
            ? 'var(--brand-primary)'
            : isFirst
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #475569, #334155)',
        }}
      >
        {entry.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Pedestal */}
      <div
        className={`w-full ${height} flex flex-col items-center justify-center rounded-t-lg`}
        style={{
          background: isFirst
            ? 'linear-gradient(180deg, #f59e0b22 0%, #f59e0b11 100%)'
            : 'linear-gradient(180deg, #ffffff08 0%, #ffffff04 100%)',
          border: isFirst ? '1px solid #f59e0b33' : '1px solid #ffffff10',
          borderBottom: 'none',
        }}
      >
        <span className="text-base font-extrabold text-white">{entry.rank === 1 ? '👑' : entry.rank === 2 ? '🥈' : '🥉'}</span>
        <p className="mt-0.5 text-[10px] font-bold text-white/50">
          {entry.monthly_points.toLocaleString('pt-BR')} pts
        </p>
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  entry: PartnerRankingEntry;
  isSelf: boolean;
  isPrize: boolean;
}

function RankRow({ entry, isSelf, isPrize }: RowProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={
        isSelf
          ? {
              background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
              outline: '1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)',
            }
          : undefined
      }
    >
      {/* Rank number */}
      <div className="flex w-7 shrink-0 items-center justify-center">
        {entry.rank <= 3 ? (
          medalIcon(entry.rank)
        ) : (
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{
          background: isSelf
            ? 'var(--brand-primary)'
            : 'linear-gradient(135deg, #475569, #334155)',
        }}
      >
        {entry.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Name + title */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate text-sm font-semibold"
          style={isSelf ? { color: 'var(--brand-primary)' } : undefined}
        >
          {isSelf ? `${entry.full_name} (você)` : entry.full_name}
        </p>
        <p
          className="text-[10px] font-medium"
          style={{ color: TITLE_COLORS[entry.gamification_title] ?? '#64748b' }}
        >
          {entry.gamification_title}
        </p>
      </div>

      {/* Points + prize badge */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-extrabold text-slate-800 dark:text-white">
          {entry.monthly_points.toLocaleString('pt-BR')}
        </span>
        {isPrize ? (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: 'var(--brand-primary)' }}
          >
            prêmio
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">pts</span>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const shouldReduce = useReducedMotion();

  const { summary, ranking, isLoading, refreshRanking } = usePartnerGamification();

  // Fetch ranking once the hook has authenticated (tokenRef.current is set after init)
  useEffect(() => {
    if (!isLoading) {
      refreshRanking(100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const monthLabel = summary?.month_label ?? 'Este mês';
  const myPosition = summary?.rank_position ?? null;
  const myPoints = summary?.monthly_points ?? 0;
  const prizeCutoff = ranking?.prize_cutoff ?? summary?.prize_cutoff ?? 3;

  const fullList = ranking?.ranking ?? [];
  const selfEntry = ranking?.user_context?.self ?? null;

  // Podium: first 3 entries reordered as [2nd, 1st, 3rd] for visual balance
  const top3 = fullList.slice(0, 3);
  const podiumOrder =
    top3.length === 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        variants={shouldReduce ? undefined : CONTAINER}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={shouldReduce ? undefined : ITEM}>
          <div
            className="relative overflow-hidden rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full blur-3xl opacity-20"
              style={{ background: 'var(--brand-primary)' }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                  Ranking mensal
                </p>
                <h1 className="text-xl font-extrabold text-white">{monthLabel}</h1>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
              >
                <Trophy className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              </div>
            </div>

            {myPosition !== null && (
              <div className="relative z-10 mt-3 flex gap-3">
                <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  <p className="text-[10px] text-white/40">Sua posição</p>
                  <p className="text-lg font-extrabold text-white">#{myPosition}</p>
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  <p className="text-[10px] text-white/40">Seus pontos</p>
                  <p
                    className="text-lg font-extrabold"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    {myPoints.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Podium ─────────────────────────────────────────────────────────── */}
        {(isLoading || fullList.length > 0) && (
          <motion.div variants={shouldReduce ? undefined : ITEM}>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Pódio
              </p>

              {isLoading || fullList.length === 0 ? (
                <div className="flex gap-3 items-end justify-center h-28">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="w-16 rounded-t-lg" style={{ height: podiumHeight(i === 1 ? 2 : i === 2 ? 1 : 3).replace('h-', '') + 'rem' }} />
                  ))}
                </div>
              ) : (
                <div className="flex items-end gap-2 justify-center">
                  {podiumOrder.map((entry) => (
                    <PodiumEntry
                      key={entry.user_id}
                      entry={entry}
                      isSelf={selfEntry?.user_id === entry.user_id}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Full list ──────────────────────────────────────────────────────── */}
        <motion.div variants={shouldReduce ? undefined : ITEM}>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Classificação completa
              </p>
            </div>

            <div className="p-2 space-y-0.5">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <Skeleton className="h-4 w-6 rounded" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-2.5 w-16 rounded" />
                    </div>
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                ))
              ) : fullList.length === 0 ? (
                <div className="py-8 text-center">
                  <Trophy className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Nenhuma entrada ainda.
                  </p>
                  <p className="mt-1 text-xs text-slate-300 dark:text-slate-600">
                    Complete atividades para aparecer no ranking!
                  </p>
                </div>
              ) : (
                <>
                  {fullList.map((entry) => (
                    <RankRow
                      key={entry.user_id}
                      entry={entry}
                      isSelf={selfEntry?.user_id === entry.user_id}
                      isPrize={entry.rank <= prizeCutoff}
                    />
                  ))}

                  {/* If user is outside visible window, show their entry separately */}
                  {selfEntry &&
                    !fullList.some((e) => e.user_id === selfEntry.user_id) && (
                      <>
                        <div className="my-2 flex items-center gap-2 px-3">
                          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                          <span className="text-[10px] text-slate-400">···</span>
                          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <RankRow
                          entry={selfEntry}
                          isSelf
                          isPrize={selfEntry.rank <= prizeCutoff}
                        />
                      </>
                    )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Prize info footer ───────────────────────────────────────────────── */}
        {!isLoading && (
          <motion.div variants={shouldReduce ? undefined : ITEM}>
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              Top {prizeCutoff} alunos ganham prêmio ao final do mês.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}