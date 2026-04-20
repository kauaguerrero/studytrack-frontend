'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePopupTheme } from './popupTheme';

interface Props {
  pointsAwarded: number;
  newMonthlyPoints: number;
  rankPosition: number | null;
  pointsToTop3: number | null;
  onDismiss: () => void;
  onViewRanking: () => void;
}

const MONTHLY_GOAL = 1500;

// ── Confetti: 20 partículas irradiam do centro para fora (sem lib externa) ───

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  color: ['#F59E0B', '#ffffff', '#34D399', '#60A5FA', '#F472B6'][i % 5],
  angleDeg: (i / 20) * 360,
  distance: 90 + (i % 4) * 35,
  size: 6 + (i % 3) * 4,
  durationS: 0.75 + (i % 4) * 0.12,
  isCircle: i % 3 === 0,
}));

const confettiKeyframes = PARTICLES.map((p) => {
  const rad = (p.angleDeg * Math.PI) / 180;
  const tx = Math.round(Math.cos(rad) * p.distance);
  const ty = Math.round(Math.sin(rad) * p.distance);
  return `@keyframes st-confetti-${p.id} {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    75%  { opacity: 0.9; }
    100% { transform: translate(${tx}px,${ty}px) scale(0); opacity: 0; }
  }`;
}).join('\n');

// ── Component ─────────────────────────────────────────────────────────────────

export function SimuladoRewardPopup({
  pointsAwarded,
  newMonthlyPoints,
  rankPosition,
  pointsToTop3,
  onDismiss,
  onViewRanking,
}: Props) {
  const shouldReduce = useReducedMotion();
  const [displayPoints, setDisplayPoints] = useState(0);
  const theme = usePopupTheme('celebration');

  // ── Counter animation: 0 → pointsAwarded over 1.5 s (ease-out cubic) ───────

  useEffect(() => {
    if (shouldReduce) return;
    const DURATION = 1500;
    const startedAt = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplayPoints(Math.round(eased * pointsAwarded));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointsAwarded, shouldReduce]);

  const monthlyBarPct = Math.min((newMonthlyPoints / MONTHLY_GOAL) * 100, 100);
  const renderedPoints = shouldReduce ? pointsAwarded : displayPoints;

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center px-4"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      aria-live="polite"
      aria-label="Recompensa por concluir o simulado"
    >
      {/* Confetti CSS keyframes */}
      {!shouldReduce && <style>{confettiKeyframes}</style>}

      {/* Confetti particles — posicionadas relativas ao centro da tela */}
      {!shouldReduce && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.isCircle ? '50%' : '2px',
                backgroundColor: p.color,
                animation: `st-confetti-${p.id} ${p.durationS}s ease-out both`,
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.8, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={
          shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 22 }
        }
      >
        {/* Botão X */}
        <button
          onClick={onDismiss}
          className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors ${theme.closeButtonClass}`}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 28%, transparent), transparent)'
              : 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 18%, white), transparent)',
          }}
        />

        <div className="overflow-y-auto px-5 pt-7 pb-5 space-y-5 sm:px-6 sm:pt-8 sm:pb-6">
          {/* ── Seção 1: Header ───────────────────────────────────────────── */}
          <div className="text-center">
            <motion.div
              className="mb-3 select-none text-5xl sm:text-6xl"
              role="img"
              aria-label="Alvo"
              animate={shouldReduce ? {} : { scale: [1, 1.18, 1] }}
              transition={
                shouldReduce
                  ? {}
                  : { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              🎯
            </motion.div>
            <p className={`text-xl font-extrabold uppercase tracking-widest leading-tight ${theme.titleClass}`}>
              SIMULADO CONCLUÍDO!
            </p>
            <p className={`mt-1 text-sm ${theme.bodyClass}`}>
              Você ganhou pontos no ranking!
            </p>
          </div>

          {/* ── Seção 2: Contador de pontos ───────────────────────────────── */}
          <div className="text-center">
            <p
              className="text-5xl font-black tabular-nums leading-none sm:text-6xl"
              style={{ color: '#F59E0B' }}
            >
              +{renderedPoints}
              <span className="text-3xl font-extrabold ml-1 align-baseline">
                pts
              </span>
            </p>
            <p className={`mt-2 text-sm ${theme.bodyClass}`}>
              Total este mês:{' '}
              <span className={`font-bold ${theme.titleClass}`}>
                {newMonthlyPoints.toLocaleString('pt-BR')} pts
              </span>
            </p>
          </div>

          {/* ── Seção 3: Contexto de ranking ─────────────────────────────── */}
          {rankPosition !== null && (
            <div
              className="rounded-2xl p-4 space-y-1.5"
              style={theme.accentPanelStyle}
            >
              <p className={`text-sm font-semibold ${theme.titleClass}`}>
                📊 Você está em{' '}
                <span className="font-black">#{rankPosition}</span> no ranking
              </p>
              {pointsToTop3 !== null && (
                <p className={`text-xs ${theme.bodyClass}`}>
                  {pointsToTop3 > 0
                    ? `Faltam ${pointsToTop3.toLocaleString('pt-BR')} pts para o top 3 🏆`
                    : '🏆 Você está no top 3! Defenda sua posição!'}
                </p>
              )}
            </div>
          )}

          {/* ── Seção 4: Barra de progresso mensal ───────────────────────── */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <p className={`text-xs ${theme.mutedClass}`}>Progresso no ranking do mês</p>
              <p className={`text-xs font-semibold ${theme.titleClass}`}>
                {newMonthlyPoints.toLocaleString('pt-BR')} / 1.500 pts
              </p>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={theme.panelStyle}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: '#F59E0B' }}
                initial={shouldReduce ? {} : { width: 0 }}
                animate={shouldReduce ? {} : { width: `${monthlyBarPct}%` }}
                transition={
                  shouldReduce ? {} : { duration: 1.1, delay: 0.5, ease: 'easeOut' }
                }
              />
            </div>
          </div>

          {/* ── Seção 5: Botão ────────────────────────────────────────────── */}
          <button
            onClick={onViewRanking}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
            style={theme.primaryButtonStyle}
          >
            Ver meu ranking →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
