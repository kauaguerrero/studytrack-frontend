'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  streak: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3500;

export function StreakPopup({ streak, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[8000] flex flex-col items-center justify-center select-none"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
      aria-label={`Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}!`}
    >
      {/* Fire emoji */}
      <motion.div
        className="mb-6 text-7xl"
        role="img"
        aria-hidden
        animate={shouldReduce ? {} : { scale: [1, 1.18, 1], rotate: [-6, 6, -4, 4, 0] }}
        transition={shouldReduce ? {} : { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      >
        🔥
      </motion.div>

      {/* Streak number */}
      <motion.p
        className="text-8xl font-extrabold leading-none tabular-nums"
        style={{ color: 'var(--brand-primary)' }}
        initial={shouldReduce ? {} : { scale: 0.55, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {streak}
      </motion.p>

      <p className="mt-4 text-lg font-extrabold uppercase tracking-[0.18em] text-white">
        SEQUÊNCIA DE {streak} {streak === 1 ? 'DIA' : 'DIAS'}!
      </p>
      <p className="mt-2 text-sm text-white/40">
        Mantenha acesa para não perder pontos
      </p>
    </motion.div>
  );
}
