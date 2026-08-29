'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCountdown } from '@/hooks/useEssayWindowStatus';

/**
 * Botão bloqueado para substituir o CTA "Nova Redação"/"Enviar primeira
 * redação" quando a janela de envio da org está fechada. Nunca é um <Link> —
 * não deve ser navegável enquanto bloqueado.
 */
export function LockedEssayButton({
  label = 'Nova Redação',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={cn(
        'inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-extrabold',
        'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-white/30',
        className,
      )}
    >
      <Lock className="h-4 w-4" />
      {label}
    </button>
  );
}

/** Legenda de countdown abaixo/ao lado do CTA — abertura ou fechamento da janela. */
export function EssayWindowCaption({
  isOpen,
  secondsRemaining,
  className,
}: {
  isOpen: boolean;
  secondsRemaining: number | null;
  className?: string;
}) {
  if (secondsRemaining === null) return null;
  const countdown = formatCountdown(secondsRemaining);
  const text = isOpen
    ? `Envios fecham em ${countdown}`
    : `Envios abrem em ${countdown}`;
  return (
    <p className={cn('text-[11px] font-medium text-slate-400 dark:text-white/35', className)}>
      {text}
    </p>
  );
}
