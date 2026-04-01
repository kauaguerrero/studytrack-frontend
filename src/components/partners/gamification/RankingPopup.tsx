'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { PartnerRankingEntry, PartnerRankingResponse } from '@/types/gamification';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ranking: PartnerRankingResponse;
  onClose: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'] as const;

// ─── Sub-components ────────────────────────────────────────────────────────────

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
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      {...overlayAnim}
    >
      <motion.div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl"
        {...cardAnim}
        // Prevent overlay click from bubbling through the card
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <span aria-hidden>🏆</span> Ranking do Mês
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:text-white"
            aria-label="Fechar ranking"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-3 py-3 space-y-1">
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
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-center text-xs text-slate-500">
            Top {prize_cutoff} ganham a pulseira exclusiva Edificar 🏆
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}