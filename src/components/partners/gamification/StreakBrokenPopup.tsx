'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { X } from 'lucide-react';

interface Props {
  streakLost: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function StreakBrokenPopup({ streakLost, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const handleStudy = () => {
    onDismiss();
    router.push(`/partners/${params.slug}/student/banco-de-questoes`);
  };

  return (
    <motion.div
      className="fixed bottom-4 left-1/2 z-[7000] w-80 -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
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
          background: 'linear-gradient(135deg, #0d0d0d 0%, #1c1c1c 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
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
          <span className="mt-0.5 shrink-0 text-lg" aria-hidden>❄️</span>
          <p className="pr-4 text-sm font-extrabold leading-snug text-white">
            Sequência de {streakLost} {streakLost === 1 ? 'dia' : 'dias'} perdida.
          </p>
        </div>

        <p className="pl-8 text-xs leading-relaxed text-white/45 mb-3">
          Estude hoje para começar uma nova sequência.
        </p>

        <div className="pl-8">
          <button
            onClick={handleStudy}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand-primary)' }}
          >
            Estudar agora
          </button>
        </div>
      </div>
    </motion.div>
  );
}
