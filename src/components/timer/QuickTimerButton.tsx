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
    if (r) setPos({ top: r.bottom + 12, left: Math.min(Math.max(12, r.left - 8), window.innerWidth - 292) });
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
  // Mesmo "degrau" 3D do botão de retomada ao lado: sombra sólida embaixo, afunda no clique.
  const glass = 'border border-white/20 bg-white/[0.12] text-white backdrop-blur-md shadow-[0_5px_0_rgba(0,0,0,0.28)] transition-[transform,box-shadow,background-color] duration-100 hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-[4px] active:shadow-[0_1px_0_rgba(0,0,0,0.28)]';

  if (timer) {
    // anel: ciclo de foco de 25 min
    const turn = (t.seconds % 1500) / 1500;
    return (
      <div role="status" aria-label="Timer de estudo"
        className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.12] py-1 pl-1 pr-1 text-white shadow-[0_5px_0_rgba(0,0,0,0.28)] backdrop-blur-md">
        <button type="button" aria-label={running ? 'Pausar timer' : 'Retomar timer'} disabled={busy}
          onClick={() => void run(running ? t.pause : t.resume)}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:scale-105"
          style={{ background: `conic-gradient(${running ? '#34d399' : 'rgba(255,255,255,0.45)'} ${turn}turn, rgba(255,255,255,0.14) 0)` }}>
          <span className="absolute inset-[3px] rounded-[9px] bg-slate-900/70" />
          <span className="relative">{running ? <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} /> : <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />}</span>
        </button>
        <span className="flex min-w-0 flex-col pr-1 leading-none">
          <span className="font-mono text-[15px] font-bold tabular-nums">{formatClock(t.seconds)}</span>
          <span className="mt-1 flex max-w-[96px] items-center gap-1 truncate text-[10.5px] font-semibold text-white/60">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${running ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
            {timer.subject}
          </span>
        </span>
        <button type="button" aria-label="Encerrar timer" disabled={busy}
          onClick={() => void run(() => t.stop(), 'Estudo registrado')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 transition hover:bg-red-500/80">
          <Square className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button type="button" aria-label="Iniciar timer de estudo" title="Timer de estudo" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={`group flex h-12 w-12 items-center justify-center rounded-2xl ${glass} ${open ? 'bg-white/25' : ''}`}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <TimerIcon className="h-5 w-5 transition-transform group-hover:rotate-[-12deg]" />}
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
          <Link href={`/partners/${slug}/student/timer`} className="mt-3 block px-1 text-[12px] font-bold" style={{ color: 'var(--brand-ink, var(--brand-primary))' }}>
            Ver meu tempo de estudo →
          </Link>
        </div>,
        themePortalContainer() ?? document.body,
      )}
    </div>
  );
}
