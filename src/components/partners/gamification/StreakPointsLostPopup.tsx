'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePopupTheme } from './popupTheme';

interface Props {
  pointsLost: number;
  rankDropped: boolean;
  rivalName: string | null;
  currentRank: number;
  onDismiss: () => void;
}

export function StreakPointsLostPopup({
  pointsLost,
  rankDropped,
  rivalName,
  currentRank,
  onDismiss,
}: Props) {
  const shouldReduce = useReducedMotion();
  const [displayPoints, setDisplayPoints] = useState(0);
  const theme = usePopupTheme('danger');
  const hasPointsLoss = pointsLost > 0;

  // Counter: 0 → pointsLost em 1.2 s (ease-out cubic)
  useEffect(() => {
    if (shouldReduce) { setDisplayPoints(pointsLost); return; }
    const DURATION = 1200;
    const startedAt = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPoints(Math.round(eased * pointsLost));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointsLost, shouldReduce]);

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
      aria-label={
        hasPointsLoss
          ? 'Pontos perdidos por streak quebrada'
          : 'Streak quebrada sem perda de pontos'
      }
    >
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.8, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, rgba(239,68,68,0.22), transparent)'
              : 'linear-gradient(180deg, rgba(239,68,68,0.12), transparent)',
          }}
        />
        <button
          type="button"
          onClick={onDismiss}
          className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors ${theme.closeButtonClass}`}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="overflow-y-auto px-5 pt-7 pb-5 space-y-5 sm:px-6 sm:pt-8 sm:pb-6">
          {/* Header */}
          <div className="text-center">
            <motion.div
              className="mb-3 select-none text-5xl sm:text-6xl"
              role="img"
              aria-label="Streak quebrada"
              animate={shouldReduce ? {} : { rotate: [-6, 6, -4, 4, 0] }}
              transition={shouldReduce ? {} : { duration: 0.6, delay: 0.3 }}
            >
              💔
            </motion.div>
            <p className={`text-xl font-extrabold uppercase tracking-widest leading-tight ${theme.titleClass}`}>
              {hasPointsLoss ? 'PONTOS PERDIDOS' : 'STREAK QUEBRADA'}
            </p>
            <p className={`mt-1 text-sm ${theme.bodyClass}`}>
              {hasPointsLoss
                ? 'Sua sequência foi quebrada por inatividade'
                : 'Sua sequência foi quebrada, mas não havia pontos para descontar'}
            </p>
          </div>

          {/* Contador vermelho */}
          <div className="text-center">
            <p
              className="text-5xl font-black tabular-nums leading-none sm:text-6xl"
              style={{ color: theme.isDark ? '#F87171' : '#DC2626' }}
            >
              {hasPointsLoss ? (
                <>
                  -{displayPoints}
                  <span className="text-3xl font-extrabold ml-1 align-baseline" style={{ color: theme.isDark ? '#FCA5A5' : '#EF4444' }}>
                    pts mensais
                  </span>
                </>
              ) : (
                <span className="text-3xl font-extrabold sm:text-4xl">
                  0
                  <span className="ml-1 align-baseline text-2xl font-bold sm:text-3xl">
                    pts descontados
                  </span>
                </span>
              )}
            </p>
          </div>

          {!hasPointsLoss && (
            <motion.div
              className="rounded-2xl px-4 py-3 text-center"
              style={theme.accentPanelStyle}
              initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
              transition={shouldReduce ? {} : { delay: 0.55 }}
            >
              <p className={`text-sm ${theme.bodyClass}`}>
                Seus pontos mensais já estavam zerados neste ciclo.
              </p>
            </motion.div>
          )}

          {/* Ranking drop info */}
          {rankDropped && (
            <motion.div
              className="rounded-2xl px-4 py-3 text-center"
              style={theme.accentPanelStyle}
              initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
              transition={shouldReduce ? {} : { delay: 0.8 }}
            >
              <p className="text-sm font-bold" style={{ color: theme.isDark ? '#FCA5A5' : '#DC2626' }}>
                ⚠️{' '}
                {rivalName ? (
                  <><span className={theme.titleClass}>{rivalName}</span> te ultrapassou.</>
                ) : (
                  'Você caiu no ranking.'
                )}
              </p>
              {currentRank > 0 && (
                <p className={`mt-0.5 text-xs ${theme.mutedClass}`}>
                  Você está em #{currentRank} agora
                </p>
              )}
            </motion.div>
          )}

          {/* CTA */}
          <motion.button
            onClick={onDismiss}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
            style={theme.primaryButtonStyle}
            initial={shouldReduce ? {} : { opacity: 0 }}
            animate={shouldReduce ? {} : { opacity: 1 }}
            transition={shouldReduce ? {} : { delay: 0.5 }}
          >
            Entendido — vou estudar hoje
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
