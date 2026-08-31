'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { STREAK_STAGES, type StreakStage } from './streakEvolution';

/**
 * Dark mode via DOM em vez do StudentThemeContext — o foguinho também roda no
 * ranking do founder, que aplica `.dark` no <html> e não tem StudentThemeProvider.
 * `.closest('.dark')` cobre os dois: container do aluno e <html> do founder.
 */
function useIsDark(ref: React.RefObject<HTMLElement | null>): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(!!ref.current?.closest('.dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });
    return () => obs.disconnect();
  }, [ref]);
  return isDark;
}

interface Props {
  /** Índice do estágio (0-5) ou o próprio objeto de estágio. */
  stage: number | StreakStage;
  /** Lado do quadrado em px (default 24). */
  size?: number;
  /** Liga flicker/halo/fagulhas. Ignorado quando o usuário pede menos movimento. */
  animated?: boolean;
  className?: string;
}

// Caminhos custom (viewBox 24x30). Chama externa + chama interna distinta, pra
// o flicker parecer orgânico em vez de um simples "escalar".
const OUTER =
  'M12 1c1.6 3.1 1 5.2 3.6 8.8C18.2 13.4 20 15.6 20 19.4A8 8 0 0 1 4 19.4c0-2.6 1-4.2 2.1-5.7.3 1.8 1.4 2.9 2.8 2.9 1.8 0 2.9-1.4 2.9-3.1 0-2.5-1.9-3.8-1.9-6.6 0-2.1.9-4 2-5.9z';
const INNER =
  'M12 9c.9 1.8 2.4 2.7 2.4 5.4A6 6 0 0 1 8.3 20.6c-2.3 0-4-1.7-4-4.1 0-1.5.6-2.7 1.7-3.6.2 1.1.9 1.8 1.9 1.8 1.2 0 2-1 2-2.3 0-1.5-.6-2.1-.6-3.5C11.2 5.4 11.9 4.2 13 3z';

// Fogo arco-íris (último estágio) — do quente embaixo pro frio no topo.
const RAINBOW = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export function StreakFlame({ stage, size = 24, animated = true, className }: Props) {
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const isDark = useIsDark(rootRef);
  const uid = useId().replace(/[:]/g, '');
  const s: StreakStage =
    typeof stage === 'number' ? STREAK_STAGES[Math.max(0, Math.min(STREAK_STAGES.length - 1, stage))] : stage;
  const move = animated && !shouldReduce;
  const rainbow = !!s.rainbow;
  // CSS custom properties não resolvem de forma confiável em <stop stop-color>;
  // o estágio 0 ("Faísca") usa a cor da marca, então cai num laranja concreto
  // aqui dentro do SVG (o glow já usa glowRgb).
  const paint = s.color.startsWith('var(') ? '#F97316' : s.color;

  // No dark o fogo perde presença contra o card escuro — glow mais forte, um
  // empurrão de brilho/saturação e opacidade de base mais alta na chama.
  const glowStrength = (2 + s.id * 2.4) * (isDark ? 1.6 : 1);
  const glowAlpha = Math.min(0.9, 0.35 + s.id * 0.08 + (isDark ? 0.16 : 0));
  const baseOpacity = isDark ? 0.72 : 0.55;
  const topOpacity = isDark ? 0.96 : 0.85;
  const svgFilter = [
    `drop-shadow(0 0 ${glowStrength}px rgba(${s.glowRgb},${glowAlpha}))`,
    isDark ? 'brightness(1.18) saturate(1.14)' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const particles = move
    ? Array.from({ length: s.particles }, (_, i) => ({
        id: i,
        left: 18 + ((i * 27) % 56),
        delay: (i * 0.37) % 1.4,
        dur: 1.3 + (i % 3) * 0.35,
        dist: size * (0.7 + (i % 3) * 0.25),
        dim: Math.max(2, size * 0.06),
        color: rainbow ? RAINBOW[i % RAINBOW.length] : i % 3 === 0 ? '#ffffff' : paint,
      }))
    : [];

  const outerStops = rainbow
    ? RAINBOW.map((c, i) => (
        <stop
          key={c}
          offset={i / (RAINBOW.length - 1)}
          stopColor={c}
          stopOpacity={i === 0 ? baseOpacity : 1}
        />
      ))
    : [
        <stop key="a" offset="0" stopColor={paint} stopOpacity={baseOpacity} />,
        <stop key="b" offset="0.55" stopColor={paint} />,
        <stop key="c" offset="1" stopColor={paint} stopOpacity={topOpacity} />,
      ];

  const innerStops = rainbow
    ? RAINBOW.map((c, i) => (
        <stop
          key={c}
          offset={i / (RAINBOW.length - 1)}
          stopColor={i === RAINBOW.length - 1 && s.whiteCore ? '#ffffff' : mixWhite(c, 0.32)}
        />
      ))
    : [
        <stop key="a" offset="0" stopColor={paint} />,
        <stop key="b" offset="0.7" stopColor={mixWhite(paint, 0.4)} />,
        <stop key="c" offset="1" stopColor={s.whiteCore ? '#ffffff' : mixWhite(paint, 0.65)} />,
      ];

  return (
    <span
      ref={rootRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
      }}
    >
      {move && s.haloPulse && (
        <motion.span
          aria-hidden
          style={{
            position: 'absolute',
            inset: `-${size * 0.35}px`,
            borderRadius: '9999px',
            background: rainbow
              ? `conic-gradient(from 0deg, ${RAINBOW.join(', ')}, ${RAINBOW[0]})`
              : `radial-gradient(circle, rgba(${s.glowRgb},${isDark ? 0.62 : 0.5}), transparent 68%)`,
            opacity: rainbow ? 0.5 : 1,
            filter: rainbow ? 'blur(6px)' : undefined,
          }}
          animate={
            rainbow
              ? { rotate: 360, opacity: [0.32, 0.55, 0.32] }
              : { opacity: [0.2, 0.55, 0.2], scale: [0.9, 1.08, 0.9] }
          }
          transition={
            rainbow
              ? { rotate: { duration: 5, repeat: Infinity, ease: 'linear' }, opacity: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }
              : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      )}

      <motion.span
        style={{ display: 'inline-flex', lineHeight: 0 }}
        animate={rainbow && move ? { filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] } : undefined}
        transition={rainbow && move ? { duration: 6, repeat: Infinity, ease: 'linear' } : undefined}
      >
        <svg
          viewBox="0 0 24 30"
          width={size}
          height={size}
          role="img"
          aria-label={`Sequência: ${s.name}`}
          style={{ filter: svgFilter, overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`sf-out-${uid}`} x1="12" y1="30" x2="12" y2="0" gradientUnits="userSpaceOnUse">
              {outerStops}
            </linearGradient>
            <linearGradient id={`sf-in-${uid}`} x1="12" y1="30" x2="12" y2="4" gradientUnits="userSpaceOnUse">
              {innerStops}
            </linearGradient>
          </defs>

          <motion.path
            d={OUTER}
            fill={`url(#sf-out-${uid})`}
            animate={move ? { scaleY: [1, 1.05, 0.98, 1], scaleX: [1, 0.97, 1.02, 1] } : undefined}
            transition={move ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
            style={{ transformOrigin: '12px 28px' }}
          />
          <motion.path
            d={INNER}
            fill={`url(#sf-in-${uid})`}
            animate={move ? { scaleY: [1, 1.12, 0.94, 1], x: [0, 0.5, -0.5, 0] } : undefined}
            transition={move ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : undefined}
            style={{ transformOrigin: '12px 26px' }}
          />
          {s.whiteCore && (
            <motion.ellipse
              cx="11.4"
              cy="18"
              rx={size >= 40 ? 2.6 : 2.2}
              ry={size >= 40 ? 4 : 3.4}
              fill="#ffffff"
              animate={move ? { opacity: [0.75, 1, 0.75], scaleY: [1, 1.15, 1] } : undefined}
              transition={move ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : undefined}
              style={{ transformOrigin: '11.4px 20px' }}
            />
          )}
        </svg>
      </motion.span>

      {particles.map((p) => (
        <motion.span
          key={p.id}
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '18%',
            left: `${p.left}%`,
            width: p.dim,
            height: p.dim,
            borderRadius: '9999px',
            background: p.color,
          }}
          animate={{ y: [0, -p.dist], opacity: [0, 1, 0], scale: [1, 0.4] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: 'easeOut', delay: p.delay }}
        />
      ))}
    </span>
  );
}

/** Clareia um hex (#rrggbb) em direção ao branco. `amount` 0-1. */
function mixWhite(hex: string, amount: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
