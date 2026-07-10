'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Sparkles, Trophy, X } from 'lucide-react';
import { usePopupTheme } from './popupTheme';

interface Props {
  pointsAwarded: number;
  newMonthlyPoints: number;
  rankPosition: number | null;
  pointsToTop3: number | null;
  onDismiss: () => void;
  onContinue: () => void;
}

const MONTHLY_GOAL = 1000;

export function EssayRewardPopup({
  pointsAwarded,
  newMonthlyPoints,
  rankPosition,
  pointsToTop3,
  onDismiss,
  onContinue,
}: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('celebration');
  const monthlyBarPct = Math.min((newMonthlyPoints / MONTHLY_GOAL) * 100, 100);

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex items-center justify-center px-4 py-4 sm:py-6"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      initial={shouldReduce ? {} : { opacity: 0 }}
      animate={shouldReduce ? {} : { opacity: 1 }}
      exit={shouldReduce ? {} : { opacity: 0 }}
      transition={{ duration: 0.22 }}
      aria-live="polite"
      aria-label="Pontos ganhos por enviar redação"
    >
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.92, opacity: 0, y: 16 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1, y: 0 }}
        exit={shouldReduce ? {} : { scale: 0.96, opacity: 0, y: 16 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 24 }}
      >
        <button
          onClick={onDismiss}
          className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors ${theme.closeButtonClass}`}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 26%, transparent), transparent)'
              : 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 16%, white), transparent)',
          }}
        />

        <div className="overflow-y-auto px-5 pt-7 pb-5 space-y-5 sm:px-6 sm:pt-8 sm:pb-6">
          <div className="text-center">
            <motion.div
              className="mb-3 flex justify-center"
              animate={shouldReduce ? {} : { y: [0, -4, 0] }}
              transition={shouldReduce ? {} : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[22px]"
                style={{
                  background: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)',
                  boxShadow: theme.isDark
                    ? '0 20px 60px rgba(15,23,42,0.34)'
                    : '0 20px 60px rgba(148,163,184,0.24)',
                }}
              >
                <FileText className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
              </div>
            </motion.div>

            <p className={`text-xl font-extrabold uppercase tracking-widest leading-tight ${theme.titleClass}`}>
              REDAÇÃO ENVIADA!
            </p>
            <p className={`mt-1 text-sm ${theme.bodyClass}`}>
              Seu envio já contou no ranking mensal.
            </p>
          </div>

          <div className="text-center">
            <p
              className="text-5xl font-black tabular-nums leading-none sm:text-6xl"
              style={{ color: '#F59E0B' }}
            >
              +{pointsAwarded}
              <span className="ml-1 text-3xl font-extrabold align-baseline">
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

          <div className="rounded-2xl px-4 py-3" style={theme.accentPanelStyle}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
                  Recompensa imediata
                </p>
                <p className={`mt-1 text-sm ${theme.bodyClass}`}>
                  Redação enviada é ação de alto esforço. Por isso ela vale mais do que microações do dia a dia.
                </p>
              </div>
            </div>
          </div>

          {rankPosition !== null && (
            <div className="rounded-2xl px-4 py-4 space-y-1.5" style={theme.elevatedPanelStyle}>
              <div className="flex items-start gap-3">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className={`text-sm font-semibold ${theme.titleClass}`}>
                    Você está em <span className="font-black">#{rankPosition}</span> no ranking
                  </p>
                  <p className={`mt-1 text-xs ${theme.bodyClass}`}>
                    {pointsToTop3 !== null && pointsToTop3 > 0 && (rankPosition === null || rankPosition > 3)
                      ? `Faltam ${pointsToTop3.toLocaleString('pt-BR')} pts para alcançar o top 3.`
                      : 'Você já está na zona mais disputada do ranking. Continue sustentando essa posição.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className={`text-xs ${theme.mutedClass}`}>Progresso para os 1.000 pts</p>
              <p className={`text-xs font-semibold ${theme.titleClass}`}>
                {newMonthlyPoints.toLocaleString('pt-BR')} / 1.000 pts
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={theme.panelStyle}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: '#F59E0B' }}
                initial={shouldReduce ? {} : { width: 0 }}
                animate={shouldReduce ? { width: `${monthlyBarPct}%` } : { width: `${monthlyBarPct}%` }}
                transition={shouldReduce ? {} : { duration: 0.9, delay: 0.2, ease: 'easeOut' }}
              />
            </div>
          </div>

          <button
            onClick={onContinue}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
            style={theme.primaryButtonStyle}
          >
            Ver minhas redações
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
