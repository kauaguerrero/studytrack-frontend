'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePopupTheme } from './popupTheme';

interface Props {
  streakLost: number;
  shieldCount: number;
  onDismiss: () => Promise<void>;
  onUseShield: () => Promise<void>;
  isLoading?: boolean;
}

export function StreakBrokenPopup({
  streakLost,
  shieldCount,
  onDismiss,
  onUseShield,
  isLoading = false,
}: Props) {
  const shouldReduce = useReducedMotion();
  const [loadingAction, setLoadingAction] = useState<'dismiss' | 'shield' | null>(null);
  const theme = usePopupTheme('danger');

  const hasShield = shieldCount > 0;
  const loading = isLoading || loadingAction !== null;

  const handleDashboard = async () => {
    setLoadingAction('dismiss');
    await onDismiss();
  };

  const handleShield = async () => {
    setLoadingAction('shield');
    await onUseShield();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex flex-col items-center justify-center select-none px-6"
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
      aria-label={`Sequência de ${streakLost} dias perdida`}
    >
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-[30px] px-5 py-7 text-center sm:px-7 sm:py-9"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.9, opacity: 0, y: 18 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 240, damping: 24 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, rgba(239,68,68,0.24), transparent)'
              : 'linear-gradient(180deg, rgba(239,68,68,0.14), transparent)',
          }}
        />

        <button
          type="button"
          onClick={handleDashboard}
          disabled={loading}
          className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors disabled:opacity-50 ${theme.closeButtonClass}`}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <motion.div
          className="mb-5 text-6xl sm:mb-6 sm:text-7xl"
          role="img"
          aria-hidden
          animate={shouldReduce ? {} : { rotate: [-4, 4, -3, 3, 0], scale: [1, 1.06, 1] }}
          transition={shouldReduce ? {} : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          🥶
        </motion.div>

        <motion.p
          className="text-6xl font-extrabold leading-none tabular-nums sm:text-8xl"
          style={{ color: theme.isDark ? '#93C5FD' : '#2563EB' }}
          initial={shouldReduce ? {} : { scale: 0.55, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {streakLost}
        </motion.p>

        <motion.p
          className={`mt-3 text-base font-extrabold uppercase tracking-[0.14em] sm:text-lg sm:tracking-[0.18em] ${theme.titleClass}`}
          initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
          transition={shouldReduce ? {} : { delay: 0.2 }}
        >
          {streakLost === 1 ? 'DIA' : 'DIAS'} DE SEQUÊNCIA PERDIDOS
        </motion.p>

        <motion.p
          className={`mt-2 text-sm text-center max-w-xs mx-auto ${theme.bodyClass}`}
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={shouldReduce ? {} : { opacity: 1 }}
          transition={shouldReduce ? {} : { delay: 0.35 }}
        >
          {hasShield
            ? 'Use um escudo agora para preservar sua sequência antes do ajuste de pontos.'
            : 'Sem escudo disponível. O sistema vai encerrar sua sequência e aplicar a penalidade correta.'}
        </motion.p>

        <div className="mt-5 rounded-2xl px-4 py-3 text-left" style={theme.accentPanelStyle}>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
            Decisão imediata
          </p>
          <p className={`mt-1 text-sm ${theme.bodyClass}`}>
            {hasShield
              ? 'Escudo mantém a streak e evita perda de pontos.'
              : 'Sem escudo, a streak zera e só então o ajuste é calculado.'}
          </p>
        </div>

        <motion.div
          className="mt-10 flex w-full max-w-xs mx-auto flex-col gap-3"
          initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
          animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
          transition={shouldReduce ? {} : { delay: 0.45 }}
        >
          <button
            onClick={hasShield ? handleShield : undefined}
            disabled={!hasShield || loading}
            className={`w-full rounded-2xl py-3.5 text-sm font-extrabold transition-opacity ${theme.primaryButtonClass}`}
            style={
              hasShield
                ? { ...theme.primaryButtonStyle, opacity: loading ? 0.6 : 1 }
                : theme.isDark
                  ? { background: '#334155', color: 'rgba(255,255,255,0.55)', opacity: 0.46, cursor: 'not-allowed' }
                  : { background: '#CBD5E1', color: '#475569', opacity: 0.7, cursor: 'not-allowed' }
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
            className={`w-full rounded-2xl py-3 text-sm font-bold border transition-colors disabled:opacity-50 ${theme.secondaryButtonClass}`}
          >
            {loadingAction === 'dismiss' || (isLoading && loadingAction !== 'shield')
              ? 'Aplicando ajuste...'
              : 'Voltar ao dashboard'}
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
