'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { usePopupTheme } from './popupTheme';

interface Props {
  points: number;
  onDismiss: () => void;
  onViewRanking: () => void;
  slug: string;
}

// ── Confetti: mesmas partículas do SimuladoRewardPopup ────────────────────────

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  color: ['#F59E0B', '#ffffff', '#34D399', '#60A5FA', '#F472B6'][i % 5],
  angleDeg: (i / 20) * 360,
  distance: 90 + (i % 4) * 35,
  size: 6 + (i % 3) * 4,
  durationS: 0.75 + (i % 4) * 0.12,
  isCircle: i % 3 === 0,
}));

const confettiKeyframes = PARTICLES.map((p) => {
  const rad = (p.angleDeg * Math.PI) / 180;
  const tx = Math.round(Math.cos(rad) * p.distance);
  const ty = Math.round(Math.sin(rad) * p.distance);
  return `@keyframes qsr-confetti-${p.id} {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    75%  { opacity: 0.9; }
    100% { transform: translate(${tx}px,${ty}px) scale(0); opacity: 0; }
  }`;
}).join('\n');

// ── Component ─────────────────────────────────────────────────────────────────

export function QuestionSessionRewardPopup({ points, onDismiss, onViewRanking, slug }: Props) {
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  const [displayPoints, setDisplayPoints] = useState(0);
  const theme = usePopupTheme('celebration');

  // Counter: 0 → points em 1.5 s (ease-out cubic)
  useEffect(() => {
    if (shouldReduce) return;
    const DURATION = 1500;
    const startedAt = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPoints(Math.round(eased * points));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points, shouldReduce]);

  const renderedPoints = shouldReduce ? points : displayPoints;

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center px-4"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      aria-live="polite"
      aria-label="Pontos ganhos na sessão de questões"
    >
      {!shouldReduce && <style>{confettiKeyframes}</style>}

      {/* Confetti */}
      {!shouldReduce && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.isCircle ? '50%' : '2px',
                backgroundColor: p.color,
                animation: `qsr-confetti-${p.id} ${p.durationS}s ease-out both`,
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.8, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 22 }}
      >
        {/* Botão X */}
        <button
          onClick={onDismiss}
          className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors ${theme.closeButtonClass}`}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 22%, transparent), transparent)'
              : 'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 14%, white), transparent)',
          }}
        />

        <div className="overflow-y-auto px-5 pt-7 pb-5 space-y-5 sm:px-6 sm:pt-8 sm:pb-6">
          {/* Header */}
          <div className="text-center">
            <motion.div
              className="mb-3 select-none text-5xl sm:text-6xl"
              role="img"
              aria-label="Livros"
              animate={shouldReduce ? {} : { scale: [1, 1.18, 1] }}
              transition={shouldReduce ? {} : { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              📚
            </motion.div>
            <p className={`text-xl font-extrabold uppercase tracking-widest leading-tight ${theme.titleClass}`}>
              SESSÃO ENCERRADA!
            </p>
            <p className={`mt-1 text-sm ${theme.bodyClass}`}>
              Você ganhou pontos respondendo questões
            </p>
          </div>

          {/* Contador */}
          <div className="text-center">
            <p
              className="text-5xl font-black tabular-nums leading-none sm:text-6xl"
              style={{ color: '#F59E0B' }}
            >
              +{renderedPoints}
              <span className="text-3xl font-extrabold ml-1 align-baseline">
                pts mensais
              </span>
            </p>
          </div>

          <div className="rounded-2xl px-4 py-3" style={theme.accentPanelStyle}>
            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
              Impacto imediato
            </p>
            <p className={`mt-1 text-sm ${theme.bodyClass}`}>
              Cada acerto da sessão já foi somado ao seu ranking mensal.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              onViewRanking();
              router.push(`/partners/${slug}/student/ranking`);
            }}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
            style={theme.primaryButtonStyle}
          >
            Ver ranking →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
