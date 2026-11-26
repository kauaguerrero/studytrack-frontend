'use client';

// Timer em um toque, no topo do Início. Sem timer: abre a lista de matérias e
// um toque começa. Com timer: mostra o relógio e pausa/retoma/encerra ali mesmo.
// A página /student/timer fica só como histórico ("Ver meu tempo").

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Pause, Play, Square, Timer as TimerIcon } from 'lucide-react';
import { formatClock, useStudyTimer } from '@/lib/timer';
import { TIMER_SUBJECTS } from '@/components/timer/StudyTimerPage';
import { themePortalContainer } from '@/lib/theme-portal';

export function QuickTimerButton({ slug }: { slug: string }) {
  const t = useStudyTimer(slug);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // O hero corta o que vaza (overflow-hidden): a caixa vai num portal, presa ao botão.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // fecha ao clicar fora / Esc
  useEffect(() => {
    if (!open) return;
    const r = boxRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, left: Math.min(Math.max(12, r.left + r.width / 2 - 140), window.innerWidth - 292) });
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!boxRef.current?.contains(n) && !popRef.current?.contains(n)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close);
    };
  }, [open]);

  const run = async (fn: () => Promise<{ logged_minutes?: number } | unknown>, done?: string) => {
    setBusy(true);
    try {
      const r = (await fn()) as { logged_minutes?: number } | undefined;
      if (done) toast.success(r?.logged_minutes ? `${done}: ${r.logged_minutes} min no diário.` : 'Timer encerrado (menos de 1 min, fora do diário).');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro no timer.'); } finally { setBusy(false); }
  };

  const timer = t.timer;
  const running = timer?.status === 'running';
  const glass = 'border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20';

  if (timer) {
    return (
      <div role="status" aria-label="Timer de estudo" className={`flex items-center gap-1 rounded-2xl py-1 pl-3 pr-1 ${glass}`}>
        <TimerIcon className={`h-4 w-4 ${running ? 'text-emerald-300' : 'text-white/60'}`} />
        <span className="max-w-[90px] truncate text-[12px] font-semibold text-white/75">{timer.subject}</span>
        <span className="font-mono text-[14px] font-bold tabular-nums">{formatClock(t.seconds)}</span>
        <button type="button" aria-label={running ? 'Pausar timer' : 'Retomar timer'} disabled={busy}
          onClick={() => void run(running ? t.pause : t.resume)} className="rounded-xl p-2 hover:bg-white/15">
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Encerrar timer" disabled={busy}
          onClick={() => void run(() => t.stop(), 'Estudo registrado')} className="rounded-xl bg-white/20 p-2 hover:bg-white/30">
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button type="button" aria-label="Iniciar timer de estudo" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-bold ${glass}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TimerIcon className="h-4 w-4" />}
        Timer
      </button>
      {open && pos && createPortal(
        <div ref={popRef} role="dialog" aria-label="Escolha a matéria" style={{ top: pos.top, left: pos.left }}
          className="fixed z-[70] w-[280px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">O que você vai estudar?</p>
          <div className="mt-2 flex max-h-[220px] flex-wrap gap-1.5 overflow-y-auto">
            {TIMER_SUBJECTS.map((s) => (
              <button key={s} type="button" disabled={busy}
                onClick={() => { setOpen(false); void run(() => t.start(s, null)); }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 transition hover:border-transparent hover:text-white dark:border-white/10 dark:text-white/80"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                {s}
              </button>
            ))}
          </div>
          <Link href={`/partners/${slug}/student/timer`} className="mt-3 block px-1 text-[12px] font-bold" style={{ color: 'var(--brand-primary)' }}>
            Ver meu tempo de estudo →
          </Link>
        </div>,
        themePortalContainer() ?? document.body,
      )}
    </div>
  );
}
