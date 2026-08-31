'use client';

import { useEffect, useMemo, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePopupTheme } from './popupTheme';
import { StreakFlame } from './StreakFlame';
import { STREAK_STAGES, RAINBOW_GRADIENT } from './streakEvolution';
import { Streak67EasterEgg } from './Streak67EasterEgg';

/** Dia em que a sequência vira o easter egg do "6 7" no lugar do popup normal. */
const EASTER_EGG_STREAK = 67;

interface Props {
  streak: number;
  stage: number;
  stageName: string;
  isNewStage: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3500;
const AUTO_DISMISS_NEW_STAGE_MS = 5500;

function buildConfetti(count: number, color: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: i % 3 === 0 ? '#ffffff' : color,
    angleDeg: (i / count) * 360,
    distance: 80 + (i % 4) * 34,
    size: 6 + (i % 3) * 4,
    durationS: 0.8 + (i % 4) * 0.12,
    isCircle: i % 2 === 0,
  }));
}

export function StreakPopup(props: Props) {
  if (props.streak === EASTER_EGG_STREAK) {
    return <Streak67EasterEgg onDismiss={props.onDismiss} />;
  }
  return <StreakPopupInner {...props} />;
}

function StreakPopupInner({ streak, stage, stageName, isNewStage, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const stageMeta = STREAK_STAGES[Math.max(0, Math.min(STREAK_STAGES.length - 1, stage))];
  const accentRgb = stageMeta.glowRgb;
  const numberStyle: CSSProperties = stageMeta.rainbow
    ? {
        backgroundImage: RAINBOW_GRADIENT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }
    : { color: stage === 0 ? 'var(--brand-primary)' : stageMeta.color };

  // No momento de evolução, tinge o overlay/faixa com a cor do estágio novo.
  const theme = usePopupTheme(
    'streak',
    isNewStage
      ? { dark: `rgba(${accentRgb},0.26)`, light: `rgba(${accentRgb},0.16)` }
      : undefined,
  );

  const confetti = useMemo(
    () => (isNewStage && !shouldReduce ? buildConfetti(18, stageMeta.color) : []),
    [isNewStage, shouldReduce, stageMeta.color],
  );

  const confettiKeyframes = confetti
    .map((p) => {
      const rad = (p.angleDeg * Math.PI) / 180;
      const tx = Math.round(Math.cos(rad) * p.distance);
      const ty = Math.round(Math.sin(rad) * p.distance);
      return `@keyframes sp-confetti-${p.id} {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        80%  { opacity: 0.9; }
        100% { transform: translate(${tx}px,${ty}px) scale(0); opacity: 0; }
      }`;
    })
    .join('\n');

  useEffect(() => {
    const t = setTimeout(onDismiss, isNewStage ? AUTO_DISMISS_NEW_STAGE_MS : AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss, isNewStage]);

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
      aria-label={
        isNewStage
          ? `Seu fogo evoluiu para ${stageName}! Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}.`
          : `Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}!`
      }
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
                animation: `sp-confetti-${p.id} ${p.durationS}s ease-out both`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-[30px] px-5 py-7 text-center sm:px-7 sm:py-9"
        style={{
          ...theme.cardStyle,
          maxHeight: 'min(92dvh, 760px)',
          ...(isNewStage
            ? { boxShadow: `${theme.cardStyle.boxShadow}, 0 0 56px -8px rgba(${accentRgb},0.5)` }
            : null),
        }}
        initial={shouldReduce ? {} : { scale: 0.9, opacity: 0, y: 18 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 24 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: `linear-gradient(180deg, rgba(${accentRgb},${theme.isDark ? 0.24 : 0.14}), transparent)`,
          }}
        />

        {isNewStage && (
          <span
            className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
            style={{ background: `rgba(${accentRgb},0.16)`, color: stageMeta.color }}
          >
            Novo estágio
          </span>
        )}

        <motion.div
          className="mb-4 mt-4 flex justify-center sm:mb-6"
          initial={shouldReduce ? {} : { scale: 0.55, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <StreakFlame stage={stage} size={96} animated={!shouldReduce} />
        </motion.div>

        <motion.p
          className="text-6xl font-extrabold leading-none tabular-nums sm:text-8xl"
          style={numberStyle}
          initial={shouldReduce ? {} : { scale: 0.55, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {streak}
        </motion.p>

        {isNewStage ? (
          <>
            <p className={`mt-4 text-base font-extrabold uppercase tracking-[0.14em] sm:text-lg sm:tracking-[0.18em] ${theme.titleClass}`}>
              Seu fogo evoluiu!
            </p>
            <p className="mt-1 text-sm font-black" style={{ color: stageMeta.color }}>
              {stageName} · {streak} {streak === 1 ? 'dia' : 'dias'}
            </p>
            <p className={`mt-2 text-sm ${theme.bodyClass}`}>
              Sua constância mudou a chama de cor. Continue ativo para ela nunca apagar.
            </p>
          </>
        ) : (
          <>
            <p className={`mt-4 text-base font-extrabold uppercase tracking-[0.14em] sm:text-lg sm:tracking-[0.18em] ${theme.titleClass}`}>
              SEQUÊNCIA DE {streak} {streak === 1 ? 'DIA' : 'DIAS'}!
            </p>
            <p className={`mt-2 text-sm ${theme.bodyClass}`}>
              Você manteve o ritmo. Continue ativo para não perder embalo nem pontos.
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
