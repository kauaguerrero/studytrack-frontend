'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  streakPreserved: number;
  slug: string;
  onDismiss: () => void;
}

export function ShieldPopup({ streakPreserved, slug, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const router = useRouter();

  const handleDashboard = () => {
    onDismiss();
    router.push(`/partners/${slug}/student/dashboard`);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9500] flex flex-col items-center justify-center select-none"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-live="polite"
      aria-label={`Sequência de ${streakPreserved} dias protegida!`}
    >
      {/* Shield emoji */}
      <motion.div
        className="mb-6 text-7xl"
        role="img"
        aria-hidden
        animate={
          shouldReduce
            ? {}
            : { scale: [1, 1.15, 1], opacity: [1, 0.85, 1] }
        }
        transition={
          shouldReduce
            ? {}
            : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        🛡️
      </motion.div>

      {/* Title */}
      <motion.p
        className="text-3xl font-extrabold tracking-wide text-white text-center px-8"
        initial={shouldReduce ? {} : { scale: 0.6, opacity: 0 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
        transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        Sequência protegida!
      </motion.p>

      <motion.p
        className="mt-4 text-sm text-white/60 text-center px-10"
        initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
        animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { delay: 0.3 }}
      >
        Seu escudo salvou{' '}
        <span className="font-extrabold text-white">
          {streakPreserved} {streakPreserved === 1 ? 'dia' : 'dias'}
        </span>
        {' '}de sequência.{' '}
        Fique ativo diariamente para não perder novamente.
      </motion.p>

      <motion.button
        onClick={handleDashboard}
        className="mt-8 px-8 py-3 rounded-xl font-extrabold text-sm text-white transition-opacity hover:opacity-80 active:scale-[0.98]"
        style={{ background: 'var(--brand-primary)' }}
        initial={shouldReduce ? {} : { opacity: 0 }}
        animate={shouldReduce ? {} : { opacity: 1 }}
        transition={shouldReduce ? {} : { delay: 0.5 }}
      >
        Voltar ao dashboard
      </motion.button>
    </motion.div>
  );
}
