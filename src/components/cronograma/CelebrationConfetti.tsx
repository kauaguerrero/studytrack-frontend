'use client';

// Chuva de confete em tela cheia (framer-motion, sem lib externa).
// Remonte com `key` para disparar de novo.

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', 'var(--brand-primary)'];
const COUNT = 90;
const DURATION_MS = 2600;

interface Piece { id: number; x: number; drift: number; delay: number; size: number; spin: number; color: string; round: boolean }

function pieces(): Piece[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    drift: (Math.random() - 0.5) * 30,
    delay: Math.random() * 0.5,
    size: 6 + Math.random() * 6,
    spin: (Math.random() - 0.5) * 900,
    color: COLORS[i % COLORS.length],
    round: Math.random() < 0.3,
  }));
}

export function CelebrationConfetti() {
  const reduce = useReducedMotion();
  const [items] = useState(pieces);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), DURATION_MS + 600);
    return () => clearTimeout(t);
  }, []);
  if (!visible || reduce) return null;
  return (
    <div aria-hidden data-testid="celebration-confetti" className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {items.map((p) => (
        <motion.span key={p.id} className={`absolute top-0 block ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{ left: `${p.x}%`, width: p.size, height: p.round ? p.size : p.size * 0.45, background: p.color }}
          initial={{ y: '-5vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: `${p.drift}vw`, rotate: p.spin, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: DURATION_MS / 1000, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }} />
      ))}
    </div>
  );
}
