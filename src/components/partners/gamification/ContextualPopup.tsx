'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Crown, Gift, Sparkles, Trophy, X, Zap } from 'lucide-react';
import type { PartnerRankingEntry, PartnerRankingResponse, PopupState } from '@/types/gamification';
import { usePopupTheme } from './popupTheme';
import { getGamificationTitleMeta, getProgressTierMeta } from './titleSystem';

interface Props {
  popupState: PopupState;
  ranking: PartnerRankingResponse | null;
  slug: string;
  onDismiss: () => void;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function formatPoints(pts: number): string {
  return pts.toLocaleString('pt-BR');
}

function PopupRankRow({
  entry,
  isSelf,
  highlight = false,
  theme,
}: {
  entry: PartnerRankingEntry;
  isSelf: boolean;
  highlight?: boolean;
  theme: ReturnType<typeof usePopupTheme>;
}) {
  const titleMeta = getGamificationTitleMeta(entry.gamification_title);
  const progressMeta = getProgressTierMeta(entry.progress_tier);
  const ProgressIcon = progressMeta.Icon;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-3 py-2"
      style={
        highlight
          ? {
              background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 24%, transparent)',
            }
          : {
              ...theme.rankingRowStyle,
            }
      }
    >
      <div className={`flex w-7 shrink-0 items-center justify-center text-xs font-bold ${theme.softTextClass}`}>
        #{entry.rank}
      </div>

      {entry.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.avatar_url}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
          style={{
            border: isSelf ? '2px solid var(--brand-primary)' : '2px solid rgba(255,255,255,0.12)',
          }}
        />
      ) : (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            background: isSelf ? 'var(--brand-primary)' : 'linear-gradient(135deg, #334155, #1E293B)',
            border: isSelf ? '2px solid var(--brand-primary)' : '2px solid rgba(255,255,255,0.12)',
          }}
        >
          {getInitials(entry.full_name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${theme.rankingRowTextClass}`}
          style={isSelf ? { color: 'var(--brand-primary)' } : undefined}
        >
          {isSelf ? `${entry.full_name} (você)` : entry.full_name}
        </p>
        <div className="mt-0.5 flex items-center gap-1">
          <ProgressIcon className="h-2.5 w-2.5" style={{ color: progressMeta.color }} />
          <p className="text-[10px] font-semibold" style={{ color: progressMeta.color }}>
            {progressMeta.title}
          </p>
        </div>
        <p className={`text-[10px] ${theme.rankingRowSubtextClass}`}>{titleMeta.title}</p>
      </div>

      <div className="text-right">
        <p className={`text-sm font-extrabold ${theme.rankingRowValueClass}`}>{formatPoints(entry.monthly_points)}</p>
        <p className={`text-[10px] font-medium ${theme.rankingRowSubtextClass}`}>pts</p>
      </div>
    </div>
  );
}

export function ContextualPopup({ popupState, ranking, slug, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const isUrgency = popupState.type === 'urgency';
  const theme = usePopupTheme(isUrgency ? 'danger' : 'ranking');
  const selfEntry = ranking?.user_context?.self ?? null;
  const aboveEntries = ranking?.user_context?.above ?? [];
  const belowEntries = ranking?.user_context?.below ?? [];
  const rivalEntry = aboveEntries.at(-1) ?? null;
  const rivalName = popupState.rival_name ?? rivalEntry?.full_name ?? 'Rival';
  const visibleRows = [
    ...aboveEntries.slice(-2),
    ...(selfEntry ? [selfEntry] : []),
    ...belowEntries.slice(0, 2),
  ];
  const swapDistance = 60;

  const handleOpenRanking = () => {
    onDismiss();
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
      transition={{ duration: 0.22 }}
      aria-live="polite"
      aria-label={isUrgency ? 'Mudança no ranking' : 'Atualização do ranking'}
    >
      <motion.div
        className="relative flex max-h-[min(92dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
        style={theme.cardStyle}
        initial={shouldReduce ? {} : { y: 16, opacity: 0, scale: 0.98 }}
        animate={shouldReduce ? {} : { y: 0, opacity: 1, scale: 1 }}
        exit={shouldReduce ? {} : { y: 16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          <div className={`absolute -right-10 top-10 h-40 w-40 rounded-full blur-3xl ${isUrgency ? 'bg-red-500/12' : 'bg-amber-400/12'}`} />
        </div>

        <div className={`relative z-10 flex items-start justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 ${theme.isDark ? 'border-b border-white/8' : 'border-b border-slate-200/80'}`}>
          <div className="flex min-w-0 items-start gap-3">
            <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isUrgency ? 'bg-red-500/14 text-red-300' : 'bg-amber-400/14 text-amber-300'}`}>
              {isUrgency ? <ArrowUpRight className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${theme.mutedClass}`}>
                {isUrgency ? 'Movimento no Ranking' : 'Ranking do Mês'}
              </p>
              <h2 className={`mt-1 text-lg font-black sm:text-2xl ${theme.titleClass}`}>
                {isUrgency
                  ? `${rivalName} passou você`
                  : `Você está em #${popupState.position ?? ranking?.user_context?.position ?? '?'} no ranking`}
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${theme.bodyClass}`}>
                {isUrgency
                  ? `Você caiu uma posição. Recupere o lugar hoje para não abrir distância.`
                  : `Seu lugar já existe no ranking. Os 3 primeiros lideram o ranking, mas a meta real é chegar a 1.500 pts no mês.`}
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

        <div className="relative z-10 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isUrgency ? (
            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-4" style={theme.elevatedPanelStyle}>
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.rankingRowSubtextClass}`}>Diferença Atual</p>
                <p className={`mt-2 flex items-baseline gap-2 text-2xl font-black sm:text-3xl ${theme.titleClass}`}>
                  {popupState.points_diff ?? 0}
                  <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${theme.rankingRowSubtextClass}`}>pts</span>
                </p>
              </div>

              <div className="rounded-2xl p-4" style={theme.elevatedPanelStyle}>
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-300" />
                  <p className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.rankingRowSubtextClass}`}>
                    Troca de posição
                  </p>
                </div>

                <div className={`mb-2 flex items-center justify-end text-[10px] font-bold uppercase tracking-[0.14em] ${theme.rankingRowSubtextClass}`}>
                  <span>Agora</span>
                </div>

                <div className="relative h-[124px] overflow-hidden rounded-2xl" style={theme.panelStyle}>
                  {selfEntry && (
                    <motion.div
                      className="absolute inset-x-3 top-2.5 z-10"
                      initial={shouldReduce ? {} : { y: 0, scale: 1 }}
                      animate={shouldReduce ? {} : { y: swapDistance, scale: 0.985 }}
                      transition={{ duration: 0.85, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PopupRankRow
                        entry={{ ...selfEntry, rank: Math.max(1, selfEntry.rank - 1) }}
                        isSelf
                        highlight
                        theme={theme}
                      />
                    </motion.div>
                  )}

                  {rivalEntry && (
                    <motion.div
                      className="absolute inset-x-3 top-[63px] z-20"
                      initial={shouldReduce ? {} : { y: 0, scale: 0.985 }}
                      animate={shouldReduce ? {} : { y: -swapDistance, scale: 1 }}
                      transition={{ duration: 0.85, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PopupRankRow
                        entry={{ ...rivalEntry, rank: popupState.position ?? rivalEntry.rank }}
                        isSelf={false}
                        highlight
                        theme={theme}
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl p-4" style={theme.elevatedPanelStyle}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <p className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.rankingRowSubtextClass}`}>
                      Faixa do ranking
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.rankingRowSubtextClass}`}>
                    <Gift className="h-3 w-3" />
                    top {ranking?.prize_cutoff ?? 3} lideram com mais pontos
                  </div>
                </div>

                <div className="space-y-3">
                  {visibleRows.length > 0 ? visibleRows.map((entry, index) => (
                    <motion.div
                      key={entry.user_id}
                      initial={shouldReduce ? {} : { opacity: 0, x: 18 }}
                      animate={shouldReduce ? {} : { opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PopupRankRow
                        entry={entry}
                        isSelf={entry.user_id === selfEntry?.user_id}
                        highlight={entry.user_id === selfEntry?.user_id}
                        theme={theme}
                      />
                    </motion.div>
                  )) : (
                    <div className="rounded-xl px-4 py-5 text-center" style={theme.panelStyle}>
                      <p className={`text-sm font-semibold ${theme.softTextClass}`}>Ranking indisponível no momento</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl px-4 py-4" style={theme.elevatedPanelStyle}>
                <div className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 text-amber-300" />
                  <p className={`text-sm leading-relaxed ${theme.softTextClass}`}>
                    Faltam <span className={`font-black ${theme.titleClass}`}>{popupState.points_to_top3 ?? 0} pts</span> para você encostar no topo. Estar entre os primeiros acelera a corrida. A meta é 1.500 pts no mês.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`relative z-10 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:px-6 ${theme.isDark ? 'border-t border-white/8' : 'border-t border-slate-200/80'}`}>
          <button
            onClick={onDismiss}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${theme.secondaryButtonClass}`}
          >
            Continuar para o dashboard
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
