'use client';

import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: easeInOut,
  duration: 0.3,
};

const reducedTransition = {
  type: 'tween' as const,
  duration: 0.01,
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reducedMotion ? false : 'initial'}
        animate={reducedMotion ? false : 'in'}
        exit={reducedMotion ? false : 'out'}
        variants={reducedMotion ? undefined : pageVariants}
        transition={reducedMotion ? reducedTransition : pageTransition}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}