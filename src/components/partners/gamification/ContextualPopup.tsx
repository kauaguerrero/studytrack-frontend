'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { PopupState } from '@/types/gamification';

interface Props {
  popupState: PopupState;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export function ContextualPopup({ popupState, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const isUrgency = popupState.type === 'urgency';

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-[7000] w-72 overflow-hidden rounded-2xl shadow-2xl"
      initial={shouldReduce ? {} : { y: 80, opacity: 0 }}
      animate={shouldReduce ? {} : { y: 0, opacity: 1 }}
      exit={shouldReduce ? {} : { y: 80, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <div
        className="relative p-4"
        style={{
          background: isUrgency
            ? 'linear-gradient(135deg, #3b0d0d 0%, #5c1a1a 100%)'
            : 'linear-gradient(135deg, #0d0d0d 0%, #1c1c1c 100%)',
          border: `1px solid ${isUrgency ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 'inherit',
        }}
      >
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-md p-0.5 text-white/25 transition-colors hover:text-white/60"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-2 flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-lg" aria-hidden>{isUrgency ? '⚠️' : '🔥'}</span>
          <p className="pr-4 text-sm font-extrabold leading-snug text-white">
            {isUrgency
              ? `${popupState.rival_name ?? 'Alguém'} te ultrapassou. Você caiu para #${popupState.position ?? '?'}.`
              : `Você está em #${popupState.position ?? '?'} no ranking.`}
          </p>
        </div>

        <p className="pl-8 text-xs leading-relaxed text-white/45">
          {isUrgency
            ? `Você está ${popupState.points_diff ?? 0} pontos atrás. Estude agora para recuperar.`
            : `Faltam ${popupState.points_to_top3 ?? 0} pontos para o top 3.`}
        </p>

        {isUrgency && (popupState.points_lost ?? 0) > 0 && (
          <p className="mt-2 pl-8 text-xs leading-relaxed" style={{ color: 'rgba(248,113,113,0.75)' }}>
            Você perdeu {popupState.points_lost} {popupState.points_lost === 1 ? 'ponto' : 'pontos'} ontem por inatividade. Volte hoje e recupere!
          </p>
        )}
      </div>
    </motion.div>
  );
}
