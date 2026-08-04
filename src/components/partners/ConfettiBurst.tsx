'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  /** Incrementa esse número pra disparar uma nova rajada. IMPORTANTE: o
   * chamador deve passar `key={fire}` — é a troca de key que remonta o
   * componente e reseta as partículas, sem precisar de ref/efeito síncrono. */
  fire: number;
}

const COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
const PARTICLE_COUNT = 28;

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  rotation: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6,
    distance: 90 + Math.random() * 110,
    color: COLORS[i % COLORS.length],
    size: 5 + Math.random() * 5,
    rotation: Math.random() * 360,
  }));
}

/** Rajada de confete pura CSS/framer-motion — sem lib externa (canvas-confetti). */
export function ConfettiBurst({ fire }: Props) {
  const [particles, setParticles] = useState<Particle[]>(() => (fire > 0 ? makeParticles() : []));

  useEffect(() => {
    if (particles.length === 0) return;
    const t = setTimeout(() => setParticles([]), 900);
    return () => clearTimeout(t);
    // Roda uma vez por montagem — o pai troca `key={fire}` a cada rajada nova,
    // então este efeito não precisa (e não deve) reagir a `fire` de novo aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[100] overflow-visible">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute left-1/2 top-1/2 rounded-sm"
            style={{ width: p.size, height: p.size, backgroundColor: p.color }}
            initial={{ x: '-50%', y: '-50%', opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              x: `calc(-50% + ${Math.cos(p.angle) * p.distance}px)`,
              y: `calc(-50% + ${Math.sin(p.angle) * p.distance}px)`,
              opacity: 0,
              rotate: p.rotation,
              scale: 0.6,
            }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
