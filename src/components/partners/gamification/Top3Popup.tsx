'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Props {
  position: 1 | 2 | 3;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

const MEDAL_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const CONFETTI_PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (360 / 14) * i;
  const rad = (angle * Math.PI) / 180;
  const dist = 100;
  return {
    id: i,
    tx: Math.round(Math.cos(rad) * dist),
    ty: Math.round(Math.sin(rad) * dist),
    delay: i * 0.04,
    color: i % 3 === 0 ? 'var(--brand-primary)' : i % 3 === 1 ? '#f59e0b' : '#ffffff',
  };
});

export function Top3Popup({ position, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex flex-col items-center justify-center select-none"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
      aria-label={`Você entrou no top ${position}!`}
    >
      <button
        onClick={onDismiss}
        className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-white/40 transition-colors hover:text-white hover:bg-white/10"
        aria-label="Fechar"
      >
        ✕
      </button>

      {/* Confetti burst */}
      <div className="relative mb-4 flex items-center justify-center">
        <AnimatePresence>
          {!shouldReduce && CONFETTI_PIECES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute w-3 h-3 rounded-full pointer-events-none"
              style={{ background: p.color }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: p.tx, y: p.ty, scale: 0, opacity: 0 }}
              transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Medal */}
        <motion.div
          className="text-8xl"
          role="img"
          aria-hidden
          initial={shouldReduce ? {} : { scale: 0.4, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {MEDAL_EMOJI[position]}
        </motion.div>
      </div>

      <motion.p
        className="text-4xl font-extrabold uppercase tracking-[0.12em] text-white text-center"
        initial={shouldReduce ? {} : { y: 20, opacity: 0 }}
        animate={shouldReduce ? {} : { y: 0, opacity: 1 }}
        transition={shouldReduce ? {} : { delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        VOCÊ ESTÁ NO TOP {position}!
      </motion.p>

      <p className="mt-4 text-sm text-white/50 text-center px-10">
        Continue assim para garantir a pulseira no fim do mês.
      </p>

      <motion.button
        onClick={onDismiss}
        className="mt-8 px-8 py-3 rounded-xl font-extrabold text-sm text-white transition-opacity hover:opacity-80"
        style={{ background: 'var(--brand-primary)' }}
        initial={shouldReduce ? {} : { opacity: 0 }}
        animate={shouldReduce ? {} : { opacity: 1 }}
        transition={shouldReduce ? {} : { delay: 0.5 }}
      >
        Continuar
      </motion.button>
    </motion.div>
  );
}
