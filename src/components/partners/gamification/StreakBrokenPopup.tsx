'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  streakLost: number;
  shieldCount: number;
  onDismiss: () => Promise<void>;
  onUseShield: () => Promise<void>;
}

export function StreakBrokenPopup({ streakLost, shieldCount, onDismiss, onUseShield }: Props) {
  const shouldReduce = useReducedMotion();
  const [loading, setLoading] = useState(false);

  const hasShield = shieldCount > 0;

  const handleDashboard = async () => {
    setLoading(true);
    await onDismiss();
    // Não navega: o componente já está no dashboard. O estado é mantido para a próxima animação.
  };

  const handleShield = async () => {
    setLoading(true);
    await onUseShield();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex flex-col items-center justify-center select-none px-6"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
      aria-label={`Sequência de ${streakLost} dias perdida`}
    >
      {/* Broken flame */}
      <motion.div
        className="mb-6 text-7xl"
        role="img"
        aria-hidden
        animate={shouldReduce ? {} : { rotate: [-4, 4, -3, 3, 0], scale: [1, 1.06, 1] }}
        transition={shouldReduce ? {} : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        🥶
      </motion.div>

      {/* Streak number */}
      <motion.p
        className="text-8xl font-extrabold leading-none tabular-nums"
        style={{ color: '#60A5FA' }}
        initial={shouldReduce ? {} : { scale: 0.55, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {streakLost}
      </motion.p>

      <motion.p
        className="mt-3 text-lg font-extrabold uppercase tracking-[0.18em] text-white"
        initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
        animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { delay: 0.2 }}
      >
        {streakLost === 1 ? 'DIA' : 'DIAS'} DE SEQUÊNCIA PERDIDOS
      </motion.p>

      <motion.p
        className="mt-2 text-sm text-white/40 text-center max-w-xs"
        initial={shouldReduce ? {} : { opacity: 0 }}
        animate={shouldReduce ? {} : { opacity: 1 }}
        transition={shouldReduce ? {} : { delay: 0.35 }}
      >
        {hasShield
          ? 'Use um escudo para recuperar sua sequência agora.'
          : 'Continue estudando para começar uma nova sequência.'}
      </motion.p>

      {/* Buttons */}
      <motion.div
        className="mt-10 flex flex-col gap-3 w-full max-w-xs"
        initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
        animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { delay: 0.45 }}
      >
        {/* Usar escudo */}
        <button
          onClick={hasShield ? handleShield : undefined}
          disabled={!hasShield || loading}
          className="w-full rounded-2xl py-3.5 text-sm font-extrabold text-white transition-opacity"
          style={
            hasShield
              ? { background: 'var(--brand-primary)', opacity: loading ? 0.6 : 1 }
              : { background: '#374151', opacity: 0.4, cursor: 'not-allowed' }
          }
          aria-label={
            hasShield
              ? `Usar escudo — ${shieldCount} disponível`
              : 'Sem escudos disponíveis'
          }
        >
          🛡️ Usar escudo{hasShield ? ` (${shieldCount} disponível)` : ' — nenhum disponível'}
        </button>

        <button
          onClick={handleDashboard}
          disabled={loading}
          className="w-full rounded-2xl py-3 text-sm font-bold text-white/50 border border-white/10 transition-colors hover:text-white/80 hover:border-white/20 disabled:opacity-50"
        >
          {loading ? 'Aguarde...' : 'Voltar ao dashboard'}
        </button>
      </motion.div>
    </motion.div>
  );
}
