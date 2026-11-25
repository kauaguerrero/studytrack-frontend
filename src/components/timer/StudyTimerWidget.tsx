'use client';

// Timer aberto flutuando no canto (área do aluno). Some quando não há timer
// aberto, na tela do próprio timer e no simulado (que tem cronômetro próprio).

import Link from 'next/link';
import { toast } from 'sonner';
import { Pause, Play, Square, Timer as TimerIcon } from 'lucide-react';
import { formatClock, useStudyTimer } from '@/lib/timer';

export function StudyTimerWidget({ slug }: { slug: string }) {
  const { timer, seconds, pause, resume, stop } = useStudyTimer(slug);
  if (!timer) return null;
  const running = timer.status === 'running';

  const run = async (fn: () => Promise<{ logged_minutes?: number }>, done?: string) => {
    try {
      const r = await fn();
      if (done) toast.success(r.logged_minutes ? `${done}: ${r.logged_minutes} min no diário.` : 'Timer encerrado (menos de 1 min, fora do diário).');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro no timer.'); }
  };

  return (
    <div role="status" aria-label="Timer de estudo"
      className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 shadow-lg md:bottom-6 dark:border-white/10 dark:bg-slate-900">
      <Link href={`/partners/${slug}/student/timer`} className="flex items-center gap-2">
        <TimerIcon className={`h-4 w-4 ${running ? 'text-emerald-500' : 'text-slate-400'}`} />
        <span className="max-w-[110px] truncate text-xs font-semibold text-slate-600 dark:text-white/70">{timer.subject}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white" data-testid="widget-clock">{formatClock(seconds)}</span>
      </Link>
      <button type="button" aria-label={running ? 'Pausar timer' : 'Retomar timer'} onClick={() => void run(running ? pause : resume)}
        className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button type="button" aria-label="Encerrar timer" onClick={() => void run(() => stop(), 'Estudo registrado')}
        className="rounded-full p-1.5 text-white" style={{ background: 'var(--brand-primary)' }}>
        <Square className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
