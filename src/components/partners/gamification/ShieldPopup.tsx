'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePopupTheme } from './popupTheme';

interface Props {
  streakPreserved: number;
  slug: string;
  onDismiss: () => void;
}

export function ShieldPopup({ streakPreserved, slug, onDismiss }: Props) {
  const shouldReduce = useReducedMotion();
  const router = useRouter();
  const theme = usePopupTheme('shield');

  const handleDashboard = () => {
    onDismiss();
    router.push(`/partners/${slug}/student/dashboard`);
  };

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
      aria-label={`Sequência de ${streakPreserved} dias protegida!`}
    >
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-[30px] px-5 py-7 text-center sm:px-7 sm:py-9"
        style={{ ...theme.cardStyle, maxHeight: 'min(92dvh, 760px)' }}
        initial={shouldReduce ? {} : { scale: 0.88, opacity: 0, y: 18 }}
        animate={shouldReduce ? {} : { scale: 1, opacity: 1, y: 0 }}
        transition={shouldReduce ? {} : { type: 'spring', stiffness: 240, damping: 22 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{
            background: theme.isDark
              ? 'linear-gradient(180deg, rgba(96,165,250,0.24), transparent)'
              : 'linear-gradient(180deg, rgba(96,165,250,0.14), transparent)',
          }}
        />

        <motion.div
          className="mb-5 text-6xl sm:mb-6 sm:text-7xl"
          role="img"
          aria-hidden
          animate={shouldReduce ? {} : { scale: [1, 1.15, 1], opacity: [1, 0.82, 1] }}
          transition={shouldReduce ? {} : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🛡️
        </motion.div>

        <motion.p
          className={`text-2xl font-extrabold tracking-wide text-center sm:text-3xl ${theme.titleClass}`}
          initial={shouldReduce ? {} : { scale: 0.6, opacity: 0 }}
          animate={shouldReduce ? {} : { scale: 1, opacity: 1 }}
          transition={shouldReduce ? {} : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Sequência protegida!
        </motion.p>

        <motion.p
          className={`mt-4 text-sm text-center ${theme.bodyClass}`}
          initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
          animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
          transition={shouldReduce ? {} : { delay: 0.3 }}
        >
          Seu escudo salvou{' '}
          <span className={`font-extrabold ${theme.titleClass}`}>
            {streakPreserved} {streakPreserved === 1 ? 'dia' : 'dias'}
          </span>
          {' '}de sequência.
        </motion.p>

        <div className="mt-5 rounded-2xl px-4 py-3" style={theme.accentPanelStyle}>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
            Próximo passo
          </p>
          <p className={`mt-1 text-sm ${theme.bodyClass}`}>
            Estude hoje para manter o ritmo e não depender de outra proteção.
          </p>
        </div>

        <motion.button
          onClick={handleDashboard}
          className={`mt-8 w-full rounded-2xl px-8 py-3 font-extrabold text-sm transition-opacity hover:opacity-80 active:scale-[0.98] ${theme.primaryButtonClass}`}
          style={theme.primaryButtonStyle}
          initial={shouldReduce ? {} : { opacity: 0 }}
          animate={shouldReduce ? {} : { opacity: 1 }}
          transition={shouldReduce ? {} : { delay: 0.5 }}
        >
          Voltar ao dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
