'use client';

import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePopupTheme } from './popupTheme';

interface Props {
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 6500;
// Segredo: substitui o StreakPopup normal quando a sequência bate exatamente 67
// dias. O "6 7" é a piada — duas mãos segurando os números e fazendo o balanço
// alternado do meme. Mesma pegada visual do StreakPopup turbinado (card com
// spring, confete, glow).
const EGG_COLOR = '#c084fc';
const EGG_RGB = '192,132,252';

function buildConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? EGG_COLOR : '#fcd34d',
    angleDeg: (i / count) * 360,
    distance: 84 + (i % 4) * 34,
    size: 6 + (i % 3) * 4,
    durationS: 0.85 + (i % 4) * 0.12,
    isCircle: i % 2 === 0,
  }));
}

/** Uma "mão" segurando um dígito, com o balanço vertical do meme do 6-7. */
function DigitHand({
  digit,
  mirrored,
  phase,
  animate,
}: {
  digit: string;
  mirrored?: boolean;
  phase: 'up' | 'down';
  animate: boolean;
}) {
  const start = phase === 'up' ? -12 : 12;
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.span
        className="text-6xl font-black leading-none tabular-nums sm:text-7xl"
        style={{ color: EGG_COLOR, textShadow: `0 0 24px rgba(${EGG_RGB},0.55)` }}
        animate={animate ? { y: [start, -start, start], rotate: [start / 3, -start / 3, start / 3] } : undefined}
        transition={animate ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        {digit}
      </motion.span>
      <motion.span
        className="text-5xl sm:text-6xl"
        role="img"
        aria-hidden
        style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
        animate={animate ? { y: [start, -start, start] } : undefined}
        transition={animate ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        ✋
      </motion.span>
    </div>
  );
}

export function Streak67EasterEgg({ onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('celebration', {
    dark: `rgba(${EGG_RGB},0.26)`,
    light: `rgba(${EGG_RGB},0.16)`,
  });
  const animate = !shouldReduce;

  const confetti = useMemo(() => (animate ? buildConfetti(22) : []), [animate]);
  const confettiKeyframes = confetti
    .map((p) => {
      const rad = (p.angleDeg * Math.PI) / 180;
      const tx = Math.round(Math.cos(rad) * p.distance);
      const ty = Math.round(Math.sin(rad) * p.distance);
      return `@keyframes streak67-confetti-${p.id} {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        80%  { opacity: 0.9; }
        100% { transform: translate(${tx}px,${ty}px) scale(0); opacity: 0; }
      }`;
    })
    .join('\n');

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
      aria-label="Easter egg secreto: 67 dias de sequência"
    >
      <button
        onClick={onDismiss}
        className={`absolute right-4 top-4 z-10 rounded-full p-2 transition-colors ${theme.closeButtonClass}`}
        aria-label="Fechar"
      >
        ✕
      </button>

      {confetti.length > 0 && <style>{confettiKeyframes}</style>}
      {confetti.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
          {confetti.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.isCircle ? '50%' : '2px',
                backgroundColor: p.color,
                animation: `streak67-confetti-${p.id} ${p.durationS}s ease-out both`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-[30px] px-5 py-8 text-center sm:px-7 sm:py-10"
        style={{
          ...theme.cardStyle,
          maxHeight: 'min(92dvh, 760px)',
          boxShadow: `${theme.cardStyle.boxShadow}, 0 0 60px -8px rgba(${EGG_RGB},0.55)`,
        }}
        initial={shouldReduce ? {} : { scale: 0.85, opacity: 0, y: 20 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 240, damping: 22 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: `linear-gradient(180deg, rgba(${EGG_RGB},${theme.isDark ? 0.26 : 0.16}), transparent)` }}
        />

        <span
          className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
          style={{ background: `rgba(${EGG_RGB},0.16)`, color: EGG_COLOR }}
        >
          Sequência secreta
        </span>

        <motion.div
          className="mb-5 mt-6 flex items-end justify-center gap-5 sm:gap-7"
          initial={shouldReduce ? {} : { scale: 0.6, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <DigitHand digit="6" phase="up" animate={animate} />
          <DigitHand digit="7" phase="down" mirrored animate={animate} />
        </motion.div>

        <p className={`text-base font-extrabold uppercase tracking-[0.14em] sm:text-lg sm:tracking-[0.18em] ${theme.titleClass}`}>
          6&nbsp;7
        </p>
        <p className={`mt-2 text-sm ${theme.bodyClass}`}>
          <strong>67 dias</strong> de sequência e você encontrou um easter egg.
          Quase ninguém vê essa tela. 🤫
        </p>

        <button
          onClick={onDismiss}
          className={`mt-6 w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
          style={theme.primaryButtonStyle}
        >
          Voltar a estudar
        </button>
      </motion.div>
    </motion.div>
  );
}
