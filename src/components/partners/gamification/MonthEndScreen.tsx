'use client';

import { useReducedMotion, motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, ArrowRight } from 'lucide-react';
import { usePopupTheme } from './popupTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Winner {
  position: 1 | 2 | 3;
  full_name: string;
  monthly_points: number;
}

interface Props {
  winners: Winner[];
  organizationName: string;
  onContinue: () => void;
}

// ─── Particles ────────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.sin(i * 1.4) * 160,
  y: -90 - Math.abs(Math.cos(i * 1.1)) * 180,
  size: 5 + (i % 4) * 2,
  delay: i * 0.055,
  color:
    i % 3 === 0
      ? 'var(--brand-primary)'
      : i % 3 === 1
      ? '#f59e0b'
      : '#e2e8f0',
}));

// ─── Podium slot ─────────────────────────────────────────────────────────────

function PodiumSlot({
  winner,
  delay,
  shouldReduce,
}: {
  winner: Winner;
  delay: number;
  shouldReduce: boolean | null;
}) {
  const heights: Record<number, string> = { 1: 'h-20', 2: 'h-14', 3: 'h-10' };
  const isFirst = winner.position === 1;

  const iconEl =
    winner.position === 1 ? (
      <Crown className="h-4 w-4 text-yellow-400" />
    ) : winner.position === 2 ? (
      <Medal className="h-4 w-4 text-slate-300" />
    ) : (
      <Medal className="h-4 w-4 text-amber-600" />
    );

  const emoji =
    winner.position === 1 ? '👑' : winner.position === 2 ? '🥈' : '🥉';

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
      initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
      animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Name */}
      <p
        className="text-center text-[11px] font-semibold text-white/80 leading-tight max-w-[72px] truncate"
        title={winner.full_name}
      >
        {winner.full_name.split(' ')[0]}
      </p>

      {/* Avatar */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/20"
        style={{
          background: isFirst
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : winner.position === 2
            ? 'linear-gradient(135deg, #94a3b8, #64748b)'
            : 'linear-gradient(135deg, #a16207, #92400e)',
        }}
      >
        {winner.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Medal icon row */}
      <div className="flex items-center gap-0.5">{iconEl}</div>

      {/* Pedestal */}
      <div
        className={`w-full ${heights[winner.position]} flex flex-col items-center justify-center rounded-t-lg`}
        style={{
          background: isFirst
            ? 'linear-gradient(180deg, #f59e0b22 0%, #f59e0b0d 100%)'
            : 'linear-gradient(180deg, #ffffff0a 0%, #ffffff04 100%)',
          border: isFirst ? '1px solid #f59e0b33' : '1px solid #ffffff10',
          borderBottom: 'none',
        }}
      >
        <span className="text-base">{emoji}</span>
        <p className="mt-0.5 text-[10px] font-bold text-white/50">
          {winner.monthly_points.toLocaleString('pt-BR')} pts
        </p>
      </div>
    </motion.div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function previousMonthLabel(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MonthEndScreen({
  winners,
  organizationName,
  onContinue,
}: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('ranking');

  // Reorder for visual podium: [2nd, 1st, 3rd]
  const sorted = [...winners].sort((a, b) => a.position - b.position);
  const podium =
    sorted.length === 3
      ? [sorted[1], sorted[0], sorted[2]]
      : sorted.length === 2
      ? [sorted[1], sorted[0]]
      : sorted;

  // Delays for podium slots: 3rd → 2nd → 1st
  const podiumDelays: Record<number, number> = { 1: 0.55, 2: 0.45, 3: 0.35 };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={theme.overlayStyle} />

        {/* Card */}
        <motion.div
          className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl"
          style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
          initial={shouldReduce ? {} : { scale: 0.88, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          exit={shouldReduce ? {} : { scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        >
          {/* Brand glow */}
          <div
            className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl opacity-25"
            style={{ background: 'var(--brand-primary)' }}
          />

          {/* Confetti particles */}
          {!shouldReduce && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{ width: p.size, height: p.size, background: p.color }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
                  transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 overflow-y-auto p-5 sm:p-7">
            {/* Header */}
            <div className="mb-5 text-center">
              <motion.div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ring-2 ring-white/10"
                style={{ background: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)' }}
                initial={shouldReduce ? {} : { scale: 0 }}
                animate={shouldReduce ? {} : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              >
                <Trophy className="h-7 w-7" style={{ color: 'var(--brand-primary)' }} />
              </motion.div>

              <motion.h2
                className={`text-xl font-extrabold leading-tight ${theme.titleClass}`}
                initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
                animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                🏆 {organizationName}
              </motion.h2>
              <motion.p
                className={`mt-1 text-[11px] font-bold uppercase tracking-widest ${theme.mutedClass}`}
                initial={shouldReduce ? {} : { opacity: 0 }}
                animate={shouldReduce ? {} : { opacity: 1 }}
                transition={{ delay: 0.28 }}
              >
                Campeões de {previousMonthLabel()}
              </motion.p>
            </div>

            {/* Podium */}
            {winners.length > 0 ? (
              <div className="mb-5 flex items-end justify-center gap-1.5 sm:gap-2">
                {podium.map((w) => (
                  <PodiumSlot
                    key={w.position}
                    winner={w}
                    delay={podiumDelays[w.position] ?? 0.4}
                    shouldReduce={shouldReduce}
                  />
                ))}
              </div>
            ) : (
              <p className={`mb-5 text-center text-sm ${theme.bodyClass}`}>
                Nenhum vencedor registrado.
              </p>
            )}

            {/* Reset message */}
            <motion.div
              className="mb-5 rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3 text-center"
              style={theme.panelStyle}
              initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
              animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <p className={`text-sm font-semibold ${theme.titleClass}`}>
                Novo mês, novo ranking.
              </p>
              <p className={`mt-0.5 text-xs ${theme.mutedClass}`}>
                Todo mundo começa do zero.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.button
              onClick={onContinue}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
              style={theme.primaryButtonStyle}
              initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              Competir agora
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
