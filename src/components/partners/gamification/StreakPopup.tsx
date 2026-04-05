'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePopupTheme } from './popupTheme';

interface Props {
  streak: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3500;

export function StreakPopup({ streak, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('streak');

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex flex-col items-center justify-center px-4 select-none"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
      aria-label={`Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}!`}
    >
      <button
        onClick={onDismiss}
        className={`absolute right-4 top-4 z-10 rounded-full p-2 transition-colors ${theme.closeButtonClass}`}
        aria-label="Fechar"
      >
        ✕
      </button>

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-[30px] px-5 py-7 text-center sm:px-7 sm:py-9"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.9, opacity: 0, y: 18 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 24 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, rgba(249,115,22,0.24), transparent)'
              : 'linear-gradient(180deg, rgba(249,115,22,0.14), transparent)',
          }}
        />

        <motion.div
          className="mb-5 text-6xl sm:mb-6 sm:text-7xl"
          role="img"
          aria-hidden
          animate={shouldReduce ? {} : { scale: [1, 1.18, 1], rotate: [-6, 6, -4, 4, 0] }}
          transition={shouldReduce ? {} : { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          🔥
        </motion.div>

        <motion.p
          className="text-6xl font-extrabold leading-none tabular-nums sm:text-8xl"
          style={{ color: 'var(--brand-primary)' }}
          initial={shouldReduce ? {} : { scale: 0.55, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {streak}
        </motion.p>

        <p className={`mt-4 text-base font-extrabold uppercase tracking-[0.14em] sm:text-lg sm:tracking-[0.18em] ${theme.titleClass}`}>
          SEQUÊNCIA DE {streak} {streak === 1 ? 'DIA' : 'DIAS'}!
        </p>
        <p className={`mt-2 text-sm ${theme.bodyClass}`}>
          Você manteve o ritmo. Continue ativo para não perder embalo nem pontos.
        </p>
      </motion.div>
    </motion.div>
  );
}
