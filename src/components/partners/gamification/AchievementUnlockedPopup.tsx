'use client';

import { createElement, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePopupTheme } from './popupTheme';
import { getAchievementIcon, formatChancePct } from '@/lib/achievement-icons';

interface Props {
  title: string;
  description: string;
  icon: string;
  difficulty: string;
  difficultyLabel: string;
  chancePct: number;
  slug: string;
  onDismiss: () => void;
}

/**
 * Brilho e confete escalam com a raridade — comum é um brilho discreto,
 * ultra raro pulsa e explode confete em dobro. A cor só existe aqui e na
 * aba de Conquistas (desbloqueada); em qualquer outro lugar do app uma
 * conquista travada é sempre neutra — a cor é a recompensa, não um spoiler.
 */
const RARITY_GLOW: Record<string, { color: string; rgb: string; particles: number; pulse: boolean }> = {
  common: { color: '#10b981', rgb: '16,185,129', particles: 12, pulse: false },
  uncommon: { color: '#3b82f6', rgb: '59,130,246', particles: 16, pulse: false },
  rare: { color: '#8b5cf6', rgb: '139,92,246', particles: 18, pulse: false },
  epic: { color: '#d946ef', rgb: '217,70,239', particles: 22, pulse: true },
  legendary: { color: '#f59e0b', rgb: '245,158,11', particles: 26, pulse: true },
  ultra_rare: { color: '#f43f5e', rgb: '244,63,94', particles: 32, pulse: true },
};

function buildParticles(count: number, color: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: i % 3 === 0 ? '#ffffff' : color,
    angleDeg: (i / count) * 360,
    distance: 90 + (i % 4) * 35,
    size: 6 + (i % 3) * 4,
    durationS: 0.75 + (i % 4) * 0.12,
    isCircle: i % 3 === 0,
  }));
}

export function AchievementUnlockedPopup({
  title,
  description,
  icon,
  difficulty,
  difficultyLabel,
  chancePct,
  slug,
  onDismiss,
}: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('celebration');
  const router = useRouter();
  const Icon = useMemo(() => getAchievementIcon(icon), [icon]);
  const rarity = RARITY_GLOW[difficulty] ?? RARITY_GLOW.common;
  const particles = buildParticles(rarity.particles, rarity.color);
  const chanceLabel = formatChancePct(chancePct);

  const confettiKeyframes = particles
    .map((p) => {
      const rad = (p.angleDeg * Math.PI) / 180;
      const tx = Math.round(Math.cos(rad) * p.distance);
      const ty = Math.round(Math.sin(rad) * p.distance);
      return `@keyframes au-confetti-${p.id} {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        75%  { opacity: 0.9; }
        100% { transform: translate(${tx}px,${ty}px) scale(0); opacity: 0; }
      }`;
    })
    .join('\n');

  const handleViewAchievements = () => {
    onDismiss();
    router.push(`/partners/${slug}/student/perfil?tab=achievements`);
  };

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center px-4"
      style={{
        ...theme.overlayStyle,
        background: theme.isDark
          ? `radial-gradient(circle at top, rgba(${rarity.rgb},0.28), transparent 34%), rgba(2, 6, 23, 0.86)`
          : `radial-gradient(circle at top, rgba(${rarity.rgb},0.18), transparent 32%), rgba(248, 250, 252, 0.84)`,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
      aria-live="polite"
      aria-label={`Conquista desbloqueada: ${title}`}
    >
      {!shouldReduce && <style>{confettiKeyframes}</style>}

      {!shouldReduce && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.isCircle ? '50%' : '2px',
                backgroundColor: p.color,
                animation: `au-confetti-${p.id} ${p.durationS}s ease-out both`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{
          ...theme.cardStyle,
          maxHeight: 'min(92dvh, 760px)',
          boxShadow: `${theme.cardStyle.boxShadow}, 0 0 60px -8px rgba(${rarity.rgb},0.5)`,
        }}
        initial={shouldReduce ? {} : { scale: 0.8, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 260, damping: 22 }}
      >
        <button
          onClick={onDismiss}
          className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors ${theme.closeButtonClass}`}
          aria-label="Fechar"
        >
          ✕
        </button>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: `linear-gradient(180deg, rgba(${rarity.rgb},${theme.isDark ? 0.26 : 0.16}), transparent)` }}
        />

        <div className="overflow-y-auto px-5 pt-7 pb-5 space-y-5 sm:px-6 sm:pt-8 sm:pb-6">
          <div className="text-center">
            <motion.div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[22px]"
              style={{
                background: `rgba(${rarity.rgb},0.16)`,
                boxShadow: `0 0 0 1px rgba(${rarity.rgb},0.3) inset`,
              }}
              animate={
                shouldReduce
                  ? {}
                  : rarity.pulse
                    ? { scale: [1, 1.1, 1], boxShadow: [
                        `0 0 0 1px rgba(${rarity.rgb},0.3) inset, 0 0 0px rgba(${rarity.rgb},0)`,
                        `0 0 0 1px rgba(${rarity.rgb},0.3) inset, 0 0 28px rgba(${rarity.rgb},0.55)`,
                        `0 0 0 1px rgba(${rarity.rgb},0.3) inset, 0 0 0px rgba(${rarity.rgb},0)`,
                      ] }
                    : { y: [0, -4, 0] }
              }
              transition={{ duration: rarity.pulse ? 1.6 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {createElement(Icon, { className: 'h-8 w-8', style: { color: rarity.color } })}
            </motion.div>

            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
              Conquista desbloqueada
            </p>
            <p className={`mt-1 text-xl font-extrabold leading-tight ${theme.titleClass}`}>
              {title}
            </p>
            <p className={`mt-1.5 text-sm ${theme.bodyClass}`}>{description}</p>
          </div>

          <div
            className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center"
            style={{ background: `rgba(${rarity.rgb},0.1)`, border: `1px solid rgba(${rarity.rgb},0.24)` }}
          >
            <span className="text-sm font-black" style={{ color: rarity.color }}>
              {difficultyLabel}
            </span>
            {chanceLabel && (
              <>
                <span className={`text-xs ${theme.mutedClass}`}>·</span>
                <span className={`text-xs font-semibold ${theme.bodyClass}`}>
                  {chanceLabel} dos alunos conseguem isso
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleViewAchievements}
              className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98] ${theme.primaryButtonClass}`}
              style={theme.primaryButtonStyle}
            >
              Ver minhas conquistas →
            </button>
            <button
              onClick={onDismiss}
              className={`w-full rounded-2xl border py-3 text-sm font-bold transition-colors ${theme.secondaryButtonClass}`}
            >
              Continuar estudando
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
