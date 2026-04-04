'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { PartnerRankingEntry, PartnerRankingResponse } from '@/types/gamification';
import { usePopupTheme } from './popupTheme';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ranking: PartnerRankingResponse;
  onClose: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'] as const;

// ─── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ entry, size = 'sm' }: { entry: PartnerRankingEntry; size?: 'sm' | 'xs' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  if (entry.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={entry.avatar_url} className={`${cls} rounded-full object-cover shrink-0`} alt="" />;
  }
  return (
    <div className={`${cls} rounded-full bg-slate-700 flex items-center justify-center font-bold text-white shrink-0`}>
      {entry.full_name.charAt(0).toUpperCase()}
    </div>
  );
}

function RankRow({
  entry,
  medal,
  isHighlighted = false,
  label,
}: {
  entry: PartnerRankingEntry;
  medal?: string;
  isHighlighted?: boolean;
  label?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${isHighlighted ? 'border border-white/10' : ''}`}
      style={
        isHighlighted
          ? { background: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)' }
          : undefined
      }
    >
      {/* Rank / medal */}
      <span
        className={`w-7 shrink-0 text-center text-sm ${medal ? 'text-base' : 'font-bold text-slate-500'}`}
        aria-label={medal ? `${entry.rank}º lugar` : `#${entry.rank}`}
      >
        {medal ?? `#${entry.rank}`}
      </span>

      {/* Avatar */}
      <Avatar entry={entry} />

      {/* Name */}
      <span
        className={`flex-1 truncate text-sm font-semibold ${
          isHighlighted ? 'text-white' : 'text-slate-300'
        }`}
      >
        {entry.full_name}
      </span>

      {/* "← Você" label */}
      {label && (
        <span className="shrink-0 text-[10px] font-bold text-slate-500 whitespace-nowrap">
          {label}
        </span>
      )}

      {/* Points */}
      <span
        className={`shrink-0 text-xs font-bold tabular-nums ${
          isHighlighted ? 'text-white' : 'text-slate-400'
        }`}
      >
        {entry.monthly_points.toLocaleString('pt-BR')} pts
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function RankingPopup({ ranking, onClose }: Props) {
  const shouldReduce = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const theme = usePopupTheme('ranking');

  const { ranking: topList, user_context, prize_cutoff } = ranking;
  const selfId = user_context?.self?.user_id;
  const prizeEntries = topList.slice(0, prize_cutoff);

  const overlayAnim = shouldReduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };

  const cardAnim = shouldReduce
    ? {}
    : {
        initial: { y: 16, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit:    { y: 16, opacity: 0 },
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-[9000] flex items-end justify-center p-4 sm:items-center"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      {...overlayAnim}
    >
      <motion.div
        className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        {...cardAnim}
        // Prevent overlay click from bubbling through the card
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-4 py-3 ${theme.isDark ? 'border-b border-white/8' : 'border-b border-slate-200/80'}`}>
          <h3 className={`flex items-center gap-2 text-sm font-extrabold ${theme.titleClass}`}>
            <span aria-hidden>🏆</span> Ranking do Mês
          </h3>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${theme.closeButtonClass}`}
            aria-label="Fechar ranking"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="max-h-[min(70dvh,560px)] overflow-y-auto px-3 py-3 space-y-1">
          {/* Prize zone — top N */}
          {prizeEntries.map((entry, i) => (
            <RankRow
              key={entry.user_id}
              entry={entry}
              medal={MEDALS[i]}
              isHighlighted={entry.user_id === selfId}
            />
          ))}

          {/* Separator */}
          <div className="flex items-center gap-2 py-1.5" aria-hidden>
            <div className="flex-1 border-t border-dashed border-slate-700" />
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Zona do prêmio
            </span>
            <div className="flex-1 border-t border-dashed border-slate-700" />
          </div>

          {/* User context slice */}
          {user_context && (
            <>
              {user_context.above.map((entry) => (
                <RankRow key={entry.user_id} entry={entry} />
              ))}

              <RankRow
                entry={user_context.self}
                isHighlighted
                label="← Você está aqui"
              />

              {user_context.below.map((entry) => (
                <RankRow key={entry.user_id} entry={entry} />
              ))}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className={`${theme.isDark ? 'border-t border-white/8' : 'border-t border-slate-200/80'} px-4 py-3`}>
          <p className={`text-center text-xs ${theme.bodyClass}`}>
            Top {prize_cutoff} estão mais perto do prêmio — quem atingir 1.500 pts no mês vence 🏆
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
