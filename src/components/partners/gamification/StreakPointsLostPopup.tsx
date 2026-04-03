'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      aria-live="polite"
      aria-label="Pontos perdidos por streak quebrada"
    >
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #1a0505, #2d0a0a)',
          border: '1px solid rgba(239,68,68,0.25)',
        }}
        initial={shouldReduce ? {} : { scale: 0.8, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="px-6 pt-8 pb-6 space-y-5">
          {/* Header */}
          <div className="text-center">
            <motion.div
              className="text-6xl mb-3 select-none"
              role="img"
              aria-label="Streak quebrada"
              animate={shouldReduce ? {} : { rotate: [-6, 6, -4, 4, 0] }}
              transition={shouldReduce ? {} : { duration: 0.6, delay: 0.3 }}
            >
              💔
            </motion.div>
            <p className="text-xl font-extrabold uppercase tracking-widest text-white leading-tight">
              PONTOS PERDIDOS
            </p>
            <p className="mt-1 text-sm text-white/50">
              Sua sequência foi quebrada por inatividade
            </p>
          </div>

          {/* Contador vermelho */}
          <div className="text-center">
            <p
              className="text-6xl font-black tabular-nums leading-none"
              style={{ color: '#F87171' }}
            >
              -{displayPoints}
              <span className="text-3xl font-extrabold ml-1 align-baseline text-red-400">
                pts mensais
              </span>
            </p>
          </div>

          {/* Ranking drop info */}
          {rankDropped && (
            <motion.div
              className="rounded-2xl px-4 py-3 text-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              initial={shouldReduce ? {} : { opacity: 0, y: 6 }}
              animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
              transition={shouldReduce ? {} : { delay: 0.8 }}
            >
              <p className="text-sm font-bold text-red-300">
                ⚠️{' '}
                {rivalName ? (
                  <><span className="text-white">{rivalName}</span> te ultrapassou.</>
                ) : (
                  'Você caiu no ranking.'
                )}
              </p>
              {currentRank > 0 && (
                <p className="mt-0.5 text-xs text-white/40">
                  Você está em #{currentRank} agora
                </p>
              )}
            </motion.div>
          )}

          {/* CTA */}
          <motion.button
            onClick={onDismiss}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--brand-primary)' }}
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
