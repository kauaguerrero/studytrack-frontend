'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  streakPreserved: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;

export function ShieldPopup({ streakPreserved, onDismiss }: Props) {
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
      aria-label={`Sequência de ${streakPreserved} dias protegida!`}
    >
      {/* Shield emoji */}
      <motion.div
        className="mb-6 text-7xl"
        role="img"
        aria-hidden
        animate={
          shouldReduce
            ? {}
            : { scale: [1, 1.15, 1], opacity: [1, 0.85, 1] }
        }
        transition={
          shouldReduce
            ? {}
            : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        🛡️
      </motion.div>

      {/* Title */}
      <motion.p
        className="text-3xl font-extrabold uppercase tracking-[0.14em] text-white"
        initial={shouldReduce ? {} : { scale: 0.6, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        SEQUÊNCIA PROTEGIDA!
      </motion.p>

      <p className="mt-4 text-sm text-white/60 text-center px-8">
        Seu escudo salvou sua sequência de{' '}
        <span className="font-extrabold text-white">
          {streakPreserved} {streakPreserved === 1 ? 'dia' : 'dias'}
        </span>
        .
      </p>
    </motion.div>
  );
}
