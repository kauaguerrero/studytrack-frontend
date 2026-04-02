'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function ShieldEarnedPopup({ onDismiss }: Props) {
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed top-4 right-4 z-[7500] w-72 overflow-hidden rounded-2xl shadow-2xl"
      initial={shouldReduce ? {} : { y: -60, opacity: 0 }}
      animate={shouldReduce ? {} : { y: 0, opacity: 1 }}
      exit={shouldReduce ? {} : { y: -60, opacity: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <div
        className="relative p-4"
        style={{
          background: 'linear-gradient(135deg, #0c1a2e 0%, #1a2f4a 100%)',
          border: '1px solid rgba(99,179,237,0.25)',
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
          <motion.span
            className="mt-0.5 shrink-0 text-lg"
            aria-hidden
            animate={shouldReduce ? {} : { scale: [1, 1.2, 1] }}
            transition={shouldReduce ? {} : { duration: 0.6, repeat: 2 }}
          >
            🛡️
          </motion.span>
          <p className="pr-4 text-sm font-extrabold leading-snug text-white">
            Escudo conquistado!
          </p>
        </div>

        <p className="pl-8 text-xs leading-relaxed text-white/45">
          Você completou todas as missões da semana. Sua próxima sequência está protegida.
        </p>
      </div>
    </motion.div>
  );
}
